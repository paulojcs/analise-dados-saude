/* Teste da v2: recalcula as regras do artigo pela regra parametrizada (motor_v2.js) a partir de dados/ e compara com
   dados/referencia.json e com os resumos do objeto de dados; confere a regra atual com 12 meses (R0s, PROVISÓRIA),
   a consistência interna da regra parametrizada e os números da história.   Rodar:  node teste_referencia_v2.js
   Sai com código 1 se qualquer número divergir além das tolerâncias. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const IGM = require('./motor_v2.js');

const D = path.join(__dirname, 'dados');
const ler = f => {
  const b = fs.readFileSync(path.join(D, f));
  return (b[0] === 0x1f && b[1] === 0x8b ? zlib.gunzipSync(b) : b).toString('utf8');
};
const B = IGM.montar({
  municipios: ler('municipios.csv'), pagamentos: ler('pagamentos.csv'), medianas: ler('medianas.csv'),
  cobertura: ler('cobertura.csv.gz'), municipio_pagamento: ler('municipio_pagamento.csv.gz'),
});
const ref = JSON.parse(ler('referencia.json'));
const J = JSON.parse(ler('dados_simulacao_igm.json'));
const tol = ref.tolerancias;

let falhas = 0, ok = 0;
function confere(rotulo, obtido, esperado, t) {
  const bate = esperado === null ? obtido === null
    : (t === 0 ? obtido === esperado : Math.abs(obtido - esperado) <= t + 1e-9);
  if (bate) ok++; else { falhas++; console.log(`FALHA ${rotulo}: obtido ${obtido}, esperado ${esperado}`); }
}
const r4 = x => Math.round(x * 1e4) / 1e4, r1 = x => Math.round(x * 10) / 10, r2 = x => Math.round(x * 100) / 100;
const ip = id => B.pags.findIndex(p => p.id === id);
const iSet = ip('2026-09');

confere('pagamentos', JSON.stringify(B.pags.map(p => p.id)), JSON.stringify(ref.pagamentos), 0);
confere('status', JSON.stringify(B.pags.map(p => p.status)), JSON.stringify(ref.status), 0);
for (const r of B.medCsv) {
  const p = ip(r.pagamento), v = IGM.VAC.indexOf(r.vacina), m = B.med[p][v];
  confere(`mediana c0 ${r.pagamento} ${r.vacina}`, m.m0, +r.mediana_c0, 1e-4);
  confere(`mediana c1 ${r.pagamento} ${r.vacina}`, m.m1, +r.mediana_c1, 1e-4);
  confere(`n ${r.pagamento} ${r.vacina}`, m.n, +r.n_ambos, 0);
}

/* 1. As sete regras do artigo pela regra parametrizada. */
const ctx = IGM.contexto(B);
B.pags.forEach((p, i) => confere(`B_rs ${p.id}`, ctx.orc[i], ref.B_rs[String(p.sv)], tol.B_rs));
const res = {};
for (const nome of ['R0', 'R1', 'R2', 'R3', 'R3b', 'R4', 'R4v']) {
  const r = IGM.calcular(B, IGM.PRESETS[nome], ctx);
  res[nome] = r;
  const e = ref.regras[nome];
  r.forEach((o, i) => {
    const pg = B.pags[i].id;
    confere(`${nome} disponível ${pg}`, o.nd, false, 0);
    confere(`${nome} total ${pg}`, r4(o.total / 1e6), e.total_mi[i], tol.total_mi);
    confere(`${nome} máximo ${pg}`, r4(o.maximo / 1e6), e.maximo_mi[i], tol.total_mi);
    confere(`${nome} zerados ${pg}`, o.zero, e.mun_zero[i], 0);
    confere(`${nome} mudança ${pg}`, o.mudanca === null ? null : r4(o.mudanca), e.mediana_mudanca_fracao_max_pp[i], tol.mediana_mudanca_fracao_max_pp);
    if (nome === 'R3b') confere(`k_R3b ${pg}`, r4(o.k), ref.k_R3b[i], tol.k_R3b);
  });
}
for (const [cod, e] of Object.entries(ref.municipios)) {
  const m = B.idx.get(+cod);
  confere(`${e.municipio} pop`, B.muns[m].pop, e.pop, 0);
  confere(`${e.municipio} per capita`, B.muns[m].pc, e.percapita, 0);
  res.R0.forEach((o, i) => confere(`${e.municipio} pontos R0 ${B.pags[i].id}`, r4(o.fracao[m] * IGM.MAX_PONTOS), e.pontos_R0[i], 1e-9));
  for (const [nome, serie] of Object.entries(e.rs)) res[nome].forEach((o, i) => confere(`${e.municipio} ${nome} ${B.pags[i].id}`, o.rs[m], serie[i], tol.rs_municipio));
}
// A compatibilidade com o motor v1 (seções copiadas da v1) dá os mesmos números.
for (const [nome, sp] of Object.entries(IGM.PRESETS_V1)) {
  const a = IGM.regra(B, sp, ctx), b = res[nome];
  confere(`v1→v2 ${nome} totais iguais`, a.every((o, i) => o.total === b[i].total && o.zero === b[i].zero), true, 0);
}

