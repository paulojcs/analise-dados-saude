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

console.log(`${ok} conferências ok, ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
