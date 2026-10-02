"""Repasses do IGM SUS Paulista por municipio (2024-2026) lidos dos Anexos das Resolucoes SS.

Fonte: PDFs das Resolucoes SS publicados na BVS SES-SP, na pasta IGM_NORMAS. As tabelas sao lidas
do PDF com pdfplumber (o .txt do pdftotext embaralha colunas). Linhas validas: codigo IBGE de 6
digitos na coluna 0; numeros no formato brasileiro.

Saidas (nesta pasta):
  igm_resolucoes_longo.csv  municipio x resolucao x parcela x componente
  igm_resolucoes_ciclo.csv  municipio x ciclo (Q1.2024 ... Q2.2026), regras de mapeamento em `nota`
  _validacao.txt            contagens, somas x totais impressos, checagem SCS, comparacao com o painel legado

    python parse_resolucoes.py
"""

import os
import re
from pathlib import Path

import pandas as pd
import pdfplumber

AQUI = Path(__file__).resolve().parent
NORMAS = Path(os.environ.get("IGM_NORMAS", "normas_igm"))       # PDFs das Resolucoes SS (BVS SES-SP)
PAINEL = Path(os.environ.get("IGM_PAINEL", "igm_sp_longo.csv"))  # saida do igm_powerbi.py (comparacao com o legado)

# arquivo -> (resolucao, ano, colunas: [(indice da coluna, parcela, componente)], total impresso no ato)
RESOLUCOES = {
    "E_R-SS-18_080224": ("Res SS 18/2024", 2024, [(3, "1", "fixo")], 137_218_476.60),
    "E_R-SS-140_200624": ("Res SS 140/2024", 2024, [(3, "2", "fixo"), (4, "3", "fixo"),
                                                    (5, "2", "variavel"), (6, "3", "variavel")], 412_890_761.78),
    "E_R-SS-13_240125": ("Res SS 13/2025", 2025, [(3, "1", "fixo")], 114_348_730.50),
    "E_R-SS-97_300525": ("Res SS 97/2025", 2025, [(3, "2", "fixo")], 114_348_730.50),
    "E_RS-SS-180_081025": ("Res SS 180/2025", 2025, [(5, "1+2", "variavel")], 109_242_501.33),
    "E_RS-SS-230_091225": ("Res SS 230/2025", 2025, [(2, "3", "variavel"), (3, "3", "fixo"),
                                                     (5, "2", "ajuste"), (6, "2025", "bonus")], 230_835_172.56),
    "E_RS-SS-111_090626": ("Res SS 111/2026", 2026, [(3, "1", "fixo"), (4, "1", "variavel")], 201_769_088.13),
    "E_RS-SS-185_080926": ("Res SS 185/2026", 2026, [(3, "2", "fixo"), (4, "2", "variavel")], 185_814_716.99),
}
# Colunas de total dentro do Anexo, usadas so para conferir a soma linha a linha.
TOTAL_LINHA = {"E_R-SS-140_200624": 7, "E_RS-SS-230_091225": 7, "E_RS-SS-111_090626": 5, "E_RS-SS-185_080926": 5}

SCS = "354880"
SCS_ESPERADO = {
    ("Res SS 18/2024", "1", "fixo"): 488_289.00,
    ("Res SS 140/2024", "2", "fixo"): 488_289.00, ("Res SS 140/2024", "3", "fixo"): 488_289.00,
    ("Res SS 140/2024", "2", "variavel"): 222_008.73, ("Res SS 140/2024", "3", "variavel"): 222_008.73,
    ("Res SS 13/2025", "1", "fixo"): 406_907.50, ("Res SS 97/2025", "2", "fixo"): 406_907.50,
    ("Res SS 180/2025", "1+2", "variavel"): 325_526.00,
    ("Res SS 230/2025", "3", "variavel"): 380_458.51, ("Res SS 230/2025", "3", "fixo"): 406_907.50,
    ("Res SS 230/2025", "2", "ajuste"): 105_795.95, ("Res SS 230/2025", "2025", "bonus"): 0.0,
    ("Res SS 111/2026", "1", "fixo"): 406_907.50, ("Res SS 111/2026", "1", "variavel"): 292_973.40,
    ("Res SS 185/2026", "2", "fixo"): 406_907.50, ("Res SS 185/2026", "2", "variavel"): 187_177.45,
}

