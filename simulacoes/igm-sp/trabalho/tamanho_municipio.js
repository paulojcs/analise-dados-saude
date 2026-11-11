/* Dinheiro por porte de município: regra atual × Regra A × Regra B × Regra A + margem para pequenos.
   Números do parágrafo e da tabela do artigo (paper_tamanho_municipio.md, 09/11/2026).
   Arquivo de trabalho (fora de marca_coorte/site, não publicado).
   Rodar:  node tamanho_municipio.js            (período do artigo: as 8 parcelas de set/2024 a dez/2026,
                                                  orçamento R$ 32,0 mi por parcela, mesmo dinheiro nas três regras)
           node tamanho_municipio.js todas      (as 11 parcelas, set/2024 a dez/2027, como a maquete)
   Portes: pequeno < 20 mil hab., médio 20–100 mil, grande > 100 mil (faixas de porte de municipios.csv).
   Ganha/perde/praticamente igual: diferença de mais de 5% do que o município recebe na regra atual (comparar.js). */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const SITE = path.join(__dirname, '..', '..', '..', 'marca_coorte', 'site', 'simulacoes', 'igm-sp');   // a página publicada
const IGM = require(path.join(SITE, 'motor_v2.js')), CMP = require(path.join(SITE, 'comparar.js'));
const D = path.join(__dirname, 'dados_completos');
const ler = f => { const b = fs.readFileSync(path.join(D, f)); return (b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString('utf8'); };
const B = IGM.montar({municipios: ler('municipios.csv'), pagamentos: ler('pagamentos.csv'), medianas: ler('medianas.csv'),
  cobertura: ler('cobertura.csv.gz'), municipio_pagamento: ler('municipio_pagamento.csv.gz')});
const ctx = IGM.contexto(B);
const todas = process.argv[2] === 'todas';
const P = B.pags.map((p, i) => i).filter(i => todas || B.pags[i].sv === 0.5);
const anos = P.length / 3;                       // três parcelas por ano (jun, set, dez)
const G = m => CMP.PORTE3[B.muns[m].porte], NOME = ['pequenos (<20 mil)', 'médios (20–100 mil)', 'grandes (>100 mil)'];
const mi = x => (x / 1e6).toFixed(1);
const regras = {atual: 'R0', A: 'R3b', B: 'R4v', 'A+margem': 'R3m'};
const res = {}; for (const [k, p] of Object.entries(regras)) res[k] = IGM.calcular(B, IGM.PRESETS[p], ctx);

const pop = [0, 0, 0], nasc = [0, 0, 0], n = [0, 0, 0];
for (let m = 0; m < B.N; m++) { const g = G(m); n[g]++; pop[g] += B.muns[m].pop; nasc[g] += P.reduce((a, p) => a + B.peso[p][m], 0) / P.length; }
console.log(`Período: ${B.pags[P[0]].id} a ${B.pags[P[P.length - 1]].id}, ${P.length} parcelas (${anos.toFixed(2)} anos)`);
console.log('municípios', n.join(' / '), '· população', pop.join(' / '), '· nascidos por 1.000 hab.', pop.map((x, g) => (1000 * nasc[g] / x).toFixed(1)).join(' / '));
const tot = r => { const t = [0, 0, 0]; for (let m = 0; m < B.N; m++) for (const p of P) t[G(m)] += r[p].rs[m]; return t; };
const T = {}; for (const k of Object.keys(regras)) T[k] = tot(res[k]);
for (const k of Object.keys(regras)) {
  const t = T[k], ph = t.map((x, g) => x / pop[g] / anos);
  console.log(`\n${k}: total R$ ${mi(t[0] + t[1] + t[2])} mi`);
  t.forEach((x, g) => console.log(`  ${NOME[g].padEnd(20)} R$ ${mi(x).padStart(6)} mi  (${k === 'atual' ? '' : ((x / T.atual[g] - 1) * 100).toFixed(1) + '%, ' + (x - T.atual[g] >= 0 ? '+' : '') + mi(x - T.atual[g]) + ' mi; '}R$ ${ph[g].toFixed(2)}/hab./ano; R$ ${(x / nasc[g] / anos).toFixed(0)}/nascido)`));
  console.log(`  razão pequenos ÷ grandes por habitante: ${(ph[0] / ph[2]).toFixed(2)}×`);
  if (k !== 'atual') {
    const C = CMP.comparar(B, res[k], res.atual, P);
    console.log(`  ganham/perdem/iguais (±5%): ${C.n.ganham}/${C.n.perdem}/${C.n.iguais} · por porte ${C.porte.map(g => `${g.ganham}/${g.perdem}/${g.iguais}`).join(' ; ')}`);
    console.log(`  zerados em pelo menos uma parcela: atual ${C.zeradosAtual}, ${k} ${C.zeradosMinha} · mediana da perda de quem perde ${(100 * C.medPerda).toFixed(0)}%`);
  }
}
// Teto do per capita: o máximo possível (as 4 vacinas cheias) por habitante e por ano, por porte.
{ const t = [0, 0, 0]; for (let m = 0; m < B.N; m++) for (const p of P) t[G(m)] += IGM.MAX_PONTOS * ctx.vp[p][m];
  const ph = t.map((x, g) => x / pop[g] / anos); console.log(`\nmáximo possível R$/hab./ano ${ph.map(x => x.toFixed(2)).join(' / ')} · razão ${(ph[0] / ph[2]).toFixed(2)}×`); }

// Por que os pequenos perdem: a pontuação. Parte média do máximo por porte (média de município × parcela).
const parte = r => { const s = [0, 0, 0], c = [0, 0, 0]; for (let m = 0; m < B.N; m++) for (const p of P) { s[G(m)] += r[p].fracao[m]; c[G(m)]++; } return s.map((x, g) => (100 * x / c[g]).toFixed(1)); };
console.log('\nparte média do próprio máximo: atual', parte(res.atual).join(' / '), '· Regras A/B', parte(res.A).join(' / '));
{ const k = [0, 1, 2].map(() => ({n: 0, cheio: 0, c1: 0, c12: 0, dif: 0}));
  for (const p of P) for (let v = 0; v < 4; v++) for (let m = 0; m < B.N; m++) {
    const o = B.cob[p], c1 = o.c1[v][m], c12 = o.c12[v][m]; if (Number.isNaN(c1) || Number.isNaN(c12)) continue;
    const g = k[G(m)]; g.n++; if (res.atual[p].partes[v][m] === 1) g.cheio++; if (c1 >= 95) g.c1++; if (c12 >= 95) g.c12++; g.dif += Math.abs(c1 - c12);
  }
  console.log('pares município × vacina × parcela com a vacina cheia na regra atual (%)', k.map(g => (100 * g.cheio / g.n).toFixed(0)).join(' / '));
  console.log('valor acumulado do ano >= 95% (%)', k.map(g => (100 * g.c1 / g.n).toFixed(0)).join(' / '), '· cobertura de 12 meses >= 95% (%)', k.map(g => (100 * g.c12 / g.n).toFixed(0)).join(' / '));
  console.log('diferença média |acumulado do ano − 12 meses| (pontos)', k.map(g => (g.dif / g.n).toFixed(1)).join(' / ')); }

// Decomposição da perda dos pequenos, um passo de cada vez (R$ mi no período).
const passos = [
  ['regra atual', IGM.PRESETS.R0],
  ['+ orçamento fixo por parcela', {medida: 'acum', pont: 'faixas', corte: 'mediana', aloc: 'hab', fixo: 0, orc: 'atual'}],
  ['+ rampa no lugar das faixas (ainda acumulado)', {medida: 'acum', pont: 'rampa', piso: 80, alvo: 95, aloc: 'hab', fixo: 0, orc: 'atual'}],
  ['+ cobertura de 12 meses (= Regra A)', IGM.PRESETS.R3b],
  ['+ por criança (= Regra B)', IGM.PRESETS.R4v],
];
console.log('\ndecomposição (pequenos / médios / grandes, R$ mi):');
let ant = null;
for (const [nome, s] of passos) { const t = tot(IGM.calcular(B, s, ctx)); console.log(`  ${nome.padEnd(46)} ${t.map(mi).join(' / ')}${ant ? '   Δ pequenos ' + mi(t[0] - ant[0]) : ''}`); ant = t; }
