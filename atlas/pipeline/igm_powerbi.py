"""Paineis publicos do IGM SUS Paulista (SES-SP, portal NIES) extraidos do Power BI "publish to web".

O NIES (nies.saude.sp.gov.br) mostra tres paineis Power BI publicos, sem login:
  atual   indicadores-igm-sus-paulista-atual   regras em vigor (CIB 24/25-2026), 33 tabelas
  legado  indicadores-igm-sus-paulista          regras 2024-25 ("Legado"), 10 tabelas
  rnds    indicadores-rnds                      integracao dos estabelecimentos a RNDS (nao e IGM)

Caminho (verificado 2026-09-30):
  GET  nies.../api/powerbi/embed-info?reportId=<slug>   -> externalUrl ...view?r=<base64 {k, t}>
  GET  <API>/public/reports/<k>/modelsAndExploration     -> modelo (id, dbName), paginas
  POST <API>/public/reports/conceptualschema             -> tabelas, colunas, medidas, tipos
  POST <API>/public/reports/querydata?synchronous=true   -> consulta semantica (DSR/DM0)
Cabecalho X-PowerBI-ResourceKey: <k>. A chave e resolvida a cada execucao (a SES pode republicar).

Para cada tabela com colunas: todas as colunas, todas as linhas, em janelas de 30.000 com restart
tokens (RT). Tabela larga demais e partida em blocos de colunas que se juntam pelas chaves. A consulta
agrupa por todas as colunas, entao linhas identicas viram uma so (irrelevante nestas tabelas, que tem
IBGE x ciclo como chave). Numeros das planilhas da SES vem muitas vezes como TEXTO com virgula
decimal ("76,51991614"): ficam como texto no parquet bruto e sao convertidos no igm_sp_longo.csv.

Colunas de identificacao de pessoa (CPF do diretor clinico, telefone, e-mail, usuario) nunca sao
pedidas a API (IDENT). Medidas do modelo NAO sao extraidas em lote: dependem de slicers (SELECTEDVALUE)
e so fazem sentido dentro do visual; o que o artigo usa esta nas colunas.

Saidas, por execucao (instantaneo datado; o painel e sobrescrito no lugar, entao os antigos ficam):
  data/public/igm_sp/<AAAA-MM-DD>/<painel>/   JSON bruto de cada chamada (consultas/*.json.gz) + um parquet por tabela
  data/public/igm_sp/<AAAA-MM-DD>/_hashes.csv hash do conteudo de cada tabela
  outputs/aps/tables/igm_sp/                  CSVs pequenos (ate LIMITE_CSV linhas), igm_sp_longo.csv,
                                              _chamadas.csv, _hashes.csv, _mudancas.csv

    python atlas/pipeline/igm_powerbi.py              (os tres paineis)
    python atlas/pipeline/igm_powerbi.py atual legado (so estes)
    python atlas/pipeline/igm_powerbi.py longo        (so refaz igm_sp_longo.csv do instantaneo mais recente)
"""

import base64
import os
import gzip
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd

# raiz dos dados do atlas (no zen: /dados dentro do contêiner coorte-atlas)
RAIZ = Path(os.environ.get("ATLAS_HOME", Path(__file__).resolve().parent.parent / "_dados"))
BASE_BRUTO = RAIZ / "data" / "public" / "igm_sp"
BRUTO = BASE_BRUTO / date.today().isoformat()
SAIDA = RAIZ / "outputs" / "aps" / "tables" / "igm_sp"
NIES = "https://nies.saude.sp.gov.br/api/powerbi/embed-info?reportId="
API = "https://wabi-brazil-south-b-primary-api.analysis.windows.net"
PAINEIS = {"atual": "indicadores-igm-sus-paulista-atual",
           "legado": "indicadores-igm-sus-paulista",
           "rnds": "indicadores-rnds"}
