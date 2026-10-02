"""Gera a página do atlas (marca_coorte/site/atlas/index.html) a partir de index.src.html + atlas.js.
A página vai no git e sai no deploy do site; os dados vêm do R2 (/atlas/data/), publicados pelo pipeline.
    python atlas/web/build_page.py
"""
from pathlib import Path

AQUI = Path(__file__).resolve().parent
dest = AQUI.parent.parent / 'marca_coorte' / 'site' / 'atlas' / 'index.html'
dest.parent.mkdir(parents=True, exist_ok=True)
src = (AQUI / 'index.src.html').read_text(encoding='utf8').replace('/*JS*/', (AQUI / 'atlas.js').read_text(encoding='utf8'))
dest.write_text(src, encoding='utf8')
print(dest, len(src))
