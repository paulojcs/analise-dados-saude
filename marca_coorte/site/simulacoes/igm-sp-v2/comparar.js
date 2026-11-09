/* Comparação de uma regra com a regra atual, para a seção "Monte sua regra" (v2, maquete de 09/11/2026).
   Responde a uma pergunta: o que muda para cada município se a regra escolhida substituir a atual?
   Roda na página (window.IGMcomp) e em Node (require), sobre os resultados de IGM.calcular.

   Faixa "praticamente igual": |diferença| <= max(R$ 1.000, 2% do que o município recebe na regra atual
   no mesmo período). O piso de R$ 1 mil evita que trocados contem como ganho ou perda onde a regra atual
   paga quase nada; os 2% fazem o mesmo nas cidades grandes, onde R$ 1 mil é ruído.
   Portes: pequeno < 20 mil hab., médio 20–100 mil, grande > 100 mil (as faixas de porte de municipios.csv). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IGMcomp = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const PISO_RS = 1000, PISO_REL = 0.02, ZERO = 0.005;
  const PORTE3 = {'<5 mil': 0, '5-10 mil': 0, '10-20 mil': 0, '20-50 mil': 1, '50-100 mil': 1, '100-500 mil': 2, '>500 mil': 2};

  /* B: base do motor; resM: regra escolhida; resR: regra atual; parcelas: índices das parcelas somadas.
     Parcelas em que a regra escolhida não tem valor (nd) ficam fora das duas somas. */
  function comparar(B, resM, resR, parcelas) {
    const ps = parcelas.filter(p => !resM[p].nd && !resR[p].nd);
    const N = B.N, atual = new Float64Array(N), minha = new Float64Array(N), dif = new Float64Array(N), classe = new Int8Array(N);
    for (let m = 0; m < N; m++) {
      let a = 0, b = 0;
      for (const p of ps) { a += resR[p].rs[m]; b += resM[p].rs[m]; }
      atual[m] = a; minha[m] = b; dif[m] = b - a;
      const banda = Math.max(PISO_RS, PISO_REL * a);
      classe[m] = dif[m] > banda ? 1 : dif[m] < -banda ? -1 : 0;   // 1 ganha, -1 perde, 0 praticamente igual
    }
    const n = {ganham: 0, perdem: 0, iguais: 0};
    const porte = [0, 1, 2].map(() => ({ganham: 0, perdem: 0, iguais: 0, n: 0, dif: 0}));
    for (let m = 0; m < N; m++) {
      const k = classe[m] > 0 ? 'ganham' : classe[m] < 0 ? 'perdem' : 'iguais';
      n[k]++;
      const g = porte[PORTE3[B.muns[m].porte]];
      g[k]++; g.n++; g.dif += dif[m];
    }
    // zerados: municípios sem a parte variável em pelo menos uma das parcelas comparadas
    const zerado = res => { let c = 0; for (let m = 0; m < N; m++) if (ps.some(p => res[p].varRs[m] < ZERO)) c++; return c; };
    // quem perde, perde quanto (mediana da perda relativa, só onde a regra atual paga algo)
    const perdas = [];
    for (let m = 0; m < N; m++) if (classe[m] < 0 && atual[m] > 0) perdas.push(-dif[m] / atual[m]);
    perdas.sort((x, y) => x - y);
    const medPerda = perdas.length ? (perdas.length % 2 ? perdas[perdas.length >> 1] : (perdas[perdas.length / 2 - 1] + perdas[perdas.length / 2]) / 2) : null;
    let iMax = 0, iMin = 0;
    for (let m = 1; m < N; m++) { if (dif[m] > dif[iMax]) iMax = m; if (dif[m] < dif[iMin]) iMin = m; }
    let tA = 0, tM = 0; for (let m = 0; m < N; m++) { tA += atual[m]; tM += minha[m]; }
    return {parcelas: ps, atual, minha, dif, classe, n, porte, totalAtual: tA, totalMinha: tM,
      zeradosAtual: zerado(resR), zeradosMinha: zerado(resM), medPerda, maiorGanho: iMax, maiorPerda: iMin};
  }
  return {comparar, PISO_RS, PISO_REL, PORTE3};
}));
