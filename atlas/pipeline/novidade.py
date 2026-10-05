"""Imprime 'sim' se o relatorioaps já tem uma parcela que ainda não está no último tier1 baixado; senão 'nao'.
Tenta de novo com backoff (~8 min no total); se a API seguir fora do ar ou responder fora do formato, sai com código 1.
    python atlas/pipeline/novidade.py
"""
import json, os, sys, time, urllib.request
from pathlib import Path

import pandas as pd

H = Path(os.environ.get('ATLAS_HOME', Path(__file__).resolve().parent.parent / '_dados'))
API = 'https://relatorioaps-prd.saude.gov.br'
ESPERAS = [15, 30, 60, 120, 240]


def get(p):
    for espera in ESPERAS + [None]:
        try:
            with urllib.request.urlopen(API + p, timeout=120) as r:
                return json.load(r)
        except Exception as e:  # 503 do balanceador, timeout, HTML no lugar de JSON
            if espera is None:
                raise
            print(f'{p}: {e}; nova tentativa em {espera}s', file=sys.stderr)
            time.sleep(espera)


lista = lambda d: d if isinstance(d, list) else next((d[k] for k in ('items', 'itens', 'dados', 'content') if isinstance(d, dict) and isinstance(d.get(k), list)), [d])
ps = sorted({str(p) for a in lista(get('/data/anos')) for p in lista(get(f'/data/parcelas?ano={a}'))})
if not ps or not all(p.isdigit() and len(p) == 6 for p in ps):
    sys.exit(f'formato inesperado das parcelas: {ps[-5:]}')
t1 = sorted(H.glob('data/public/relatorioaps_br/20*/pagamento_completo.parquet'))
tem = set(pd.read_parquet(t1[-1], columns=['nuParcela']).nuParcela.astype(str)) if t1 else set()
print('sim' if ps[-1] not in tem else 'nao')
