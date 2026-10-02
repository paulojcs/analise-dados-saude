"""relatorioaps (API publica, sem login) para o Brasil inteiro: pagamentos federais da APS por municipio.

Irmao nacional de src/aps_relatorioaps.py (que puxa tudo so de Sao Caetano). Mesma API,
https://relatorioaps-prd.saude.gov.br, mesmas rotas (lidas no bundle do app em 2026-09-29).

  tier1     por parcela (202405 em diante): AGRUPADO sem coUf = 5.571 municipios, planos com valor
            efetivamente repassado (1 chamada, ~8 MB); COMPLETO por UF = 180 colunas por municipio
            (classificacao Vinculo/Qualidade/eMulti, estrato de equidade, contagens e valores por
            componente) + resumosPlanosOrcamentarios da UF (integral/desconto/ajuste/efetivo) (27 chamadas);
            componente-pagamento do plano 8 (coProcesso e processos de validacao/pagamento da parcela)
  extras    o que aceita chamada nacional (testado 2026-09-30): cobertura aps/ab/acs/sb v1/v2 por ano,
            homologacao de equipes e estabelecimentos, Informatiza, Saude na Hora, credenciamentos,
            adesoes por estrategia, PSE (ciclos, escolas, historico), sujeitos a suspensao
  detalhe   relatorio-detalhado por municipio x parcela x componente (48 eSF, 49 eAP):
            validacoesEquipes (INE, CNES, composicao, status, % pago). NAO aceita UF nem Brasil (500),
            entao e uma chamada por municipio; so para quem tem a equipe credenciada/homologada/paga no
            COMPLETO da parcela. Retoma de onde parou (pula o que ja esta em disco).
  tabelas   refaz as tabelas do detalhe a partir dos JSON em disco

Etiqueta: uma chamada por vez, pausa >= 0,2 s, backoff, para depois de 10 falhas seguidas, log de tudo.
Identificadores de pessoa (CNS etc.) saem das tabelas por padrão (IDENT); o JSON
bruto em data/ guarda a resposta inteira.

Saidas:  data/public/relatorioaps_br/<AAAA-MM-DD>/        JSON.gz bruto do tier1/extras + parquet
         data/public/relatorioaps_br/detalhe/<parcela>/c<comp>/<ibge>.json.gz  (detalhe, cumulativo)
         data/public/relatorioaps_br/detalhe_*.parquet    tabelas do detalhe
         outputs/aps/tables/relatorioaps_br/               agregados pequenos + _chamadas*.csv

    python atlas/pipeline/relatorioaps_brasil.py tier1 [202405]
    python atlas/pipeline/relatorioaps_brasil.py extras
    python atlas/pipeline/relatorioaps_brasil.py detalhe SP            (ou lista de UFs, ou BR)
    python atlas/pipeline/relatorioaps_brasil.py estimativa BR         (so conta as chamadas do detalhe)
    python atlas/pipeline/relatorioaps_brasil.py tabelas
    python atlas/pipeline/relatorioaps_brasil.py presenca             (municipio x parcela x eSF/eAP: tem ou nao)
"""

import csv
import gzip
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime
from pathlib import Path

import pandas as pd

# raiz dos dados do atlas (no zen: /dados dentro do contêiner coorte-atlas)
RAIZ = Path(os.environ.get("ATLAS_HOME", Path(__file__).resolve().parent.parent / "_dados"))
BASE = RAIZ / "data" / "public" / "relatorioaps_br"
BRUTO = BASE / date.today().isoformat()
DETALHE = BASE / "detalhe"
SAIDA = RAIZ / "outputs" / "aps" / "tables" / "relatorioaps_br"
API = "https://relatorioaps-prd.saude.gov.br"
PAUSA = 0.25
UFS = {"11": "RO", "12": "AC", "13": "AM", "14": "RR", "15": "PA", "16": "AP", "17": "TO", "21": "MA", "22": "PI",
       "23": "CE", "24": "RN", "25": "PB", "26": "PE", "27": "AL", "28": "SE", "29": "BA", "31": "MG", "32": "ES",
       "33": "RJ", "35": "SP", "41": "PR", "42": "SC", "43": "RS", "50": "MS", "51": "MT", "52": "GO", "53": "DF"}
