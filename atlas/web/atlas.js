(async () => {
/* ================= utilidades ================= */
const $ = s => document.querySelector(s);
const K = Math.cos(15 * Math.PI / 180);           // escala de longitude, latitude de referência ~15°S
const nf0 = new Intl.NumberFormat('pt-BR', {maximumFractionDigits: 0});
const nf1 = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: 1, maximumFractionDigits: 1});
const nf2 = new Intl.NumberFormat('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
function brl(v, short = true) {
  if (v == null || isNaN(v)) return '–';
  const a = Math.abs(v);
  if (short && a >= 1e9) return 'R$ ' + nf2.format(v / 1e9) + ' bi';
  if (short && a >= 1e6) return 'R$ ' + nf2.format(v / 1e6) + ' mi';
  if (short && a >= 1e4) return 'R$ ' + nf1.format(v / 1e3) + ' mil';
  return 'R$ ' + nf0.format(v);
}
const pct = v => isFinite(v) ? nf0.format(v * 100) + '%' : '–';
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const title = s => s.toLowerCase().replace(/(^|[\s'(-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/\b(Do|Da|Dos|Das|De|E|D')\b/g, w => w.toLowerCase());
const sum = a => a.reduce((x, y) => x + (y || 0), 0);

/* ================= dados ================= */
// os dados vêm do R2 em versões imutáveis; current.json aponta a versão publicada (sem ele: mesma pasta)
const DATA = await fetch('data/current.json', {cache: 'no-cache'}).then(r => r.ok ? r.json() : null).catch(() => null);
const BASE = DATA ? `data/v/${DATA.v}/` : '';
const BR = await fetch(BASE + 'br.json').then(r => r.json());

/* ================= eixos de tempo ================= */
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const ym = v => { const s = String(v); return MES[+s.slice(4, 6) - 1] + '/' + s.slice(2, 4); };
const AX = {
  parc: {n: BR.meta.parc.length, lbl: i => ym(BR.meta.parc[i]), long: i => ym(BR.meta.parc[i]).replace('/', '/20'), unit: 'parcela federal', year: i => String(BR.meta.parc[i]).slice(0, 4)},
  cic: {n: BR.meta.cic.length, lbl: i => BR.meta.cic[i].replace('.20', '/'), long: i => BR.meta.cic[i].replace('.', ' · '), unit: 'ciclo IGM', year: i => BR.meta.cic[i].slice(3)},
  comp: {n: BR.meta.comp.length, lbl: i => ym(BR.meta.comp[i]), long: i => ym(BR.meta.comp[i]).replace('/', '/20'), unit: 'competência CNES', year: i => String(BR.meta.comp[i]).slice(0, 4)},
};
const T = {parc: AX.parc.n - 1, cic: AX.cic.n - 1, comp: AX.comp.n - 1};
const last12 = (a, i) => sum(a.slice(Math.max(0, i - 11), i + 1));
const IGM_RES = BR.meta.igm_fonte === 'resolucoes';
$('#railNote').innerHTML = `Federal ${AX.parc.long(0)} a ${AX.parc.long(AX.parc.n - 1)}<br>IGM SUS Paulista ${BR.meta.cic[0].slice(3)} a ${BR.meta.cic.at(-1).slice(3)}<br>CNES ${AX.comp.long(0)} a ${AX.comp.long(AX.comp.n - 1)}<br>Atualizado em ${new Date(BR.meta.gerado).toLocaleDateString('pt-BR')}`;
$('#srcIgm').textContent = IGM_RES
  ? 'Resoluções SS da SES-SP, os atos de pagamento de 2024 a 2026 (Res 18 e 140/2024; 13, 97, 180 e 230/2025; 111 e 185/2026), com fixo, variável, ajuste e bônus. Pontuação vacinal do painel público de 2026. Em 2025 o 1º período foi pago com duas parcelas fixas e o variável dos dois primeiros períodos saiu junto, no 2º.'
  : 'Painéis públicos da SES-SP: legado (2024 e 2025, CIB 117/2023) e atual (Q1 e Q2 de 2026, CIB 24 e 25/2026). O legado de 2025 inclui ajustes e difere das resoluções.';

/* ================= geometria ================= */
function decode(rings) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  const rs = rings.map(r => {
    const a = new Float64Array(r.length);
    for (let i = 0; i < r.length; i += 2) {
      const x = r[i] / 1000 * K, y = -r[i + 1] / 1000;
      a[i] = x; a[i + 1] = y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return a;
  });
  return {rings: rs, bb: [x0, y0, x1, y1]};
}
function inside(px, py, rings) {           // par-ímpar sobre todos os anéis (buracos incluídos)
  let c = false;
  for (const r of rings) {
    const n = r.length;
    for (let i = 0, j = n - 2; i < n; j = i, i += 2) {
      const yi = r[i + 1], yj = r[j + 1];
      if ((yi > py) !== (yj > py) && px < (r[j] - r[i]) * (py - yi) / (yj - yi) + r[i]) c = !c;
    }
  }
  return c;
}

const UF = [], ufIdx = {};
for (const [cod, rings] of Object.entries(BR.geo)) {
  const [sg, nome, reg] = BR.ufn[cod];
  ufIdx[cod] = UF.length;
  UF.push({cod, sg, nome, reg, ...decode(rings), d: BR.uf[cod]});
}
const SP = ufIdx['35'];
const BR_TOT = Array.from({length: AX.parc.n}, (_, i) => sum(UF.map(u => u.d.tot[i])));
const BR_POP = sum(UF.map(u => u.d.pop));

// municípios: carregados por UF, sob demanda
const CACHE = {};
let MU = [], muIdx = {}, muUf = -1, AGG = null;
function loadUf(i) {
  const cod = UF[i].cod;
  if (!CACHE[cod]) CACHE[cod] = fetch(`${BASE}uf/${cod}.json`).then(r => r.json()).then(j => {
    const list = [], idx = {};
    for (const [c6, rings] of Object.entries(j.geo)) { idx[c6] = list.length; list.push({cod: c6, nome: j.mun[c6].nome, ...decode(rings), d: j.mun[c6]}); }
    return {list, idx};
  });
  return CACHE[cod];
}
function useUf(i, pack) {
  MU = pack.list; muIdx = pack.idx; muUf = i;
  for (const k in BINS) if (k.startsWith('mu')) delete BINS[k];
  AGG = {
    esf: Array.from({length: AX.comp.n}, (_, j) => sum(MU.map(m => m.d.cnes?.esf[j]))),
  };
  if (i === SP) Object.assign(AGG, {
    igm: Array.from({length: AX.cic.n}, (_, j) => sum(MU.map(m => m.d.igm?.tot[j]))),
    igmFixo: Array.from({length: AX.cic.n}, (_, j) => sum(MU.map(m => m.d.igm?.fixo[j]))),
    igmVar: Array.from({length: AX.cic.n}, (_, j) => sum(MU.map(m => m.d.igm?.var[j]))),
    igmAj: Array.from({length: AX.cic.n}, (_, j) => sum(MU.map(m => m.d.igm?.aj[j]))),
  });
  if (!metricOf('mu')) metric.mu = 'fed';
  recolor();
}
const hasMu = () => level !== 'br' && focusUf === muUf && MU.length > 0;

/* ================= métricas ================= */
const METRICS = {
  uf: [
    {id: 'pc', ax: 'parc', label: 'R$/hab/mês', title: 'Repasse federal APS por habitante no mês', f: (u, i) => u.d.tot[i] / u.d.pop, fmt: v => 'R$ ' + nf2.format(v)},
    {id: 'pc12', ax: 'parc', label: '12 meses R$/hab', title: 'Repasse federal APS por habitante, 12 meses até a parcela', f: (u, i) => last12(u.d.tot, i) / u.d.pop, fmt: v => 'R$ ' + nf0.format(v)},
    {id: 'tot', ax: 'parc', label: 'Total no mês', title: 'Repasse federal APS no mês', f: (u, i) => u.d.tot[i], fmt: v => brl(v)},
  ],
  mu: [
    {id: 'fed', ax: 'parc', label: 'Federal R$/hab', title: 'Repasse federal APS por habitante no mês', f: (m, i) => m.d.pop ? m.d.f.tot[i] / m.d.pop : null, fmt: v => 'R$ ' + nf2.format(v)},
    {id: 'fed12', ax: 'parc', label: '12 meses R$/hab', title: 'Repasse federal APS por habitante, 12 meses até a parcela', f: (m, i) => m.d.pop ? last12(m.d.f.tot, i) / m.d.pop : null, fmt: v => 'R$ ' + nf0.format(v)},
    {id: 'esfpg', ax: 'parc', label: 'eSF pagas/10 mil hab', title: 'eSF pagas pelo Ministério por 10 mil habitantes', f: (m, i) => m.d.pop ? m.d.f.esf_pg[i] / m.d.pop * 1e4 : null, fmt: v => nf2.format(v)},
    {id: 'teto', ax: 'parc', label: 'Uso do teto eSF', title: 'eSF credenciadas ÷ teto de eSF do município', f: (m, i) => m.d.f.esf_teto[i] ? m.d.f.esf_cred[i] / m.d.f.esf_teto[i] : null, fmt: v => pct(v)},
    {id: 'igm', sp: true, ax: 'cic', label: 'IGM R$/hab', title: 'IGM SUS Paulista por habitante no ciclo', f: (m, i) => m.d.igm && m.d.igm.tot[i] != null && m.d.pop ? m.d.igm.tot[i] / m.d.pop : null, fmt: v => 'R$ ' + nf2.format(v)},
    {id: 'pts', sp: true, ax: 'cic', label: 'Pontos IGM', title: 'Pontuação IGM (máx. 10; só no painel 2026)', f: (m, i) => m.d.igm ? m.d.igm.pts[i] : null, fmt: v => nf1.format(v) + ' pts'},
    {id: 'esf', ax: 'comp', label: 'eSF CNES/10 mil hab', title: 'Equipes de Saúde da Família ativas no CNES por 10 mil habitantes', f: (m, i) => m.d.cnes && m.d.pop ? m.d.cnes.esf[i] / m.d.pop * 1e4 : null, fmt: v => nf2.format(v)},
  ],
};
let metric = {uf: 'pc', mu: 'fed'};
const metricsFor = lvl => lvl === 'uf' ? METRICS.uf : METRICS.mu.filter(m => !m.sp || muUf === SP);
const metricOf = lvl => metricsFor(lvl).find(m => m.id === metric[lvl]);
const curLvl = () => level !== 'br' ? 'mu' : 'uf';

const RAMP = ['#CBD6EE', '#A9BBE4', '#8AA2D9', '#5E7FCB', '#2F5BD3', '#0839B5', '#002FA7', '#00207A'];
// faixas fixas por métrica (todas as parcelas/ciclos), para que a cor compare períodos
function bins(vals, n = RAMP.length) {
  const v = vals.filter(x => x != null && isFinite(x) && x > 0).sort((a, b) => a - b);
  if (!v.length) return {q: [], min: 0, max: 0};
  const q = []; for (let i = 1; i < n; i++) q.push(v[Math.floor(i / n * (v.length - 1))]);
  return {q, min: v[0], max: v[v.length - 1]};
}
const BINS = {};
function binsFor(lvl, m) {
  const key = lvl + m.id;
  if (!BINS[key]) {
    const set = lvl === 'uf' ? UF : MU, all = [];
    for (let i = 0; i < AX[m.ax].n; i++) for (const r of set) all.push(m.f(r, i));
    BINS[key] = bins(all);
  }
  return BINS[key];
}
function colorFor(v, b) {
  if (v == null || !isFinite(v) || v <= 0) return '#C7CED8';
  let i = 0; while (i < b.q.length && v > b.q[i]) i++;
  return RAMP[i];
}
function recolor() {
  const mu = metricOf('uf'), bu = binsFor('uf', mu); UF.forEach(u => { u.v = mu.f(u, T[mu.ax]); u.col = colorFor(u.v, bu); });
  const mm = metricOf('mu');
  if (MU.length && mm) { const bm = binsFor('mu', mm); MU.forEach(m => { m.v = mm.f(m, T[mm.ax]); m.col = colorFor(m.v, bm); }); }
  [...UF].sort((a, b) => b.d.tot[T.parc] / b.d.pop - a.d.tot[T.parc] / a.d.pop).forEach((u, i) => u.rank = i + 1);
}

/* ================= vista e grade de pixels ================= */
const cv = $('#map'), ctx = cv.getContext('2d'), wrap = $('#wrap');
let W = 0, H = 0, DPR = 1;
let view = {x0: 0, y0: 0, s: 1};              // tela = (mundo - x0) * s
let grid = null, oldGrid = null;
let level = 'br', focusUf = null, selMu = null; // 'br' | 'uf' | 'mu'
let hover = {uf: -1, mu: -1};
let anim = null, resolveT = 1;

const BR_BB = UF.reduce((b, u) => [Math.min(b[0], u.bb[0]), Math.min(b[1], u.bb[1]), Math.max(b[2], u.bb[2]), Math.max(b[3], u.bb[3])], [1e9, 1e9, -1e9, -1e9]);
function fitView(bb, pad = 0.08, minSpan = 0) {
  let [x0, y0, x1, y1] = bb;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let w = Math.max(x1 - x0, minSpan), h = Math.max(y1 - y0, minSpan * 0.75);
  w *= 1 + pad * 2; h *= 1 + pad * 2;
  const s = Math.min(W / w, H / h);
  return {x0: cx - W / 2 / s, y0: cy - H / 2 / s, s};
}
const levelView = () => level === 'br' ? fitView(BR_BB, .04) : level === 'uf' ? fitView(UF[focusUf].bb, .04) : fitView(MU[selMu].bb, .35, .24);
function cellPx() {               // tamanho do "pixel" em px de tela, por nível
  const base = W < 600 ? 0.8 : 1;
  return (level === 'br' ? 5 : level === 'uf' ? 4 : 6) * base;
}

function buildGrid() {
  const c = cellPx(), cw = c / view.s;              // tamanho da célula no mundo
  const gx0 = Math.floor(view.x0 / cw) * cw, gy0 = Math.floor(view.y0 / cw) * cw;
  const cols = Math.ceil(W / c) + 2, rows = Math.ceil(H / c) + 2;
  const uf = new Int16Array(cols * rows).fill(-1), mu = new Int16Array(cols * rows).fill(-1);
  const withMu = hasMu();
  const vis = (set, on) => on ? set.map((x, i) => i).filter(i => { const b = set[i].bb; return b[2] >= gx0 && b[0] <= gx0 + cols * cw && b[3] >= gy0 && b[1] <= gy0 + rows * cw; }) : [];
  const visUf = vis(UF, true), visMu = vis(MU, withMu);
  let lastU = -1, lastM = -1;
  for (let r = 0; r < rows; r++) {
    const py = gy0 + (r + .5) * cw;
    const ru = visUf.filter(i => UF[i].bb[1] <= py && UF[i].bb[3] >= py);
    const rm = visMu.filter(i => MU[i].bb[1] <= py && MU[i].bb[3] >= py);
    for (let q = 0; q < cols; q++) {
      const px = gx0 + (q + .5) * cw, k = r * cols + q;
      let hit = -1;
      if (lastU >= 0 && ru.includes(lastU) && UF[lastU].bb[0] <= px && UF[lastU].bb[2] >= px && inside(px, py, UF[lastU].rings)) hit = lastU;
      else for (const i of ru) { const b = UF[i].bb; if (b[0] <= px && b[2] >= px && inside(px, py, UF[i].rings)) { hit = i; break; } }
      uf[k] = hit; lastU = hit;
      if (withMu && hit === muUf && rm.length) {
        let mh = -1;
        if (lastM >= 0 && MU[lastM].bb[0] <= px && MU[lastM].bb[2] >= px && MU[lastM].bb[1] <= py && MU[lastM].bb[3] >= py && inside(px, py, MU[lastM].rings)) mh = lastM;
        else for (const i of rm) { const b = MU[i].bb; if (b[0] <= px && b[2] >= px && inside(px, py, MU[i].rings)) { mh = i; break; } }
        mu[k] = mh; if (mh >= 0) lastM = mh;
      }
    }
  }
  const seed = new Float32Array(cols * rows);   // ordem de "revelação" de cada célula
  for (let i = 0; i < seed.length; i++) seed[i] = Math.random();
  return {gx0, gy0, cw, cols, rows, uf, mu, withMu, muUf, seed};
}

/* ================= desenho ================= */
const GAP = 0.16;   // fração da célula que fica vazia entre os pixels
function regionColor(g, k) {
  const u = g.uf[k]; if (u < 0) return null;
  if (level === 'br') return u === hover.uf ? '#101318' : UF[u].col;
  if (u !== focusUf) return u === hover.uf ? '#B9C3D1' : '#D3DAE4';
  if (g.withMu && g.muUf === muUf) {
    const m = g.mu[k];
    if (m < 0) return '#C7CED8';
    if (m === selMu) return '#D9482B';
    if (m === hover.mu) return '#101318';
    return MU[m].col;
  }
  return u === hover.uf ? '#00207A' : UF[u].col;
}
function drawGrid(g, alpha, reveal) {
  const s = view.s, cw = g.cw, size = cw * s, inset = size * GAP / 2, sz = size * (1 - GAP);
  const ox = (g.gx0 - view.x0) * s, oy = (g.gy0 - view.y0) * s;
  const c0 = Math.max(0, Math.floor(-ox / size) - 1), c1 = Math.min(g.cols, Math.ceil((W - ox) / size) + 1);
  const r0 = Math.max(0, Math.floor(-oy / size) - 1), r1 = Math.min(g.rows, Math.ceil((H - oy) / size) + 1);
  const muOk = g.withMu && g.muUf === muUf;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(16,19,24,.075)';            // fundo: o "campo" de pixels fora do território
  const dot = Math.max(1, size * 0.18);
  for (let r = r0; r < r1; r++) for (let q = c0; q < c1; q++) {
    const k = r * g.cols + q; if (g.uf[k] >= 0) continue;
    if (reveal < 1 && g.seed[k] > reveal) continue;
    ctx.fillRect(ox + q * size + size / 2 - dot / 2, oy + r * size + size / 2 - dot / 2, dot, dot);
  }
  const by = new Map();                              // agrupa por cor para reduzir trocas de fillStyle
  for (let r = r0; r < r1; r++) for (let q = c0; q < c1; q++) {
    const k = r * g.cols + q;
    if (reveal < 1 && g.seed[k] > reveal) continue;
    const col = regionColor(g, k); if (!col) continue;
    let a = by.get(col); if (!a) by.set(col, a = []); a.push(q, r);
  }
  for (const [col, a] of by) {
    ctx.fillStyle = col;
    for (let i = 0; i < a.length; i += 2) ctx.fillRect(ox + a[i] * size + inset, oy + a[i + 1] * size + inset, sz, sz);
  }
  // divisas: segmentos em escada nas bordas entre células de regiões diferentes
  edges(g, ox, oy, size, c0, c1, r0, r1, k => g.uf[k], 'rgba(16,19,24,.78)', Math.max(1, size * 0.12));
  if (muOk) edges(g, ox, oy, size, c0, c1, r0, r1, k => g.uf[k] === g.muUf ? g.mu[k] : -2, 'rgba(237,241,245,.95)', Math.max(1, size * (level === 'mu' ? .2 : .26)), true);
  if (level === 'br' && hover.uf >= 0) outline(g, ox, oy, size, c0, c1, r0, r1, k => g.uf[k] === hover.uf, '#101318', Math.max(2, size * .22));
  if (level !== 'br' && hover.uf >= 0 && hover.uf !== focusUf) outline(g, ox, oy, size, c0, c1, r0, r1, k => g.uf[k] === hover.uf, 'rgba(16,19,24,.6)', Math.max(1.5, size * .18));
  if (level !== 'br') outline(g, ox, oy, size, c0, c1, r0, r1, k => g.uf[k] === focusUf, '#101318', Math.max(1.5, size * .2));
  if (muOk && hover.mu >= 0) outline(g, ox, oy, size, c0, c1, r0, r1, k => g.mu[k] === hover.mu, '#101318', Math.max(2, size * .24));
  if (muOk && selMu != null && selMu >= 0) outline(g, ox, oy, size, c0, c1, r0, r1, k => g.mu[k] === selMu, '#D9482B', Math.max(2, size * .26));
  ctx.globalAlpha = 1;
}
function edges(g, ox, oy, size, c0, c1, r0, r1, id, color, lw, onlyInner) {
  ctx.beginPath();
  for (let r = r0; r < r1; r++) for (let q = c0; q < c1; q++) {
    const k = r * g.cols + q, a = id(k);
    if (q + 1 < g.cols) { const b = id(k + 1); if (a !== b && (a >= 0 || b >= 0) && !(onlyInner && (a < 0 || b < 0))) { const x = ox + (q + 1) * size; ctx.moveTo(x, oy + r * size); ctx.lineTo(x, oy + (r + 1) * size); } }
    if (r + 1 < g.rows) { const b = id(k + g.cols); if (a !== b && (a >= 0 || b >= 0) && !(onlyInner && (a < 0 || b < 0))) { const y = oy + (r + 1) * size; ctx.moveTo(ox + q * size, y); ctx.lineTo(ox + (q + 1) * size, y); } }
  }
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square'; ctx.stroke();
}
function outline(g, ox, oy, size, c0, c1, r0, r1, isIn, color, lw) {
  ctx.beginPath();
  for (let r = r0; r < r1; r++) for (let q = c0; q < c1; q++) {
    const k = r * g.cols + q; if (!isIn(k)) continue;
    const x = ox + q * size, y = oy + r * size;
    if (q === 0 || !isIn(k - 1)) { ctx.moveTo(x, y); ctx.lineTo(x, y + size); }
    if (q === g.cols - 1 || !isIn(k + 1)) { ctx.moveTo(x + size, y); ctx.lineTo(x + size, y + size); }
    if (r === 0 || !isIn(k - g.cols)) { ctx.moveTo(x, y); ctx.lineTo(x + size, y); }
    if (r === g.rows - 1 || !isIn(k + g.cols)) { ctx.moveTo(x, y + size); ctx.lineTo(x + size, y + size); }
  }
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square'; ctx.stroke();
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  if (oldGrid && resolveT < 1) drawGrid(oldGrid, 1 - resolveT * .9, 1);
  if (grid) drawGrid(grid, 1, oldGrid ? resolveT : 1);
}
let raf = 0;
const schedule = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; render(); }); };

