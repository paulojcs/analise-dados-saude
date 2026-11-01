/* Teste: recalcula as sete regras do artigo a partir de dados/ com o mesmo motor da página
   e compara com dados/referencia.json. Rodar antes de publicar:  node teste_referencia.js
   Sai com código 1 se qualquer número divergir além das tolerâncias do próprio referencia.json. */
'use strict';
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const IGM = require('./motor.js');

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
const tol = ref.tolerancias;

let falhas = 0, ok = 0;
function confere(rotulo, obtido, esperado, t) {
  const bate = esperado === null ? obtido === null
    : (t === 0 ? obtido === esperado : Math.abs(obtido - esperado) <= t + 1e-9);
  if (bate) ok++; else { falhas++; console.log(`FALHA ${rotulo}: obtido ${obtido}, esperado ${esperado}`); }
}
const r4 = x => Math.round(x * 1e4) / 1e4;

confere('pagamentos', JSON.stringify(B.pags.map(p => p.id)), JSON.stringify(ref.pagamentos), 0);
confere('status', JSON.stringify(B.pags.map(p => p.status)), JSON.stringify(ref.status), 0);

// Medianas recalculadas em precisão cheia contra as publicadas no medianas.csv (arredondadas ou truncadas em 4–5 casas).
for (const r of B.medCsv) {
  const p = B.pags.findIndex(x => x.id === r.pagamento), v = IGM.VAC.indexOf(r.vacina), m = B.med[p][v];
  confere(`mediana c0 ${r.pagamento} ${r.vacina}`, m.m0, +r.mediana_c0, 1e-4);
  confere(`mediana c1 ${r.pagamento} ${r.vacina}`, m.m1, +r.mediana_c1, 1e-4);
  confere(`n ${r.pagamento} ${r.vacina}`, m.n, +r.n_ambos, 0);
}

const ctx = IGM.contexto(B);
const iSet = B.pags.findIndex(p => p.id === '2026-09');
B.pags.forEach((p, i) => confere(`B_rs ${p.id}`, ctx.orc[i], ref.B_rs[String(p.sv)], tol.B_rs));

const res = {};
for (const [nome, spec] of Object.entries(IGM.PRESETS)) {
  const r = IGM.regra(B, spec, ctx);
  res[nome] = r;
  const e = ref.regras[nome];
  r.forEach((o, i) => {
    const pg = B.pags[i].id;
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
  for (const [nome, serie] of Object.entries(e.rs)) {
    res[nome].forEach((o, i) => confere(`${e.municipio} ${nome} ${B.pags[i].id}`, o.rs[m], serie[i], tol.rs_municipio));
  }
}

// Pontos publicados pela SES (mapa): os números do artigo (Figura B) e o pago em setembro.
const pub = IGM.csv(ler('pontos_publicados_2026.csv'));
const dif = pub.map(r => Math.round((+r.pts_set - +r.pts_jun) * 1e4) / 1e4);
confere('publicado: municípios', pub.length, 645, 0);
confere('publicado: perderam pontos', dif.filter(d => d < 0).length, 415, 0);
confere('publicado: iguais', dif.filter(d => d === 0).length, 105, 0);
confere('publicado: ganharam', dif.filter(d => d > 0).length, 125, 0);
confere('publicado: sem pontos em setembro', pub.filter(r => +r.pts_set === 0).length, 164, 0);

// Uma criança a mais: sem criança a mais nada muda, e o "antes" é o dinheiro da própria regra.
for (const cod of Object.keys(ref.municipios)) {
  const m = B.idx.get(+cod);
  for (const nome of ['R0', 'R1', 'R2', 'R3']) {
    let soma = 0, igual = true;
    IGM.VAC.forEach((_, v) => { const z = IGM.criancaAMais(B, iSet, m, v, 0, IGM.PRESETS[nome], ctx); soma += z.antes; if (z.antes !== z.depois) igual = false; });
    confere(`criança a mais ${nome} ${cod} n=0`, igual, true, 0);
    confere(`criança a mais ${nome} ${cod} soma = regra`, soma, res[nome][iSet].rs[m], 0.01);
  }
}

// Números da história que a página mostra, recalculados dos mesmos arquivos (os da página saem do mesmo cálculo).
const nasAno = {2024: new Float64Array(B.N), 2025: new Float64Array(B.N)};
for (const r of IGM.csv(ler('nascidos.csv.gz'))) if (nasAno[r.ano]) nasAno[r.ano][B.idx.get(+r.mun)] += +r.nv;
const teto = Array.from(nasAno[2025], (v, i) => 100 * v / nasAno[2024][i]);
confere('teto abaixo de 95%', teto.filter(v => v < 95).length, 185, 0);
const ac100 = IGM.VAC.map((_, v) => { let n = 0, t = 0; for (const x of B.cob[iSet].c12[v]) if (!Number.isNaN(x)) { t++; if (x >= 100) n++; } return 100 * n / t; });
confere('12 meses >= 100%, mínimo', Math.round(Math.min(...ac100) * 10) / 10, 37.5, 1e-9);
confere('12 meses >= 100%, máximo', Math.round(Math.max(...ac100) * 10) / 10, 42.0, 1e-9);
const J = JSON.parse(ler('dados_simulacao_igm.json'));
const nv25 = J.nasc.map(r => r.slice(12, 24).reduce((a, b) => a + b, 0));
const esperado = {jun: [11.5, 7.0, 5.8, 5.5], set: [22.2, 11.7, 7.7, 3.7]};
for (const parc of ['jun', 'set']) {
  const [c0, c1] = J.cob[parc].oficial.Penta;
  [[0, 100], [100, 500], [500, 1500], [1500, 1e9]].forEach(([a, b], k) => {
    const sw = c0.map((x, i) => (x == null || c1[i] == null || nv25[i] < a || nv25[i] >= b) ? null : Math.abs(c1[i] - x)).filter(x => x !== null);
    confere(`oscilação Penta ${parc} porte ${k}`, Math.round(IGM.mediana(sw) * 10) / 10, esperado[parc][k], 1e-9);
  });
}
confere('dinheiro das vacinas jun→set pago', Math.round(100 * (J.pagoEst['2026-09'][0] / J.pagoEst['2026-06'][0] - 1)), -41, 0);

console.log(`${ok} conferências ok, ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