PAUSA = 0.3
JANELA = 30000
MAX_COLS = 25          # acima disso a tabela e pedida em blocos
LIMITE_CSV = 20000     # tabelas maiores ficam so em parquet (data/)
TIPOS = {1: "texto", 2: "bool", 3: "double", 4: "int", 6: "decimal", 7: "datahora"}
IDENT = re.compile(r"cpf|telefone|e_?mail|^co_usuario$|^no_usuario|^reg_diretor", re.I)
AUTO_DATA = re.compile(r"^(LocalDateTable|DateTableTemplate)_")

LOG = []


def http(url, corpo=None, chave=None, rotulo=""):
    """GET/POST JSON com backoff; para depois de 4 falhas seguidas. Registra cada chamada."""
    cab = {"Content-Type": "application/json", "Accept": "application/json"}
    if chave:
        cab["X-PowerBI-ResourceKey"] = chave
    dados = json.dumps(corpo).encode() if corpo is not None else None
    erro = ""
    for tentativa in range(4):
        t0 = time.time()
        try:
            req = urllib.request.Request(url, data=dados, headers=cab)
            with urllib.request.urlopen(req, timeout=180) as r:
                txt = r.read().decode("utf-8")
            LOG.append({"quando": datetime.now().isoformat(timespec="seconds"), "rotulo": rotulo,
                        "url": url, "ok": True, "status": 200, "bytes": len(txt),
                        "segundos": round(time.time() - t0, 2), "erro": ""})
            time.sleep(PAUSA)
            return json.loads(txt), txt
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
            status = getattr(e, "code", None)
            erro = f"{type(e).__name__}: {str(e)[:150]}"
            LOG.append({"quando": datetime.now().isoformat(timespec="seconds"), "rotulo": rotulo,
                        "url": url, "ok": False, "status": status, "bytes": 0,
                        "segundos": round(time.time() - t0, 2), "erro": erro})
            if status in (400, 401, 403, 404):
                break
            time.sleep(3 * 2 ** tentativa)
    raise RuntimeError(f"{rotulo}: {erro}")


def grava(pasta, nome, txt):
    """JSON bruto; as respostas das consultas vao em gzip (o d_cnes do painel rnds passa de 200 MB)."""
    pasta.mkdir(parents=True, exist_ok=True)
    if pasta.name == "consultas":
        with gzip.open(pasta / f"{nome}.gz", "wt", encoding="utf-8") as f:
            f.write(txt)
    else:
        (pasta / nome).write_text(txt, encoding="utf-8")


# ------------------------------------------------------------------ contexto do painel
def contexto(painel):
    slug, pasta = PAINEIS[painel], BRUTO / painel
    ei, txt = http(NIES + slug, rotulo=f"{painel} embed-info")
    grava(pasta, "embed_info.json", txt)
    r = ei["externalUrl"].split("r=")[1]
    tok = json.loads(base64.b64decode(r + "=" * (-len(r) % 4)))
    chave = tok["k"]
    mae, txt = http(f"{API}/public/reports/{chave}/modelsAndExploration?preferReadOnlySession=true",
                    chave=chave, rotulo=f"{painel} modelsAndExploration")
    grava(pasta, "models_and_exploration.json", txt)
    modelo = mae["models"][0]
    cs, txt = http(f"{API}/public/reports/conceptualschema", {"modelIds": [modelo["id"]]},
                   chave=chave, rotulo=f"{painel} conceptualschema")
    grava(pasta, "conceptualschema.json", txt)
    return {"painel": painel, "chave": chave, "tenant": tok.get("t"), "modelo": modelo,
            "relatorio": mae["exploration"].get("report", {}).get("objectId", ""),
            "entidades": cs["schemas"][0]["schema"]["Entities"], "pasta": pasta,
            "atualizado": modelo.get("LastRefreshTime")}