/* 2. Uma criança a mais: os resumos do objeto de dados (artigo, Tabela 2 / Figura H). */
const TERC = J.cr.terc;
for (const nome of ['R0', 'R1', 'R2']) res[nome].forEach((_, i) => {
  const mg = IGM.margem(B, IGM.PRESETS[nome], res[nome], i);
  confere(`${nome} perto ${B.pags[i].id}`, mg.pctMun, J.reg[nome].perto[i], 0.0051);
  confere(`${nome} salto ${B.pags[i].id}`, mg.mediana, J.reg[nome].salto[i], 0.0051);  // o objeto tem 2 casas
});
for (const nome of ['R3', 'R3b', 'R4', 'R4v']) res[nome].forEach((_, i) => {
  const mg = IGM.margem(B, IGM.PRESETS[nome], res[nome], i);
  confere(`${nome} na faixa ${B.pags[i].id}`, mg.pctPares, J.reg[nome].faixa[i], 0.0051);
  confere(`${nome} valor de uma criança ${B.pags[i].id}`, mg.mediana, J.reg[nome].marg[i], 0.0051);
});
const terR3b = IGM.margem(B, IGM.PRESETS.R3b, res.R3b, iSet, TERC).porTerco, terR4v = IGM.margem(B, IGM.PRESETS.R4v, res.R4v, iSet, TERC).porTerco;
[0, 1, 2].forEach(t => {
  confere(`Figura H terço ${t} proporcional`, Math.floor(terR3b[t].mediana + 0.5), J.cr.med[t][0], 0);
  confere(`Figura H terço ${t} por criança`, Math.floor(terR4v[t].mediana + 0.5), J.cr.med[t][1], 0);
});
// A curva por município da v1 (criancaAMais) continua batendo com a regra, sem criança a mais.
for (const cod of Object.keys(ref.municipios)) {
  const m = B.idx.get(+cod);
  for (const nome of ['R0', 'R1', 'R2', 'R3', 'R3b', 'R4v']) {
    let s = 0, igual = true;
    IGM.VAC.forEach((_, v) => { const z = IGM.criancaAMais(B, iSet, m, v, 0, IGM.PRESETS_V1[nome], ctx); s += z.antes; if (z.antes !== z.depois) igual = false; });
    confere(`criança a mais ${nome} ${cod} n=0`, igual, true, 0);
    confere(`criança a mais ${nome} ${cod} soma = regra`, s, res[nome][iSet].rs[m], 0.01);
  }
}

/* 3. Regra atual com 12 meses (R0s). PROVISÓRIO: os valores abaixo vieram da sessão de análise do PrefSaoCaetano
   (periodos_cobertura.csv.gz), ainda não fazem parte da exportação nem do referencia.json. Quando o
   s10_regras_periodos.py exportar R0s, ler daqui do referencia.json e apagar este bloco.
   [pagamento, % do máximo (antes do teto, base 2026), municípios sem dinheiro de vacina]. */
const R0S_PROVISORIO = [
  ['2024-12', 73.7, 28], ['2025-06', 65.0, 48], ['2025-09', 52.6, 22], ['2025-12', 38.9, 46], ['2026-06', 57.0, 20],
  ['2026-09', 56.1, 37], ['2026-12', 59.0, 28], ['2027-09', 65.1, 58], ['2027-12', 42.4, 107],
];
/* Achado (07/11/2026): com a mediana POR VACINA (como a regra atual, a definição pedida), 6 dos 9 batem e três não:
   dez/2025 41,4% e 45, jun/2026 58,9% e 19, dez/2027 42,7% e 107. São justamente as parcelas em que a mediana de
   12 meses de alguma vacina fica abaixo de 95 (nas outras o corte é sempre 95, pelo limite). Os 9 valores
   provisórios saem exatos com UM corte só para as quatro vacinas (mediana conjunta, sempre >= 95, logo corte 95) ou
   com corte fixo de 95. A página usa a mediana por vacina, que reproduz o jun/2026 = 19 da rodada antiga (s08). */
