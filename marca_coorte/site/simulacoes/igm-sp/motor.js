/* Motor das regras de pagamento das vacinas do IGM SUS Paulista.
   O mesmo arquivo roda na página (window.IGM) e no teste em Node (require), para que
   os números da página e os do teste saiam do mesmo código. Regras e campos: dados/README.md. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IGM = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VAC = ['Polio', 'Penta', 'Pneumo', 'Triplice'];
  const PONTO_VAC = 1.3;              // pontos por vacina
  const MAX_PONTOS = PONTO_VAC * 4;   // 5,2 dos 10 pontos
  const ZERO = 0.005;                 // R$: abaixo disto conta como "sem dinheiro de vacina"

  /* ---------- leitura dos CSVs (texto já descomprimido) ---------- */
  function csv(txt) {
    const linhas = txt.replace(/\r/g, '').split('\n').filter(l => l.length);
    const cab = linhas[0].split(',');
    return linhas.slice(1).map(l => {
      const c = l.split(','), o = {};
      cab.forEach((k, i) => { o[k] = c[i]; });
      return o;
    });
  }
  const num = s => (s === undefined || s === '' ? null : Number(s));

  /* Monta a base do motor a partir dos arquivos de dados/ (texto de cada CSV). */
  function montar(t) {
    const muns = csv(t.municipios).map(r => ({
      mun: +r.mun, ibge7: +r.ibge7, nome: r.municipio, drs: r.drs, regiao: r.regiao_saude,
      porte: r.porte, pop: +r.pop, pc: +r.percapita, ordem: +r.ordem_painel,
    })).sort((a, b) => a.ordem - b.ordem);
    const idx = new Map(muns.map((m, i) => [m.mun, i]));
    const N = muns.length;
    const pags = csv(t.pagamentos).map(r => ({
      id: r.pagamento, rotulo: r.rotulo, status: r.status, comp: r.bloco_comp, aval: r.bloco_aval,
      j12: [r.janela12_inicio, r.janela12_fim], sv: +r.share_variavel, B: +r.B_rs, doses: r.doses_aval,
    }));
    const pi = new Map(pags.map((p, i) => [p.id, i]));
    const P = pags.length;
    const nova = () => VAC.map(() => new Float64Array(N).fill(NaN));
    const cob = pags.map(() => ({ c0: nova(), c1: nova(), c12: nova(), nasc: nova(), den12: nova() }));
    const vi = new Map(VAC.map((v, i) => [v, i]));
    for (const r of csv(t.cobertura)) {
      const p = pi.get(r.pagamento), v = vi.get(r.vacina), m = idx.get(+r.mun);
      const o = cob[p];
      for (const k of ['c0', 'c1', 'c12']) { const x = num(r[k]); o[k][v][m] = x === null ? NaN : x; }
      const n = num(r.nasc_aval); o.nasc[v][m] = n === null ? NaN : n;
      const d = num(r.den12); o.den12[v][m] = d === null ? NaN : d;
    }
    const vp = pags.map(() => new Float64Array(N)), peso = pags.map(() => new Float64Array(N));
    for (const r of csv(t.municipio_pagamento)) {
      const p = pi.get(r.pagamento), m = idx.get(+r.mun);
      vp[p][m] = +r.vp; peso[p][m] = +r.nasc_ano_peso;
    }
    // Medianas recalculadas em precisão cheia: muitas vezes a mediana é a cobertura de um município,
    // e o medianas.csv (5 casas) desempataria errado o "c1 >= mediana". O CSV fica só como conferência.
    const med = pags.map((_, p) => VAC.map((_, v) => medianasDe(cob[p].c0[v], cob[p].c1[v])));
    const medCsv = t.medianas ? csv(t.medianas) : [];
    return { VAC, muns, idx, pags, N, P, cob, vp, peso, med, medCsv };
  }
  /* Medianas estaduais de c0 e c1 sobre os municípios com os dois valores; corte = min(mediana, 95). */
  function medianasDe(c0, c1) {
    const a = [], b = [];
    for (let m = 0; m < c0.length; m++) if (!Number.isNaN(c0[m]) && !Number.isNaN(c1[m])) { a.push(c0[m]); b.push(c1[m]); }
    const m0 = mediana(a), m1 = mediana(b);
    return { m0, m1, corte0: Math.min(m0, 95), corte1: Math.min(m1, 95), n: a.length };
  }

  /* ---------- regras ---------- */

  /* Faixas da CIB 25/2026: parte do ponto de uma vacina, dados c0, c1 e os cortes m0, m1.
     A meta de 95% é fixa na regra; os cortes m0/m1 são a mediana (limitada a 95) ou um corte fixo. */
  function faixa(c0, c1, m0, m1) {
    if (Number.isNaN(c0) || Number.isNaN(c1)) return 0;
    if (c0 >= 95) return c1 >= 95 ? 1 : (c1 >= m1 ? 0.75 : 0);
    if (c0 >= m0) return c1 > c0 ? 1 : (c1 >= m1 ? 0.75 : 0);
    if (c1 > c0 && c1 >= m1) return 1;
    if (c1 >= c0 && c1 < m1) return 0.5;
    return 0;
  }

  /* Proporcional: nada no piso, cheio na meta, linear no meio, sobre a cobertura de 12 meses. */
  function proporcional(c12, piso, meta) {
    if (Number.isNaN(c12)) return 0;
    const s = (c12 - piso) / (meta - piso);
    return s < 0 ? 0 : (s > 1 ? 1 : s);
  }

  /* Partes [vacina][município] de uma regra de faixas numa parcela.
     corte: 'mediana' (regra atual) ou um número (corte fixo, ex. 90 ou 95). */
  function partesFaixas(B, p, corte) {
    const o = B.cob[p];
    return VAC.map((_, v) => {
      const m0 = corte === 'mediana' ? B.med[p][v].corte0 : corte;
      const m1 = corte === 'mediana' ? B.med[p][v].corte1 : corte;
      const s = new Float64Array(B.N);
      for (let m = 0; m < B.N; m++) s[m] = faixa(o.c0[v][m], o.c1[v][m], m0, m1);
      return s;
    });
  }
  function partesProp(B, p, piso, meta) {
    const o = B.cob[p];
    return VAC.map((_, v) => {
      const s = new Float64Array(B.N);
      for (let m = 0; m < B.N; m++) s[m] = proporcional(o.c12[v][m], piso, meta);
      return s;
    });
  }

  /* Dinheiro por município numa parcela de uma regra "por habitante" (R0–R3): vp × 1,3 × parte. */
  function dinheiroPorHab(B, p, partes) {
    const r = new Float64Array(B.N), f = new Float64Array(B.N);
    for (let m = 0; m < B.N; m++) {
      let soma = 0;
      for (let v = 0; v < 4; v++) soma += partes[v][m];
      r[m] = B.vp[p][m] * PONTO_VAC * soma;
      f[m] = soma / 4;                            // = pontos / 5,2
    }
    return { rs: r, fracao: f };
  }
  const maximoPorHab = (B, p) => { let s = 0; for (let m = 0; m < B.N; m++) s += MAX_PONTOS * B.vp[p][m]; return s; };
  const soma = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };

  /* Orçamento B por regime (parte variável 50% / 60%): média do total da regra atual nas parcelas do regime. */
  function orcamentos(B, totaisR0) {
    const g = {};
    B.pags.forEach((p, i) => { (g[p.sv] = g[p.sv] || []).push(totaisR0[i]); });
    const o = {};
    for (const k in g) o[k] = g[k].reduce((a, b) => a + b, 0) / g[k].length;
    return B.pags.map(p => o[p.sv]);
  }

  /* Uma regra completa sobre as 11 parcelas.
     spec = {tipo:'faixas', corte:'mediana'|número}
          | {tipo:'prop', piso, meta, orcamento:false|true}
          | {tipo:'crianca', piso, meta, fixa: 0.5 (R4) | 0 (R4v)}
     Devolve por parcela: rs (Float64Array por município), fracao (parte do máximo), total, maximo, zero. */
  function regra(B, spec, ctx) {
    ctx = ctx || contexto(B);
    const out = [];
    for (let p = 0; p < B.P; p++) {
      let rs, fr, max, zero, k = null;
      if (spec.tipo === 'faixas') {
        ({ rs, fracao: fr } = dinheiroPorHab(B, p, partesFaixas(B, p, spec.corte)));
        max = maximoPorHab(B, p);
      } else {
        const piso = spec.piso ?? 80, meta = spec.meta ?? 95;
        const pr = dinheiroPorHab(B, p, partesProp(B, p, piso, meta));
        fr = pr.fracao;
        if (spec.tipo === 'prop' && !spec.orcamento) { rs = pr.rs; max = maximoPorHab(B, p); }
        else if (spec.tipo === 'prop') {
          k = ctx.orc[p] / soma(pr.rs);
          rs = pr.rs.map(x => x * k); max = ctx.orc[p];
        } else {
          const Bp = ctx.orc[p], fixa = spec.fixa ?? 0.5;
          const w = new Float64Array(B.N), ws = new Float64Array(B.N);
          for (let m = 0; m < B.N; m++) { w[m] = B.peso[p][m] * B.muns[m].pc / 30; ws[m] = w[m] * fr[m]; }
          const sw = soma(w), sws = soma(ws);
          rs = new Float64Array(B.N);
          const varPart = new Float64Array(B.N);
          for (let m = 0; m < B.N; m++) {
            varPart[m] = Bp * (1 - fixa) * ws[m] / sws;
            rs[m] = Bp * fixa * w[m] / sw + varPart[m];
          }
          max = Bp;
          zero = contaZero(varPart);
        }
      }
      if (zero === undefined) zero = contaZero(rs);
      out.push({ rs, fracao: fr, total: soma(rs), maximo: max, zero, k });
    }
    out.forEach((o, p) => { o.mudanca = p === 0 ? null : mediana(Array.from(o.fracao, (f, m) => Math.abs(f - out[p - 1].fracao[m]) * 100)); });
    return out;
  }
  function contaZero(a) { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] < ZERO) n++; return n; }
  function mediana(a) {
    const s = a.slice().sort((x, y) => x - y), n = s.length;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }
  /* Contexto comum: orçamento B de cada parcela, sempre pela regra atual. */
  function contexto(B) {
    const r0 = regra(B, { tipo: 'faixas', corte: 'mediana' }, { orc: [] });
    return { orc: orcamentos(B, r0.map(o => o.total)), r0 };
  }

  /* As sete regras do artigo, com os nomes do README e do glossário. */
  const PRESETS = {
    R0: { tipo: 'faixas', corte: 'mediana' },
    R1: { tipo: 'faixas', corte: 90 },
    R2: { tipo: 'faixas', corte: 95 },
    R3: { tipo: 'prop', piso: 80, meta: 95, orcamento: false },
    R3b: { tipo: 'prop', piso: 80, meta: 95, orcamento: true },
    R4: { tipo: 'crianca', piso: 80, meta: 95, fixa: 0.5 },
    R4v: { tipo: 'crianca', piso: 80, meta: 95, fixa: 0 },
  };

  /* Uma criança a mais: quanto muda o dinheiro de um município numa vacina e parcela
     se n crianças a mais forem vacinadas no período avaliado (cortes da mediana mantidos fixos). */
  function criancaAMais(B, p, m, v, n, spec, ctx) {
    ctx = ctx || contexto(B);
    const o = B.cob[p];
    const c0 = o.c0[v][m], c1 = o.c1[v][m], nasc = o.nasc[v][m], c12 = o.c12[v][m], den = o.den12[v][m];
    const c1n = Number.isNaN(c1) || !(nasc > 0) ? c1 : c1 + 100 * n / nasc;
    const c12n = Number.isNaN(c12) || !(den > 0) ? c12 : c12 + 100 * n / den;
    const vp = B.vp[p][m] * PONTO_VAC;
    if (spec.tipo === 'faixas') {
      const m0 = spec.corte === 'mediana' ? B.med[p][v].corte0 : spec.corte;
      const m1 = spec.corte === 'mediana' ? B.med[p][v].corte1 : spec.corte;
      return { antes: vp * faixa(c0, c1, m0, m1), depois: vp * faixa(c0, c1n, m0, m1), c1, c1n, m0, m1 };
    }
    const piso = spec.piso ?? 80, meta = spec.meta ?? 95;
    const a = proporcional(c12, piso, meta), d = proporcional(c12n, piso, meta);
    if (spec.tipo === 'prop' && !spec.orcamento) return { antes: vp * a, depois: vp * d, c12, c12n };
    // Com orçamento fixo, o fator do estado fica fixo: uma criança o move muito pouco (aproximação; < 5% no maior município).
    const chave = JSON.stringify(spec);
    ctx.cache = ctx.cache || {};
    const rg = (ctx.cache[chave] = ctx.cache[chave] || regra(B, spec, ctx))[p];
    if (spec.tipo === 'prop') return { antes: vp * a * rg.k, depois: vp * d * rg.k, c12, c12n };
    let sws = 0;
    for (let mm = 0; mm < B.N; mm++) sws += B.peso[p][mm] * B.muns[mm].pc / 30 * rg.fracao[mm];
    const w = B.peso[p][m] * B.muns[m].pc / 30;
    const fatia = ctx.orc[p] * (1 - (spec.fixa ?? 0.5)) * w / sws / 4;   // uma vacina = 1/4 da fração média
    return { antes: fatia * a, depois: fatia * d, c12, c12n };
  }

  return { VAC, PONTO_VAC, MAX_PONTOS, ZERO, csv, montar, faixa, proporcional, regra, contexto, PRESETS, criancaAMais, mediana };
}));
