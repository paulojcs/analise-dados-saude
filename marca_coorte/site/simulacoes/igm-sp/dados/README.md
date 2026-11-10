# IGM SUS Paulista vaccine-money simulator: data export

Version 1.2 (2026-11-10). Public data behind the state simulator page (`../index.html`), exported so that another front end can
rebuild the page and recompute the payment rules in the browser with user-chosen parameters. Everything here is public
and aggregated to the municipality (no person-level data). All 645 municipalities of the state of São Paulo.

Scope: the four infant-vaccine indicators of the IGM SUS Paulista (São Paulo state primary-care incentive):
Polio, Penta, Pneumo (pneumococcal) and Triplice (MMR, first dose).

## Files

| File | Rows | What |
|---|---|---|
| `dados_simulacao_igm.json` | 1 object | The exact data object `D` the current page uses (same keys). Compact UTF-8 JSON. |
| `municipios.csv` | 645 | Municipality names, codes, region, size class, population, per capita tier. |
| `pagamentos.csv` | 11 | The 11 payments (Sep 2024 to Dec 2027): windows, status, variable share, budget B. |
| `medianas.csv` | 44 | State medians and capped cut-offs per payment and vaccine. |
| `cobertura.csv.gz` | 28,380 | Payment x municipality x vaccine coverages (c0, c1, c12) and denominators. |
| `municipio_pagamento.csv.gz` | 7,095 | Payment x municipality: point value and births used for the per-child weight. |
| `nascidos.csv.gz` | 22,498 | Live births (SINASC) per municipality, year (2023-2025) and month. |
| `cobertura_alternativas_2026.csv.gz` | 20,640 | Four coverage constructions for the two 2026 payments (19/09/2026 reading). |
| `municipios.geojson` | 645 features | Light municipality boundaries (WGS84). |
| `referencia.json` | 1 object | Results a recomputation must reproduce, with tolerances (unit test). |

CSV conventions: UTF-8 without BOM, comma separator, dot decimal, header row, `\n` line ends; empty field = missing.
`.csv.gz` is plain gzip. Municipality key everywhere is `mun`, the 6-digit IBGE code (integer); `ibge7` is the
7-digit code with check digit. Coverage is in percent (can exceed 100). Money is in reais (R$) unless the field ends
in `_mi` (R$ million). Payment labels are `YYYY-MM` of the month the state pays (`2026-09` = September 2026).
Four-month blocks are `YYYY-Qn`: Q1 = Jan-Apr, Q2 = May-Aug, Q3 = Sep-Dec; a `P` prefix (`P2026-Q3`) marks a
projected block.

### municipios.csv
`mun`, `ibge7`, `municipio` (name), `drs` (Departamento Regional de Saúde, 17), `rras` (Rede Regional de Atenção à
Saúde), `regiao_saude` (health region), `porte` (size class by 2026 population: `<5 mil` ... `>500 mil`),
`pop` (2026 population used by SES), `percapita` (SES per capita tier, R$ per inhabitant per year: 4, 15, 25, 30, 35
or 40), `ordem_painel` (0-based index of the municipality in every array of `dados_simulacao_igm.json`; alphabetical).

### pagamentos.csv
`pagamento`, `rotulo` (English label), `status` (`observed`: both blocks observed in the federal panel;
`forecast`: Dec 2026, the Jan-Aug 2026 block is forecast; `projection`: 2027), `bloco_comp` / `bloco_aval`
(comparison and evaluated four-month blocks), `janela12_inicio` / `janela12_fim` (the 12 months ending at the end
of the evaluated block, for c12), `share_variavel` (variable share of the IGM money: 0.5 up to Dec 2026, 0.6 in 2027),
`sinasc_ano_comp` / `sinasc_ano_aval` (SINASC birth year in the denominator of c0 / c1; also the year of the births
used for the per-child weight, from `bloco_aval`), `doses_aval` (source of the evaluated block's doses: `observed`,
`forecast_janapr2026_pace` = Jan-Apr 2026 monthly pace kept to August, `projection_2025_pace` = each municipality's
2025 monthly doses, flat), `B_rs` (budget B of the regime, R$, see rules).

