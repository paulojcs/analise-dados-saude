"""Imagens de pré-visualização do Atlas da APS (Open Graph, Google): 1200x630 (png e jpg), 1200x900 e 1200x1200.

Mapa em pixels do Brasil, cada pixel com a cor do município que contém o seu centro: repasse federal da APS
por habitante nos 12 meses até a última parcela (mesma rampa do atlas). Contorno de SP em destaque.
Lê o JSON montado pelo build (ATLAS_HOME/site), monta uma página por formato e fotografa com o Chrome headless.

    ATLAS_HOME=atlas/_dados python atlas/web/og/gerar_og.py
Saída: marca_coorte/site/atlas/og-atlas-*.png|jpg
"""
import gzip, json, os, shutil, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from matplotlib.path import Path as MPath
from PIL import Image

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parents[2]
H = Path(os.environ.get('ATLAS_HOME', RAIZ / 'atlas/_dados')) / 'site'
DEST = RAIZ / 'marca_coorte/site/atlas'
RAMP = ['#CBD6EE', '#A9BBE4', '#8AA2D9', '#5E7FCB', '#2F5BD3', '#0839B5', '#002FA7', '#00207A']
CHROME = os.environ.get('CHROME') or next((p for p in (
    r'C:\Program Files\Google\Chrome\Application\chrome.exe', '/usr/bin/google-chrome', '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome') if Path(p).exists()), 'chrome')


def load(p):
    b = Path(p).read_bytes()
    try: return json.loads(gzip.decompress(b))
    except OSError: return json.loads(b)


def rings_of(g):   # anéis em pares (lon, lat) × 1000; aceita lista de anéis ou lista de polígonos
    if g and isinstance(g[0], (int, float)): return [g]
    return [r for x in g for r in rings_of(x)]


br = load(H / 'br.json'); meta = br['meta']; P = meta['parc']; i = len(P) - 1
pop_i = (meta.get('pop_i') or {}).get('parc')
MUN = []   # (cod, uf, valor, [Path...], bbox)
for uf in sorted(br['ufn']):
    d = load(H / 'uf' / f'{uf}.json')
    for cod, rings in d['geo'].items():
        m = d['mun'].get(cod)
        if not m: continue
        pop = (m.get('pa') or [None])[pop_i[i]] if pop_i and m.get('pa') else m.get('pop')
        tot = m['f']['tot'][i - 11:i + 1]
        v = sum(x or 0 for x in tot) / pop if pop and len(tot) == 12 else None
        paths = [MPath(np.array(r, float).reshape(-1, 2) / 1000) for r in rings_of(rings)]
        xy = np.vstack([p.vertices for p in paths])
        MUN.append((cod, uf, v, paths, (*xy.min(0), *xy.max(0))))
n_mun = len(MUN)


