"""Monta os dados do Atlas da APS (br.json + uf/<cod>.json) a partir do que os coletores deixaram em ATLAS_HOME.

Entradas (ATLAS_HOME, mesmo layout dos coletores):
  data/public/relatorioaps_br/<data>/pagamento_municipio_parcela.parquet   total e planos por município x parcela
  data/public/relatorioaps_br/<data>/pagamento_completo.parquet            componentes e equipes (180 colunas)
  data/public/relatorioaps_br/detalhe_validacoesEquipes.parquet            situação de cada eSF/eAP de SP por parcela
  outputs/aps/tables/relatorioaps_br/uf_parcela.csv
  outputs/aps/tables/igm_sp/igm_sp_longo.csv, atual__tbFinanceira.csv     IGM (painel atual da SES-SP)
  data/public/cnes_ep/ep_<AAAAMM>.parquet                                  equipes no CNES (Brasil)
Estáticos (git, atlas/estatico/): malhas, nomes, IGM 2024-25 pelas Resoluções SS.
População: IBGE SIDRA 6579 (última estimativa), com cópia local se a API falhar.

Saída: ATLAS_HOME/site/  (br.json, uf/<cod>.json, manifest.json com o hash do conteúdo)
    python atlas/pipeline/build.py
"""
import hashlib, json, os, sys, unicodedata, urllib.request
from pathlib import Path
import numpy as np, pandas as pd

