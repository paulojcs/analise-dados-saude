# IGM paper: money by municipality size (text to paste, 2026-11-09)

Text for Paulo to copy into the final Google Doc "IGM_SUS_Paulista_revisado_controle_alteracoes"
(id 1GhRZOVoprdDYtbdG8iID4qfT25p-6ArQAp19Pb--R_Q, read again on 2026-11-09). Nothing was edited in the Doc.

Every number comes from `node simulacoes/igm-sp/trabalho/tamanho_municipio.js` (the paper's period). The simulator mock uses all 11 payments
instead: `node tamanho_municipio.js todas`. Both sets are checked in section 8 of `teste_referencia_v2.js`.

## Period and definitions

- The paper sets the budget for September 2024 to December 2026: eight payments, including the December forecast,
  at R$ 32.0 million each. Over those payments, all three rules spend the same R$ 256.4 million. I used this period.
  - 2027 is left out because it has a different budget (R$ 35.7 million), a 60% variable share, and is a projection.
- The simulator mock uses all 11 payments (September 2024 to December 2027). Over that period the ratios come out
  slightly different: 3.4×, 2.66× and 2.4× instead of 3.3×, 2.6× and 2.4×.
- Size groups use 2026 population:
  - small: fewer than 20,000 inhabitants (384 municipalities);
  - medium: 20,000 to 100,000 (180);
  - large: more than 100,000 (81).
- "Unchanged" means the municipality's total over the period differs by 5% or less from what it receives under the
  current rule.
- R$ per inhabitant per year = the period total ÷ 2026 population ÷ 2.67 years (three payments per year). This uses
  the 2026 money basis, before the 10-point cap, as in the rest of Section 2.3.

## Where each piece goes

1. **Methods, 2.3 Analyses.** Add a new paragraph right after the one that starts "For each rule and payment, we
   report the money paid as a share of the maximum…" and ends "…whose birth rates differed most." (text A below).
2. **Results, 3.3 Two proposed payment rules.** Add a new paragraph after the one that starts "Under both rules,
   every child vaccinated between 80% and 95% adds a fixed amount…" and ends "…which favor smaller and poorer
   municipalities by design." It goes before "These are two of many possible rules." (text B below). Table 2 goes
   right after this new paragraph.
3. **Table numbering.** The paper has only Table 1 (yearly payments and comparison periods), so the new table is
   Table 2 and nothing needs renumbering.
4. **Discussion.** Make three edits in the paragraph that starts "The rules we propose keep the program's budget,
   its 95% target…" (text C below):
   - replace its first sentence;
   - insert three sentences before "Two complements could address what remains";
   - adjust "Paying per child is a choice…" and the "Two complements…" sentence.
5. **Abstract.** No change is required: it reports no results for the proposed rules. An optional sentence is given
   at the end in case Paulo wants one.

## A. Methods (new paragraph in 2.3, after "For each rule and payment, we report…")

To examine how each rule distributes the money among municipalities of different sizes, we summed the amount each municipality received over the eight payments from September 2024 to December 2026, the period in which the three rules spend the same budget. We grouped municipalities by their 2026 population into small (fewer than 20,000 inhabitants, n = 384), medium (20,000 to 100,000, n = 180) and large (more than 100,000, n = 81). A municipality was considered to gain or lose under a proposed rule when its total differed by more than 5% from the amount received under the current rule, and smaller differences were treated as no change. Amounts per inhabitant are annual, dividing each total by the 2026 population and by the 2.67 years covered by the eight payments.

## B. Results (new paragraph in 3.3, before "These are two of many possible rules.")

The proposed rules also change how the money is distributed among municipalities of different sizes (Table 2). Over the eight payments from September 2024 to December 2026, in which the three rules spend the same R$ 256.4 million, small municipalities received R$ 41.5 million under the current rule, compared with R$ 35.1 million under rule A (15.5% less) and R$ 32.3 million under rule B (22.1% less). Large municipalities received R$ 6.9 million more under rule A and R$ 10.6 million more under rule B, and medium-sized municipalities changed little (0.6% and 2.0% less). Of the 384 small municipalities, 288 would receive less under rule A and 315 under rule B. Small municipalities still receive more per inhabitant than large ones under both rules, but the gap narrows, from R$ 5.01 against R$ 1.54 per inhabitant per year under the current rule (3.3 times as much) to R$ 4.23 against R$ 1.61 under rule A (2.6 times) and R$ 3.90 against R$ 1.65 under rule B (2.4 times). The ratio under rule A is the one built into the state's per capita values, which would pay a small municipality 2.6 times as much per inhabitant as a large one if every municipality scored in full. Rule B narrows the gap further because small municipalities have fewer births per inhabitant (9.6 against 10.5 per 1,000). The per capita values are therefore kept by both rules, and what small municipalities lose is an additional advantage they have under the current scoring: they received on average 64% of their maximum, compared with 53% for large municipalities, whereas under the proposed scoring both groups received about 78%. Part of this advantage reflects chance. In small municipalities, the year-to-date value used by the current rule differed from the 12-month coverage by 18.5 percentage points on average, against 5.8 points in large municipalities, and, as described in Section 2.1, a value that stays at or above 95%, or rises past the state median, earns the full amount. Part of it, however, reflects higher coverage, since 63% of the 12-month values of small municipalities were at or above 95%, against 41% in large municipalities, and our data do not allow us to separate the two.

## Table 2

Caption: **Table 2.** Vaccine money by municipality size under the current rule and the two proposed rules, September 2024 to December 2026 (eight payments; R$ 256.4 million under each rule).

Tab-separated, to paste into Google Docs: paste it, select it, then Insert → Table, or paste into an empty Sheet and copy from there.

```
Municipality size (inhabitants)	Rule	Total (R$ million)	Change from current rule	R$ per inhabitant per year	Municipalities losing / unchanged / gaining
Small (<20,000; n = 384)	Current	41.5	–	5.01	–
	Rule A	35.1	−15.5%	4.23	288 / 44 / 52
	Rule B	32.3	−22.1%	3.90	315 / 20 / 49
Medium (20,000–100,000; n = 180)	Current	69.5	–	3.23	–
	Rule A	69.1	−0.6%	3.21	85 / 24 / 71
	Rule B	68.1	−2.0%	3.16	94 / 24 / 62
Large (>100,000; n = 81)	Current	145.3	–	1.54	–
	Rule A	152.2	+4.7%	1.61	35 / 9 / 37
	Rule B	155.9	+7.3%	1.65	33 / 7 / 41
All (n = 645)	Current	256.4	–	2.06	–
	Rule A	256.4	0.0%	2.06	408 / 77 / 160
	Rule B	256.4	0.0%	2.06	442 / 51 / 152
```

Markdown version:

| Municipality size (inhabitants) | Rule | Total (R$ million) | Change from current rule | R$ per inhabitant per year | Municipalities losing / unchanged / gaining |
|---|---|---|---|---|---|
| Small (<20,000; n = 384) | Current | 41.5 | – | 5.01 | – |
| | Rule A | 35.1 | −15.5% | 4.23 | 288 / 44 / 52 |
| | Rule B | 32.3 | −22.1% | 3.90 | 315 / 20 / 49 |
| Medium (20,000–100,000; n = 180) | Current | 69.5 | – | 3.23 | – |
| | Rule A | 69.1 | −0.6% | 3.21 | 85 / 24 / 71 |
| | Rule B | 68.1 | −2.0% | 3.16 | 94 / 24 / 62 |
| Large (>100,000; n = 81) | Current | 145.3 | – | 1.54 | – |
| | Rule A | 152.2 | +4.7% | 1.61 | 35 / 9 / 37 |
| | Rule B | 155.9 | +7.3% | 1.65 | 33 / 7 / 41 |
| All (n = 645) | Current | 256.4 | – | 2.06 | – |
| | Rule A | 256.4 | 0.0% | 2.06 | 408 / 77 / 160 |
| | Rule B | 256.4 | 0.0% | 2.06 | 442 / 51 / 152 |

Footnote (under the table): Size groups by 2026 population. Amounts on the 2026 basis (2026 population and per capita values), before the 10-point cap; December 2026 is a forecast. R$ per inhabitant per year is the period total divided by the 2026 population and by the 2.67 years covered by the eight payments. A municipality is counted as unchanged when its total differs by 5% or less from the amount under the current rule. With all four vaccines in full, the state's per capita values would pay small municipalities 2.6 times as much per inhabitant as large ones.

## C. Discussion (paragraph "The rules we propose keep the program's budget…")

**Replace the first sentence.** The current sentence is misleading now, because the rules also move money between sizes.

Current: "The rules we propose keep the program's budget, its 95% target, its four vaccines and its per capita values, which already direct more resources to smaller and poorer municipalities, and change only how coverage is measured and how it is turned into money."

Replacement: "The rules we propose keep the program's budget, its 95% target, its four vaccines and its per capita values, which already direct more resources to smaller and poorer municipalities, and change how coverage is measured and how it is turned into money."

**Change "Paying per child is a choice…" to:** "Paying per child, as in rule B, is a choice about what the vaccination component should reward, and the state may weigh it against other aims of the program, including its support for small municipalities."

**Insert before "Two complements could address what remains":** "Measuring and scoring coverage in this way also moves money between municipalities of different sizes. Small municipalities would receive less under both rules, not because their per capita values change, but because the current rule, by paying in full whenever a year-to-date value based on few births crosses a cutoff, gives them an advantage that a 12-month measure removes, and part of that advantage reflects chance rather than vaccination (Table 2). Under rule A, the remaining difference between small and large municipalities is the one set by the per capita values, whereas paying per child narrows it further. If the state wishes to keep its current level of support for small municipalities, it can do so explicitly rather than through measurement noise: giving municipalities with fewer than 20,000 inhabitants a 25% larger weight in the allocation under rule A would keep their total at the current level (R$ 42.4 million over the eight payments, against R$ 41.5 million under the current rule), mainly at the expense of medium-sized municipalities (R$ 2.7 million, or 3.9%, less), while large municipalities would still receive R$ 1.8 million more."

**Then change "Two complements could address what remains: longer measurement periods or size-based margins for small municipalities (68), and a small share of the budget…" to:** "Two complements could address what remains: longer measurement periods or size-based margins for small municipalities (68), such as the weight described above, and a small share of the budget paid on regional coverage, to reward cooperation where children move between municipalities (22)."

## Other numbers in the paper

- **Section 3.3, "Both rules eliminated the seasonal artifact…"** (74–86% of the maximum, 3.7–6.9 points, 5–24
  without money): this is about scoring, which the change does not touch. It stays as it is.
- **Paragraph with Ribeirão Pires/Tatuí and the birth-rate thirds:** also unchanged.
- **Abstract:** no number changes. Optional sentence, to add after "Coverage estimates also showed greater
  fluctuations across payment periods in smaller municipalities.": "Two alternative rules based on 12-month coverage
  removed these artifacts at the same cost, and kept the gradient in favor of small municipalities set by the
  state's per capita values." (This holds for rule A exactly; under rule B the gradient narrows to 2.4×. Use it only
  if the abstract stays about rule A.)
- **Possible conflict.** The Results paragraph on Figure 3 reports results "From September 2024 to September 2026"
  (seven observed payments). Table 2 uses the budget period, which runs through December 2026 and includes the
  forecast, because only over that period do the three rules spend exactly the same money (R$ 256.4 million). Over
  the seven observed payments the proposed rules would spend R$ 224.3 million against R$ 214.2 million, which would
  mix the size shift with a difference in total money.
- **"Rule A is the preferred rule".** No sentence in the Doc names a preferred rule any more. The new Discussion
  wording frames the size margin as an option for the state, which fits the paper's diplomatic register. Saying in
  the paper that rule A is preferred is Paulo's call.

## Reproducing

From `simulacoes/igm-sp/trabalho/` (outside the published site):

- `node tamanho_municipio.js` prints every number in this file.
  - It also prints the step-by-step decomposition for small municipalities over the eight payments: fixed budget
    +1.3, ramp −3.7, 12-month coverage −4.0 (= rule A), per child −2.7 (= rule B).
- `node tamanho_municipio.js todas` gives the same numbers over the mock's 11 payments.
- `node marca_coorte/site/simulacoes/igm-sp/teste_referencia_v2.js` checks these numbers (section 8).