const R0S_POR_VACINA = { '2025-12': [41.4, 45], '2026-06': [58.9, 19], '2027-12': [42.7, 107] };
const r0s = IGM.calcular(B, IGM.PRESETS.R0s, ctx);
confere('R0s set/2024 indisponível', r0s[ip('2024-09')].nd, true, 0);
confere('R0s jun/2027 indisponível', r0s[ip('2027-06')].nd, true, 0);
for (const [pg, pct, z] of R0S_PROVISORIO) {
  const o = r0s[ip(pg)], [pctV, zV] = R0S_POR_VACINA[pg] || [pct, z];
  confere(`R0s % do máximo ${pg}`, r1(100 * o.total / o.maximo), pctV, 0.1);
  confere(`R0s zerados ${pg}`, o.zero, zV, 0);
}
r0s.forEach((o, i) => { if (!o.nd && o.mudanca !== null) confere(`R0s mudança ${B.pags[i].id} é 12,5 ou 25`, o.mudanca === 12.5 || o.mudanca === 25, true, 0); });
// A rodada provisória reproduzida exatamente com um corte único (mediana das quatro vacinas juntas, limitada a 95).
(function () {
  for (const [pg, pct, z] of R0S_PROVISORIO) {
    const p = ip(pg), q = B.comp12[p], S = new Float64Array(B.N), a = [], c = [];
    for (let v = 0; v < 4; v++) for (let m = 0; m < B.N; m++) { const x = B.cob[q].c12[v][m], y = B.cob[p].c12[v][m]; if (!Number.isNaN(x) && !Number.isNaN(y)) { a.push(x); c.push(y); } }
    const m0 = Math.min(IGM.mediana(a), 95), m1 = Math.min(IGM.mediana(c), 95);
    for (let v = 0; v < 4; v++) for (let m = 0; m < B.N; m++) S[m] += IGM.faixa(B.cob[q].c12[v][m], B.cob[p].c12[v][m], m0, m1);
    let tot = 0, max = 0, zz = 0;
    for (let m = 0; m < B.N; m++) { const x = B.vp[p][m] * IGM.PONTO_VAC * S[m]; tot += x; max += IGM.MAX_PONTOS * B.vp[p][m]; if (x < IGM.ZERO) zz++; }
    confere(`R0s provisório (corte único) ${pg}`, r1(100 * tot / max), pct, 0.1);
    confere(`R0s provisório (corte único) zerados ${pg}`, zz, z, 0);
  }
})();

/* 4. Consistência interna da regra parametrizada. */
const igualSerie = (a, b) => a.every((o, i) => o.nd === b[i].nd && (o.nd || o.rs.every((x, m) => x === b[i].rs[m])));
confere('rampa 80/95, por habitante, sem orçamento == R3 (exato)',
  igualSerie(IGM.calcular(B, { medida: 'c12', pont: 'rampa', piso: 80, alvo: 95, aloc: 'hab', fixo: 0, orc: 'sem' }, ctx), res.R3), true, 0);
confere('faixas, mediana, acumulado, por habitante, sem orçamento == R0 (exato)', igualSerie(IGM.calcular(B, IGM.PRESETS.R0, ctx), ctx.r0), true, 0);
const custom = [
  { medida: 'c12', pont: 'faixas', corte: 90, aloc: 'crianca', fixo: 0.3, orc: 'atual' },
  { medida: 'acum', pont: 'rampa', piso: 70, alvo: 100, aloc: 'hab', fixo: 0.2, orc: 'atual' },
  { medida: 'c12', pont: 'rampa', piso: 85, alvo: 98, aloc: 'crianca', fixo: 0, orc: 25e6 },
  { medida: 'acum', pont: 'faixas', corte: 'mediana', aloc: 'hab', fixo: 0, orc: 'atual' },
];
custom.forEach((sp, j) => IGM.calcular(B, sp, ctx).forEach((o, i) => {
  if (o.nd) return;
  const Bp = sp.orc === 'atual' ? ctx.orc[i] : sp.orc * B.pags[i].sv / 0.5;
  confere(`personalizada ${j} soma = orçamento ${B.pags[i].id}`, Math.abs(o.total - Bp) < 0.01, true, 0);
}));
// Regra atual com o mesmo orçamento = a regra atual multiplicada por um fator por parcela (os zerados não mudam).
IGM.calcular(B, custom[3], ctx).forEach((o, i) => confere(`R0 com orçamento: zerados ${B.pags[i].id}`, o.zero, res.R0[i].zero, 0));
// Parte fixa 100%: ninguém zera a parte variável conta como zero (sem parte variável), e o total ainda é o orçamento.
IGM.calcular(B, { medida: 'c12', pont: 'rampa', aloc: 'crianca', fixo: 1, orc: 'atual' }, ctx).forEach((o, i) => confere(`fixo 100% total ${B.pags[i].id}`, Math.abs(o.total - ctx.orc[i]) < 0.01, true, 0));
// Sem orçamento e por habitante: % do máximo = total ÷ máximo.
res.R0.forEach((o, i) => confere(`R0 parte do máximo ${B.pags[i].id}`, Math.abs(o.partMax - o.total / o.maximo) < 1e-12, true, 0));
// Parte variável de 2027 em 60% (padrão) não mexe em nada; em 50% o máximo de 2027 vira o de 2026.
const c50 = IGM.contexto(B, 0.5);
confere('2027 a 50%: máximo = o de 2026', r4(IGM.calcular(B, IGM.PRESETS.R0, c50)[ip('2027-09')].maximo / 1e6), ref.regras.R0.maximo_mi[ip('2026-09')], 1e-4);
confere('2027 a 50%: B60 cai na mesma proporção (× 50/60)', Math.abs(c50.orc[ip('2027-09')] - ref.B_rs['0.6'] * 0.5 / 0.6) < 0.05, true, 0);