SIGLA_UF = {v: k for k, v in UFS.items()}
# igual ao salva() de aps_relatorioaps.py: CNS/CPF/nome/nascimento de profissional nao vao para tabela
IDENT = re.compile(r"(^|_)(co|nu)?(cns|cpf)$|^no(me)?profissional|^noprof|nascimento|^dtnasc", re.I)
# plano 8: 48/49 todo mes; 62/63 = parcela adicional do componente de qualidade (so em 202412)
COMPONENTES_DETALHE = {48: ("Esf", "eSF"), 49: ("Eap", "eAP"), 62: ("Esf", "eSF qualidade adicional"),
                       63: ("Eap", "eAP qualidade adicional")}

LOG_ARQ = None
FALHAS_SEGUIDAS = 0


class Parar(Exception):
    pass


def registra(linha):
    global LOG_ARQ
    novo = not LOG_ARQ.exists()
    with open(LOG_ARQ, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["quando", "rotulo", "url", "ok", "status", "bytes", "segundos", "erro"])
        if novo:
            w.writeheader()
        w.writerow(linha)


def get(caminho, rotulo="", destino=None, tentativas=4, **params):
    """GET com backoff. Grava o JSON bruto (gzip) em `destino`. None se falhar (4xx sem nova tentativa)."""
    global FALHAS_SEGUIDAS
    params = {k: v for k, v in params.items() if v not in (None, "")}
    url = f"{API}{caminho}" + (f"?{urllib.parse.urlencode(params)}" if params else "")
    erro, status = "", None
    for tentativa in range(tentativas):
        t0 = time.time()
        try:
            with urllib.request.urlopen(url, timeout=300) as r:
                bruto = r.read()
            dado = json.loads(bruto.decode("utf-8"))
            if destino is not None:
                destino.parent.mkdir(parents=True, exist_ok=True)
                with gzip.open(destino, "wb") as f:
                    f.write(bruto)
            registra({"quando": datetime.now().isoformat(timespec="seconds"), "rotulo": rotulo, "url": url,
                      "ok": True, "status": 200, "bytes": len(bruto), "segundos": round(time.time() - t0, 2),
                      "erro": ""})
            FALHAS_SEGUIDAS = 0
            time.sleep(PAUSA)
            return dado
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ConnectionError,
                json.JSONDecodeError) as e:
            status = getattr(e, "code", None)
            erro = f"{type(e).__name__}: {str(e)[:150]}"
            registra({"quando": datetime.now().isoformat(timespec="seconds"), "rotulo": rotulo, "url": url,
                      "ok": False, "status": status, "bytes": 0, "segundos": round(time.time() - t0, 2),
                      "erro": erro})
            if status in (400, 401, 403, 404):
                break
            time.sleep(min(120, 5 * 2 ** tentativa))
    FALHAS_SEGUIDAS += 1
    if FALHAS_SEGUIDAS >= 10:
        raise Parar(f"10 falhas seguidas; ultima: {url} {erro}")
    return None


def le_gz(p):
    with gzip.open(p, "rb") as f:
        return json.loads(f.read().decode("utf-8"))


def lista(dado, chave=None):
    if dado is None:
        return []
    if isinstance(dado, list):
        return dado
    for k in ([chave] if chave else []) + ["items", "itens", "dados", "content", "adesoes"]:
        if k and isinstance(dado.get(k), list):
            return dado[k]
    return [dado]


def limpa(df):
    fora = [c for c in df.columns if IDENT.search(str(c))]
    if fora:
        print(f"      (sem as colunas de identificacao {fora})")
    return df.drop(columns=fora)