/* ================= transições ================= */
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
let navId = 0;
function goTo(target, ready) {      // ready: promessa dos dados do nível; a grade fina só sai quando chegam
  const id = ++navId;
  const from = {...view}, t0 = performance.now(), dur = 820;
  oldGrid = null; resolveT = 1;
  cancelAnimationFrame(anim);
  const lerpLog = (a, b, t) => Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
  const fc = [from.x0 + W / 2 / from.s, from.y0 + H / 2 / from.s], tc = [target.x0 + W / 2 / target.s, target.y0 + H / 2 / target.s];
  const step = now => {
    if (id !== navId) return;
    const t = Math.min(1, (now - t0) / dur), e = ease(t);
    const s = lerpLog(from.s, target.s, e), cx = fc[0] + (tc[0] - fc[0]) * e, cy = fc[1] + (tc[1] - fc[1]) * e;
    view = {x0: cx - W / 2 / s, y0: cy - H / 2 / s, s};
    render();
    if (t < 1) anim = requestAnimationFrame(step);
    else { view = target; Promise.resolve(ready).then(() => { if (id === navId) resolve(); }); }
  };
  anim = requestAnimationFrame(step);
}
function resolve() {          // nova grade na resolução do nível, revelada pixel a pixel
  oldGrid = grid; grid = buildGrid(); resolveT = 0;
  const t0 = performance.now(), dur = 520;
  const step = now => {
    resolveT = Math.min(1, (now - t0) / dur);
    render();
    if (resolveT < 1) anim = requestAnimationFrame(step); else { oldGrid = null; render(); }
  };
  anim = requestAnimationFrame(step);
}