/* 5. Números de set/2026 que a seção "Monte sua regra" mostra (artigo / sessão de análise). */
const zeradosSet = [];
for (let m = 0; m < B.N; m++) if (res.R0[iSet].rs[m] < IGM.ZERO) zeradosSet.push(m);
confere('set/2026: sem dinheiro de vacina na regra atual', zeradosSet.length, 163, 0);
const bons = zeradosSet.filter(m => IGM.VAC.every((_, v) => B.cob[iSet].c12[v][m] >= 80));
confere('set/2026: desses, com 12 meses >= 80% nas quatro', bons.length, 128, 0);
// 90,5 é a mediana dos 12 meses de TODOS os pares vacina dos 163 (dos 128 seria 92,4).
confere('set/2026: mediana dos 12 meses das vacinas dos 163', r1(IGM.mediana(zeradosSet.flatMap(m => IGM.VAC.map((_, v) => B.cob[iSet].c12[v][m])))), 90.5, 1e-9);
confere('set/2026: (a mesma mediana só nos 128)', r1(IGM.mediana(bons.flatMap(m => IGM.VAC.map((_, v) => B.cob[iSet].c12[v][m])))), 92.4, 1e-9);
const pagosR3 = zeradosSet.filter(m => res.R3[iSet].rs[m] >= IGM.ZERO);
confere('set/2026: dos 163, recebem na proporcional (R3)', pagosR3.length, 155, 0);
// 70% é a mediana da parte do máximo na R3 sobre os 163 (sobre os 155 que recebem seria 72%).
confere('set/2026: mediana da parte do máximo dos 163 na R3', Math.round(100 * IGM.mediana(zeradosSet.map(m => res.R3[iSet].fracao[m]))), 70, 0);
confere('set/2026: (a mesma mediana só nos 155)', Math.round(100 * IGM.mediana(pagosR3.map(m => res.R3[iSet].fracao[m]))), 72, 0);
const pub = IGM.csv(ler('pontos_publicados_2026.csv'));
confere('publicado: cheios nas quatro vacinas em jun/2026', pub.filter(r => Math.abs(+r.pts_jun - 5.2) < 1e-9).length, 224, 0);
confere('publicado: cheios nas quatro vacinas em set/2026', pub.filter(r => Math.abs(+r.pts_set - 5.2) < 1e-9).length, 136, 0);

/* 6. Números da história da v1 (as seções copiadas). */
const dif = pub.map(r => Math.round((+r.pts_set - +r.pts_jun) * 1e4) / 1e4);
confere('publicado: municípios', pub.length, 645, 0);
confere('publicado: perderam pontos', dif.filter(d => d < 0).length, 415, 0);
confere('publicado: iguais', dif.filter(d => d === 0).length, 105, 0);
confere('publicado: ganharam', dif.filter(d => d > 0).length, 125, 0);
confere('publicado: sem pontos em setembro', pub.filter(r => +r.pts_set === 0).length, 164, 0);
const nasAno = {2024: new Float64Array(B.N), 2025: new Float64Array(B.N)};
for (const r of IGM.csv(ler('nascidos.csv.gz'))) if (nasAno[r.ano]) nasAno[r.ano][B.idx.get(+r.mun)] += +r.nv;
const teto = Array.from(nasAno[2025], (v, i) => 100 * v / nasAno[2024][i]);
confere('teto abaixo de 95%', teto.filter(v => v < 95).length, 185, 0);
confere('teto abaixo de 95% com menos de 100 nascidos em 2024', teto.filter((v, i) => v < 95 && nasAno[2024][i] < 100).length, 109, 0);
const ac100 = IGM.VAC.map((_, v) => { let n = 0, t = 0; for (const x of B.cob[iSet].c12[v]) if (!Number.isNaN(x)) { t++; if (x >= 100) n++; } return 100 * n / t; });
confere('12 meses >= 100%, mínimo', r1(Math.min(...ac100)), 37.5, 1e-9);
confere('12 meses >= 100%, máximo', r1(Math.max(...ac100)), 42.0, 1e-9);
const nv25 = J.nasc.map(r => r.slice(12, 24).reduce((a, b) => a + b, 0));
const esperado = {jun: [11.5, 7.0, 5.8, 5.5], set: [22.2, 11.7, 7.7, 3.7]};
for (const parc of ['jun', 'set']) {
  const [c0, c1] = J.cob[parc].oficial.Penta;
  [[0, 100], [100, 500], [500, 1500], [1500, 1e9]].forEach(([a, b], k) => {
    const sw = c0.map((x, i) => (x == null || c1[i] == null || nv25[i] < a || nv25[i] >= b) ? null : Math.abs(c1[i] - x)).filter(x => x !== null);
    confere(`oscilação Penta ${parc} porte ${k}`, r1(IGM.mediana(sw)), esperado[parc][k], 1e-9);
  });
}
confere('dinheiro das vacinas jun→set pago', Math.round(100 * (J.pagoEst['2026-09'][0] / J.pagoEst['2026-06'][0] - 1)), -41, 0);