def grava_parquet(df, nome, pasta):
    df = limpa(df)
    for c in df.columns:                  # colunas com tipos misturados viram texto
        if df[c].dtype == object:
            df[c] = df[c].map(lambda v: None if v is None or (isinstance(v, float) and pd.isna(v))
                              else (json.dumps(v, ensure_ascii=False) if isinstance(v, (list, dict)) else str(v)))
    pasta.mkdir(parents=True, exist_ok=True)
    df.to_parquet(pasta / f"{nome}.parquet", index=False)
    print(f"   {nome:<40} {len(df):>9} linhas x {df.shape[1]} col")
    return df


def parcelas(desde="202405"):
    todas = []
    for a in lista(get("/data/anos", "anos")):
        todas += [str(p) for p in lista(get("/data/parcelas", "parcelas", ano=a))]
    return sorted(p for p in set(todas) if p >= desde)


# ------------------------------------------------------------------ tier 1
def tier1(desde="202405"):
    print("== tier 1: pagamentos por municipio, Brasil")
    ps = parcelas(desde)
    print(f"   parcelas {ps[0]}..{ps[-1]} ({len(ps)}); {len(ps) * 29} chamadas previstas")
    agr, comp, res, compon = [], [], [], []
    for p in ps:
        t0 = time.time()
        a = get("/financiamento/pagamento", f"agrupado BR {p}", BRUTO / "agrupado" / f"{p}.json.gz",
                unidadeGeografica="MUNICIPIO", nuParcelaInicio=p, nuParcelaFim=p, tipoRelatorio="AGRUPADO") or {}
        g = a.get("agrupamentos", [])
        for m in g:
            base = {k: v for k, v in m.items() if not isinstance(v, list)}
            for pl in m.get("listaPagamentoPlanoOrcamentario") or []:
                agr.append(base | pl)
        processo = g[0]["coProcesso"] if g else None
        if processo:
            for pl in (8,):
                for c in lista(get("/financiamento/pagamento/componente-pagamento", f"componentes {p}",
                                   BRUTO / "componentes" / f"{p}_{pl}.json.gz",
                                   coProcesso=processo, coPlanoOrcamentario=pl)):
                    compon.append(c | {"nuParcela_consulta": p})
        n_uf = 0
        for co, uf in UFS.items():
            c = get("/financiamento/pagamento", f"completo {uf} {p}", BRUTO / "completo" / f"{p}_{uf}.json.gz",
                    unidadeGeografica="MUNICIPIO", coUf=co, nuParcelaInicio=p, nuParcelaFim=p,
                    tipoRelatorio="COMPLETO")
            if c is None:
                print(f"      falhou COMPLETO {uf} {p}")
                continue
            comp += c.get("pagamentos", [])
            res += c.get("resumosPlanosOrcamentarios", [])
            n_uf += 1
        print(f"   {p}: {len(g)} municipios no AGRUPADO, {n_uf}/27 UFs no COMPLETO  ({time.time() - t0:.0f}s)")
    pasta = BRUTO
    agr = grava_parquet(pd.DataFrame(agr), "pagamento_municipio_parcela_plano", pasta)
    comp = grava_parquet(pd.DataFrame(comp), "pagamento_completo", pasta)
    res = grava_parquet(pd.DataFrame(res), "resumo_planos", pasta)
    grava_parquet(pd.DataFrame(compon), "componentes_plano8", pasta)
    agregados(pasta)