### medianas.csv
Per `pagamento` x `vacina`: `n_ambos` (municipalities with both c0 and c1), `mediana_c0`, `mediana_c1` (state
medians over those municipalities, uncapped), `corte_c0`, `corte_c1` (= min(median, 95), the cut-offs R0 uses),
`mediana_c12` (median of c12 over municipalities with a value; descriptive only).

### cobertura.csv.gz
Per `pagamento` x `mun` x `vacina`:
- `c0`, `c1`: SES-style "official accumulated" coverage of the comparison and evaluated blocks: doses recorded from
  January to the end of the block, over the SINASC births of the same months of the PREVIOUS year (2024 blocks:
  SINASC 2023; 2025 and 2026 blocks: SINASC 2024, as SES did; 2027 blocks: SINASC 2024 too, see note 3). Exception: 2023-Q3 (the
  comparison of Sep 2024) uses SINASC 2023 because SINASC 2022 was not loaded.
- `c12`: 12-month coverage, doses of the 12 months ending at `janela12_fim` over the federal panel's own
  denominator for those months (projection months, 2026 and 2027: the SINASC month of SINASC 2024).
- `nasc_aval`: births in the denominator of c1. `den12`: denominator of c12 (may be fractional).
Values are full-precision doubles. Parse them exactly (JS `parseFloat`/`Number` does; in pandas use
`float_precision="round_trip"`) and do NOT round before comparing: see caveat 6.

### municipio_pagamento.csv.gz
Per `pagamento` x `mun`: `vp` (point value, R$ = pop x percapita / 3 x share_variavel / 10, rounded to 5 decimals)
and `nasc_ano_peso` (births of the whole SINASC year `sinasc_ano_aval`, for the per-child weight).