function toBrazil() { stop(); level = 'br'; focusUf = null; selMu = null; hover = {uf: -1, mu: -1}; goTo(levelView()); ui(); }
function toUf(i) {
  stop(); level = 'uf'; focusUf = i; selMu = null; hover = {uf: -1, mu: -1};
  const ready = muUf === i ? null : loadUf(i).then(p => { if (focusUf === i) { useUf(i, p); ui(); } });
  goTo(levelView(), ready); ui();
}
function toMu(i) { stop(); level = 'mu'; focusUf = muUf; selMu = i; hover = {uf: -1, mu: -1}; goTo(levelView()); ui(); }
async function toMuCode(cod6, ufCod) {
  const i = ufIdx[ufCod];
  if (muUf !== i) useUf(i, await loadUf(i));
  if (muIdx[cod6] == null) return toUf(i);   // município sem malha (build.py avisa): fica na UF
  toMu(muIdx[cod6]);
}

/* ================= interação no mapa ================= */
function pick(ev) {
  if (!grid) return {uf: -1, mu: -1};
  const r = cv.getBoundingClientRect();
  const sx = ev.clientX - r.left, sy = ev.clientY - r.top;
  const wx = view.x0 + sx / view.s, wy = view.y0 + sy / view.s;
  const q = Math.floor((wx - grid.gx0) / grid.cw), rr = Math.floor((wy - grid.gy0) / grid.cw);
  if (q < 0 || rr < 0 || q >= grid.cols || rr >= grid.rows) return {uf: -1, mu: -1, sx, sy};
  const k = rr * grid.cols + q;
  return {uf: grid.uf[k], mu: grid.withMu && grid.muUf === muUf ? grid.mu[k] : -1, sx, sy};
}
const tip = $('#tip');
function showTip(p) {
  let html = '';
  if (level === 'br' || (p.uf >= 0 && p.uf !== focusUf)) {
    if (p.uf < 0) return hideTip();
    const u = UF[p.uf], m = metricOf('uf');
    html = `<b>${esc(u.nome)}</b><span>${esc(m.label)} <em>${m.fmt(m.f(u, T[m.ax]))}</em> · ${AX[m.ax].lbl(T[m.ax])}</span><span>${u.rank}º de 27 em R$/hab no mês</span><span>${level === 'br' ? 'Clique para aproximar' : 'Clique para ir ao estado'}</span>`;
  } else if (hasMu() && p.mu >= 0) {
    const m = MU[p.mu], mm = metricOf('mu');
    html = `<b>${esc(m.nome)}</b><span>${esc(mm.label)} <em>${m.v == null ? '–' : mm.fmt(m.v)}</em> · ${AX[mm.ax].lbl(T[mm.ax])}</span><span>Pop. <em>${nf0.format(m.d.pop || 0)}</em> · eSF pagas <em>${m.d.f.esf_pg[T.parc]}</em></span><span>Clique para abrir</span>`;
  } else if (p.uf >= 0) {
    const u = UF[p.uf];
    html = `<b>${esc(u.nome)}</b><span>Repasse federal <em>${brl(u.d.tot[T.parc])}</em> · ${AX.parc.lbl(T.parc)}</span>`;
  } else return hideTip();
  tip.innerHTML = html;
  const tw = tip.offsetWidth, th = tip.offsetHeight;
  const x = p.sx + tw + 30 > W ? p.sx - tw - 28 : p.sx, y = p.sy + th + 30 > H ? p.sy - th - 28 : p.sy;
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on');
}
const hideTip = () => tip.classList.remove('on');