def agregados(pasta):
    """Tabela longa municipio x parcela x plano com as classificacoes, e os resumos pequenos para outputs/."""
    agr = pd.read_parquet(pasta / "pagamento_municipio_parcela_plano.parquet")
    comp = pd.read_parquet(pasta / "pagamento_completo.parquet")
    res = pd.read_parquet(pasta / "resumo_planos.parquet")
    for c in ("vlTotalCusteio", "vlTotalImplantacao", "total"):
        agr[c] = pd.to_numeric(agr[c], errors="coerce")
    classif = ["dsClassificacaoVinculoEsfEap", "dsClassificacaoQualidadeEsfEap", "dsClassificacaoQualidadeEmulti",
               "dsFaixaIndiceEquidadeEsfEap", "qtPopulacao"]
    cl = comp[["coMunicipioIbge", "nuParcela"] + [c for c in classif if c in comp]].drop_duplicates(
        ["coMunicipioIbge", "nuParcela"])
    longo = agr.merge(cl, on=["coMunicipioIbge", "nuParcela"], how="left")
    longo.to_parquet(pasta / "pagamento_municipio_parcela.parquet", index=False)
    print(f"   pagamento_municipio_parcela            {len(longo):>9} linhas (planos x classificacao)")

    SAIDA.mkdir(parents=True, exist_ok=True)
    mun = agr.drop_duplicates(["coMunicipioIbge", "nuParcela"])
    br = mun.groupby("nuParcela").agg(municipios=("coMunicipioIbge", "nunique"), ufs=("sgUf", "nunique"),
                                      total_repasse=("total", "sum")).reset_index()
    br["total_planos_custeio"] = agr.groupby("nuParcela")["vlTotalCusteio"].sum().values
    br["total_planos_implantacao"] = agr.groupby("nuParcela")["vlTotalImplantacao"].sum().values
    for c in ("vlIntegral", "vlAjuste", "vlDesconto", "vlEfetivoRepasse", "vlTotalImplantacao"):
        res[c] = pd.to_numeric(res[c], errors="coerce")
    rb = res.groupby("nuParcela")[["vlIntegral", "vlAjuste", "vlDesconto", "vlEfetivoRepasse"]].sum()
    br = br.merge(rb.add_prefix("resumo_uf_").reset_index(), on="nuParcela", how="left")
    br.to_csv(SAIDA / "brasil_parcela.csv", index=False)

    uf = mun.groupby(["nuParcela", "sgUf"]).agg(municipios=("coMunicipioIbge", "nunique"),
                                                total_repasse=("total", "sum")).reset_index()
    ru = res.groupby(["nuParcela", "sgUf"])[["vlIntegral", "vlAjuste", "vlDesconto", "vlEfetivoRepasse"]].sum()
    uf = uf.merge(ru.add_prefix("resumo_").reset_index(), on=["nuParcela", "sgUf"], how="left")
    cu = comp.groupby(["nuParcela", "sgUf"]).agg(municipios_completo=("coMunicipioIbge", "nunique")).reset_index()
    uf = uf.merge(cu, on=["nuParcela", "sgUf"], how="left")
    for col, nome in (("dsClassificacaoVinculoEsfEap", "vinculo"), ("dsClassificacaoQualidadeEsfEap", "qualidade")):
        if col in comp:
            t = comp.pivot_table(index=["nuParcela", "sgUf"], columns=col, values="coMunicipioIbge",
                                 aggfunc="nunique", fill_value=0)
            t.columns = [f"n_{nome}_{str(c).lower().replace(' ', '_')}" for c in t.columns]
            uf = uf.merge(t.reset_index(), on=["nuParcela", "sgUf"], how="left")
    uf.to_csv(SAIDA / "uf_parcela.csv", index=False)
    rp = res.groupby(["nuParcela", "sgUf", "dsPlanoOrcamentario", "dsEsferaAdministrativa"], dropna=False)[
        ["vlIntegral", "vlAjuste", "vlDesconto", "vlEfetivoRepasse", "vlTotalImplantacao"]].sum().reset_index()
    rp.to_csv(SAIDA / "resumo_planos_uf_parcela.csv", index=False)
    # SP x parcela (645 x ~29): classificacao e totais, pequena o bastante para outputs/
    sp = comp[comp.sgUf == "SP"]
    cols = ["coMunicipioIbge", "noMunicipio", "nuParcela", "nuCompCnes"] + [c for c in classif if c in sp] + \
        [c for c in sp.columns if re.match(r"^(qtEsf|qtEap|vlTotal|qtTetoEsf|qtTetoEap|qtAcs|vlPagamentoAcs)", c)]
    sp[cols].merge(mun[["coMunicipioIbge", "nuParcela", "total"]], on=["coMunicipioIbge", "nuParcela"],
                   how="left").to_csv(SAIDA / "sp_municipio_parcela.csv", index=False)
    print(f"   outputs: brasil_parcela ({len(br)}), uf_parcela ({len(uf)}), resumo_planos_uf_parcela ({len(rp)}), "
          f"sp_municipio_parcela ({len(sp)})")
    presenca(pasta)


