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

console.log(`${ok} conferências ok, ${falhas} falhas`);
process.exit(falhas ? 1 : 0);