cv.addEventListener('mousemove', ev => {
  const p = pick(ev);
  const muH = hasMu() && p.uf === muUf ? p.mu : -1;
  const ufH = (level === 'br' || p.uf !== focusUf) ? p.uf : -1;
  if (ufH !== hover.uf || muH !== hover.mu) { hover = {uf: ufH, mu: muH}; schedule(); hotRank(); }
  cv.style.cursor = (ufH >= 0 || muH >= 0) ? 'pointer' : 'crosshair';
  showTip(p);
});
cv.addEventListener('mouseleave', () => { hover = {uf: -1, mu: -1}; schedule(); hideTip(); hotRank(); });
cv.addEventListener('click', ev => {
  const p = pick(ev);
  if (p.uf < 0) return;
  hideTip();
  if (level === 'br' || p.uf !== focusUf) return toUf(p.uf);
  if (hasMu() && p.mu >= 0 && !(level === 'mu' && p.mu === selMu)) return toMu(p.mu);
});
document.addEventListener('keydown', ev => {
  if (document.activeElement === $('#q')) return;
  if (ev.key === 'Escape') back();
  else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { const ax = metricOf(curLvl()).ax; setT(ax, T[ax] + (ev.key === 'ArrowLeft' ? -1 : 1)); ev.preventDefault(); }
});
function back() { if (level === 'mu') toUf(focusUf); else if (level === 'uf') toBrazil(); }
$('#zout').onclick = back;
$('#zin').onclick = () => { if (level === 'br') toUf(SP); else if (level === 'uf' && hasMu()) toMu(MU.reduce((b, m, j) => (m.d.pop || 0) > (MU[b].d.pop || 0) ? j : b, 0)); };