def presenca(pasta):
    """Municipio x parcela x tipo de equipe (eSF, eAP): tem ou nao tem, e em que etapa esta.
    Sai do COMPLETO do tier1, sem chamada nova; e o complemento do detalhe, que so e pedido para quem
    tem a equipe. Com os EP do CNES em data/public/cnes_ep/ (atlas/pipeline/cnes_ep.py), ganha
    cnes_ativas (equipes ativas do tipo no CNES da competencia) e a situacao "so no CNES": existe no
    CNES mas o Ministerio nao credencia/homologa/paga nenhuma."""
    comp = pd.read_parquet(pasta / "pagamento_completo.parquet")
    cols = {"eSF": {"teto": "qtTetoEsf", "credenciadas": "qtEsfCredenciado", "homologadas": "qtEsfHomologado",
                    "pagas": "qtEsfTotalPgto", "pagas_100pc": "qtEsf100pcPgto", "valor_total": "vlTotalEsf"},
            "eAP": {"teto": "qtTetoEap", "credenciadas": "qtEapCredenciadas", "homologadas": "qtEapHomologado",
                    "pagas": "qtEapTotalPgto", "valor_total": "vlTotalEap"}}
    partes = []
    for tipo, m in cols.items():
        d = comp[["coMunicipioIbge", "noMunicipio", "sgUf", "nuParcela", "nuCompCnes"]].copy()
        d["tipo"] = tipo
        for novo, orig in m.items():
            d[novo] = pd.to_numeric(comp[orig], errors="coerce") if orig in comp else None
        partes.append(d)
    p = pd.concat(partes, ignore_index=True)
    n = p[["credenciadas", "homologadas", "pagas"]].fillna(0)
    p["tem_equipe"] = n.sum(axis=1) > 0
    p["situacao"] = "sem equipe"
    p.loc[n.credenciadas > 0, "situacao"] = "credenciada, nao homologada"
    p.loc[n.homologadas > 0, "situacao"] = "homologada, nao paga"
    p.loc[n.pagas > 0, "situacao"] = "paga"
    # CNES (atlas/pipeline/cnes_ep.py): equipes ativas do tipo na competencia que a parcela usa
    cnes = []
    for arq in sorted((RAIZ / "data" / "public" / "cnes_ep").glob("ep_*.parquet")):
        e = pd.read_parquet(arq, columns=["COMPETEN", "CODUFMUN", "TIPO_EQP", "ativa"])
        e = e[e.ativa & e.TIPO_EQP.isin(["70", "76"])]
        cnes.append(e.groupby(["COMPETEN", "CODUFMUN", "TIPO_EQP"]).size().reset_index(name="cnes_ativas"))
    if cnes:
        c = pd.concat(cnes).rename(columns={"COMPETEN": "nuCompCnes", "CODUFMUN": "coMunicipioIbge"})
        c["tipo"] = c.TIPO_EQP.map({"70": "eSF", "76": "eAP"})
        p = p.merge(c.drop(columns="TIPO_EQP"), on=["nuCompCnes", "coMunicipioIbge", "tipo"], how="left")
        tem_cnes = p.nuCompCnes.isin(c.nuCompCnes.unique())
        p.loc[tem_cnes, "cnes_ativas"] = p.loc[tem_cnes, "cnes_ativas"].fillna(0)
        p.loc[(p.situacao == "sem equipe") & (p.cnes_ativas > 0), "situacao"] = "so no CNES"
    alguma = p.groupby(["coMunicipioIbge", "nuParcela"]).tem_equipe.transform("any")
    p["municipio_sem_esf_nem_eap"] = ~alguma
    p.to_parquet(pasta / "presenca_equipes.parquet", index=False)
    SAIDA.mkdir(parents=True, exist_ok=True)
    r = p.groupby(["nuParcela", "sgUf", "tipo", "situacao"]).coMunicipioIbge.nunique().unstack(fill_value=0)
    r["municipios"] = r.sum(axis=1)
    r = r.reset_index()
    nen = p[p.municipio_sem_esf_nem_eap].groupby(["nuParcela", "sgUf"]).coMunicipioIbge.nunique()
    r["municipios_sem_esf_nem_eap"] = r.set_index(["nuParcela", "sgUf"]).index.map(nen).fillna(0).astype(int)
    r.to_csv(SAIDA / "presenca_equipes_uf_parcela.csv", index=False)
    p[p.sgUf == "SP"].to_csv(SAIDA / "presenca_equipes_sp.csv", index=False)
    print(f"   presenca_equipes: {len(p)} linhas (Brasil, parquet); presenca_equipes_uf_parcela.csv {len(r)}; "
          f"presenca_equipes_sp.csv {int((p.sgUf == 'SP').sum())}")
    return p