def grade(cols):
    """Rasteriza o Brasil numa grade com `cols` colunas: devolve lista de (col, lin, cor, é_SP) e o nº de linhas."""
    x0, y0 = min(b[4][0] for b in MUN), min(b[4][1] for b in MUN)
    x1, y1 = max(b[4][2] for b in MUN), max(b[4][3] for b in MUN)
    step = (x1 - x0) / cols
    rows = int(np.ceil((y1 - y0) / step))
    cx = x0 + (np.arange(cols) + .5) * step; cy = y1 - (np.arange(rows) + .5) * step
    gx, gy = np.meshgrid(cx, cy); pts = np.c_[gx.ravel(), gy.ravel()]
    dono = np.full(len(pts), -1)
    for k, (_, _, _, paths, (a, b, c, e)) in enumerate(MUN):
        sel = np.where((dono < 0) & (pts[:, 0] >= a) & (pts[:, 0] <= c) & (pts[:, 1] >= b) & (pts[:, 1] <= e))[0]
        if not len(sel): continue
        dentro = np.zeros(len(sel), bool)
        for p in paths: dentro ^= p.contains_points(pts[sel])   # par-ímpar: buracos e ilhas
        dono[sel[dentro]] = k
    vals = np.array([MUN[k][2] if k >= 0 and MUN[k][2] is not None else np.nan for k in dono])
    ok = ~np.isnan(vals)
    cortes = np.quantile(vals[ok], np.linspace(0, 1, len(RAMP) + 1)[1:-1])
    cel = []
    for j, k in enumerate(dono):
        if k < 0: continue
        cor = RAMP[int(np.searchsorted(cortes, vals[j]))] if ok[j] else RAMP[0]
        cel.append((j % cols, j // cols, cor, MUN[k][1] == '35'))
    return cel, rows


def svg_mapa(cols, cell, gap):
    cel, rows = grade(cols)
    w, h = cols * cell, rows * cell
    rect = ''.join(f'<rect x="{c * cell + gap / 2:.1f}" y="{r * cell + gap / 2:.1f}" width="{cell - gap:.1f}" height="{cell - gap:.1f}" fill="{cor}"/>'
                   for c, r, cor, _ in cel)
    sp = {(c, r) for c, r, _, s in cel if s}   # contorno de SP: arestas entre célula de SP e vizinha fora de SP
    seg = []
    for c, r in sp:
        if (c, r - 1) not in sp: seg.append(f'M{c * cell} {r * cell}h{cell}')
        if (c, r + 1) not in sp: seg.append(f'M{c * cell} {(r + 1) * cell}h{cell}')
        if (c - 1, r) not in sp: seg.append(f'M{c * cell} {r * cell}v{cell}')
        if (c + 1, r) not in sp: seg.append(f'M{(c + 1) * cell} {r * cell}v{cell}')
    return (f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">'
            f'<g>{rect}</g>'
            f'<path d="{"".join(seg)}" fill="none" stroke="#101318" stroke-width="3" stroke-linecap="square"/></svg>')


LOGO = '''<svg class="logo" viewBox="108 28 570 104"><g fill="none" stroke-width="16" stroke-linecap="butt" stroke-linejoin="miter">
<path stroke="#101318" d="M 304 38 A 42 42 0 1 1 304 122 A 42 42 0 1 1 304 38"/><path stroke="#002FA7" d="M 252 38 A 42 42 0 1 1 252 122 A 42 42 0 1 1 252 38"/>
<clipPath id="c"><circle cx="278" cy="112.98" r="19"/></clipPath><path stroke="#101318" d="M 304 38 A 42 42 0 1 1 304 122 A 42 42 0 1 1 304 38" clip-path="url(#c)"/>
<path stroke="#002FA7" d="M 185.86 46.9 A 42 42 0 1 0 185.86 113.1"/>
<path stroke="#101318" d="M 376 30 L 376 130 M 376 38 L 439 38 A 21 21 0 0 1 439 80 L 376 80 M 396 80 L 460 130 M 476 38 L 576 38 M 526 30 L 526 130 M 592 30 L 592 130 M 592 38 L 676 38 M 592 80 L 664 80 M 592 122 L 676 122"/></g></svg>'''

CSS = '''@import url("https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@700&family=IBM+Plex+Mono:wght@400;500&display=block");
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:WPX;height:HPX;overflow:hidden}
body{background:#EDF1F5;background-image:radial-gradient(rgba(16,19,24,.10) 1px,transparent 1.2px);background-size:16px 16px;position:relative;color:#101318}
.k{font:500 21px/1 "IBM Plex Mono",monospace;letter-spacing:.16em;text-transform:uppercase;position:absolute}
h1{font:700 FSpx/.98 "Archivo Narrow",sans-serif;text-transform:uppercase;letter-spacing:-.01em;position:absolute}
h1 em{font-style:normal;color:#002FA7}
.rule{position:absolute;height:1px;background:#101318}
.s{font:400 20px/1.6 "IBM Plex Mono",monospace;letter-spacing:.14em;text-transform:uppercase;position:absolute}
.u{font:400 21px/1 "IBM Plex Mono",monospace;letter-spacing:.04em;position:absolute}
.logo{position:absolute;height:22px;width:auto}
.map{position:absolute}'''

NUM = f'{n_mun:,}'.replace(',', '.')
FORMATOS = {
    '1200x630': dict(w=1200, h=630, fs=62, cols=44, cell=13, gap=1.4, html=f'''
<div class="map" style="right:-8px;top:12px">MAPA</div>
<div class="k" style="left:64px;top:68px">Coorte · Atlas da APS</div>
<div class="rule" style="left:296px;top:272px;width:470px"></div>
<h1 style="left:296px;top:294px">O financiamento<br>federal da<br><em>atenção primária</em></h1>
<div class="s" style="left:296px;top:500px">{NUM} municípios · mês a mês desde 2024</div>
<div class="u" style="left:296px;top:545px">coorte.io/atlas</div>
{LOGO.replace('class="logo"', 'class="logo" style="left:72px;top:541px"')}'''),
    '1200x900': dict(w=1200, h=900, fs=80, cols=40, cell=14.5, gap=1.5, html=f'''
<div class="map" style="right:20px;bottom:24px">MAPA</div>
<div class="k" style="left:64px;top:68px">Coorte · Atlas da APS</div>
<h1 style="left:64px;top:112px">O financiamento federal<br>da <em>atenção primária</em></h1>
<div class="rule" style="left:64px;top:690px;width:360px"></div>
<div class="s" style="left:64px;top:710px">{NUM} municípios<br>mês a mês desde 2024</div>
{LOGO.replace('class="logo"', 'class="logo" style="left:72px;top:826px"')}
<div class="u" style="right:64px;top:826px">coorte.io/atlas</div>'''),
    '1200x1200': dict(w=1200, h=1200, fs=80, cols=56, cell=16.5, gap=1.6, html=f'''
<div class="map" style="left:50%;transform:translateX(-50%);top:270px">MAPA</div>
<div class="k" style="left:64px;top:68px">Coorte · Atlas da APS</div>
<h1 style="left:64px;top:112px">O financiamento federal<br>da <em>atenção primária</em></h1>
<div class="rule" style="left:64px;top:930px;width:400px"></div>
<div class="s" style="left:64px;top:950px">{NUM} municípios<br>mês a mês desde 2024</div>
{LOGO.replace('class="logo"', 'class="logo" style="left:72px;top:1108px"')}
<div class="u" style="right:64px;top:1110px">coorte.io/atlas</div>'''),
}

tmp = Path(tempfile.mkdtemp(prefix='og_atlas_'))
for nome, f in FORMATOS.items():
    css = CSS.replace('WPX', f"{f['w']}px").replace('HPX', f"{f['h']}px").replace('FS', str(f['fs']))
    html = f'<!doctype html><meta charset="utf-8"><style>{css}</style><body>{f["html"].replace("MAPA", svg_mapa(f["cols"], f["cell"], f["gap"]))}</body>'
    src = tmp / f'{nome}.html'; src.write_text(html, encoding='utf-8')
    png = DEST / f'og-atlas-{nome}.png'
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
                    f'--window-size={f["w"]},{f["h"]}', '--virtual-time-budget=8000', f'--screenshot={png}', src.as_uri()],
                   check=True, capture_output=True)
    Image.open(png).convert('RGB').save(png, optimize=True)
    print(png.name, Image.open(png).size)
Image.open(DEST / 'og-atlas-1200x630.png').convert('RGB').save(DEST / 'og-atlas-1200x630.jpg', quality=88, optimize=True)
print('og-atlas-1200x630.jpg;', n_mun, 'municípios; parcela', P[i])
shutil.rmtree(tmp, ignore_errors=True)