# Ciclo (quadrimestre de pagamento) -> lista de (resolucao, parcela, componente). Regras explicadas em NOTAS.
CICLOS = {
    "Q1.2024": [("Res SS 18/2024", "1", "fixo")],
    "Q2.2024": [("Res SS 140/2024", "2", "fixo"), ("Res SS 140/2024", "2", "variavel")],
    "Q3.2024": [("Res SS 140/2024", "3", "fixo"), ("Res SS 140/2024", "3", "variavel")],
    "Q1.2025": [("Res SS 13/2025", "1", "fixo"), ("Res SS 97/2025", "2", "fixo")],
    "Q2.2025": [("Res SS 180/2025", "1+2", "variavel"), ("Res SS 230/2025", "2", "ajuste")],
    "Q3.2025": [("Res SS 230/2025", "3", "fixo"), ("Res SS 230/2025", "3", "variavel"),
                ("Res SS 230/2025", "2025", "bonus")],
    "Q1.2026": [("Res SS 111/2026", "1", "fixo"), ("Res SS 111/2026", "1", "variavel")],
    "Q2.2026": [("Res SS 185/2026", "2", "fixo"), ("Res SS 185/2026", "2", "variavel")],
}
NOTAS = {
    "Q1.2024": "Res 18/2024 (1a parcela fixa, antecipada de maio). Sem variavel: Res 11/2024 art. 4o, 1 (1o quad. 2024 so fixo).",
    "Q2.2024": "Res 140/2024: fixo 2o quad. (ref. set/2024) + variavel (ref. set/2024, base 3o quad./2023), pagos juntos em jun/2024.",
    "Q3.2024": "Res 140/2024: fixo 3o quad. (ref. dez/2024) + variavel (ref. dez/2024, base 3o quad./2023), pagos juntos em jun/2024.",
    "Q1.2025": "Res 13/2025 (parcela 1 fixa) + Res 97/2025 (parcela 2 fixa). Res 230/2025 art. 2o par. 1o: o 1o quad. 2025 foi pago com duas parcelas fixas.",
    "Q2.2025": "Res 180/2025 (+RET): as duas parcelas variaveis de 2025 (1o quad. 2025 vs 3o quad. 2024) + ajuste da Res 230/2025 col. B (correcao do 2o quad., pago em dez/2025). Nao ha divisao oficial entre 1o e 2o quad.",
    "Q3.2025": "Res 230/2025 col. A (variavel base 2o quad. 2025 + fixo 3o quad.) + bonus col. C (bonificacao excepcional 2025, anual).",
    "Q1.2026": "Res 111/2026 (1a parcela 2026: fixo + variavel).",
    "Q2.2026": "Res 185/2026 (2a parcela 2026: fixo + variavel).",
}


def reais(s):
    s = (s or "").replace("R$", "").replace("\n", "").replace(" ", "").strip()
    if not s or s in {"-", "R$-"}:
        return 0.0 if s else None
    return float(s.replace(".", "").replace(",", "."))


def data_pub(arq):
    d = re.search(r"_(\d{6})", arq).group(1)
    return f"20{d[4:6]}-{d[2:4]}-{d[0:2]}"


def le_anexo(arq):
    """Linhas com IBGE de 6 digitos (deduplicadas) e eventual linha de total do Anexo."""
    linhas, totais = {}, []
    with pdfplumber.open(NORMAS / f"{arq}.pdf") as doc:
        for pag in doc.pages:
            for tab in pag.extract_tables():
                for r in tab:
                    c0 = (r[0] or "").strip() if r else ""
                    if re.fullmatch(r"\d{6}", c0):
                        if arq == "E_R-SS-140_200624":  # ultima pagina tem celulas vazias extras
                            r = r[:3] + [c for c in r[3:] if c is not None]
                        linhas.setdefault(c0, r)
                    elif r and any(c and c.strip().lower() == "total" for c in r[:2] if c):
                        totais.append(r)
    return linhas, totais


def nome_mun(r, arq):
    # Res 180 tem RRAS/DRS/CIR antes do nome
    i = 4 if arq == "E_RS-SS-180_081025" else 1
    return " ".join((r[i] or "").split())


