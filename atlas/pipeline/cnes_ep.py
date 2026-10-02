"""CNES equipes (DATASUS FTP, arquivos EP<UF><AAMM>.dbc) para o Brasil, nas competencias do relatorioaps.

Cada arquivo EP lista as equipes registradas no CNES na competencia: todos os tipos (70 eSF, 76 eAP,
71 eSB, 72 eMulti, 22/23 atencao domiciliar, 73/74/75 ... ), ativas e desativadas, com CNES, area,
segmento e datas. NAO lista profissionais (isso e o PF) e nao diz se a equipe e financiada (isso e o
relatorioaps). Juntando os dois se separa: existe no CNES / credenciada / homologada / paga.

INE: IDEQUIPE tem 18 digitos = IBGE (6) + area (4) + INE (8); o INE de 10 digitos do Ministerio e
IDEQUIPE[-8:] com zeros a esquerda (confere com 14.705 de 14.732 equipes homologadas em SP, 2026-09-30).
Ativa = DT_DESAT 900001 (sem desativacao) ou desativacao depois da competencia.
CPF_CNPJ sai (em estabelecimento pessoa fisica e o CPF do dono).

Competencias: as nuCompCnes do tier1 do relatorioaps (parcela = competencia + 2 meses) e as mais
novas que ja estiverem no FTP. Cumulativo: pula o mes ja em disco.

Saidas:  data/public/cnes_ep/dbc/EP<UF><AAMM>.dbc        bruto
         data/public/cnes_ep/ep_<AAAAMM>.parquet          uma linha por equipe x competencia (Brasil)
         outputs/aps/tables/relatorioaps_br/_chamadas_cnes_ep.csv

    python atlas/pipeline/cnes_ep.py           (baixa o que falta e refaz os parquet)
"""

import csv
import os
import ftplib
import io
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path

import datasus_dbc
import pandas as pd
from dbfread import DBF

# raiz dos dados do atlas (no zen: /dados dentro do contêiner coorte-atlas)
RAIZ = Path(os.environ.get("ATLAS_HOME", Path(__file__).resolve().parent.parent / "_dados"))
BASE = RAIZ / "data" / "public" / "cnes_ep"
DBC = BASE / "dbc"
LOG = RAIZ / "outputs" / "aps" / "tables" / "relatorioaps_br" / "_chamadas_cnes_ep.csv"
HOST, DIR = "ftp.datasus.gov.br", "/dissemin/publicos/CNES/200508_/Dados/EP"
UFS = ["RO", "AC", "AM", "RR", "PA", "AP", "TO", "MA", "PI", "CE", "RN", "PB", "PE", "AL", "SE", "BA", "MG", "ES",
       "RJ", "SP", "PR", "SC", "RS", "MS", "MT", "GO", "DF"]
COLS = ["COMPETEN", "CODUFMUN", "CNES", "IDEQUIPE", "TIPO_EQP", "NOME_EQP", "ID_AREA", "NOMEAREA", "ID_SEGM",
        "DESCSEGM", "TIPOSEGM", "DT_ATIVA", "DT_DESAT", "MOTDESAT", "TP_DESAT", "VINC_SUS", "TP_UNID", "ESFERA_A",
        "TPGESTAO", "NAT_JUR", "CNPJ_MAN", "QUILOMBO", "ASSENTAD", "POPGERAL", "ESCOLA", "INDIGENA", "PRONASCI"]
PAUSA = 0.3


def registra(linha):
    novo = not LOG.exists()
    LOG.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG, "a", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["quando", "arquivo", "ok", "bytes", "segundos", "erro"])
        if novo:
            w.writeheader()
        w.writerow(linha)


def conecta():
    ftp = ftplib.FTP(HOST, timeout=180)
    ftp.login()
    ftp.cwd(DIR)
    return ftp


def baixa(ftp, nome):
    destino = DBC / nome
    if destino.exists() and destino.stat().st_size > 0:
        return ftp, True
    erro = ""
    for tentativa in range(4):
        t0 = time.time()
        buf = io.BytesIO()
        try:
            ftp.retrbinary(f"RETR {nome}", buf.write)
            DBC.mkdir(parents=True, exist_ok=True)
            destino.write_bytes(buf.getvalue())
            registra({"quando": datetime.now().isoformat(timespec="seconds"), "arquivo": nome, "ok": True,
                      "bytes": len(buf.getvalue()), "segundos": round(time.time() - t0, 2), "erro": ""})
            time.sleep(PAUSA)
            return ftp, True
        except ftplib.error_perm as e:          # 550: arquivo nao existe
            erro = str(e)[:150]
            break
        except (ftplib.Error, OSError, EOFError) as e:
            erro = f"{type(e).__name__}: {str(e)[:150]}"
            time.sleep(5 * 2 ** tentativa)
            try:
                ftp = conecta()
            except (ftplib.Error, OSError):
                pass
    registra({"quando": datetime.now().isoformat(timespec="seconds"), "arquivo": nome, "ok": False, "bytes": 0,
              "segundos": 0, "erro": erro})
    return ftp, False


def le(nome):
    with tempfile.TemporaryDirectory() as tmp:
        dbf = Path(tmp) / "x.dbf"
        datasus_dbc.decompress(str(DBC / nome), str(dbf))
        df = pd.DataFrame(iter(DBF(str(dbf), encoding="latin-1", char_decode_errors="replace")))
    df = df[[c for c in COLS if c in df.columns]].astype(str)
    df["ine"] = df["IDEQUIPE"].str[-8:].str.zfill(10)
    df["ativa"] = (df["DT_DESAT"] == "900001") | (df["DT_DESAT"] > df["COMPETEN"])
    return df


def competencias(ftp):
    tier1 = sorted(RAIZ.glob("data/public/relatorioaps_br/*/pagamento_completo.parquet"))
    comps = set()
    if tier1:
        comps = set(pd.read_parquet(tier1[-1], columns=["nuCompCnes"]).nuCompCnes.astype(str))
    no_ftp = {f[4:8] for f in ftp.nlst() if f.startswith("EPSP")}
    novas = {"20" + a for a in no_ftp if comps and "20" + a > max(comps)}
    return sorted(comps | novas)


def main():
    ftp = conecta()
    comps = competencias(ftp)
    print(f"competencias {comps[0]}..{comps[-1]} ({len(comps)}) x 27 UFs = {len(comps) * 27} arquivos")
    t0 = time.time()
    for comp in comps:
        saida = BASE / f"ep_{comp}.parquet"
        if saida.exists():
            continue
        partes, faltou = [], []
        for uf in UFS:
            nome = f"EP{uf}{comp[2:]}.dbc"
            ftp, ok = baixa(ftp, nome)
            if not ok:
                faltou.append(uf)
                continue
            partes.append(le(nome))
        df = pd.concat(partes, ignore_index=True)
        if not faltou:
            df.to_parquet(saida, index=False)
        print(f"   {comp}: {len(df):>7} equipes ({int(df.ativa.sum())} ativas), {27 - len(faltou)}/27 UFs"
              + (f"  FALTAM {faltou} (parquet nao gravado)" if faltou else "") + f"  {time.time() - t0:.0f}s",
              flush=True)
    ftp.quit()


if __name__ == "__main__":
    sys.exit(main())