# ------------------------------------------------------------------ consulta e DSR
def consulta(ctx, entidade, cols, restart=None):
    sel = [{"Column": {"Expression": {"SourceRef": {"Source": "t"}}, "Property": c}, "Name": f"t.{c}"}
           for c in cols]
    janela = {"Count": JANELA}
    if restart:
        janela["RestartTokens"] = restart
    q = {"version": "1.0.0", "cancelQueries": [], "modelId": ctx["modelo"]["id"],
         "queries": [{"Query": {"Commands": [{"SemanticQueryDataShapeCommand": {
             "Query": {"Version": 2, "From": [{"Name": "t", "Entity": entidade, "Type": 0}], "Select": sel},
             "Binding": {"Primary": {"Groupings": [{"Projections": list(range(len(cols)))}]},
                         "DataReduction": {"DataVolume": 4, "Primary": {"Window": janela}}, "Version": 1}}}]},
             "QueryId": "", "ApplicationContext": {"DatasetId": ctx["modelo"]["dbName"],
                                                    "Sources": [{"ReportId": ctx["relatorio"]}]}}]}
    return http(f"{API}/public/reports/querydata?synchronous=true", q, chave=ctx["chave"],
                rotulo=f"{ctx['painel']} {entidade}")


def decodifica(resp, cols):
    """DSR/DM0: S = esquema das colunas, C = valores, R = bitmask 'repete o anterior',
    Ø = bitmask de nulo, DN = indice num ValueDict. Devolve (linhas, restart_tokens ou None)."""
    res = resp["results"][0]["result"]
    if "error" in res.get("data", {}).get("dsr", {}) or "DataShapes" in res.get("data", {}).get("dsr", {}):
        raise RuntimeError(json.dumps(res["data"]["dsr"])[:400])
    dsr = res["data"]["dsr"]
    ds = dsr["DS"][0]
    if "odata.error" in ds or "Error" in ds:
        raise RuntimeError(json.dumps(ds)[:400])
    vd = ds.get("ValueDicts", {})
    linhas, esquema, ant = [], None, [None] * len(cols)
    for ph in ds.get("PH", []):
        for chave_dm, dm in ph.items():
            if not chave_dm.startswith("DM"):
                continue
            for r in dm:
                if "S" in r:
                    esquema = r["S"]
                c = list(r.get("C", []))
                rep, nul = r.get("R", 0), r.get("Ø", 0)
                lin = []
                for i, sc in enumerate(esquema):
                    if sc["N"] in r:      # valor com nome proprio ({"G0": 2024}), sem C
                        v = r[sc["N"]]
                        if "DN" in sc and isinstance(v, int):
                            v = vd[sc["DN"]][v]
                    elif rep >> i & 1:
                        v = ant[i]
                    elif nul >> i & 1:
                        v = None
                    else:
                        v = c.pop(0)
                        if "DN" in sc and isinstance(v, int):
                            v = vd[sc["DN"]][v]
                    lin.append(v)
                if c:
                    raise RuntimeError(f"DSR: sobraram valores {c[:5]}")
                ant = lin
                linhas.append(lin)
    completo = ds.get("IC", True)
    rt = ds.get("RT")
    return linhas, (rt if (rt and not completo) else None)


def tabela_inteira(ctx, entidade, cols, tag):
    """Todas as linhas das colunas `cols`, paginando por restart tokens."""
    todas, restart, pagina = [], None, 0
    while True:
        resp, txt = consulta(ctx, entidade, cols, restart)
        grava(ctx["pasta"] / "consultas", f"{seguro(entidade)}{tag}_p{pagina:03d}.json", txt)
        linhas, restart = decodifica(resp, cols)
        todas += linhas
        pagina += 1
        if not restart:
            break
        if pagina > 400:
            raise RuntimeError(f"{entidade}: paginacao sem fim")
    return pd.DataFrame(todas, columns=cols)


def seguro(nome):
    return re.sub(r"[^\w.-]+", "_", nome, flags=re.UNICODE).strip("_")


