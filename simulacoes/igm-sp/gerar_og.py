"""Gera a imagem de compartilhamento (1200x630) da página coorte.io/simulacoes/igm-sp/.
Mapa dos municípios pela mudança nos pontos de vacina publicados pela SES (jun -> set/2026).
    python simulacoes/igm-sp/gerar_og.py      (precisa do Chrome instalado)
"""
import csv, json, subprocess, tempfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
PAG = RAIZ / 'marca_coorte' / 'site' / 'simulacoes' / 'igm-sp'
D = json.loads((PAG / 'dados' / 'dados_simulacao_igm.json').read_text(encoding='utf8'))
pub = {int(r['mun']): (float(r['pts_jun']), float(r['pts_set'])) for r in csv.DictReader(open(PAG / 'dados' / 'pontos_publicados_2026.csv', encoding='utf8'))}
dif = [round(pub[m[0]][1] - pub[m[0]][0], 4) for m in D['mun']]
caiu = sum(d < 0 for d in dif)

def cor(d):
    if d == 0: return '#D6DBE2'
    t = min(1, abs(d) / 3.25); base = (229, 98, 46) if d < 0 else (42, 120, 214); claro = (232, 236, 241)
    return 'rgb(%d,%d,%d)' % tuple(round(c + (b - c) * (0.35 + 0.65 * t)) for b, c in zip(base, claro))

M = D['mapa']
svg = f'<svg viewBox="0 0 {M["w"]} {M["h"]}" width="700">' + ''.join(f'<path d="{d}" fill="{cor(dif[i])}" stroke="#EDF1F5" stroke-width=".6"/>' for i, d in enumerate(M['d'])) + '</svg>'
html = f'''<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
<body style="margin:0;width:1200px;height:630px;background:#EDF1F5;display:grid;grid-template-columns:470px 1fr;align-items:center;font-family:'Archivo Narrow',sans-serif;overflow:hidden">
<div style="padding:0 0 0 64px">
 <div style="font:500 17px/1.3 'IBM Plex Mono',monospace;letter-spacing:.12em;color:#002FA7">COORTE · IGM SUS PAULISTA</div>
 <div style="font-weight:700;font-size:64px;line-height:.98;margin-top:22px;color:#101318;text-transform:uppercase"><span style="color:#E5622E">{caiu}</span> de 645 municípios perderam pontos de vacina</div>
 <div style="font:500 18px/1.5 'IBM Plex Mono',monospace;color:rgba(16,19,24,.6);margin-top:22px">jun → set/2026, pontos publicados pela SES.<br>Mude a regra e veja o dinheiro mexer.</div>
</div>
<div style="padding-right:30px">{svg}</div></body>'''
with tempfile.TemporaryDirectory() as tmp:
    f = Path(tmp) / 'og.html'; f.write_text(html, encoding='utf8')
    chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
    out = PAG / 'og-igm-sp-1200x630.png'
    subprocess.run([chrome, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1200,630',
                    '--virtual-time-budget=8000', f'--screenshot={out}', f.as_uri()], check=True, capture_output=True)
print(out, caiu)