AQUI = Path(__file__).resolve().parent
EST = AQUI.parent / 'estatico'
H = Path(os.environ.get('ATLAS_HOME', AQUI.parent / '_dados'))
OUT = H / 'site'
TB = H / 'outputs/aps/tables'
(OUT / 'uf').mkdir(parents=True, exist_ok=True)
dump = lambda o, p: json.dump(o, open(p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'),
                              default=lambda v: int(v) if isinstance(v, np.integer) else float(v))
load = lambda p: json.load(open(p, encoding='utf8'))

UFN = load(EST / 'ufs.json'); SG = {v[0]: k for k, v in UFN.items()}
NOMES = load(EST / 'municipios.json')
GEO_UF = load(EST / 'geo/uf.json')

# ---------- população (IBGE) ----------
def sidra(nivel):
    cache = H / 'cache' / f'pop_{nivel}.json'
    try:
        raw = urllib.request.urlopen(f'https://apisidra.ibge.gov.br/values/t/6579/{nivel}/all/v/9324/p/last', timeout=120).read()
        rows = json.loads(raw)[1:]
        cache.parent.mkdir(parents=True, exist_ok=True); cache.write_bytes(raw)
    except Exception as e:
        print(f'   SIDRA {nivel} falhou ({e}); usando cópia local', file=sys.stderr)
        rows = load(cache)[1:]
    return {r['D1C'][:6]: int(r['V']) for r in rows}, rows[0]['D3N']
POP, POP_ANO = sidra('n6')
POP_UF, _ = sidra('n3')

# ---------- federal ----------
tier1 = sorted((H / 'data/public/relatorioaps_br').glob('*/pagamento_completo.parquet'))[-1].parent
u = pd.read_csv(TB / 'relatorioaps_br/uf_parcela.csv')
PARC = sorted(int(p) for p in u.nuParcela.unique()); NP = len(PARC); pi = {p: i for i, p in enumerate(PARC)}
# planos por município (AGRUPADO): somam o total de cada município; o resumo por UF da API inclui pagamentos a estados
# (esfera ESTADUAL: CEO/LRPD, prisional) e desloca ajustes entre parcelas, então não fecha com tot
mpp = pd.read_parquet(tier1 / 'pagamento_municipio_parcela.parquet', columns=['sgUf', 'coMunicipioIbge', 'nuParcela', 'total', 'coSeqPlanoOrcamentario', 'dsPlanoOrcamentario', 'vlTotalCusteio', 'vlTotalImplantacao'])
for col in ('total', 'vlTotalCusteio', 'vlTotalImplantacao'): mpp[col] = pd.to_numeric(mpp[col], errors='coerce')
mpp['v'] = mpp.vlTotalCusteio.fillna(0) + mpp.vlTotalImplantacao.fillna(0)
CAT = {'Equipes de Saúde da Família - eSF e equipes de Atenção Primária - eAP': 'esf', 'Agentes Comunitários de Saúde': 'acs',
       'Atenção à Saúde Bucal': 'sb', 'Equipes Multiprofissionais - eMulti': 'emulti', 'Componente per capita de base populacional': 'percapita',
       'Incentivo Compensatório de Transição': 'transicao', 'Demais programas, serviços e equipes da Atenção Primária à Saúde': 'demais',
       'Manutenção de pagamento de valor nominal com base em exercício anterior': 'manut', 'Incentivo financeiro da APS - Promoção à saúde': 'promo'}
mpp['cat'] = mpp.dsPlanoOrcamentario.map(CAT).fillna('outros')
UF = {}
for sg, g in u.groupby('sgUf'):
    cod = SG[sg]; tot = [0] * NP; n = 0
    for x in g.itertuples():
        tot[pi[int(x.nuParcela)]] = round(x.total_repasse); n = int(x.municipios)
    plan = {}
    for cat, h in mpp[mpp.sgUf == sg].groupby('cat'):
        a = [0] * NP
        for p, v in h.groupby('nuParcela').v.sum().items(): a[pi[int(p)]] = round(v)
        plan[cat] = a
    UF[cod] = {'n': n, 'pop': POP_UF[cod], 'tot': tot, 'plan': plan}

mpp['coSeqPlanoOrcamentario'] = pd.to_numeric(mpp.coSeqPlanoOrcamentario, errors='coerce')
# componentes por plano orçamentário (os mesmos do "Para onde vai" das UFs): 10 saúde bucal, 9 eMulti, 2 ACS, 8 eSF+eAP (líquido)
pl = mpp.pivot_table(index=['coMunicipioIbge', 'nuParcela'], columns='coSeqPlanoOrcamentario', values='v', aggfunc='sum', fill_value=0)
for k in (10, 9, 2, 8):
    if k not in pl.columns: pl[k] = 0
pl = pl.rename(columns={10: 'pl_sb', 9: 'pl_emulti', 2: 'pl_acs', 8: 'pl_esfeap'})[['pl_sb', 'pl_emulti', 'pl_acs', 'pl_esfeap']].reset_index()
tot = mpp.drop_duplicates(['coMunicipioIbge', 'nuParcela'])[['coMunicipioIbge', 'nuParcela', 'total']].merge(pl, on=['coMunicipioIbge', 'nuParcela'])
tot['p'] = tot.nuParcela.astype(int)
c = pd.read_parquet(tier1 / 'pagamento_completo.parquet')
c['p'] = c.nuParcela.astype(int)
c = c.merge(tot[['coMunicipioIbge', 'p', 'total', 'pl_sb', 'pl_emulti', 'pl_acs', 'pl_esfeap']], on=['coMunicipioIbge', 'p'], how='left')
# vlTotalEsf/Eap são brutos (antes dos descontos); o repasse real é o plano 8. Líquido repartido pela proporção do bruto (+ implantação)
num = lambda k: pd.to_numeric(c[k], errors='coerce').fillna(0)
gE, gA = num('vlTotalEsf') + num('vlPagamentoImplantacaoEsf'), num('vlTotalEap') + num('vlPagamentoImplantacaoEap')
sh = (gE / (gE + gA)).where(gE + gA > 0, 1.0)
c['esf_l'] = c.pl_esfeap.fillna(0) * sh; c['eap_l'] = c.pl_esfeap.fillna(0) - c.esf_l
COLS = {'tot': 'total', 'esf': 'vlTotalEsf', 'eap': 'vlTotalEap', 'esf_l': 'esf_l', 'eap_l': 'eap_l', 'emulti': 'pl_emulti', 'sb': 'pl_sb', 'acs': 'pl_acs',
        'esf_pg': 'qtEsfTotalPgto', 'esf_cred': 'qtEsfCredenciado', 'esf_teto': 'qtTetoEsf', 'eap_pg': 'qtEapTotalPgto',
        'esf_fixo': 'vlFixoEsf', 'eap_fixo': 'vlFixoEap'}
for col in COLS.values(): c[col] = pd.to_numeric(c[col], errors='coerce')
c['i'] = c.p.map(pi)
MU = {}
for cod, g in c.groupby('coMunicipioIbge'):
    d = {k: [0] * NP for k in COLS}
    for k, col in COLS.items():
        arr = d[k]
        for i, v in zip(g.i, g[col]): arr[i] = 0 if pd.isna(v) else round(float(v))
    last = g.loc[g.p.idxmax()]
    MU[cod] = {'f': d, 'vin': last.dsClassificacaoVinculoEsfEap, 'qual': last.dsClassificacaoQualidadeEsfEap,
               'eq': last.dsFaixaIndiceEquidadeEsfEap}

# ---------- IGM (SP): Resoluções SS (estático, 2024 em diante) + painel atual para ciclos ainda sem resolução ----------
longo = pd.read_csv(TB / 'igm_sp/igm_sp_longo.csv', low_memory=False)
atual = longo[(longo.painel == 'atual') & (longo.nivel == 'municipio') & longo.ciclo.notna()].copy()
atual['ibge'] = atual.ibge.astype(int).astype(str)
res = pd.read_csv(EST / 'igm/igm_resolucoes_ciclo.csv', dtype={'ibge': str})
ordem = lambda q: (int(q[3:]), int(q[1]))
CIC = sorted(set(res.ciclo) | set(atual.ciclo), key=ordem); ci = {x: i for i, x in enumerate(CIC)}; NC = len(CIC)
novo = lambda: {k: [None] * NC for k in ('tot', 'fixo', 'var', 'aj', 'pts')}
val = lambda v: float(v) if pd.notna(v) else 0.0
for x in res.itertuples():
    m = MU.get(x.ibge[:6])
    if m is None: continue
    ig = m.setdefault('igm', novo()); i = ci[x.ciclo]
    ig['tot'][i] = round(val(x.total), 2); ig['fixo'][i] = round(val(x.fixo), 2); ig['var'][i] = round(val(x.variavel), 2)
    ig['aj'][i] = round(val(x.ajuste) + val(x.bonus), 2)            # ajuste (Res 230/2025 col. B) + bônus (col. C)
    ig.setdefault('res', {})[x.ciclo] = x.resolucoes
    if pd.notna(x.nota): ig.setdefault('nota', {})[x.ciclo] = x.nota
VAC = ['Polio', 'Penta', 'Pneumo', 'Triplice', 'HPV_F', 'HPV_M']
for (ibge, ciclo), g in atual.groupby(['ibge', 'ciclo']):
    m = MU.get(ibge)
    if m is None: continue
    ig = m.setdefault('igm', novo()); i = ci[ciclo]
    f = g.iloc[0]
    if ig['tot'][i] is None and pd.notna(f.mun_valor_total):         # ciclo ainda sem resolução: valores do painel
        ig['tot'][i] = round(float(f.mun_valor_total), 2); ig['fixo'][i] = round(val(f.mun_valor_fixo), 2); ig['var'][i] = round(val(f.mun_valor_variavel), 2)
        ig.setdefault('res', {})[ciclo] = 'painel IGM SUS Paulista (SES-SP), sem resolução publicada ainda'
    ig['pts'][i] = None if pd.isna(f.mun_pontos_total) else float(f.mun_pontos_total)
    pv = g.set_index('indicador').pontos
    ig.setdefault('vac', [None] * NC)[i] = [None if pd.isna(pv.get(v)) else float(pv.get(v)) for v in VAC]
fin = pd.read_csv(TB / 'igm_sp/atual__tbFinanceira.csv')
for ibge, faixa in fin.drop_duplicates('IBGE_N')[['IBGE_N', 'PER CAPITA']].itertuples(index=False):
    m = MU.get(str(ibge))
    if m and pd.notna(faixa): m['faixa'] = int(faixa)                  # faixa per capita do IGM (R$/hab)

# ---------- CNES (Brasil): equipes ativas por tipo e competência; nomes públicos das equipes ----------
TIPOS = {'70': 'esf', '71': 'esb', '72': 'emulti', '76': 'eap'}
eps = sorted((H / 'data/public/cnes_ep').glob('ep_*.parquet'))
COMP = [int(p.stem[3:]) for p in eps]
cnt, NOME = {}, {}
for j, p in enumerate(eps):
    e = pd.read_parquet(p, columns=['CODUFMUN', 'TIPO_EQP', 'ativa', 'ine', 'NOME_EQP'])
    e = e[e.ativa & e.TIPO_EQP.isin(TIPOS)]
    for (mun, tp), n in e.groupby(['CODUFMUN', 'TIPO_EQP']).size().items():
        cnt.setdefault(mun, {k: [0] * len(COMP) for k in TIPOS.values()})[TIPOS[tp]][j] = int(n)
    if j == len(COMP) - 1:
        NOME = {str(int(i)): n.strip() for i, n in zip(e.ine, e.NOME_EQP) if str(i).isdigit()}
for mun, a in cnt.items():
    if mun in MU: MU[mun]['cnes'] = a

# ---------- equipes eSF/eAP de SP por parcela (relatorio-detalhado) ----------
det = H / 'data/public/relatorioaps_br/detalhe_validacoesEquipes.parquet'
if det.exists():
    d = pd.read_parquet(det, columns=['nuParcela', 'coComponente', 'coMunicipioIbge', 'coEquipe', 'codigoEstabelecimento', 'stPagamento', 'composicao'])
    def code(st, comp):   # '.' sem registro, 'x' inválida, '4'/'3'/'2'/'1' paga a 100/75/50/25%, '0' proporcional c/ composição inválida
        # 'VÁLIDO' é pago a 100% qualquer que seja a composição; só 'VÁLIDO (PROPORCIONAL)' segue a composição
        # (confere 100% com qtEsf100/75/50/25pcPgto e qtEap*Completas/Incompletas do pagamento, SP 202405-202609)
        st = unicodedata.normalize('NFKD', str(st or '')).encode('ascii', 'ignore').decode().upper()
        if st.startswith('INV'): return 'x'
        if 'PROPORC' not in st: return '4'
        return {'100%': '4', '75%': '3', '50%': '2', '25%': '1'}.get(str(comp or ''), '0')
    d['h'] = [code(a, b) for a, b in zip(d.stPagamento, d.composicao)]
    d['ine'] = d.coEquipe.astype(str).str.lstrip('0'); d['p'] = d.nuParcela.astype(int)
    d = d[d.p.isin(pi)]
    for (cod, ine), h in d.groupby(['coMunicipioIbge', 'ine']):
        m = MU.get(cod)
        if not m: continue
        hist = ['.'] * NP
        for p, x in zip(h.p, h.h): hist[pi[p]] = x
        last = h.loc[h.p.idxmax()]
        m.setdefault('teams', []).append({'i': ine, 'c': 'eSF' if int(last.coComponente) == 48 else 'eAP', 'n': NOME.get(ine) or ('INE ' + ine),
                                          'e': str(last.codigoEstabelecimento or ''), 'h': ''.join(hist)})
    for m in MU.values():
        if 'teams' in m: m['teams'].sort(key=lambda t: (t['c'] != 'eSF', t['e'], t['n']))

# ---------- arquivos ----------
IDX = []
for cod_uf in sorted(UFN):
    geo_all = load(EST / 'geo' / f'{cod_uf}.json'); geo, mun = {}, {}
    for cod6 in list(geo_all) + sorted(c for c in MU if c[:2] == cod_uf and c not in geo_all):
        if cod6 not in MU: continue
        if cod6 in geo_all: geo[cod6] = geo_all[cod6]
        else: print(f'   AVISO: {cod6} {NOMES.get(cod6, "?")} sem malha em estatico/geo/{cod_uf}.json (fora do mapa; rodar prep_estatico.py)', file=sys.stderr)
        m = MU[cod6]; m['nome'] = NOMES.get(cod6, cod6); m['pop'] = POP.get(cod6)
        mun[cod6] = m
        IDX.append([cod6, m['nome'], cod_uf, m['pop'] or 0])
    dump({'geo': geo, 'mun': mun}, OUT / 'uf' / f'{cod_uf}.json')
meta = {'parc': PARC, 'cic': CIC, 'comp': COMP, 'pop_ano': POP_ANO, 'igm_fonte': 'resolucoes',
        'gerado': pd.Timestamp.now(tz='America/Sao_Paulo').isoformat(timespec='minutes')}
dump({'meta': meta, 'geo': GEO_UF, 'ufn': UFN, 'uf': UF, 'idx': IDX}, OUT / 'br.json')

# hash só do conteúdo (sem a data de geração), para o publicador saber se mudou algo
h = hashlib.sha256()
for p in sorted(OUT.rglob('*.json')):
    if p.name == 'manifest.json': continue
    b = p.read_bytes()
    if p.name == 'br.json': b = b.replace(meta['gerado'].encode(), b'')
    h.update(p.relative_to(OUT).as_posix().encode()); h.update(b)
dump({'hash': h.hexdigest()[:16], 'gerado': meta['gerado'], 'parcela': PARC[-1], 'ciclo_igm': CIC[-1], 'cnes': COMP[-1],
      'arquivos': sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob('*.json') if p.name != 'manifest.json')}, OUT / 'manifest.json')
print(f'atlas: {len(IDX)} municípios, parcelas {PARC[0]}..{PARC[-1]}, IGM {CIC[0]}..{CIC[-1]}, CNES {COMP[0]}..{COMP[-1]}, hash {h.hexdigest()[:16]}')