def chaves_de(cols):
    """Colunas que identificam a linha para juntar blocos: municipio + ciclo."""
    if "co_unidade" in cols:              # d_cnes (painel rnds): um estabelecimento por linha
        return ["co_unidade"]
    padrao = re.compile(r"^(IBGE_N|IBGE|cod_ibge)$|^Nome da Origem$|^Pagamento$|^Compet|^Ano$|"
                        r"^Quadrimestre$|^Indicador$|^Periodo$|^Trienio$", re.I)
    chaves = [c for c in cols if padrao.search(c)]
    if not chaves:
        raise RuntimeError("tabela larga sem chave para juntar os blocos")
    return chaves


def extrai_tabela(ctx, ent):
    props = [p for p in ent.get("Properties", []) if "Column" in p]
    fora = [p["Name"] for p in props if IDENT.search(p["Name"])]
    props = [p for p in props if p["Name"] not in fora]
    cols = [p["Name"] for p in props]
    if not cols:
        return None, fora
    if len(cols) <= MAX_COLS:
        df = tabela_inteira(ctx, ent["Name"], cols, "")
    else:
        chaves = chaves_de(cols)
        resto = [c for c in cols if c not in chaves]
        passo = MAX_COLS - len(chaves)
        df = None
        for i in range(0, len(resto), passo):
            parte = tabela_inteira(ctx, ent["Name"], chaves + resto[i:i + passo], f"_b{i // passo}")
            if df is None:
                df = parte
            else:
                antes = len(df)
                df = df.merge(parte, on=chaves, how="outer")
                if len(df) != antes:
                    print(f"      aviso: juntar o bloco {i // passo} mudou {antes} -> {len(df)} linhas")
    for p in props:                       # tipa pelo esquema: double as vezes chega como texto
        c, tipo = p["Name"], TIPOS.get(p.get("DataType"))
        if tipo == "datahora":            # milissegundos desde 1970
            df[c] = pd.to_datetime(pd.to_numeric(df[c], errors="coerce"), unit="ms")
        elif tipo in ("double", "decimal"):
            df[c] = pd.to_numeric(df[c], errors="coerce")
        elif tipo == "int":
            df[c] = pd.to_numeric(df[c], errors="coerce").astype("Int64")
        else:
            df[c] = df[c].map(lambda v: None if v is None else str(v))
    return df, fora


def hash_df(df):
    t = df.astype(str).sort_values(list(df.columns)).to_csv(index=False)
    return hashlib.sha256(t.encode()).hexdigest()[:16]


def painel(nome):
    print(f"== {nome}")
    ctx = contexto(nome)
    print(f"   chave {ctx['chave']}  modelo {ctx['modelo']['id']}  atualizado {ctx['atualizado']}")
    meta = []
    for ent in ctx["entidades"]:
        nome_t = ent["Name"]
        props = ent.get("Properties", [])
        base = {"painel": nome, "tabela": nome_t, "oculta": bool(ent.get("Hidden")),
                "n_colunas": sum("Column" in p for p in props), "n_medidas": sum("Measure" in p for p in props),
                "medidas": "; ".join(p["Name"] for p in props if "Measure" in p),
                "modelo_atualizado": ctx["atualizado"], "chave": ctx["chave"]}
        if AUTO_DATA.match(nome_t) or base["n_colunas"] == 0:
            meta.append(base | {"linhas": 0, "hash": "", "obs": "tabela automatica de datas" if AUTO_DATA.match(nome_t)
                                else "so medidas"})
            continue
        t0 = time.time()
        try:
            df, fora = extrai_tabela(ctx, ent)
        except RuntimeError as e:
            print(f"   {nome_t:<34} ERRO {e}")
            meta.append(base | {"linhas": -1, "hash": "", "obs": f"erro: {str(e)[:200]}"})
            continue
        arq = f"{nome}__{seguro(nome_t)}"
        df.to_parquet(ctx["pasta"] / f"{arq}.parquet", index=False)
        h = hash_df(df)
        csv = len(df) <= LIMITE_CSV
        if csv:
            SAIDA.mkdir(parents=True, exist_ok=True)
            df.to_csv(SAIDA / f"{arq}.csv", index=False, encoding="utf-8")
        obs = (f"sem colunas de identificacao {fora}; " if fora else "") + ("" if csv else "so parquet (grande)")
        meta.append(base | {"linhas": len(df), "hash": h, "obs": obs.strip("; ")})
        print(f"   {nome_t:<34} {len(df):>7} linhas x {df.shape[1]:>2} col  {time.time() - t0:5.1f}s"
              + (f"  (fora: {fora})" if fora else ""))
    return meta