# ------------------------------------------------------------------ extras
def extras():
    print("== extras (chamadas nacionais)")
    pasta = BRUTO / "extras"
    ano_fim = date.today().year
    for tipo, caminho, desde in [("aps", "/cobertura/aps", 2021), ("ab", "/cobertura/ab", 2007),
                                 ("acs", "/cobertura/acs", 2007), ("sb_v1", "/cobertura/sb/v1", 2007),
                                 ("sb_v2", "/cobertura/sb/v2", 2021)]:
        linhas = []
        for ano in range(desde, ano_fim + 1):   # por ano: pedidos longos dao 500
            linhas += lista(get(caminho, f"cobertura {tipo} {ano}", pasta / f"cobertura_{tipo}_{ano}.json.gz",
                                unidadeGeografica="MUNICIPIO", nuCompInicio=f"{ano}01", nuCompFim=f"{ano}12"))
        if linhas:
            grava_parquet(pd.DataFrame(linhas), f"cobertura_{tipo}", pasta)
    for nome, caminho, params in [("homologacao_equipes", "/financiamento/homologacao/equipes", {}),
                                  ("homologacao_estabelecimentos", "/financiamento/homologacao/estabelecimentos", {}),
                                  ("informatiza_historico", "/informatiza/historico", {"unidadeGeografica": "MUNICIPIO"}),
                                  ("saude_na_hora_historico", "/adesao/snh/historico", {"unidadeGeografica": "MUNICIPIO"}),
                                  ("credenciamento_solicitacoes", "/credenciamento/solicitacoes-adesao/gerencia", {})]:
        d = lista(get(caminho, nome, pasta / f"{nome}.json.gz", **params))
        if d:
            grava_parquet(pd.DataFrame(d), nome, pasta)
    estr = lista(get("/adesao/estrategias", "adesao_estrategias", pasta / "adesao_estrategias.json.gz"))
    grava_parquet(pd.DataFrame(estr), "adesao_estrategias", pasta)
    ades = []
    for e in estr:
        d = get("/adesao/solicitacoes", f"adesao {e['codigo']}", pasta / f"adesao_{e['codigo']}.json.gz",
                tentativas=2, coEstrategia=e["codigo"])
        for s in lista(d):
            for it in (s.get("itens") or [s]) if isinstance(s, dict) else []:
                ades.append({"coEstrategia": e["codigo"], "dsEstrategia": e.get("descricao")} | it)
    if ades:
        grava_parquet(pd.DataFrame(ades), "adesao_solicitacoes", pasta)
    ciclos = lista(get("/adesao/pse/ciclos", "pse_ciclos", pasta / "pse_ciclos.json.gz"))
    grava_parquet(pd.DataFrame(ciclos), "pse_ciclos", pasta)
    escolas, hist = [], []
    for c in ciclos:
        cc = c["coPseCiclo"]
        escolas += [{"coPseCiclo": cc} | x for x in lista(get("/adesao/pse/estabelecimentos", f"pse escolas {cc}",
                                                              pasta / f"pse_escolas_{cc}.json.gz", coCiclo=cc))]
        for h in lista(get("/adesao/pse/historico", f"pse historico {cc}", pasta / f"pse_historico_{cc}.json.gz",
                           coCiclo=cc), "adesoes"):
            base = {k: v for k, v in h.items() if not isinstance(v, list)}
            listas = [v for v in h.values() if isinstance(v, list)]
            hist += [{"coPseCiclo": cc} | base | x for x in (listas[0] if listas else [{}])]
    grava_parquet(pd.DataFrame(escolas), "pse_escolas", pasta)
    grava_parquet(pd.DataFrame(hist), "pse_historico", pasta)
    partes = {"equipes": [], "estabelecimentos": [], "profissionais": []}
    for comp in lista(get("/credenciamento/sujeitos-suspensao/competencias", "suspensao competencias")):
        rel = get("/credenciamento/sujeitos-suspensao", f"suspensao {comp}", pasta / f"suspensao_{comp}.json.gz",
                  nuCompCnes=comp) or {}
        for k in partes:
            partes[k] += [{"nuCompCnes": comp} | r for r in (rel.get(k) or [])]
    for k, v in partes.items():
        if v:
            grava_parquet(pd.DataFrame(v), f"sujeitos_suspensao_{k}", pasta)