/* busca: todos os municípios do Brasil */
const q = $('#q'), qr = $('#qr');
const norm = s => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
const NAMES = BR.idx.map(([cod, nome, uf, pop]) => ({cod, nome, uf, pop, n: norm(nome)}));
let qSel = 0, qList = [];
q.addEventListener('input', () => {
  const t = norm(q.value.trim());
  qList = t.length < 2 ? [] : NAMES.filter(x => x.n.includes(t)).sort((a, b) => (b.n === t) - (a.n === t) || (a.n.startsWith(t) ? 0 : 1) - (b.n.startsWith(t) ? 0 : 1) || b.pop - a.pop).slice(0, 10);
  qSel = 0; drawQ();
});
function drawQ() {
  qr.innerHTML = qList.map((x, j) => `<li role="option" data-j="${j}" class="${j === qSel ? 'act' : ''}">${esc(x.nome)}<small>${BR.ufn[x.uf][0]}</small></li>`).join('');
  qr.classList.toggle('on', qList.length > 0);
}
q.addEventListener('keydown', ev => {
  if (ev.key === 'ArrowDown') { qSel = Math.min(qList.length - 1, qSel + 1); drawQ(); ev.preventDefault(); }
  else if (ev.key === 'ArrowUp') { qSel = Math.max(0, qSel - 1); drawQ(); ev.preventDefault(); }
  else if (ev.key === 'Enter' && qList[qSel]) choose(qList[qSel]);
  else if (ev.key === 'Escape') { q.value = ''; qList = []; drawQ(); q.blur(); }
});
qr.addEventListener('mousedown', ev => { const li = ev.target.closest('li'); if (li) choose(qList[+li.dataset.j]); });
q.addEventListener('blur', () => setTimeout(() => qr.classList.remove('on'), 120));
function choose(x) { q.value = ''; qList = []; drawQ(); q.blur(); toMuCode(x.cod, x.uf); }

/* ================= linha do tempo ================= */
let playing = null;
function focusSeries(ax) {      // a série que a linha do tempo desenha: a do recorte em foco
  const m = level === 'mu' && hasMu() ? MU[selMu] : null;
  if (ax === 'parc') return level === 'br' ? BR_TOT : m ? m.d.f.tot : UF[focusUf].d.tot;
  if (ax === 'cic') return m ? (m.d.igm?.tot || []) : (AGG?.igm || []);
  return m ? (m.d.cnes?.esf || []) : (AGG?.esf || []);
}
const focusFmt = (ax, v) => ax === 'comp' ? nf0.format(v || 0) + ' eSF' : brl(v);
function drawTime() {
  const ax = (metricOf(curLvl()) || METRICS.mu[0]).ax, A = AX[ax], ser = focusSeries(ax), mx = Math.max(1, ...ser.map(v => v || 0));
  let ticks = '', prevY = '';
  for (let i = 0; i < A.n; i++) { const y = A.year(i); ticks += `<span>${y !== prevY ? y : ''}</span>`; prevY = y; }
  $('#time').innerHTML = `<button class="play" aria-pressed="${!!playing}" title="${playing ? 'Pausar' : 'Reproduzir a série'}">${playing ? '❚❚' : '▶'}</button>
    <div class="cells"><div class="bars">${Array.from({length: A.n}, (_, i) => `<button aria-current="${i === T[ax]}" data-i="${i}" title="${A.long(i)} · ${focusFmt(ax, ser[i])}"><i style="height:${Math.max(4, (ser[i] || 0) / mx * 100)}%"></i></button>`).join('')}</div>
    <div class="ticks">${ticks}</div></div>
    <div class="now"><b>${A.lbl(T[ax])}</b><span>${A.unit}<br>${focusFmt(ax, ser[T[ax]])}</span></div>`;
  $('#time').querySelectorAll('.bars button').forEach(b => b.onclick = () => { stop(); setT(ax, +b.dataset.i); });
  $('#time .play').onclick = () => playing ? stop() : play();
}
function setT(ax, i) {
  i = Math.max(0, Math.min(AX[ax].n - 1, i));
  if (i === T[ax]) return;
  T[ax] = i; recolor(); schedule(); ui(true);
}
function play() {
  const ax = metricOf(curLvl()).ax;
  if (T[ax] >= AX[ax].n - 1) T[ax] = -1;
  playing = setInterval(() => { if (T[ax] >= AX[ax].n - 1) return stop(); setT(ax, T[ax] + 1); }, ax === 'parc' ? 520 : 900);
  drawTime();
}
function stop() { if (playing) { clearInterval(playing); playing = null; drawTime(); } }

/* ================= painel ================= */
const PLAN_LBL = {esf: ['eSF e eAP', '#002FA7'], acs: ['Agentes comunitários', '#2F5BD3'], sb: ['Saúde bucal', '#5E7FCB'], emulti: ['eMulti', '#8AA2D9'],
  percapita: ['Per capita populacional', '#0839B5'], transicao: ['Incentivo de transição', '#A9BBE4'], demais: ['Demais programas', '#CBD6EE'],
  manut: ['Manutenção nominal', '#7A8597'], promo: ['Promoção da saúde', '#1F9A7E'], outros: ['Outros', '#C7CED8']};
function planBlock(plan, i) {
  const ks = Object.keys(PLAN_LBL).filter(k => plan[k] && plan[k][i] > 0).sort((a, b) => plan[b][i] - plan[a][i]);
  const tot = sum(ks.map(k => plan[k][i]));
  return `<div class="stack">${ks.map(k => `<i style="flex:${plan[k][i]};background:${PLAN_LBL[k][1]}" title="${PLAN_LBL[k][0]}"></i>`).join('')}</div>
  <div class="lines">${ks.map(k => `<div class="line"><i class="dot" style="background:${PLAN_LBL[k][1]}"></i><span class="nm">${PLAN_LBL[k][0]}</span><span class="vv">${brl(plan[k][i])}</span><span class="pp">${pct(plan[k][i] / tot)}</span></div>`).join('')}</div>`;
}
// série em colunas; clicar numa coluna muda o período
function series(vals, ax, stack) {
  const A = AX[ax], mx = Math.max(1, ...vals.map(v => v || 0));
  const col = (v, i) => stack
    ? `<i class="stk${i === T[ax] ? ' on' : ''}" data-ax="${ax}" data-i="${i}" title="${A.long(i)} · ${brl(v)}" style="height:${(v || 0) / mx * 100}%">${stack[i].map(([x, c]) => `<b style="flex:${x || 0};background:${i === T[ax] ? c : c + '88'}"></b>`).join('')}</i>`
    : `<i class="${i === T[ax] ? 'on' : ''}" data-ax="${ax}" data-i="${i}" title="${A.long(i)} · ${ax === 'comp' ? nf0.format(v || 0) : brl(v)}" style="height:${(v || 0) / mx * 100}%"></i>`;
  return `<div class="ser">${vals.map(col).join('')}</div><div class="ser-l"><span>${A.lbl(0)}</span><span>${A.lbl(A.n - 1)}</span></div>`;
}
function rankBlock(items, me, key, fmt, limit) {
  const max = Math.max(...items.map(x => x.v || 0));
  let rows = items.map((x, j) => ({...x, j}));
  if (limit && rows.length > limit) {
    const mi = rows.findIndex(x => x.i === me);
    rows = rows.slice(0, limit).concat(mi >= limit ? [rows[mi]] : []);
  }
  return `<div class="rank">${rows.map(x => `<button class="rk${x.i === me ? ' me' : ''}" data-${key}="${x.i}"><span class="n">${x.j + 1}</span><span class="s">${esc(x.s)}</span><span class="b"><i style="width:${(x.v || 0) / max * 100}%"></i></span><span class="x">${fmt(x.v)}</span></button>`).join('')}</div>`;
}
function hotRank() {
  document.querySelectorAll('.rk').forEach(b => b.classList.toggle('hot', (+b.dataset.uf === hover.uf) || (+b.dataset.mu === hover.mu && hover.mu >= 0)));
}
const delta = (a, i) => i > 0 && a[i - 1] ? (a[i] / a[i - 1] - 1) : null;
const deltaTxt = d => d == null ? '' : `<span style="color:${d < 0 ? 'var(--signal)' : 'var(--ok)'}">${d > 0 ? '+' : ''}${nf1.format(d * 100)}%</span> vs. mês anterior`;