# ------------------------------------------------------------------ instantaneos
def compara(meta):
    """Hash de cada tabela contra o instantaneo anterior mais recente."""
    atual = pd.DataFrame(meta)
    atual.to_csv(BRUTO / "_hashes.csv", index=False)
    anteriores = sorted(p for p in BASE_BRUTO.glob("*/_hashes.csv") if p.parent.name < BRUTO.name)
    if not anteriores:
        mud = atual.assign(anterior="", hash_anterior="", mudou="primeiro instantaneo")
    else:
        ant = pd.read_csv(anteriores[-1], dtype=str)[["painel", "tabela", "hash", "linhas"]]
        mud = atual.merge(ant, on=["painel", "tabela"], how="outer", suffixes=("", "_anterior"))
        mud["anterior"] = anteriores[-1].parent.name
        mud["mudou"] = mud.apply(lambda r: "nova" if pd.isna(r.get("hash_anterior")) else
                                 ("sumiu" if pd.isna(r.get("hash")) else
                                  ("sim" if str(r["hash"]) != str(r["hash_anterior"]) else "nao")), axis=1)
    SAIDA.mkdir(parents=True, exist_ok=True)
    atual.to_csv(SAIDA / "_hashes.csv", index=False)
    mud.to_csv(SAIDA / "_mudancas.csv", index=False)
    print("   mudancas:", mud["mudou"].value_counts().to_dict())


# ------------------------------------------------------------------ tabela longa
def num(s):
    """'76,51991614' -> 76.51991614; tambem aceita numero e '1.234,5'."""
    if s is None or (isinstance(s, float) and pd.isna(s)):
        return None
    if isinstance(s, (int, float)):
        return float(s)
    t = str(s).strip().replace("%", "").replace("R$", "").strip()
    if t in ("", "-", "NA", "null"):
        return None
    if "," in t:
        t = t.replace(".", "").replace(",", ".")
    try:
        return float(t)
    except ValueError:
        return None