# ------------------------------------------------------------------ tier 2
def ultimo_tier1():
    ps = sorted(p for p in BASE.glob("*/pagamento_completo.parquet"))
    if not ps:
        raise SystemExit("rode o tier1 antes")
    return ps[-1].parent


def fila_detalhe(ufs):
    """(parcela, componente, ibge, parametros) de cada chamada necessaria; pula municipio sem a equipe."""
    pasta = ultimo_tier1()
    comp = pd.read_parquet(pasta / "pagamento_completo.parquet")
    compon = pd.read_parquet(pasta / "componentes_plano8.parquet")
    if ufs != ["BR"]:
        comp = comp[comp.sgUf.isin(ufs)]
    fila, pulados = [], 0
    for _, c in compon.iterrows():
        cc = int(c["coComponentePagamento"])
        if cc not in COMPONENTES_DETALHE:
            continue
        suf = COMPONENTES_DETALHE[cc][0]
        p = c["nuParcela"]
        cp = comp[comp.nuParcela == p]
        cols = [x for x in cp.columns if re.match(rf"^qt{suf}(Credenciad|Homologad|TotalPgto)", x)]
        tem = cp[cols].apply(pd.to_numeric, errors="coerce").fillna(0).sum(axis=1) > 0
        pulados += int((~tem).sum())
        for ibge in cp.loc[tem, "coMunicipioIbge"]:
            fila.append((p, cc, str(ibge), dict(nuParcela=p, nuCompCnes=c["nuCompCnes"], coMunicipio=ibge,
                                                coComponentePagamento=cc, coProcesso=c["coProcesso"],
                                                coProcessoPagamento=c["coProcessoPagamento"],
                                                coProcessoValidacao=c["coProcessoValidacao"],
                                                coPlanoOrcamentario=8)))
    return fila, pulados


def arq_detalhe(p, cc, ibge):
    return DETALHE / p / f"c{cc}" / f"{ibge}.json.gz"


def detalhe(ufs):
    fila, pulados = fila_detalhe(ufs)
    falta = [f for f in fila if not arq_detalhe(*f[:3]).exists()]
    print(f"== detalhe {','.join(ufs)}: {len(fila)} chamadas necessarias ({pulados} municipio-parcela-componente "
          f"sem a equipe, pulados); {len(fila) - len(falta)} ja em disco; faltam {len(falta)}")
    t0, feitos = time.time(), 0
    for p, cc, ibge, params in falta:
        get("/financiamento/pagamento/municipio/relatorio-detalhado", f"detalhe {p} c{cc} {ibge}",
            arq_detalhe(p, cc, ibge), **params)
        feitos += 1
        if feitos % 200 == 0:
            taxa = (time.time() - t0) / feitos
            print(f"   {datetime.now():%Y-%m-%d %H:%M} {feitos}/{len(falta)}  {taxa:.2f} s/chamada  "
                  f"faltam ~{(len(falta) - feitos) * taxa / 3600:.1f} h", flush=True)
    print(f"   fim: {feitos} chamadas em {(time.time() - t0) / 3600:.2f} h")
    tabelas()