function panelBrazil() {
  const i = T.parc, tot = BR_TOT[i], n = sum(UF.map(u => u.d.n));
  const plan = {}; UF.forEach(u => { for (const [k, v] of Object.entries(u.d.plan)) { plan[k] = plan[k] || Array(AX.parc.n).fill(0); v.forEach((x, j) => plan[k][j] += x); } });
  const m = metricOf('uf');
  const items = UF.map((u, j) => ({i: j, s: u.sg, v: m.f(u, T[m.ax])})).sort((a, b) => b.v - a.v);
  return `<div class="p-head"><span class="k">Brasil · 27 UF</span><h2>Repasse federal da APS</h2><div class="sub">Parcela de ${AX.parc.long(i)} · ${nf0.format(n)} municípios</div></div>
  <div class="p-body">
    <div class="blk"><div class="kpis">
      <div class="kpi wide hl"><div class="v">${brl(tot)}</div><div class="l">transferido no mês · ${deltaTxt(delta(BR_TOT, i))}</div></div>
      <div class="kpi"><div class="v"><small>R$</small>${nf2.format(tot / BR_POP)}</div><div class="l">por habitante no mês</div></div>
      <div class="kpi"><div class="v">${brl(last12(BR_TOT, i)).replace('R$ ', '')}</div><div class="l">12 meses até ${AX.parc.lbl(i)}</div></div>
    </div>${series(BR_TOT, 'parc')}</div>
    <div class="blk"><h3>Para onde vai <em>${AX.parc.lbl(i)}</em></h3>${planBlock(plan, i)}</div>
    <div class="blk"><h3>${esc(m.label)} por estado <em>clique para abrir</em></h3>${rankBlock(items, -1, 'uf', m.fmt)}</div>
  </div>`;
}
function panelUf(ix) {
  const u = UF[ix], d = u.d, i = T.parc;
  const loaded = hasMu(), mm = metricOf('mu');
  let munis = `<div class="blk"><p class="loading">Carregando os ${nf0.format(d.n)} municípios…</p></div>`;
  if (loaded && mm) {
    const mitems = MU.map((x, j) => ({i: j, s: title(x.nome), v: mm.f(x, T[mm.ax])})).filter(x => x.v != null && isFinite(x.v)).sort((a, b) => b.v - a.v);
    munis = `<div class="blk"><h3>${esc(mm.label)} · ${AX[mm.ax].lbl(T[mm.ax])} <em>maiores · clique para abrir</em></h3>${rankBlock(mitems, -1, 'mu', mm.fmt, 12)}</div>`;
  }
  let extra = '';
  if (ix === SP && loaded && AGG && AGG.igm) {
    const c = T.cic;
    const stk = AGG.igm.map((v, j) => [[AGG.igmFixo[j], '#002FA7'], [AGG.igmVar[j], '#8AA2D9'], [AGG.igmAj[j], '#1F9A7E']]);
    extra = `<div class="blk"><h3>IGM SUS Paulista · estado <em>${AX.cic.lbl(c)}</em></h3>
      <div class="kpis"><div class="kpi hl"><div class="v">${brl(AGG.igm[c])}</div><div class="l">transferido no ciclo</div></div>
      <div class="kpi"><div class="v">${brl(AGG.igmVar[c]).replace('R$ ', '')}</div><div class="l">parte variável</div></div></div>
      ${series(AGG.igm, 'cic', stk)}
      <p class="fine" style="margin-top:8px">Azul: fixo · claro: variável · verde: ajuste e bônus. ${IGM_RES ? 'Valores das Resoluções SS (atos de pagamento).' : '2024–25 pelo painel legado (inclui ajustes); 2026 pelo painel atual.'}</p></div>
`;
  }
  if (loaded && AGG) extra += `<div class="blk"><h3>Equipes no CNES <em>${AX.comp.lbl(T.comp)}</em></h3><div class="kpis"><div class="kpi"><div class="v">${nf0.format(AGG.esf[T.comp])}</div><div class="l">eSF ativas</div></div><div class="kpi"><div class="v">${nf0.format(MU.length)}</div><div class="l">municípios</div></div></div>${series(AGG.esf, 'comp')}</div>`;
  return `<div class="p-head"><span class="k">${esc(u.reg)} · ${u.sg}</span><h2>${esc(u.nome)}</h2><div class="sub">${nf0.format(d.n)} municípios · ${nf0.format(d.pop)} hab · ${u.rank}º de 27 em R$/hab · ${AX.parc.lbl(i)}</div></div>
  <div class="p-body">
    <div class="blk"><div class="kpis">
      <div class="kpi wide hl"><div class="v">${brl(d.tot[i])}</div><div class="l">repasse federal da APS · ${AX.parc.lbl(i)} · ${deltaTxt(delta(d.tot, i))}</div></div>
      <div class="kpi"><div class="v"><small>R$</small>${nf2.format(d.tot[i] / d.pop)}</div><div class="l">por habitante no mês</div></div>
      <div class="kpi"><div class="v">${brl(last12(d.tot, i)).replace('R$ ', '')}</div><div class="l">12 meses até ${AX.parc.lbl(i)}</div></div>
    </div>${series(d.tot, 'parc')}</div>
    <div class="blk"><h3>Para onde vai <em>${AX.parc.lbl(i)}</em></h3>${planBlock(d.plan, i)}</div>
    ${extra}${munis}
  </div>`;
}
const CLS = {'ÓTIMO': 'ot', 'BOM': 'bo', 'SUFICIENTE': 'su', 'REGULAR': 're'};
const HCOL = {'4': '#002FA7', '3': '#5E7FCB', '2': '#8AA2D9', '1': '#B3C3E6', '0': '#C9A227', 'x': '#D9482B', '.': ''};
const HLBL = {'4': 'paga 100%', '3': 'paga 75%', '2': 'paga 50%', '1': 'paga 25%', '0': 'válida, composição inválida', 'x': 'inválida', '.': 'sem registro'};
const HW = {'4': 1, '3': .75, '2': .5, '1': .25};
let showAllTeams = false;
// valor estimado por equipe: repasse do componente no mês ÷ soma dos pesos de composição das equipes pagas
function teamEstimates(d, i) {
  const w = {eSF: 0, eAP: 0}; d.teams.forEach(t => w[t.c] += HW[t.h[i]] || 0);
  const unit = {eSF: w.eSF ? d.f.esf[i] / w.eSF : 0, eAP: w.eAP ? d.f.eap[i] / w.eAP : 0};
  let gain = 0, partial = 0, invalid = 0;
  d.teams.forEach(t => { const c = t.h[i]; if (c === '.') return; const ww = HW[c] || 0; if (ww < 1) { gain += (1 - ww) * unit[t.c]; if (ww > 0) partial++; else invalid++; } });
  return {unit, gain, partial, invalid};
}
function panelMu(ix) {
  const m = MU[ix], d = m.d, f = d.f, i = T.parc, c = T.cic, ig = d.igm, sp = muUf === SP;
  const vacN = ['Pól', 'Pen', 'Pnm', 'Trí', 'HPV♀', 'HPV♂'], vacMax = [1.3, 1.3, 1.3, 1.3, .4, .4];
  const vacFull = ['Poliomielite', 'Pentavalente', 'Pneumocócica', 'Tríplice viral', 'HPV meninas', 'HPV meninos'];
  const vac = v => `<div class="vac">${v.map((x, j) => { const k = Math.round((x || 0) / vacMax[j] * 4); return `<div title="${vacFull[j]}: ${nf2.format(x || 0)} de ${nf1.format(vacMax[j])}"><div class="px">${[3, 2, 1, 0].map(r => `<i class="${r < k ? 'f' : ''}"></i>`).join('')}</div><span>${vacN[j]}</span></div>`; }).join('')}</div>`;
  const per = d.pop ? f.tot[i] / d.pop : null;
  const line = (col, nm, v) => v ? `<div class="line"><i class="dot" style="background:${col}"></i><span class="nm">${nm}</span><span class="vv">${brl(v)}</span><span class="pp">${pct(v / f.tot[i])}</span></div>` : '';
  const comp = `<div class="lines" style="margin-top:12px">
      ${line('#002FA7', `eSF · ${f.esf_pg[i]} pagas de ${f.esf_cred[i]} credenciadas`, f.esf_l[i])}
      ${line('#8AA2D9', `eAP · ${f.eap_pg[i]} pagas`, f.eap_l[i])}
      ${line('#5E7FCB', 'Saúde bucal', f.sb[i])}
      ${line('#B3C3E6', 'eMulti', f.emulti[i])}
      ${line('#7A8597', 'Agentes comunitários', f.acs[i])}
    </div>`;
  const teto = f.esf_teto[i] && f.esf_teto[i] > f.esf_cred[i] ? `<p class="fine" style="margin-top:10px">Teto de ${f.esf_teto[i]} eSF para a população; ${f.esf_cred[i]} credenciadas. Cabem mais ${f.esf_teto[i] - f.esf_cred[i]}.</p>` : '';

  let igmBlk = '';
  if (sp) {
    igmBlk = '<p class="empty">Sem registro no IGM.</p>';
    if (ig) {
      const stk = ig.tot.map((v, j) => [[ig.fixo[j], '#002FA7'], [ig.var[j], '#8AA2D9'], [ig.aj[j], '#1F9A7E']]);
      const parts = [['fixo', ig.fixo[c]], ['variável', ig.var[c]], ['ajuste e bônus', ig.aj[c]]].filter(x => x[1]);
      const nota = ig.nota && ig.nota[BR.meta.cic[c]];
      igmBlk = `<div class="kpis"><div class="kpi hl"><div class="v">${brl(ig.tot[c])}</div><div class="l">no ciclo ${AX.cic.lbl(c)}</div></div>
        <div class="kpi"><div class="v">${ig.pts[c] != null ? nf1.format(ig.pts[c]) : '–'}<small style="margin-left:3px">/10</small></div><div class="l">pontos ${ig.pts[c] != null ? '' : '(só 2026)'}</div></div></div>
        ${parts.length ? `<p class="fine" style="margin-top:8px">${parts.map(([a, b]) => `${a} ${brl(b)}`).join(' · ')}</p>` : ''}
        ${ig.res && ig.res[BR.meta.cic[c]] ? `<p class="fine" title="${esc(nota || '')}">Fonte: ${esc(ig.res[BR.meta.cic[c]])}${/2025/.test(BR.meta.cic[c]) ? '. Em 2025 o 1º período foi pago com duas parcelas fixas e o variável dos dois primeiros saiu junto no 2º; compare pelo ano.' : ''}</p>` : ''}
        ${series(ig.tot, 'cic', stk)}
        ${ig.vac && ig.vac[c] ? vac(ig.vac[c]) + `<p class="fine" style="margin-top:6px">Pixels: pontos por vacina no ciclo (cheio = máximo).</p>` : ''}`;
    }
    igmBlk = `<div class="blk"><h3>IGM SUS Paulista <em>${AX.cic.lbl(c)}</em></h3>${igmBlk}</div>`;
  }
  const cnesBlk = d.cnes ? `<div class="blk"><h3>Equipes no CNES <em>${AX.comp.lbl(T.comp)}</em></h3><div class="kpis">
        <div class="kpi"><div class="v">${d.cnes.esf[T.comp]}</div><div class="l">eSF</div></div>
        <div class="kpi"><div class="v">${d.cnes.esb[T.comp]}</div><div class="l">eSB</div></div>
        <div class="kpi"><div class="v">${d.cnes.emulti[T.comp]}</div><div class="l">eMulti</div></div>
        <div class="kpi"><div class="v">${d.cnes.eap[T.comp]}</div><div class="l">eAP</div></div>
      </div>${series(d.cnes.esf, 'comp')}<p class="fine" style="margin-top:6px">eSF ativas por competência</p></div>` : '';

  let teams = '';
  if (d.teams) {
    const e = teamEstimates(d, i);
    const act = d.teams.filter(t => t.h[i] !== '.');
    const list = showAllTeams ? d.teams : d.teams.slice(0, 40);
    let grp = '';
    const rows = list.map(t => {
      const g = t.c !== grp ? `<tr class="tgrp"><td colspan="3">${t.c}</td></tr>` : ''; grp = t.c;
      const h = t.h[i], v = (HW[h] || 0) * e.unit[t.c];
      const strip = `<div class="hist" title="Situação por parcela, ${AX.parc.lbl(0)} a ${AX.parc.lbl(AX.parc.n - 1)}">${[...t.h].map((x, j) => `<i class="${j === i ? 'on' : ''}" style="${HCOL[x] ? 'background:' + HCOL[x] : ''}"></i>`).join('')}</div>`;
      return g + `<tr><td>${esc(title(t.n))}<span class="u">CNES ${esc(t.e)} · INE ${esc(t.i)}</span>${strip}</td><td><span class="st" style="background:${HCOL[h] || 'var(--bg-2)'}"></span><span class="fine">${HLBL[h]}</span></td><td class="m r">${v ? brl(v, false) : '–'}</td></tr>`;
    }).join('');
    teams = `<div class="blk"><h3>eSF e eAP no repasse <em>${AX.parc.lbl(i)}</em></h3>
      <div class="est"><b>Valores estimados.</b> O Ministério publica o repasse de cada componente e a situação de cada equipe, não o valor pago a cada uma. Aqui, o valor por equipe é o repasse do componente na parcela dividido pelas equipes pagas, ponderado pela composição (100, 75, 50 ou 25%). É o valor bruto da regra, antes dos descontos do município; as linhas eSF e eAP acima são o repasse líquido, já com os descontos. A oportunidade de aumento aplica esse valor médio ao que faltou para as equipes pagas em parte ou não pagas chegarem a 100%.</div>
      ${e.gain > 1 ? `<div class="gain"><div class="v">+ ${brl(e.gain)}</div><div class="l">oportunidade de aumento no mês (estimativa): o repasse se ${e.partial} equipe(s) paga(s) em parte e ${e.invalid} inválida(s) chegassem a 100%.</div></div>` : ''}
      <div class="kpis" style="margin-bottom:14px">
        <div class="kpi"><div class="v">${act.length}</div><div class="l">equipes no relatório</div></div>
        <div class="kpi"><div class="v">${brl(e.unit.eSF, false).replace('R$ ', '')}</div><div class="l">R$ por eSF 100% no mês (estimado, bruto)</div></div>
      </div>
      <table class="teams"><thead><tr><th>Equipe</th><th>Situação</th><th class="r">R$/mês est.</th></tr></thead><tbody>${rows}</tbody></table>
      ${d.teams.length > 40 ? `<button class="more" id="moreTeams">${showAllTeams ? 'Mostrar menos' : `Mostrar as ${d.teams.length} equipes`}</button>` : ''}
      <p class="fine" style="margin-top:10px">Faixa: uma coluna por parcela (azul = paga, tons claros = parcial, vermelho = inválida).</p></div>`;
  } else if (!sp) {
    teams = `<div class="blk"><p class="fine">Situação de cada equipe no repasse e IGM: por enquanto, só em São Paulo.</p></div>`;
  }
  const uf = UF[muUf];
  return `<div class="p-head"><span class="k">${esc(uf.nome)} · IBGE ${m.cod}</span><h2>${esc(title(m.nome))}</h2><div class="sub">${nf0.format(d.pop || 0)} hab${d.faixa ? ` · faixa IGM R$ ${d.faixa}/hab` : ''} · ${esc((d.eq || '').toLowerCase())}</div></div>
  <div class="p-body">
    <div class="blk"><h3>Federal · APS <em>${AX.parc.lbl(i)}</em></h3>
      <div class="kpis">
        <div class="kpi hl"><div class="v">${brl(f.tot[i])}</div><div class="l">repasse no mês</div></div>
        <div class="kpi"><div class="v"><small>R$</small>${per == null ? '–' : nf2.format(per)}</div><div class="l">por habitante</div></div>
        <div class="kpi wide"><div class="v">${brl(last12(f.tot, i))}</div><div class="l">12 meses até ${AX.parc.lbl(i)} · ${deltaTxt(delta(f.tot, i))}</div></div>
      </div>
      ${series(f.tot, 'parc')}
      <div class="badges" style="margin-top:12px">
        <span class="badge ${CLS[d.vin] || ''}">Vínculo <b>${esc(d.vin || '–')}</b></span>
        <span class="badge ${CLS[d.qual] || ''}">Qualidade <b>${esc(d.qual || '–')}</b></span>
      </div>
      ${comp}${teto}
    </div>
    ${igmBlk}${cnesBlk}${teams}
  </div>`;
}