/* 7. Figuras finais do artigo (revisão de 08/11/2026). */
// Figura 1C: nascidos de 2024 e Penta completa em 2025, por quadrimestre.
const nb24 = [0, 1, 2].map(k => J.nasc2024.slice(4 * k, 4 * k + 4).reduce((a, b) => a + b, 0));
[168131, 156800, 145952].forEach((x, k) => confere(`Figura 1C nascidos 2024 bloco ${k + 1}`, nb24[k], x, 0));
const vPenta = IGM.VAC.indexOf('Penta');
const acum = id => { const o = B.cob[ip(id)]; let s = 0; for (let m = 0; m < B.N; m++) if (!Number.isNaN(o.c1[vPenta][m])) s += o.c1[vPenta][m] * o.nasc[vPenta][m] / 100; return s; };
const pq = [acum('2025-09'), acum('2025-12') - acum('2025-09'), acum('2026-06') - acum('2025-12')];
[140474, 134492, 149407].forEach((x, k) => confere(`Figura 1C Penta 2025 bloco ${k + 1}`, Math.round(pq[k]), x, 0));
// Figura 2A: teto de 2025 contra os nascidos de 2024.
confere('Figura 2A: mediana do teto', r1(IGM.mediana(teto.filter(v => !Number.isNaN(v)))), 100.9, 1e-9);
// Figura 2B: mudança mediana da Penta (valores publicados) por nascidos de 2024.
const fig2b = {jun: [[284, 11.7], [219, 7.2], [86, 5.2], [56, 5.5]], set: [[284, 22.4], [219, 12.3], [86, 7.7], [56, 3.6]]};
for (const parc of ['jun', 'set']) {
  const [c0, c1] = J.cob[parc].oficial.Penta;
  [[0, 100], [100, 500], [500, 1500], [1500, 1e9]].forEach(([a, b], k) => {
    const sw = c0.map((x, i) => (x == null || c1[i] == null || nasAno[2024][i] < a || nasAno[2024][i] >= b) ? null : Math.abs(c1[i] - x)).filter(x => x !== null);
    confere(`Figura 2B ${parc} grupo ${k} n`, sw.length, fig2b[parc][k][0], 0);
    confere(`Figura 2B ${parc} grupo ${k} mediana`, r1(IGM.mediana(sw)), fig2b[parc][k][1], 1e-9);
  });
}
// Figura 3A: série do artigo (fig3_series_full.csv; tolerância 0,001 ponto: o artigo usa vp sem o arredondamento
// de 5 casas da exportação e diferenças de ordem de soma): % do máximo e zerados; Regras A e B = uma linha (pontuação igual).
const FIG3 = [ // pag, atual %, zerados, A %, zerados A, B %, municípios com sbar = 0
  ['2024-09', 36.39166194109532, 117, 79.99941878560891, 23, 79.46494062830824, 23], ['2024-12', 54.92474807688875, 23, 85.67794548939419, 14, 85.46572397035875, 14],
  ['2025-06', 61.2077461660158, 25, 84.60025002637786, 10, 84.47060104918255, 10], ['2025-09', 40.27477302567396, 112, 81.1895348741505, 11, 80.87037749341728, 11],
  ['2025-12', 62.34964801749671, 14, 74.17631310655794, 5, 73.84653170065552, 5], ['2026-06', 67.57863000496498, 14, 77.08124432678798, 12, 76.934836077455, 12],
  ['2026-09', 37.43032181068392, 163, 77.38495925375244, 13, 77.168333991484, 13], ['2026-12', 70.9634904589511, 28, 77.45530791734306, 21, 77.46038532105607, 21],
  ['2027-06', 71.0289711633484, 16, 77.08124432696513, 12, 76.934836077455, 12], ['2027-09', 35.76945227505899, 222, 81.94640767405697, 13, 82.16330907722478, 13],
  ['2027-12', 43.307211907569005, 98, 76.97636592716295, 11, 76.82488257331723, 11]];