### nascidos.csv.gz
`mun`, `ano` (2023, 2024, 2025), `mes` (1-12), `nv` (live births by mother's residence, SINASC; 2025 preliminary).
Records with unknown municipality are excluded. Sum over `mes` for annual births.

### cobertura_alternativas_2026.csv.gz
`pagamento` (2026-06, 2026-09), `construcao`, `mun`, `vacina`, `c0`, `c1` (rounded to 5 decimals), all on the federal
panel read on 19/09/2026. Constructions: `oficial` (cumulative from January over the panel's denominator, as SES),
`anual` (same doses over a flat share of 2024 annual births: births x months / 12), `yoy` (the same months a year
apart: Jun 2026 compares Jan-Dec 2024 with Jan-Dec 2025, Sep 2026 compares Jan-Apr 2025 with Jan-Apr 2026),
`r12` (rolling 12 months: Jun 2026 compares Sep 2024-Aug 2025 with Jan-Dec 2025; Sep 2026 compares Jan-Dec 2025 with
May 2025-Apr 2026). Municipalities without a value are absent. These feed the "Como o estado paga" tab
(`alt`, `altCob`, `altCorte`, `altRes` in the data object), where the money also includes the other IGM points, the
bonus and the 10-point limit, so they are not on the money basis of `referencia.json`.

### municipios.geojson
IBGE municipal mesh (downloaded 2026-10-07), simplified with a 700 m tolerance in EPSG:5880 (the same simplification the page's SVG
map uses), reprojected to WGS84 (EPSG:4326), coordinates rounded to 4 decimals (~10 m). Properties: `mun`, `ibge7`,
`municipio`. Features in `ordem_painel` order. For display only; adjacent borders may not match exactly.

### dados_simulacao_igm.json (the page's data object)
Arrays indexed by municipality follow `ordem_painel`. Money in R$. Main keys:
- `mun`: [code, name, DRS, size class, population]. `portes`, `vacinas`: labels. `scs`: index of São Caetano do Sul.
- `pts`, `var`, `cob`, `corte` (two 2026 payments, `jun` = Jun 2026, `set` = Sep 2026), built from the coverages SES
  published, with scenarios `denominator|cut` (denominators `oficial`, `anual`, `atualizado`, `atualizado_anual`;
  cuts `mediana`, `fixo90`, `fixo95`). `pts` = one digit per vaccine per municipality (0 = 0, 1 = 0.5, 2 = 0.75,
  3 = 1 of 1.3 points; 4 digits per municipality); `var` = whole IGM variable money including other indicators, bonus
  and the 10-point limit; `cob` = [c0 array, c1 array] per denominator and vaccine; `corte` = [cut c0, cut c1].
- `releitura`: Jan-Apr 2026 vaccinated as SES read them vs the 19/09/2026 re-reading, where they differ.
- `mapa`: SVG paths of the map (projected, w x h). `nasc2024`: state births by month 2024. `nasc`: births per
  municipality, Jan 2024-Dec 2025. `razao`, `calpol`, `dez`, `dezv`, `jan`, `quad`, `alt`, `altCob`, `altCorte`,
  `altRes`, `divergencias`, `pubZeroVac`, `vacSetS0`, `setRef`, `publicado`: figures of the "Como o estado paga"
  and December tabs.
- `pags`, `status`: the 11 payments. `reg[rule]`: per payment `tot` (R$ mi), `max`, `zero`, `mch`, `perto`, `salto`,
  `faixa`, `marg` (same meaning as the paper's Table 2 / Figure G). `pagoEst`: vaccine money as paid by the state,
  Jun and Sep 2026 [paid R$ mi, max R$ mi, municipalities with zero].
- `pmun`: per municipality and payment: `pop`, `pc` (per capita), `sv` (variable share), `k` (R3b factor),
  `q[R0|R1|R2]` (vaccine points summed over the 4 vaccines as letters a..q = 0..16 quarters of 1.3 points),
  `r3` (R3 share of maximum, thousandths), `r3b`, `r4`, `r4v` (R$, integers).
- `cr` ("one more child" tab, Sep 2026), `defs` (coverage definitions), `atraso` (late recording), `dez2` (two
  December forecasts).

### referencia.json
`pagamentos`, `status`; `B_rs` (budget per variable-share regime, keys `"0.5"`, `"0.6"`); `k_R3b` (per payment);
`regras[rule]`: per payment `total_mi`, `maximo_mi`, `mun_zero`, `mediana_mudanca_fracao_max_pp` (null for the
first payment); `municipios[mun]`: `municipio`, `pop`, `percapita`, `pontos_R0` (vaccine points under R0) and
`rs[rule]` (money per payment) for São Paulo (355030), Santo André (354780), Ribeirão Preto (354340), São Caetano do
Sul (354880) and Borá (350720, the smallest municipality); `tolerancias`. The numbers come from the analysis outputs,
not from a recomputation; the Python twin of the website test (recomputes everything from these files) passes.

## Money basis

Constant across all 11 payments, so that only the rule changes: 2026 population and SES per capita; point value
`vp = pop x percapita / 3 x share_variavel / 10` (the variable part of one four-month installment divided into 10
points); variable share 50% up to Dec 2026 and 60% in 2027 (CIB 24/2026); each vaccine is worth 1.3 points, so the
vaccine maximum is `5.2 x vp` per municipality. The IGM 10-point limit is ignored and the other IGM indicators and
the maternal bonus are not used: vaccine money is treated as its own budget ("pre-cap vaccine money").

## Rules (score per municipality x vaccine x payment, money = vp x 1.3 x share summed over the 4 vaccines)

- **R0, current (CIB 25/2026 bands vs the state median, capped at 95).** Cuts m0 = min(median c0, 95),
  m1 = min(median c1, 95), medians over municipalities with both values. Share:
  - c0 >= 95: 1 if c1 >= 95; 0.75 if m1 <= c1 < 95; else 0.
  - m0 <= c0 < 95: 1 if c1 > c0; 0.75 if c1 <= c0 and c1 >= m1; else 0.
  - c0 < m0: 1 if c1 > c0 and c1 >= m1; 0.5 if c1 >= c0 and c1 < m1; else 0 (note: c1 = c0 >= m1 gives 0).
  - c0 or c1 missing: 0. Comparisons are on the full-precision values.
- **R1, R2 (fixed cuts).** Same bands with m0 = m1 = 90 (R1) or 95 (R2).
- **R3, proportional 80-95, 12 months.** share = clip((c12 - 80) / 15, 0, 1); missing c12 = 0. Level only, no
  comparison block. Unscaled (its total is whatever the shares add up to).
- **R3b, budgeted.** R3 money x k, one state factor per payment: k = B / (state total of R3). B per regime =
  mean R0 state total over the payments with the same variable share (B50 over the eight 50% payments Sep 2024-Dec
  2026, incl. the Dec 2026 forecast; B60 over the three 2027 payments).
- **R4, per child 50/50.** weight w = nasc_ano_peso x percapita / 30; sbar = mean R3 share over the 4 vaccines.
  Money = B/2 x w / sum(w) + B/2 x (w x sbar) / sum(w x sbar).
- **R4v, per child, all variable.** Money = B x (w x sbar) / sum(w x sbar).

Summaries: `mun_zero` = municipalities with less than R$ 0.005 of vaccine money (R4: of its variable part).
Share of maximum = points / 5.2 (R0-R3) or sbar (R3b, R4, R4v); `mediana_mudanca_fracao_max_pp` = median over
municipalities of |share this payment - share previous payment| x 100. `maximo_mi` = sum of 5.2 x vp (R0-R3) or B
(R3b, R4, R4v). A user-chosen rule only needs to change the cuts (R0-R2), the floor/target (R3) or B/weights.

## Data readings

1. **SES published** (the state's own coverage values and points, Jun and Sep 2026 payments): `pts`, `var`, `cob`,
   `corte`, `publicado`, `pagoEst` in the data object.
2. **Reconstruction** of every payment from the federal vaccination panel (Ministry of Health, monthly doses and
   denominators by municipality) read on **19/09/2026**, covering Jan 2023-Jul 2026, plus SINASC births. All the
   extra tables and `referencia.json` use this reading. It is not what SES published: SES read the panel earlier,
   and late-recorded doses raise the 19/09 numbers; the page discusses the differences.

## Caveats

1. **Sep 2024 is approximate**: its comparison block (2023-Q3) uses SINASC 2023 instead of 2022.
2. **Dec 2026 is a forecast**: Jan-Aug 2026 = Jan-Apr 2026 pace kept to August (also in its 12-month window).
3. **2027 is a projection with no change in vaccination**: every municipality keeps its 2025 monthly doses, flat,
   from Jan 2026, over SINASC 2024 births for every 2026 and 2027 month (data 1.3, 2026-11-10: a single birth year;
   data 1.2 switched to SINASC 2025 for 2027 months, which mixed two birth years inside the same payment); variable
   share 60%. Births for the per-child weight in 2027 are also SINASC 2024.
4. **SINASC 2025 is preliminary.**
5. Coverages above 100% are real (doses to children born elsewhere or recorded late) and are kept.
6. **Float ties in 2027.** In Jun and Sep 2027, 56 municipality x vaccine pairs have c1 = c0 in exact arithmetic
   (flat projected pace), and the stored doubles differ by about 1e-14, which decides "rose" vs "did not rise".
   The reference reproduces the stored doubles. Rounding c0/c1 to 9 decimals before comparing instead raises R0 by
   about R$ 9 thousand in each of those payments (R1 R$ 7-13 thousand, R2 R$ 14-24 thousand; B60, and so R3b/R4/R4v
   in 2027, shift by R$ 6 thousand); no count of municipalities with zero changes.
7. These are simulations under a constant money basis, not amounts the state paid, except where marked as paid.


## Added on the website (COORTE)

`pontos_publicados_2026.csv` (645 rows): `mun`, `pts_jun`, `pts_set`, the vaccine points (of 5.2) of each municipality
as published by SES-SP for the June and September 2026 payments (IGM SUS Paulista public panel). It feeds the map:
415 municipalities lost points, 105 unchanged, 125 rose; 164 had none in September.