def main():
    reg, val = [], []
    nomes = {}
    for arq, (res, ano, cols, total_ato) in RESOLUCOES.items():
        linhas, totais = le_anexo(arq)
        problemas = 0
        for ibge, r in linhas.items():
            nm = nome_mun(r, arq)
            if arq == "E_R-SS-13_240125" or ibge not in nomes:
                nomes[ibge] = nm  # Res 13/2025 tem o nome com acentos e caixa mista
            soma = 0.0
            for i, parc, comp in cols:
                v = reais(r[i]) if i < len(r) else None
                if v is None:
                    problemas += 1
                    continue
                soma += v
                reg.append(dict(ibge=ibge, municipio_res=nm, ano=ano, resolucao=res, data_publicacao=data_pub(arq),
                                parcela=parc, componente=comp, valor=v, arquivo=f"{arq}.pdf"))
            if arq in TOTAL_LINHA:
                t = reais(r[TOTAL_LINHA[arq]])
                if t is None or abs(t - soma) > 0.015:
                    problemas += 1
        s = sum(x["valor"] for x in reg if x["resolucao"] == res)
        val.append(dict(resolucao=res, arquivo=arq, municipios=len(linhas), valores_ausentes_ou_linha_incoerente=problemas,
                        soma_anexo=round(s, 2), total_impresso=total_ato, dif=round(s - total_ato, 2),
                        linhas_total_no_pdf=" | ".join(str([c for c in t if c]) for t in totais)))
    longo = pd.DataFrame(reg)
    longo["municipio"] = longo.ibge.map(nomes)
    longo = longo[["ibge", "municipio", "ano", "resolucao", "data_publicacao", "parcela", "componente", "valor",
                   "arquivo"]].sort_values(["ibge", "data_publicacao", "parcela", "componente"])
    longo.to_csv(AQUI / "igm_resolucoes_longo.csv", index=False, encoding="utf-8")

    # ---- ciclo
    mapa = {(r, p, c): ciclo for ciclo, itens in CICLOS.items() for (r, p, c) in itens}
    lc = longo.assign(ciclo=[mapa.get((r, p, c)) for r, p, c in zip(longo.resolucao, longo.parcela, longo.componente)])
    assert lc.ciclo.notna().all(), lc[lc.ciclo.isna()]
    ciclo = (lc.pivot_table(index=["ibge", "municipio", "ciclo"], columns="componente", values="valor", aggfunc="sum")
             .reindex(columns=["fixo", "variavel", "ajuste", "bonus"]).reset_index())
    ciclo.columns.name = None
    # ausente onde o componente nao existe naquele ciclo; zero em Q1.2024 variavel (regra transitoria)
    ciclo.loc[ciclo.ciclo == "Q1.2024", "variavel"] = 0.0
    ciclo["total"] = ciclo[["fixo", "variavel", "ajuste", "bonus"]].sum(axis=1, min_count=1).round(2)
    ciclo["ano"] = ciclo.ciclo.str[-4:].astype(int)
    ciclo["resolucoes"] = ciclo.ciclo.map(lambda c: " + ".join(dict.fromkeys(r for r, _, _ in CICLOS[c])))
    ciclo["nota"] = ciclo.ciclo.map(NOTAS)
    ordem = {c: i for i, c in enumerate(CICLOS)}
    ciclo = ciclo.sort_values(["ibge", "ciclo"], key=lambda s: s.map(ordem) if s.name == "ciclo" else s)
    ciclo = ciclo[["ibge", "municipio", "ano", "ciclo", "fixo", "variavel", "ajuste", "bonus", "total", "resolucoes", "nota"]]
    ciclo.to_csv(AQUI / "igm_resolucoes_ciclo.csv", index=False, encoding="utf-8")

    # ---- validacao
    out = ["# Validacao", "", "## Por resolucao", pd.DataFrame(val).to_string(index=False), ""]
    scs = longo[longo.ibge == SCS].set_index(["resolucao", "parcela", "componente"]).valor
    out.append("## Sao Caetano do Sul (354880)")
    for k, esp in SCS_ESPERADO.items():
        v = scs.get(k)
        out.append(f"{k}: resolucao={v} esperado={esp} {'OK' if v is not None and abs(v - esp) < 0.006 else 'DIVERGE'}")
    out.append("")
    out.append("## Por ciclo: resolucoes x painel legado (fixo+variavel+dengue)")
    tc = ciclo.groupby("ciclo")[["fixo", "variavel", "ajuste", "bonus", "total"]].sum().reindex(list(CICLOS))
    tc["n_mun"] = ciclo.groupby("ciclo").size()
    if PAINEL.exists():
        p = pd.read_csv(PAINEL, dtype={"ibge": str}, low_memory=False)
        lg = p[(p.painel == "legado") & (p.nivel == "municipio") & (p.indicador == "REPASSE")]
        lg = lg.assign(ibge=lg.ibge.str[:6])
        g = lg.groupby("ciclo")[["mun_valor_fixo", "mun_valor_variavel", "mun_valor_dengue", "mun_valor_total"]].sum()
        g.columns = ["leg_fixo", "leg_variavel", "leg_dengue", "leg_total"]
        tc = tc.join(g)
        tc["dif_total_res_menos_legado"] = tc.total - tc.leg_total
        # casamento municipio a municipio do total (res) com total legado
        m = ciclo.merge(lg[["ibge", "ciclo", "mun_valor_fixo", "mun_valor_variavel", "mun_valor_dengue",
                            "mun_valor_total"]], on=["ibge", "ciclo"], how="left")
        m["ok_total"] = (m.total - m.mun_valor_total.fillna(0)).abs() <= 0.011
        m["ok_sem_dengue"] = (m.total - (m.mun_valor_total.fillna(0) - m.mun_valor_dengue.fillna(0))).abs() <= 0.011
        tc["mun_total_igual_legado"] = m.groupby("ciclo").ok_total.sum()
        tc["mun_igual_legado_sem_dengue"] = m.groupby("ciclo").ok_sem_dengue.sum()
        m.to_csv(AQUI / "_comparacao_legado.csv", index=False, encoding="utf-8")
    pd.set_option("display.width", 250)
    pd.set_option("display.float_format", lambda x: f"{x:,.2f}")
    out.append(tc.to_string())
    out.append("")
    out.append("## Por ano (resolucoes)")
    out.append(ciclo.groupby("ano")[["fixo", "variavel", "ajuste", "bonus", "total"]].sum().to_string())
    txt = "\n".join(out)
    (AQUI / "_validacao.txt").write_text(txt, encoding="utf-8")
    print(txt)


if __name__ == "__main__":
    main()