for (const [pg, cur, cz, a, az, b, bz] of FIG3) {
  const p = ip(pg);
  confere(`Figura 3A atual ${pg}`, 100 * res.R0[p].partMax, cur, 1e-3);
  confere(`Figura 3A atual zerados ${pg}`, res.R0[p].zero, cz, 0);
  confere(`Figura 3A Regra A ${pg}`, 100 * res.R3b[p].partMax, a, 1e-3);
  confere(`Figura 3A Regra A zerados ${pg}`, res.R3b[p].zero, az, 0);
  confere(`Figura 3A Regra B ${pg}`, 100 * res.R4v[p].partMax, b, 1e-3);
  confere(`Figura 3A Regra B sem pontuação ${pg}`, Array.from(res.R4v[p].fracao).filter(x => x === 0).length, bz, 0);
}
// R0s na série do artigo: set/2024 = 68,2% e 45; jun/2027 = 51,4% e 8. NÃO reproduzíveis com dados/: o valor de comparação
// (12 meses até dez/2023; 12 meses projetados até ago/2026) não está na exportação. O motor deixa as duas sem valor.
confere('R0s set/2024 sem valor (o artigo usa 68,2% e 45, fora da exportação)', r0s[ip('2024-09')].nd, true, 0);
confere('R0s jun/2027 sem valor (o artigo usa 51,4% e 8, fora da exportação)', r0s[ip('2027-06')].nd, true, 0);
// Zerados publicados em set/2026 (164): 128 com 12 meses >= 80% nas quatro; mediana 90,3%; 156 pagos na Regra A, mediana 72%
// do máximo ENTRE OS PAGOS (entre os 164 seria 67%).
const pubZ = []; pub.forEach(r => { if (+r.pts_set === 0) pubZ.push(B.idx.get(+r.mun)); });
confere('publicado set/2026: zerados', pubZ.length, 164, 0);
confere('publicado set/2026: 12 meses >= 80% nas quatro', pubZ.filter(m => IGM.VAC.every((_, v) => B.cob[iSet].c12[v][m] >= 80)).length, 128, 0);
confere('publicado set/2026: mediana dos 12 meses', r1(IGM.mediana(pubZ.flatMap(m => IGM.VAC.map((_, v) => B.cob[iSet].c12[v][m])))), 90.3, 1e-9);
const pagA = pubZ.filter(m => res.R3b[iSet].varRs[m] >= IGM.ZERO);
confere('publicado set/2026: pagos na Regra A', pagA.length, 156, 0);
confere('publicado set/2026: mediana da parte do máximo dos pagos na Regra A', Math.round(100 * IGM.mediana(pagA.map(m => res.R3b[iSet].fracao[m]))), 72, 0);
// Figura 3B/C: o par de exemplo pela regra de escolha, e os valores dos dois municípios (Penta, set/2026).
const nat = m => 1000 * B.peso[iSet][m] / B.muns[m].pop;
const cand = pubZ.filter(m => B.cob[iSet].c12[vPenta][m] >= 80 && B.cob[iSet].c12[vPenta][m] < 95 && B.muns[m].pop > 50000);
let par = null;
for (const a of cand) for (const b of cand) if (a < b && B.muns[a].pc === B.muns[b].pc && Math.abs(B.muns[a].pop / B.muns[b].pop - 1) <= 0.05) { const d = Math.abs(nat(a) - nat(b)); if (!par || d > par[0]) par = [d, a, b]; }
confere('Figura 3B/C: par escolhido', par && [par[1], par[2]].map(m => B.muns[m].mun).sort().join(','), '354330,355400', 0);
confere('Figura 3B/C: natalidade Ribeirão Pires', r1(nat(B.idx.get(354330))), 7.0, 1e-9);
confere('Figura 3B/C: natalidade Tatuí', r1(nat(B.idx.get(355400))), 12.4, 1e-9);
const md = B.med[iSet][vPenta];
confere('Figura 3B/C: corte m0 Penta', r2(md.corte0), 94.12, 1e-9);
confere('Figura 3B/C: corte m1 Penta', r2(md.corte1), 87.72, 1e-9);
for (const [cod, kids, salto, umA, umB] of [[354330, 33, 40702, 214, 149], [355400, 32, 40344, 122, 149]]) {
  const m = B.idx.get(cod), o = B.cob[iSet], c0 = o.c0[vPenta][m], c1 = o.c1[vPenta][m], passo = 100 / o.nasc[vPenta][m];
  const sc = IGM.faixa(c0, c1, md.corte0, md.corte1); let n = 0, s = sc;
  while (s <= sc && n < 1000) { n++; s = IGM.faixa(c0, c1 + n * passo, md.corte0, md.corte1); }
  const full = ctx.vp[iSet][m] * IGM.PONTO_VAC, p12 = 100 / o.den12[vPenta][m];
  confere(`Figura 3B/C ${cod}: dinheiro hoje (regra atual)`, sc * full, 0, 0);
  confere(`Figura 3B/C ${cod}: crianças para o salto`, n, kids, 0);
  confere(`Figura 3B/C ${cod}: valor do salto`, Math.round(s * full), salto, 0);
  confere(`Figura 3B/C ${cod}: uma criança, Regra A`, Math.round(res.R3b[iSet].unidade[m] * p12 / 15), umA, 0);
  confere(`Figura 3B/C ${cod}: uma criança, Regra B`, Math.round(res.R4v[iSet].unidade[m] * p12 / 15), umB, 0);
}

