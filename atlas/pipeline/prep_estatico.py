"""Gera atlas/estatico/ (muda raramente; versionado no git): malhas simplificadas das UFs e dos municípios,
nomes dos municípios e os valores do IGM pelas Resoluções SS.
Baixa do IBGE (API de malhas v3, qualidade intermediária). Rodar quando o IBGE mudar a malha (município novo).
A API v3 só serve a malha de 2022; UF com município mais novo (Boa Esperança do Norte-MT, instalado em 2025) usa,
inteira, a Malha Municipal anual do IBGE (geoftp, ano MALHA), simplificada com as mesmas tolerâncias.
    python atlas/pipeline/prep_estatico.py
"""
import gzip, json, urllib.request
from pathlib import Path
import geopandas as gpd

OUT = Path(__file__).resolve().parent.parent / 'estatico'
(OUT / 'geo').mkdir(parents=True, exist_ok=True)
IBGE = 'https://servicodados.ibge.gov.br/api'
MALHA = 2025
GEOFTP = 'https://geoftp.ibge.gov.br/organizacao_do_territorio/malhas_territoriais/malhas_municipais'
def get(u):
    b = urllib.request.urlopen(u, timeout=300).read()
    return gzip.decompress(b) if b[:2] == bytes([0x1F, 0x8B]) else b   # o IBGE às vezes responde em gzip sem avisar

def enc(geom, tol):
    g = geom.simplify(tol, preserve_topology=True)
    rings = []
    for p in ([g] if g.geom_type == 'Polygon' else list(g.geoms)):
        for ring in [p.exterior] + list(p.interiors):
            cs = [v for x, y in ring.coords for v in (round(x * 1000), round(y * 1000))]
            if len(cs) >= 8: rings.append(cs)
    return rings

dump = lambda o, p: json.dump(o, open(p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
ufs = json.loads(get(f'{IBGE}/v1/localidades/estados'))
dump({str(u['id']): [u['sigla'], u['nome'], u['regiao']['nome']] for u in ufs}, OUT / 'ufs.json')
NOMES = {str(m['id'])[:6]: m['nome'] for m in json.loads(get(f'{IBGE}/v1/localidades/municipios'))}
dump(NOMES, OUT / 'municipios.json')
uf = gpd.read_file(get(f'{IBGE}/v3/malhas/paises/BR?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=UF'))
dump({r.codarea: enc(r.geometry, 0.01) for r in uf.itertuples()}, OUT / 'geo' / 'uf.json')
for u in ufs:
    c = str(u['id'])
    g = gpd.read_file(get(f'{IBGE}/v3/malhas/estados/{c}?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=municipio'))
    falta = {k for k in NOMES if k[:2] == c} - {x[:6] for x in g.codarea}
    if falta:   # API sem município novo: a UF toda vem da malha anual, para as divisas ficarem coerentes
        s = u['sigla']
        g = gpd.read_file(get(f'{GEOFTP}/municipio_{MALHA}/UFs/{s}/{s}_Municipios_{MALHA}.zip')).rename(columns={'CD_MUN': 'codarea'})
        print(s, 'malha', MALHA, 'por falta de', sorted(falta))
    area = g.to_crs(5880).area.mean() / 1e6                          # km² médio do município
    tol = 0.0015 if area < 1500 else 0.003 if area < 6000 else 0.006  # municípios grandes aguentam mais simplificação
    dump({r.codarea[:6]: enc(r.geometry, tol) for r in g.itertuples()}, OUT / 'geo' / f'{c}.json')
    print(u['sigla'], len(g))