def estimativa(ufs):
    fila, pulados = fila_detalhe(ufs)
    falta = sum(not arq_detalhe(*f[:3]).exists() for f in fila)
    log = pd.read_csv(LOG_ARQ) if LOG_ARQ.exists() else pd.DataFrame()
    d = log[log.rotulo.astype(str).str.startswith("detalhe")] if len(log) else log
    print(f"   {','.join(ufs)}: {len(fila)} chamadas ({pulados} puladas), faltam {falta}")
    if len(d) > 50:
        q = pd.to_datetime(d.quando)
        taxa = (q.max() - q.min()).total_seconds() / (len(d) - 1)
        print(f"   ritmo medido: {taxa:.2f} s/chamada (mediana resposta {d.segundos.median():.2f} s) -> "
              f"{falta * taxa / 3600:.1f} h")


def tabelas():
    """validacoesEquipes e demais listas do detalhe -> parquet; escalares numa linha por chamada."""
    esc, listas = [], {}
    for arq in sorted(DETALHE.glob("*/c*/*.json.gz")):
        p, cc, ibge = arq.parent.parent.name, int(arq.parent.name[1:]), arq.name.split(".")[0]
        d = le_gz(arq)
        ctx = {"nuParcela": p, "coComponente": cc, "coMunicipioIbge": ibge}
        for obj in (d if isinstance(d, list) else [d]):
            if not isinstance(obj, dict):
                continue
            esc.append(ctx | {k: v for k, v in obj.items() if not isinstance(v, (list, dict))})
            for k, v in obj.items():
                if isinstance(v, list):
                    listas.setdefault(k, []).extend(ctx | (x if isinstance(x, dict) else {k: x}) for x in v)
    if not esc:
        return
    grava_parquet(pd.DataFrame(esc), "detalhe_campos", BASE)
    for k, v in listas.items():
        if v:
            grava_parquet(pd.DataFrame(v), f"detalhe_{k}", BASE)
    # agregado pequeno: UF x parcela x componente, equipes por status de pagamento e composicao
    ve = pd.DataFrame(listas.get("validacoesEquipes", []))
    if len(ve):
        ve["sgUf"] = ve["coMunicipioIbge"].str[:2].map(UFS)
        cols = [c for c in ("stPagamento", "composicao") if c in ve]
        r = ve.groupby(["sgUf", "nuParcela", "coComponente"] + cols, dropna=False).size().reset_index(name="equipes")
        SAIDA.mkdir(parents=True, exist_ok=True)
        r.to_csv(SAIDA / "detalhe_equipes_uf_parcela.csv", index=False)
        print(f"   detalhe_equipes_uf_parcela.csv        {len(r):>9} linhas")


if __name__ == "__main__":
    args = sys.argv[1:] or ["tier1"]
    cmd = args[0]
    SAIDA.mkdir(parents=True, exist_ok=True)
    LOG_ARQ = SAIDA / f"_chamadas_{cmd if cmd in ('tier1', 'extras') else 'detalhe'}.csv"
    ufs = [a.upper() for a in args[1:]] or ["SP"]
    try:
        if cmd == "tier1":
            tier1(args[1] if len(args) > 1 else "202405")
        elif cmd == "extras":
            extras()
        elif cmd == "detalhe":
            # decisao de Paulo 2026-09-30: detalhe por equipe so SP (Brasil ~190 h); liberar com DETALHE_BR=1
            if ufs != ["SP"] and os.environ.get("DETALHE_BR") != "1":
                raise SystemExit("detalhe fora de SP desativado (decisao 2026-09-30); use DETALHE_BR=1 para liberar")
            detalhe(ufs)
        elif cmd == "estimativa":
            estimativa(ufs)
        elif cmd == "tabelas":
            tabelas()
        elif cmd == "presenca":
            presenca(ultimo_tier1())
        elif cmd == "agregados":
            agregados(ultimo_tier1())
        else:
            raise SystemExit(__doc__)
    except Parar as e:
        print(f"PAROU: {e}")
        sys.exit(2)