/* 8. Regra A + margem para pequenos (R3m, 09/11/2026) e a comparação por porte (comparar.js, maquete e artigo). */
const CMP = require('./comparar.js');
const R3m = IGM.calcular(B, IGM.PRESETS.R3m, ctx);
confere('margem 1 == Regra A (exato)', igualSerie(IGM.calcular(B, Object.assign({}, IGM.PRESETS.R3b, {margem: 1}), ctx), res.R3b), true, 0);
R3m.forEach((o, i) => {
  const pg = B.pags[i].id;
  confere(`R3m soma = orçamento ${pg}`, Math.abs(o.total - ctx.orc[i]) < 0.01, true, 0);
  confere(`R3m zerados = Regra A ${pg}`, o.zero, res.R3b[i].zero, 0);
  // fora dos pequenos, R3m = Regra A × um fator por parcela; nos pequenos, o mesmo fator × 1,25
  let c = null, ok1 = true;
  for (let m = 0; m < B.N; m++) {
    if (res.R3b[i].rs[m] < 1) continue;
    const q = o.rs[m] / res.R3b[i].rs[m] / (B.muns[m].pequeno ? 1.25 : 1);
    if (c === null) c = q; else if (Math.abs(q / c - 1) > 1e-9) ok1 = false;
  }
  confere(`R3m = Regra A × fator (pequenos × 1,25) ${pg}`, ok1, true, 0);
});
confere('pequenos (< 20 mil hab.) = 384', B.muns.filter(m => m.pequeno).length, 384, 0);
{ // sem orçamento e por habitante: o máximo dos pequenos sobe 25%
  const o = IGM.calcular(B, Object.assign({}, IGM.PRESETS.R3, {margem: 1.25}), ctx)[iSet];
  let mx = 0; for (let m = 0; m < B.N; m++) mx += IGM.MAX_PONTOS * ctx.vp[iSet][m] * (B.muns[m].pequeno ? 1.25 : 1);
  confere('R3 sem orçamento com margem: máximo', Math.abs(o.maximo - mx) < 0.01, true, 0);
}
// Por porte, no período do artigo (8 parcelas, set/2024–dez/2026) e no da maquete (11 parcelas). Números de
// simulacoes/igm-sp-v2/trabalho/paper_tamanho_municipio.md (trabalho/tamanho_municipio.js, fora do site). Faixa praticamente igual = ±5% do que recebe na regra atual.
const P8 = B.pags.map((p, i) => i).filter(i => B.pags[i].sv === 0.5), P11 = B.pags.map((p, i) => i);
const porPorte = (r, P) => { const t = [0, 0, 0]; for (let m = 0; m < B.N; m++) for (const p of P) t[CMP.PORTE3[B.muns[m].porte]] += r[p].rs[m]; return t.map(x => r1(x / 1e6)); };
const espPorte = {
  R0: [[41.5, 69.5, 145.3], [60.6, 101.7, 201.2]], R3b: [[35.1, 69.1, 152.2], [50.2, 97.8, 215.5]],
  R4v: [[32.3, 68.1, 155.9], [46.2, 96.3, 221.0]], R3m: [[42.4, 66.8, 147.2], [60.7, 94.5, 208.3]],
};
const RR = {R0: res.R0, R3b: res.R3b, R4v: res.R4v, R3m};
for (const [k, [e8, e11]] of Object.entries(espPorte)) {
  confere(`${k} por porte, 8 parcelas`, JSON.stringify(porPorte(RR[k], P8)), JSON.stringify(e8), 0);
  confere(`${k} por porte, 11 parcelas`, JSON.stringify(porPorte(RR[k], P11)), JSON.stringify(e11), 0);
}
const cont = {
  '8 R3b': [160, 408, 77, [[52, 288, 44], [71, 85, 24], [37, 35, 9]]], '8 R4v': [152, 442, 51, [[49, 315, 20], [62, 94, 24], [41, 33, 7]]],
  '8 R3m': [257, 292, 96, [[163, 159, 62], [60, 94, 26], [34, 39, 8]]],
  '11 R3b': [124, 432, 89, [[30, 301, 53], [59, 95, 26], [35, 36, 10]]], '11 R4v': [118, 465, 62, [[37, 328, 19], [43, 106, 31], [38, 31, 12]]],
};
for (const [k, [g, l, s, pp]] of Object.entries(cont)) {
  const [per, nome] = k.split(' '), C = CMP.comparar(B, RR[nome], res.R0, per === '8' ? P8 : P11);
  confere(`${k}: ganham/perdem/iguais`, `${C.n.ganham}/${C.n.perdem}/${C.n.iguais}`, `${g}/${l}/${s}`, 0);
  confere(`${k}: soma 645`, C.n.ganham + C.n.perdem + C.n.iguais, 645, 0);
  confere(`${k}: por porte`, JSON.stringify(C.porte.map(x => [x.ganham, x.perdem, x.iguais])), JSON.stringify(pp), 0);
  // as classes do mapa (classe por município) somam o mesmo que a frase
  const cl = [0, 0, 0]; C.classe.forEach(c => { cl[c > 0 ? 0 : c < 0 ? 1 : 2]++; });
  confere(`${k}: classes do mapa = frase`, cl.join('/'), `${g}/${l}/${s}`, 0);
}

