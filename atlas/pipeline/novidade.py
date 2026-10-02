"""Imprime 'sim' se o relatorioaps já tem uma parcela que ainda não está no último tier1 baixado; senão 'nao'.
    python atlas/pipeline/novidade.py
"""
import json, os, urllib.request
from pathlib import Path

import pandas as pd

H = Path(os.environ.get('ATLAS_HOME', Path(__file__).resolve().parent.parent / '_dados'))
API = 'https://relatorioaps-prd.saude.gov.br'
get = lambda p: json.load(urllib.request.urlopen(API + p, timeout=120))
lista = lambda d: d if isinstance(d, list) else next((d[k] for k in ('items', 'itens', 'dados', 'content') if isinstance(d, dict) and isinstance(d.get(k), list)), [d])
ps = sorted({str(p) for a in lista(get('/data/anos')) for p in lista(get(f'/data/parcelas?ano={a}'))})
t1 = sorted(H.glob('data/public/relatorioaps_br/20*/pagamento_completo.parquet'))
tem = set(pd.read_parquet(t1[-1], columns=['nuParcela']).nuParcela.astype(str)) if t1 else set()
print('sim' if ps[-1] not in tem else 'nao')