function ui(keepScroll) {
  const pnl = $('#panel'), body = pnl.querySelector('.p-body'), st = keepScroll && body ? body.scrollTop : 0;
  pnl.innerHTML = level === 'br' ? panelBrazil() : level === 'uf' ? panelUf(focusUf) : panelMu(selMu);
  pnl.querySelector('.p-body').scrollTop = st;
  pnl.querySelectorAll('.rk').forEach(b => {
    b.onclick = () => b.dataset.uf != null ? toUf(+b.dataset.uf) : toMu(+b.dataset.mu);
    b.onmouseenter = () => { hover = b.dataset.uf != null ? {uf: +b.dataset.uf, mu: -1} : {uf: -1, mu: +b.dataset.mu}; schedule(); };
    b.onmouseleave = () => { hover = {uf: -1, mu: -1}; schedule(); };
  });
  pnl.querySelectorAll('.ser i').forEach(b => b.onclick = () => { stop(); setT(b.dataset.ax, +b.dataset.i); });
  const mt = pnl.querySelector('#moreTeams'); if (mt) mt.onclick = () => { showAllTeams = !showAllTeams; ui(true); };
  // trilha
  const cr = [];
  cr.push(level === 'br' ? `<span class="cur">Brasil</span>` : `<button data-go="br">Brasil</button>`);
  if (level !== 'br') { cr.push('<span class="sep">/</span>'); cr.push(level === 'uf' ? `<span class="cur">${esc(UF[focusUf].nome)}</span>` : `<button data-go="uf">${esc(UF[focusUf].nome)}</button>`); }
  if (level === 'mu') { cr.push('<span class="sep">/</span>'); cr.push(`<span class="cur">${esc(title(MU[selMu].nome))}</span>`); }
  $('#crumbs').innerHTML = cr.join('');
  $('#crumbs').querySelectorAll('button').forEach(b => b.onclick = () => b.dataset.go === 'br' ? toBrazil() : toUf(focusUf));
  // métricas, legenda e linha do tempo
  const lvl = curLvl(), mm = metricOf(lvl) || METRICS.mu[0];
  $('#metrics').innerHTML = metricsFor(lvl).map(m => `<button aria-pressed="${metric[lvl] === m.id}" data-m="${m.id}">${esc(m.label)}</button>`).join('');
  $('#metrics').querySelectorAll('button').forEach(b => b.onclick = () => { stop(); metric[lvl] = b.dataset.m; recolor(); ui(true); schedule(); });
  const bb = lvl === 'mu' && !MU.length ? {min: 0, max: 0} : binsFor(lvl, mm);
  $('#lgT').textContent = mm.title + ' · ' + AX[mm.ax].lbl(T[mm.ax]);
  $('#lgS').innerHTML = RAMP.map(c => `<i style="background:${c}"></i>`).join('');
  $('#lgA').textContent = mm.fmt(bb.min); $('#lgB').textContent = mm.fmt(bb.max);
  $('#hint').innerHTML = level === 'br' ? 'Passe o cursor sobre um estado<br>clique para aproximar · ← → muda o mês' : 'Clique num município<br>Esc ou − volta · ← → muda o período';
  $('#zin').disabled = level === 'mu';
  $('#zout').disabled = level === 'br';
  drawTime();
}

/* ================= início ================= */
function resize() {
  const r = wrap.getBoundingClientRect();
  W = r.width; H = r.height; DPR = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  view = levelView(); grid = buildGrid(); oldGrid = null; render();
}
let rt; new ResizeObserver(() => { clearTimeout(rt); rt = setTimeout(resize, 80); }).observe(wrap);
recolor(); ui();
resize();
// entrada: o Brasil se monta pixel a pixel
oldGrid = {...grid, uf: new Int16Array(grid.uf.length).fill(-1), mu: new Int16Array(grid.uf.length).fill(-1)}; resolveT = 0;
(function intro(t0) { const step = now => { resolveT = Math.min(1, (now - t0) / 1100); render(); if (resolveT < 1) requestAnimationFrame(step); else { oldGrid = null; render(); } }; requestAnimationFrame(step); })(performance.now());
})();