// Seção "Monte sua regra" (index.html): para TODO preset, a frase, o mapa e as barras por porte vêm da mesma comparação
// nas 8 parcelas de set/2024 a dez/2026 e somam 645; a regra atual contra ela mesma = 645 praticamente iguais.
for (const [nome, sp] of Object.entries(IGM.PRESETS)) {
  const r = nome === 'R0' ? res.R0 : IGM.calcular(B, sp, ctx), C = CMP.comparar(B, r, res.R0, P8);
  const fr = [C.n.ganham, C.n.perdem, C.n.iguais];
  const mapa = [0, 0, 0]; C.classe.forEach(c => { mapa[c > 0 ? 0 : c < 0 ? 1 : 2]++; });
  const barras = [0, 0, 0]; C.porte.forEach(g => { barras[0] += g.ganham; barras[1] += g.perdem; barras[2] += g.iguais; });
  confere(`Monte ${nome}: frase soma 645`, fr[0] + fr[1] + fr[2], 645, 0);
  confere(`Monte ${nome}: frase = mapa = barras`, `${fr}|${mapa}|${barras}`, `${fr}|${fr}|${fr}`, 0);
  confere(`Monte ${nome}: parcelas com valor`, C.parcelas.length, nome === 'R0s' ? 7 : 8, 0);
  if (nome === 'R0') confere('Monte R0 × R0 = 645 iguais', fr.join('/'), '0/0/645', 0);
  if (sp.orc === 'atual') confere(`Monte ${nome}: mesmo total`, Math.abs(C.totalMinha - C.totalAtual) < 1, true, 0);
}

/* 9. Pesos por tamanho (10/11/2026): peso decrescente (R3t) e pesos por porte (R3p) contra a análise de variantes do
   PrefSaoCaetano (s12_variantes_pequenos.py, outputs/vacinacao/variantes_pequenos/resumo.csv, base BACK = 8 parcelas). */
{
  const pctPorte = (r) => { const t0 = [0, 0, 0], t1 = [0, 0, 0];
    for (let m = 0; m < B.N; m++) { const z = CMP.PORTE3[B.muns[m].porte]; for (const p of P8) { t0[z] += res.R0[p].rs[m]; t1[z] += r[p].rs[m]; } }
    return t1.map((x, z) => 100 * (x / t0[z] - 1)); };
  const run = sp => IGM.calcular(B, Object.assign({}, IGM.PRESETS.R3b, sp), ctx);
  // s12 V2_taper30 (c = 0,30): +2,2649 / −2,8100 / +0,6980; contagens 169/137/78 · 66/90/24 · 33/40/8
  const R3t = IGM.calcular(B, IGM.PRESETS.R3t, ctx), pt = pctPorte(R3t);
  [[2.2649, 0], [-2.81, 1], [0.698, 2]].forEach(([e, k]) => confere(`R3t por porte ${k} = s12 V2_taper30`, Math.abs(pt[k] - e) < 0.01, true, 0));
  const Ct = CMP.comparar(B, R3t, res.R0, P8);
  confere('R3t ganham/perdem/iguais por porte = s12', JSON.stringify(Ct.porte.map(g => [g.ganham, g.perdem, g.iguais])), JSON.stringify([[169, 137, 78], [66, 90, 24], [33, 40, 8]]), 0);
  // s12 V2_taper calibrado (c = 0,26043): 0 / −2,5318 / +1,2113
  const pc = pctPorte(run({afina: 1.26043}));
  [[0, 0], [-2.5318, 1], [1.2113, 2]].forEach(([e, k]) => confere(`afina 1,26043 por porte ${k} = s12 V2_taper`, Math.abs(pc[k] - e) < 0.01, true, 0));
  // s12 V2_tier calibrado (1,23945 / 1,05389): 0 / 0 / 0; o preset arredonda para 1,24 / 1,05 (fica a menos de 0,5%)
  const px = pctPorte(run({margem: 1.23945, margemMed: 1.05389}));
  px.forEach((x, k) => confere(`pesos por porte calibrados ${k} = 0`, Math.abs(x) < 0.01, true, 0));
  const R3p = IGM.calcular(B, IGM.PRESETS.R3p, ctx);
  pctPorte(R3p).forEach((x, k) => confere(`R3p (1,24 / 1,05) por porte ${k} perto de 0`, Math.abs(x) < 0.5, true, 0));
  // s12 V2_w (1,21892): 0 / −3,5165 / +1,6824
  const pw = pctPorte(run({margem: 1.21892}));
  [[0, 0], [-3.5165, 1], [1.6824, 2]].forEach(([e, k]) => confere(`peso único 1,21892 por porte ${k} = s12 V2_w`, Math.abs(pw[k] - e) < 0.01, true, 0));
  // pesos = 1 é a Regra A; orçamento fecha; os pequenos com peso decrescente: 1,30 até 10 mil, 1 a partir de 30 mil
  confere('afina 1 e margemMed 1 == Regra A (exato)', igualSerie(run({afina: 1, margemMed: 1, afP1: 5000, afP2: 50000}), res.R3b), true, 0);
  [R3t, R3p].forEach((r, j) => r.forEach((o, i) => confere(`${j ? 'R3p' : 'R3t'} soma = orçamento ${B.pags[i].id}`, Math.abs(o.total - ctx.orc[i]) < 0.01, true, 0)));
  const w = m => IGM.pesoTamanho(IGM.PRESETS.R3t, m);
  confere('peso decrescente: 1,30 até 10 mil, 1,15 em 20 mil, 1 em 30 mil', [w({pop: 8000}), w({pop: 20000}), w({pop: 30000}), w({pop: 90000})].map(x => x.toFixed(4)).join(' '), '1.3000 1.1500 1.0000 1.0000', 0);
}

console.log(`${ok} conferências ok, ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
