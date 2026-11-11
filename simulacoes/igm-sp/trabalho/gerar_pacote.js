/* Gera o único arquivo de dados que a página publicada busca: marca_coorte/site/simulacoes/igm-sp/dados/sim.json.gz.
   Fonte: dados_completos/ (a exportação do PrefSaoCaetano, s06_painel.py --publico --json; NÃO publicada: os dados
   ficam disponíveis mediante solicitação, contato@coorte.io). Só entra o que a página usa:
     D (objeto do painel, dados_simulacao_igm.json) e o texto de municipios.csv (sem rras), pagamentos.csv,
     cobertura.csv.gz, municipio_pagamento.csv.gz e pontos_publicados_2026.csv, como CSV (o motor lê CSV, então os
     números saem idênticos aos da exportação). Saem: medianas.csv (o motor recalcula; só o teste usa), nascidos.csv.gz
     (só o total por ano entra, a página usa o ano), cobertura_alternativas_2026.csv.gz, municipios.geojson, referencia.json e README.md.
   Rodar:  node simulacoes/igm-sp/trabalho/gerar_pacote.js        (depois: node .../teste_referencia_v2.js) */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const SRC = path.join(__dirname, 'dados_completos');
const OUT = path.join(__dirname, '..', '..', '..', 'marca_coorte', 'site', 'simulacoes', 'igm-sp', 'dados', 'sim.json.gz');
const ler = f => { const b = fs.readFileSync(path.join(SRC, f)); return (b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString('utf8').replace(/\r/g, ''); };
/* tira colunas de um CSV simples (sem aspas) */
function colunas(txt, manter) {
  const L = txt.split('\n').filter(l => l.length), cab = L[0].split(','), ix = manter.map(c => { const i = cab.indexOf(c); if (i < 0) throw new Error(c); return i; });
  return L.map(l => { const c = l.split(','); return ix.map(i => c[i]).join(','); }).join('\n') + '\n';
}
/* nascidos por município e ano (soma dos meses): mun,ano,nv */
function nascidosAno(txt) {
  const L = txt.split('\n').filter(l => l.length), cab = L[0].split(','), [im, ia, iv] = ['mun', 'ano', 'nv'].map(c => cab.indexOf(c)), t = new Map();
  for (const l of L.slice(1)) { const c = l.split(','), k = c[im] + ',' + c[ia]; t.set(k, (t.get(k) || 0) + +c[iv]); }
  return 'mun,ano,nv\n' + [...t].map(([k, v]) => k + ',' + v).join('\n') + '\n';
}
const D = JSON.parse(ler('dados_simulacao_igm.json'));
const pacote = {
  versao: '1.3',
  D,
  municipios: colunas(ler('municipios.csv'), ['mun', 'ibge7', 'municipio', 'drs', 'regiao_saude', 'porte', 'pop', 'percapita', 'ordem_painel']),
  pagamentos: ler('pagamentos.csv'),
  cobertura: ler('cobertura.csv.gz'),
  municipio_pagamento: ler('municipio_pagamento.csv.gz'),
  pontos: ler('pontos_publicados_2026.csv'),
  nascidos: nascidosAno(ler('nascidos.csv.gz')),   // só o total do ano por município (a página usa o ano)
};
const json = JSON.stringify(pacote);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, zlib.gzipSync(Buffer.from(json, 'utf8'), { level: 9 }));
console.log(`${path.relative(process.cwd(), OUT)}: ${(fs.statSync(OUT).size / 1024).toFixed(0)} kB (JSON ${(json.length / 1024).toFixed(0)} kB)`);