def longo(pasta=None):
    """Tabela longa municipio x ciclo x indicador (o que o artigo usa).

    atual (CIB 24/25-2026), ciclo = parcela de pagamento (Q1.2026 = maio, Q2.2026 = setembro):
      vacinas: Comparação/Avaliação das tabelas Penta/Pneumo/Polio/Triplice; competencias de _tbPeriodoAvaliação
      HPV_F/HPV_M: _HPV (Ano de comparacao x ano de avaliacao; o mesmo para os dois ciclos)
      MI: _MortInfatil (dois trienios por ciclo: o mais antigo e a comparacao)
      eSF, ICSAB, Sifilis, LIRAa: competencia avaliada -> ciclo por tbCompetências
      MM: obitos maternos (valor) e bonus
      pontos por indicador, pontos totais e R$ fixo/variavel/total: _tbFinanceira
    legado (CIB 117/2023 + 150/2025): BASE e MortalidadeInfantil (indicador x quadrimestre avaliado, % pago,
      R$ pago), comparacao = quadrimestre anterior do mesmo indicador; tb_igm_financeiro = R$ por parcela.
    O IBGE 350000 e a linha do estado (nivel = estado)."""
    pasta = pasta or sorted(p for p in BASE_BRUTO.iterdir() if p.is_dir() and (p / "atual").exists())[-1]

    def le(p, t):
        arq = pasta / p / f"{p}__{seguro(t)}.parquet"
        return pd.read_parquet(arq) if arq.exists() else None

    def base(d, ibge, ind, **kw):
        out = pd.DataFrame({"ibge": d[ibge].astype(str), "indicador": ind})
        for k, v in kw.items():
            out[k] = v.values if isinstance(v, pd.Series) else v
        return out

    partes = []
    # ------------------------------------------------ atual
    comp = le("atual", "tbCompetências")
    per = le("atual", "_tbPeriodoAvaliação")
    fin = le("atual", "_tbFinanceira")
    if fin is not None and comp is not None:
        ciclo_de = lambda col: dict(zip(comp[col].astype(str), comp["Pagamento"].astype(str)))
        c_av = per[per.PERIODO == "Avaliação"].set_index("Pagamento")["CompAvaliação"].to_dict()
        c_cp = per[per.PERIODO == "Comparação"].set_index("Pagamento")["CompAvaliação"].to_dict()
        vals = []
        for t in ("Penta", "Pneumo", "Polio", "Triplice"):
            d = le("atual", t)
            vals.append(base(d, "IBGE_N", t, ciclo=d["Pagamento"], comp_avaliada=d["Pagamento"].map(c_av),
                             comp_comparacao=d["Pagamento"].map(c_cp), valor_comparacao=d["Comparação"].map(num),
                             valor_avaliacao=d["Avaliação"].map(num), fonte_valor=d["Nome da Origem"]))
        h = le("atual", "_HPV")
        for sexo, ind in (("HPV Fem", "HPV_F"), ("HPV Masc", "HPV_M")):
            hs = h[h.Imunobiologico == sexo]
            w = hs.pivot_table(index="IBGE_N", columns="Periodo", values="Cobertura", aggfunc="first")
            a = hs.pivot_table(index="IBGE_N", columns="Periodo", values="Ano", aggfunc="first")
            for cic in comp["Pagamento"]:
                vals.append(pd.DataFrame({"ibge": w.index.astype(str), "indicador": ind, "ciclo": cic,
                                          "comp_avaliada": a["Avaliação"].astype(str).values,
                                          "comp_comparacao": a["Comparação"].astype(str).values,
                                          "valor_comparacao": w["Comparação"].values,
                                          "valor_avaliacao": w["Avaliação"].values}))
        mi = le("atual", "_MortInfatil").sort_values("Trienio")
        g = mi.groupby(["IBGE_N", "Pagamento"])
        mi2 = g.agg(comp_comparacao=("Trienio", "first"), comp_avaliada=("Trienio", "last"),
                    valor_comparacao=("Taxa", "first"), valor_avaliacao=("Taxa", "last"),
                    fonte_valor=("Nome da Origem", "first")).reset_index()
        vals.append(base(mi2, "IBGE_N", "MI", **{c: mi2[c] for c in mi2.columns if c not in ("IBGE_N",)}
                         ).rename(columns={"Pagamento": "ciclo"}))
        e = le("atual", "_eSF")
        vals.append(base(e, "IBGE_N", "eSF", ciclo=e["Competência_avaliação"].map(ciclo_de("Comp_eSF")),
                         comp_avaliada=e["Competência_avaliação"], valor_avaliacao=e["Cobertura_média"] * 100))
        d = le("atual", "_ICSAB")
        vals.append(base(d, "IBGE_N", "ICSAB", ciclo=d["Pagamento"], comp_avaliada=d["Competencia"],
                         valor_avaliacao=d["% ICSAB"], fonte_valor=d["Nome da Origem"]))
        d = le("atual", "_Sifilis")
        vals.append(base(d, "IBGE_N", "Sifilis", ciclo=d["Competencia"].map(ciclo_de("Sifilis")),
                         comp_avaliada=d["Competencia"], valor_avaliacao=d["COBERTURA"], fonte_valor=d["Nome da Origem"]))
        d = le("atual", "_LIRAa")
        vals.append(base(d, "IBGE_N", "LIRAa", ciclo=d["Competencia"].map(ciclo_de("LiRAa")),
                         comp_avaliada=d["Competencia"], valor_texto=d["CUMPRIMENTO IGM"], fonte_valor=d["Nome da Origem"]))
        d = le("atual", "_MortMaterna")
        vals.append(base(d, "IBGE_N", "MM", ciclo=d["Competencia"], comp_avaliada=d["Competencia"],
                         valor_avaliacao=d["Freqüência"].map(num), valor_texto="bonus=" + d["Bônus"].astype(str),
                         fonte_valor=d["Nome da Origem"]))
        v = pd.concat(vals, ignore_index=True)

        pont = {"Penta": "PONTUAÇÃO PENTA (1,3)", "Pneumo": "PONTUAÇÃO PNEUMO (1,3)", "Polio": "PONTUAÇÃO POLIO (1,3)",
                "Triplice": "PONTUAÇÃO TRIPLICE (1,3)", "HPV_F": "PONTUAÇÃO HPV F (0,4)",
                "HPV_M": "PONTUAÇÃO HPV M (0,4)", "MI": "PONTUAÇÃO MI (0,8)", "eSF": "PONTUAÇÃO eSF (0,8)",
                "ICSAB": "PONTUAÇÃO ICSAB (0,8)", "Sifilis": "PONTUAÇÃO SÍFILIS (0,8)", "LIRAa": "PONTUAÇÃO LIRAa (0,8)"}
        p = []
        for ind, col in pont.items():
            p.append(base(fin, "IBGE_N", ind, ciclo=fin["Competencia"], pontos=fin[col].map(num),
                          peso=num(re.search(r"\(([\d,]+)\)", col).group(1))))
        p.append(base(fin, "IBGE_N", "MM", ciclo=fin["Competencia"], pontos=fin["MM Bônus (sem mortalidade) "].map(num)))
        p = pd.concat(p, ignore_index=True)
        mun = pd.DataFrame({"ibge": fin["IBGE_N"].astype(str), "ciclo": fin["Competencia"].values,
                            "municipio": fin["MUNICÍPIO"].values, "fonte_arquivo": fin["Nome da Origem"].values,
                            "mun_pontos_total": fin["Pontos com limite de 10 (consederando bônus)"].map(num).values,
                            "mun_valor_fixo": fin["Valor fixo"].map(num).values,
                            "mun_valor_variavel": fin["Valor variável"].map(num).values,
                            "mun_valor_total": fin["VALOR TOTAL DO REPASSE"].map(num).values})
        a = v.merge(p, on=["ibge", "ciclo", "indicador"], how="outer", validate="1:1").merge(
            mun, on=["ibge", "ciclo"], how="left", validate="m:1")
        partes.append(a.assign(painel="atual", regra="CIB 24/25-2026"))
    # ------------------------------------------------ legado
    b = le("legado", "BASE")
    if b is not None:
        mi = le("legado", "MortalidadeInfantil")
        leg = pd.concat([
            pd.DataFrame({"ibge": b["IBGE"].astype(str), "indicador": b["Indicador"],
                          "comp_avaliada": b["Quadrimestre"].astype(str) + "." + b["Ano"].astype(str),
                          "ordem": b["Ano"].astype(float) * 10 + b["Quadrimestre_Ordem"].astype(float),
                          "valor_avaliacao": b["Percent"], "pct_pagamento": b["% Pagamento"].map(num),
                          "valor_pago_indicador": b["Pagamento"], "valor_max_indicador": b["Máximo Pagamento"],
                          "valor_texto": "quadrante=" + b["Quadrante"].astype(str)}),
            pd.DataFrame({"ibge": mi["IBGE"].astype(str), "indicador": "Mortalidade Infantil",
                          "comp_avaliada": mi["Ano"].astype(str).str.strip(),
                          "ordem": pd.to_numeric(mi["Ano"].astype(str).str[:4], errors="coerce"),
                          "valor_avaliacao": mi["Percent"], "pct_pagamento": mi["% Pagamento"].map(num),
                          "valor_pago_indicador": mi["Pagamento"].map(num),
                          "valor_max_indicador": mi["Máximo Pagamento"].map(num),
                          "valor_texto": "quadrante=" + mi["Quadrante"].astype(str)})], ignore_index=True)
        leg = leg.sort_values(["ibge", "indicador", "ordem"])
        g = leg.groupby(["ibge", "indicador"])
        leg["valor_comparacao"] = g["valor_avaliacao"].shift()
        leg["comp_comparacao"] = g["comp_avaliada"].shift()
        partes.append(leg.drop(columns="ordem").assign(painel="legado", regra="CIB 117/2023 + 150/2025"))
        f = le("legado", "tb_igm_financeiro")
        partes.append(pd.DataFrame({"ibge": f["ibge"].astype(str), "indicador": "REPASSE",
                                    "ciclo": f["competencia"].astype(str) + "." + f["ano"].astype(str),
                                    "mun_valor_fixo": f["fixo"], "mun_valor_variavel": f["variavel"],
                                    "mun_valor_dengue": f["dengue"], "mun_valor_total": f["total"],
                                    "painel": "legado", "regra": "CIB 117/2023 + 150/2025"}))
    tudo = pd.concat(partes, ignore_index=True)
    nomes = le("atual", "TB_ESP")
    if nomes is not None:
        tudo["municipio"] = tudo["municipio"].fillna(tudo["ibge"].map(
            dict(zip(nomes["IBGE_N"].astype(str), nomes["MUNICÍPIO"]))))
    tudo["nivel"] = tudo["ibge"].map(lambda x: "estado" if x == "350000" else "municipio")
    ordem = ["painel", "regra", "nivel", "ibge", "municipio", "ciclo", "indicador", "comp_comparacao", "comp_avaliada",
             "valor_comparacao", "valor_avaliacao", "valor_texto", "pontos", "peso", "pct_pagamento",
             "valor_pago_indicador", "valor_max_indicador", "mun_pontos_total", "mun_valor_fixo", "mun_valor_variavel",
             "mun_valor_dengue", "mun_valor_total", "fonte_arquivo", "fonte_valor"]
    tudo = tudo.reindex(columns=ordem).sort_values(["painel", "ibge", "ciclo", "comp_avaliada", "indicador"])
    SAIDA.mkdir(parents=True, exist_ok=True)
    tudo.to_csv(SAIDA / "igm_sp_longo.csv", index=False, encoding="utf-8")
    print(f"   igm_sp_longo.csv: {len(tudo)} linhas, {tudo['ibge'].nunique()} codigos; "
          f"{tudo.groupby('painel').size().to_dict()}")
    return tudo


def main(quais):
    t0 = time.time()
    meta = []
    for p in quais:
        try:
            meta += painel(p)
        except RuntimeError as e:
            print(f"   painel {p} falhou: {e}")
            meta.append({"painel": p, "tabela": "(painel)", "linhas": -1, "obs": str(e)[:200]})
    compara(meta)
    log = pd.DataFrame(LOG)
    log.to_csv(BRUTO / "_chamadas.csv", index=False)
    log.to_csv(SAIDA / "_chamadas.csv", index=False)
    if {"atual", "legado"} <= set(quais):
        longo(BRUTO)
    print(f"\n   {len(log)} chamadas, {int((~log.ok).sum())} falhas, {time.time() - t0:.0f}s; bruto em {BRUTO}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if args == ["longo"]:
        longo()
    else:
        main([a for a in args if a in PAINEIS] or list(PAINEIS))
