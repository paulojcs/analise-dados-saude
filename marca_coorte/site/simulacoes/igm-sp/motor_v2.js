/* Motor v2 das regras de pagamento das vacinas do IGM SUS Paulista: UMA regra parametrizada,
   da qual todas as regras do artigo (R0–R4v) e a "regra atual com 12 meses" (R0s) são casos particulares.
   O mesmo arquivo roda na página (window.IGM) e no teste em Node (require). Regras e campos: dados/README.md;
   o que a v2 acrescenta: simulacoes/igm-sp/NOTAS.md.

   Uma regra = {
     medida: 'acum'  valores acumulados desde janeiro, como a SES (c0 comparação, c1 avaliado)
           | 'c12'   cobertura de 12 meses (avaliado = c12 da parcela; comparação = c12 da parcela cujo bloco
                     avaliado é o bloco de comparação desta; sem essa parcela, a regra de faixas fica indisponível)
     pont:   'faixas' faixas da CIB 25/2026 contra um corte | 'rampa' de nada no piso a cheio no alvo (só o nível)
     corte:  'mediana' (mediana estadual, limitada a 95) | número (corte fixo, %)
     piso, alvo: rampa (padrão 80 e 95)
     aloc:   'hab' por habitante (valor do ponto) | 'crianca' nascidos × per capita / 30
     fixo:   parte fixa, 0–1 (R4 = 0,5; as demais = 0)
     orc:    'sem' (sem orçamento: cada município recebe a sua parte do seu máximo)
           | 'atual' (mesmo orçamento da regra atual: B50/B60) | número (R$ por parcela, base 50% variável)
     sv27:   parte variável em 2027 (padrão 0,6)
     Pesos por tamanho (multiplicam o peso de repartição, população × per capita ou nascidos × per capita ÷ 30; com
     orçamento, o mesmo orçamento é repartido de novo; sem orçamento, o máximo de quem tem peso > 1 sobe):
     margem:    peso dos municípios pequenos (< 20 mil hab., porte de municipios.csv); 1 = nenhum (padrão)
     margemMed: peso dos médios (20–100 mil hab.); 1 = nenhum (padrão)
     afina, afP1, afP2: peso decrescente pela população de 2026: `afina` até afP1 habitantes, caindo em linha reta
                até 1 em afP2 (padrão afina = 1, nenhum; afP1 = 10.000, afP2 = 30.000). Os três pesos se multiplicam.
     Presets (PrefSaoCaetano s12_variantes_pequenos.py, 09/11/2026): R3m = peso único 1,25 para pequenos; R3t = peso
     decrescente 1,30 de 10 mil a 30 mil hab. (a variante recomendada pela s12); R3p = pesos por porte 1,24 / 1,05
     (os calibrados para trás, 1,239 / 1,054, arredondados).
   } */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.IGM = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const VAC = ['Polio', 'Penta', 'Pneumo', 'Triplice'];
  const PONTO_VAC = 1.3;              // pontos por vacina
  const MAX_PONTOS = PONTO_VAC * 4;   // 5,2 dos 10 pontos
  const ZERO = 0.005;                 // R$: abaixo disto conta como "sem dinheiro de vacina"
  const META = 95;                    // meta fixa das faixas da CIB 25/2026
  const PEQUENO = new Set(['<5 mil', '5-10 mil', '10-20 mil']);   // portes de municipios.csv abaixo de 20 mil hab.

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
      porte: r.porte, pequeno: PEQUENO.has(r.porte), pop: +r.pop, pc: +r.percapita, ordem: +r.ordem_painel,
    })).sort((a, b) => a.ordem - b.ordem);
    const idx = new Map(muns.map((m, i) => [m.mun, i]));
    const N = muns.length;
    const pags = csv(t.pagamentos).map(r => ({
      id: r.pagamento, rotulo: r.rotulo, status: r.status, comp: r.bloco_comp, aval: r.bloco_aval,
      j12: [r.janela12_inicio, r.janela12_fim], sv: +r.share_variavel, B: +r.B_rs, doses: r.doses_aval,
    }));
    const pi = new Map(pags.map((p, i) => [p.id, i]));
    const P = pags.length;
    // Para a medida de 12 meses: a parcela cujo bloco AVALIADO é o bloco de comparação desta (comparação exata
    // dos rótulos: 2026-Q2 previsto ≠ P2026-Q2 projetado). -1 = não há; a regra de faixas fica indisponível.
    const comp12 = pags.map(p => pags.findIndex(q => q.aval === p.comp));
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
    // Medianas em precisão cheia (o medianas.csv, com 5 casas, desempataria errado o "c1 >= mediana").
    const med = pags.map((_, p) => VAC.map((_, v) => medianasDe(cob[p].c0[v], cob[p].c1[v])));
    const med12 = pags.map((_, p) => comp12[p] < 0 ? null : VAC.map((_, v) => medianasDe(cob[comp12[p]].c12[v], cob[p].c12[v])));
    const medCsv = t.medianas ? csv(t.medianas) : [];
    return { VAC, muns, idx, pags, N, P, cob, vp, peso, med, med12, comp12, medCsv };
  }
  /* Medianas estaduais de dois valores sobre os municípios com os dois; corte = min(mediana, 95). */
  function medianasDe(c0, c1) {
    const a = [], b = [];
    for (let m = 0; m < c0.length; m++) if (!Number.isNaN(c0[m]) && !Number.isNaN(c1[m])) { a.push(c0[m]); b.push(c1[m]); }
    const m0 = mediana(a), m1 = mediana(b);
    return { m0, m1, corte0: Math.min(m0, META), corte1: Math.min(m1, META), n: a.length };
  }

  /* ---------- pontuação de uma vacina ---------- */
  /* Faixas da CIB 25/2026: parte do ponto de uma vacina, dados c0, c1 e os cortes m0, m1 (a meta de 95% é fixa). */
  function faixa(c0, c1, m0, m1) {
    if (Number.isNaN(c0) || Number.isNaN(c1)) return 0;
    if (c0 >= 95) return c1 >= 95 ? 1 : (c1 >= m1 ? 0.75 : 0);
    if (c0 >= m0) return c1 > c0 ? 1 : (c1 >= m1 ? 0.75 : 0);
    if (c1 > c0 && c1 >= m1) return 1;
    if (c1 >= c0 && c1 < m1) return 0.5;
    return 0;
  }
  /* Rampa: nada no piso, cheio no alvo, linear no meio, só o nível. */
  function proporcional(c, piso, meta) {
    if (Number.isNaN(c)) return 0;
    const s = (c - piso) / (meta - piso);
    return s < 0 ? 0 : (s > 1 ? 1 : s);
  }
  const soma = a => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i]; return s; };
  function contaZero(a) { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] < ZERO) n++; return n; }
  function mediana(a) {
    const s = Array.from(a).sort((x, y) => x - y), n = s.length;
    if (!n) return null;
    return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
  }

  /* ---------- a regra parametrizada ---------- */
  const PADRAO = { medida: 'c12', pont: 'rampa', corte: 'mediana', piso: 80, alvo: 95, aloc: 'hab', fixo: 0, orc: 'atual', sv27: 0.6,
    margem: 1, margemMed: 1, afina: 1, afP1: 10000, afP2: 30000 };
  const MEDIO = new Set(['20-50 mil', '50-100 mil']);
  /* Peso por tamanho de um município na regra (1 = nenhum). */
  function pesoTamanho(spec, m) {
    let w = 1;
    if (+spec.margem !== 1 && m.pequeno) w *= +spec.margem;
    if (+spec.margemMed !== 1 && MEDIO.has(m.porte)) w *= +spec.margemMed;
    if (+spec.afina !== 1) {
      const t = Math.min(1, Math.max(0, (spec.afP2 - m.pop) / (spec.afP2 - spec.afP1)));
      w *= 1 + (spec.afina - 1) * t;
    }
    return w;
  }
  const completa = s => Object.assign({}, PADRAO, s || {});

  /* Valor do ponto por parcela, com a parte variável de 2027 escolhida (padrão: o vp exportado, sem tocar). */
  function vpDe(B, sv27) {
    return B.pags.map((p, i) => {
      if (p.sv !== 0.6 || sv27 === undefined || sv27 === 0.6) return B.vp[i];
      const f = sv27 / 0.6;
      return B.vp[i].map(x => x * f);
    });
  }

  /* Contexto: valor do ponto e orçamento B de cada parcela, sempre pela regra atual (R0) na mesma base de dinheiro. */
  const ctxCache = new WeakMap();
  function contexto(B, sv27) {
    sv27 = sv27 === undefined ? 0.6 : sv27;
    let porB = ctxCache.get(B);
    if (!porB) { porB = {}; ctxCache.set(B, porB); }
    if (porB[sv27]) return porB[sv27];
    const ctx = { sv27, vp: vpDe(B, sv27), orc: [] };
    const r0 = calcular(B, { medida: 'acum', pont: 'faixas', corte: 'mediana', aloc: 'hab', fixo: 0, orc: 'sem', sv27 }, ctx);
    const g = {};
    B.pags.forEach((p, i) => { (g[p.sv] = g[p.sv] || []).push(r0[i].total); });
    const o = {};
    for (const k in g) o[k] = g[k].reduce((a, b) => a + b, 0) / g[k].length;
    ctx.orc = B.pags.map(p => o[p.sv]);
    ctx.r0 = r0;
    porB[sv27] = ctx;
    return ctx;
  }

  /* Orçamento de uma parcela: 'atual' = B50/B60; número = R$ por parcela na base de 50% variável, que em 2027
     cresce com a parte variável (como o máximo cresce). */
  function orcamentoDe(B, spec, ctx, p) {
    if (spec.orc === 'atual') return ctx.orc[p];
    const sv = B.pags[p].sv === 0.6 ? ctx.sv27 : B.pags[p].sv;
    return +spec.orc * sv / 0.5;
  }

  /* Valores comparado (cA) e avaliado (cB) e o denominador do avaliado (para "uma criança a mais"). */
  function valores(B, spec, p, v) {
    const o = B.cob[p];
    if (spec.medida === 'acum') return { cA: o.c0[v], cB: o.c1[v], n: o.nasc[v], cortes: B.med[p][v] };
    const q = B.comp12[p];
    return { cA: q < 0 ? null : B.cob[q].c12[v], cB: o.c12[v], n: o.den12[v], cortes: q < 0 ? null : B.med12[p][v] };
  }

  /* Uma regra sobre as 11 parcelas. Devolve por parcela:
     nd (indisponível), rs (R$ por município), varRs (parte variável), fracao (parte média das 4 vacinas, 0–1),
     total, maximo, zero, partMax (dinheiro ganho ÷ o que se poderia ganhar, antes de repartir o orçamento),
     k (fator do orçamento sobre a parte variável), unidade (R$ por uma vacina cheia, por município),
     partes [vacina][município], cortes [vacina] {m0, m1}; e mudanca (mediana de |Δ fracao| × 100 contra a parcela
     disponível anterior; null na primeira). */
  function calcular(B, spec, ctx) {
    spec = completa(spec);
    ctx = ctx || contexto(B, spec.sv27);
    const VP = ctx.vp, N = B.N, f = +spec.fixo;
    const W = B.muns.map(m => pesoTamanho(spec, m));
    const out = [];
    for (let p = 0; p < B.P; p++) {
      // 1. partes de cada vacina
      const partes = [], cortes = [];
      let nd = false;
      for (let v = 0; v < 4; v++) {
        const { cA, cB, cortes: md } = valores(B, spec, p, v);
        const s = new Float64Array(N);
        if (spec.pont === 'faixas') {
          if (!cA) { nd = true; break; }
          const m0 = spec.corte === 'mediana' ? md.corte0 : +spec.corte, m1 = spec.corte === 'mediana' ? md.corte1 : +spec.corte;
          for (let m = 0; m < N; m++) s[m] = faixa(cA[m], cB[m], m0, m1);
          cortes.push({ m0, m1 });
        } else {
          for (let m = 0; m < N; m++) s[m] = proporcional(cB[m], spec.piso, spec.alvo);
        }
        partes.push(s);
      }
      if (nd) { out.push({ nd: true, total: null, maximo: null, zero: null, partMax: null, mudanca: null }); continue; }
      // 2. soma das partes (0–4) e peso de repartição
      const S = new Float64Array(N), a = new Float64Array(N);
      for (let m = 0; m < N; m++) {
        S[m] = partes[0][m] + partes[1][m] + partes[2][m] + partes[3][m];
        a[m] = (spec.aloc === 'hab' ? VP[p][m] * PONTO_VAC : B.peso[p][m] * B.muns[m].pc / 30) * W[m];
      }
      const rs = new Float64Array(N), varRs = new Float64Array(N), unidade = new Float64Array(N);
      let maximo, k;
      const sa = soma(a);
      if (spec.orc === 'sem') {
        // Sem orçamento: cada município tem um máximo (por habitante: 5,2 × valor do ponto; por criança: o mesmo
        // total do estado repartido pelo peso) e recebe parte fixa + parte variável × fração.
        let Mtot = 0; for (let m = 0; m < N; m++) Mtot += spec.aloc === 'hab' ? MAX_PONTOS * a[m] / PONTO_VAC : MAX_PONTOS * VP[p][m];
        maximo = Mtot;
        for (let m = 0; m < N; m++) {
          const u = spec.aloc === 'hab' ? a[m] : Mtot * a[m] / sa / 4;     // R$ por uma vacina cheia, sem a parte fixa
          varRs[m] = u * S[m] * (1 - f);
          unidade[m] = u * (1 - f);
          rs[m] = (f ? f * 4 * u : 0) + varRs[m];
        }
        k = 1;
      } else {
        const Bp = orcamentoDe(B, spec, ctx, p);
        maximo = Bp;
        let saS = 0; for (let m = 0; m < N; m++) saS += a[m] * S[m];
        k = saS > 0 ? Bp * (1 - f) / saS : 0;
        for (let m = 0; m < N; m++) {
          varRs[m] = saS > 0 ? Bp * (1 - f) * (a[m] * S[m]) / saS : 0;
          unidade[m] = k * a[m];
          rs[m] = (f ? Bp * f * a[m] / sa : 0) + varRs[m];
        }
      }
      const fracao = new Float64Array(N);
      let ganho = 0;
      for (let m = 0; m < N; m++) { fracao[m] = S[m] / 4; ganho += a[m] * (f + (1 - f) * fracao[m]); }
      out.push({ nd: false, rs, varRs, fracao, partes, cortes, unidade, k, total: soma(rs), maximo,
        zero: contaZero(varRs), partMax: ganho / sa, spec });
    }
    let ant = -1;
    out.forEach((o, p) => {
      if (o.nd) return;
      o.mudanca = ant < 0 ? null : mediana(Array.from(o.fracao, (x, m) => Math.abs(x - out[ant].fracao[m]) * 100));
      ant = p;
    });
    return out;
  }

  /* Uma criança a mais, numa parcela, para a regra (o fator do orçamento e os cortes ficam fixos, como no artigo).
     Faixas: pares município × vacina a uma criança de um corte (para cima ou para baixo) e o salto em R$.
     Rampa: R$ por criança a mais dentro da rampa (piso <= c < alvo). Devolve por par e os resumos. */
  function margem(B, spec, res, p, terc) {
    spec = completa(spec);
    const o = res[p];
    if (o.nd) return null;
    const N = B.N, pares = [], pertoMun = new Uint8Array(N);
    for (let v = 0; v < 4; v++) {
      const { cA, cB, n } = valores(B, spec, p, v);
      for (let m = 0; m < N; m++) {
        if (Number.isNaN(cB[m])) continue;
        const passo = n[m] > 0 ? 100 / n[m] : NaN;
        if (spec.pont === 'faixas') {
          const { m0, m1 } = o.cortes[v], sc = o.partes[v][m];
          const up = Number.isNaN(passo) ? 0 : faixa(cA[m], cB[m] + passo, m0, m1);
          const dn = Number.isNaN(passo) ? 0 : faixa(cA[m], cB[m] - passo, m0, m1);
          const salto = Math.max(Math.abs(up - sc), Math.abs(dn - sc));
          if (salto > 1e-9) { pertoMun[m] = 1; pares.push({ m, v, rs: o.unidade[m] * salto }); }
        } else if (cB[m] >= spec.piso && cB[m] < spec.alvo && !Number.isNaN(passo)) {
          pares.push({ m, v, rs: o.unidade[m] * passo / (spec.alvo - spec.piso) });
        }
      }
    }
    const r = { tipo: spec.pont, n: pares.length, mediana: mediana(pares.map(x => x.rs)) };
    if (spec.pont === 'faixas') r.pctMun = 100 * soma(pertoMun) / N;
    else r.pctPares = 100 * pares.length / (4 * N);
    if (terc) r.porTerco = [0, 1, 2].map(t => { const x = pares.filter(z => terc[z.m] === t); return { n: x.length, mediana: mediana(x.map(z => z.rs)) }; });
    return r;
  }

  /* Presets: as regras do artigo e a regra atual com 12 meses. */
  const PRESETS = {
    R0: { medida: 'acum', pont: 'faixas', corte: 'mediana', aloc: 'hab', fixo: 0, orc: 'sem' },
    R0s: { medida: 'c12', pont: 'faixas', corte: 'mediana', aloc: 'hab', fixo: 0, orc: 'sem' },
    R1: { medida: 'acum', pont: 'faixas', corte: 90, aloc: 'hab', fixo: 0, orc: 'sem' },
    R2: { medida: 'acum', pont: 'faixas', corte: 95, aloc: 'hab', fixo: 0, orc: 'sem' },
    R3: { medida: 'c12', pont: 'rampa', piso: 80, alvo: 95, aloc: 'hab', fixo: 0, orc: 'sem' },
    R3b: { medida: 'c12', pont: 'rampa', piso: 80, alvo: 95, aloc: 'hab', fixo: 0, orc: 'atual' },
    R4: { medida: 'c12', pont: 'rampa', piso: 80, alvo: 95, aloc: 'crianca', fixo: 0.5, orc: 'atual' },
    R4v: { medida: 'c12', pont: 'rampa', piso: 80, alvo: 95, aloc: 'crianca', fixo: 0, orc: 'atual' },
    R3m: { medida: 'c12', pont: 'rampa', piso: 80, alvo: 95, aloc: 'hab', fixo: 0, orc: 'atual', margem: 1.25 },
    R3t: { medida: 'c12', pont: 'rampa', piso: 80, alvo: 95, aloc: 'hab', fixo: 0, orc: 'atual', afina: 1.3, afP1: 10000, afP2: 30000 },
    R3p: { medida: 'c12', pont: 'rampa', piso: 80, alvo: 95, aloc: 'hab', fixo: 0, orc: 'atual', margem: 1.24, margemMed: 1.05 },
  };
  Object.keys(PRESETS).forEach(k => { PRESETS[k] = completa(PRESETS[k]); });

  /* ---------- compatibilidade com o motor v1 (as seções copiadas da v1 usam estas funções) ---------- */
  function deV1(s) {
    if (s.medida) return completa(s);
    if (s.tipo === 'faixas') return completa({ medida: 'acum', pont: 'faixas', corte: s.corte, aloc: 'hab', fixo: 0, orc: 'sem' });
    if (s.tipo === 'prop') return completa({ medida: 'c12', pont: 'rampa', piso: s.piso ?? 80, alvo: s.meta ?? 95, aloc: 'hab', fixo: 0, orc: s.orcamento ? 'atual' : 'sem' });
    return completa({ medida: 'c12', pont: 'rampa', piso: s.piso ?? 80, alvo: s.meta ?? 95, aloc: 'crianca', fixo: s.fixa ?? 0.5, orc: 'atual' });
  }
  const regra = (B, spec, ctx) => calcular(B, deV1(spec), ctx);
  const PRESETS_V1 = {
    R0: { tipo: 'faixas', corte: 'mediana' }, R1: { tipo: 'faixas', corte: 90 }, R2: { tipo: 'faixas', corte: 95 },
    R3: { tipo: 'prop', piso: 80, meta: 95, orcamento: false }, R3b: { tipo: 'prop', piso: 80, meta: 95, orcamento: true },
    R4: { tipo: 'crianca', piso: 80, meta: 95, fixa: 0.5 }, R4v: { tipo: 'crianca', piso: 80, meta: 95, fixa: 0 },
  };
  /* Uma criança a mais num município (curva da v1): n crianças a mais no período avaliado, cortes fixos. */
  function criancaAMais(B, p, m, v, n, spec, ctx) {
    ctx = ctx || contexto(B);
    const o = B.cob[p];
    const c0 = o.c0[v][m], c1 = o.c1[v][m], nasc = o.nasc[v][m], c12 = o.c12[v][m], den = o.den12[v][m];
    const c1n = Number.isNaN(c1) || !(nasc > 0) ? c1 : c1 + 100 * n / nasc;
    const c12n = Number.isNaN(c12) || !(den > 0) ? c12 : c12 + 100 * n / den;
    const vp = ctx.vp[p][m] * PONTO_VAC;
    if (spec.tipo === 'faixas') {
      const m0 = spec.corte === 'mediana' ? B.med[p][v].corte0 : spec.corte;
      const m1 = spec.corte === 'mediana' ? B.med[p][v].corte1 : spec.corte;
      return { antes: vp * faixa(c0, c1, m0, m1), depois: vp * faixa(c0, c1n, m0, m1), c1, c1n, m0, m1 };
    }
    const piso = spec.piso ?? 80, meta = spec.meta ?? 95;
    const a = proporcional(c12, piso, meta), d = proporcional(c12n, piso, meta);
    if (spec.tipo === 'prop' && !spec.orcamento) return { antes: vp * a, depois: vp * d, c12, c12n };
    const chave = JSON.stringify(spec);
    ctx.cache = ctx.cache || {};
    const rg = (ctx.cache[chave] = ctx.cache[chave] || regra(B, spec, ctx))[p];
    if (spec.tipo === 'prop') return { antes: vp * a * rg.k, depois: vp * d * rg.k, c12, c12n };
    // por criança: R$ por uma vacina cheia da parte variável (= orçamento variável × peso ÷ Σ peso × soma das partes)
    const fatia = rg.unidade[m];
    return { antes: fatia * a, depois: fatia * d, c12, c12n };
  }

  return { VAC, PONTO_VAC, MAX_PONTOS, ZERO, META, PADRAO, csv, montar, faixa, proporcional, calcular, margem, completa,
    contexto, PRESETS, PRESETS_V1, pesoTamanho, regra, criancaAMais, mediana, soma };
}));
