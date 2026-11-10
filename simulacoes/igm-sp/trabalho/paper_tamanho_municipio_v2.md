<!-- Markdown copy of orchestrator/handoffs/coorte-igm-paper-size-v2-2026-11-09.html (the HTML page is the one to paste from). {+ +} = inserted, {- -} = deleted. -->

# IGM paper: money by municipality size (v2, reframed)

Edits for the final Google Doc, re-read on 2026-11-09 (the Doc does not yet contain the size text from v1). This replaces the v1 page. The backward comparison is now framed as a counterfactual: the 2026 rule applied to the coverage observed in each period, on the 2026 money basis. A forward projection for 2027 serves as the confirmation. Every "Copy" button copies plain text. The table copies as a real table for Google Docs. Blocks with {+green+}/{-red-} changes copy the clean new version. Nothing has been changed in the Doc.

## Why the 2027 projection goes in Table 2 as panel B

The backward and forward numbers answer the same question in the same units: money by size, the change from the 2026 rule, R$ per inhabitant, and losing/unchanged/gaining. A second panel lets the reader compare them line by line without a second table, and the text only needs one short paragraph for the projection. Panel B reports the SINASC 2024 scenario. The SINASC 2025 scenario is given in the text, because it barely moves the result for small municipalities.

## 1. Methods 2.1: payment dates

Paragraph that starts "The state pays the yearly funding in three installments…" (first sentence).

The state pays the yearly funding in three installments{+, on the fifth business day of May, September, and December+}{- in June, September, and December-}.

Check before pasting: the paper calls the first 2026 payment "June" in the Abstract, Table 1, Section 3.1, Section 3.2, the Figure 1 and 2 captions and Results 3.3 (about 9 places). If the first installment is paid in May, either rename it everywhere ("the May 2026 payment") or keep "June" and add "(published by the state in June)" once. I did not change those places.

## 2. Table 1 note

The note under Table 1 that starts "For the vaccination indicators, each value is…". The 2024 sentence describes our simulation, not what the state did in 2024–2025, so it moves to Methods 2.3 (block 3b).

For the vaccination indicators, each value is the number of children vaccinated in that period, divided by the live births of the same period in the latest year with consolidated births. {-Values for 2024 were divided by 2023 births, and values-}{+Values+} for 2025 and 2026 {+were divided +}by 2024 births, because 2025 births had not been consolidated. Source: CIB {+Resolutions+} 24/2026 {+and 25/2026+}.

## 3. Methods 2.3: the rules compared

### 3a. Item (i)

Replace "(i) the current rule, as described in Section 2.1;"

(i) the {-current rule-}{+2026 rule (CIB Resolutions 24/2026 and 25/2026)+}, as described in Section 2.1;

### 3b. New paragraph after item (iii)

Insert as its own paragraph right after "(iii) rule B: … multiplied by the state's per capita value." and before "The target of 95% is the program's own…". It takes over the second half of the current Fourth limitation (block 7).

{+The 2026 rule governed only the 2026 payments. Payments in 2024 and 2025 followed an earlier resolution (CIB 117/2023), which divided coverage by births of the same year and used a different variable share. We applied the 2026 rule to every payment so that all rules are compared on the same terms, and the 2024 and 2025 values were divided by births of the latest consolidated year, as the 2026 rule prescribes (2023 births for 2024 and 2024 births for 2025). The values for 2024 and 2025 therefore show what municipalities would have received had the 2026 rule been in force, not what they were paid.+}

Add the CIB 117/2023 reference number. The facts in this block come from the read-only check of the norms and are not computed here.

### 3c. Budget sentence

Paragraph that starts "The target of 95% is the program's own…", second sentence.

To compare rules at equal cost, rules A and B were run within a fixed budget equal to the mean amount {-paid under the current rule-}{+that the 2026 rule would pay over the same payments+}: R$ 32.0 million per payment from September 2024 to December 2026 (including the December forecast) and R$ 35.7 million in 2027.

## 4. Methods 2.3: new paragraph on municipality size

Add after the paragraph that starts "For each rule and payment, we report the money paid as a share of the maximum…" and ends "…whose birth rates differed most."

{+To examine how each rule distributes the money among municipalities of different sizes, we summed the amount each municipality would have received over the eight payments from September 2024 to December 2026, the period in which the three rules spend the same budget. We grouped municipalities by their 2026 population into small (fewer than 20,000 inhabitants, n = 384), medium (20,000 to 100,000, n = 180) and large (more than 100,000, n = 81). A municipality was considered to gain or lose under a proposed rule when its total differed by more than 5% from the amount under the 2026 rule, and smaller differences were treated as no change. Amounts per inhabitant are annual. Because this comparison applies the 2026 rule to periods in which another rule was in force, we also projected the three payments of 2027, when the 2026 rule will still apply with a 60% variable share. Monthly doses from January 2026 to August 2027 were drawn for each municipality and vaccine from a Poisson distribution with the mean monthly doses of August 2025 to July 2026, in 1,000 replicates, assuming no change in vaccination. In each replicate, rules A and B shared the total that the 2026 rule paid, on the 2026 money basis. The 2027 values were divided by 2024 births and, in a second scenario, by 2025 births. We report the mean and the 10th and 90th percentiles across replicates. This projection is separate from the 2027 values in Figure 3A, which assume each municipality keeps its 2025 pace. We also ran rule A with a 25% larger allocation weight for municipalities with fewer than 20,000 inhabitants.+}

## 5. Results 3.3: budget wording and the 2026 rule

### 5a. First paragraph of 3.3

Paragraph that starts "We propose two alternative rules…", first sentence.

We propose two alternative rules, both calibrated to {-remain within the average budget allocated under the current rule-}{+spend the average amount that the 2026 rule would pay over the same payments+} (R${+ +}32.0 million per payment).

### 5b. Second paragraph of 3.3

Paragraph that starts "Both rules eliminated the seasonal artifact…", first three comparisons; the first sentence also says that the 74–86% are scores before scaling to the budget, as the Figure 3 caption does. The fourth mention ("the municipalities that the current rule left without money") refers to the real September 2026 payment and stays.

From September 2024 to September 2026, {-they paid between 74% and 86% of the maximum amount in every payment round, compared with 36% to 68% under the current rule-}{+their scores reached between 74% and 86% of the maximum in every payment round, before scaling to the budget, compared with 36% to 68% paid under the 2026 rule+}. Between consecutive payments, the median municipality's share of its maximum varied by only 3.7 to 6.9 percentage points, compared with 12.5 to 37.5 points under the {-current rule-}{+2026 rule+}. Between 5 and 24 municipalities were left without vaccine money in each payment, compared with 14 to 164 under the {-current rule-}{+2026 rule+}.

## 6. Results 3.3: new paragraphs on municipality size, and Table 2

Add two paragraphs after the paragraph that starts "Under both rules, every child vaccinated between 80% and 95% adds a fixed amount…" (it ends "…which favor smaller and poorer municipalities by design.") and before "These are two of many possible rules." Table 2 goes right after them.

{+The proposed rules also change how the money is distributed among municipalities of different sizes (Table 2). Had the 2026 rule been applied to the coverage observed from September 2024 to December 2026, small municipalities would have received R$ 41.5 million over the eight payments, compared with R$ 35.1 million under rule A (15.5% less) and R$ 32.3 million under rule B (22.1% less), out of the same R$ 256.4 million. Large municipalities would have received R$ 6.9 million more under rule A and R$ 10.6 million more under rule B, whereas medium-sized municipalities would have changed little (0.6% and 2.0% less). Of the 384 small municipalities, 288 would have received more than 5% less under rule A, and 315 under rule B. The result is similar when the comparison is restricted to the first two payments of 2026, the only ones in the period actually made under the 2026 rule: the share of the money going to small municipalities would have fallen from 16.2% to 13.9% under rule A, a relative decrease of 14%.+}

{+The projection for 2027 points in the same direction (Table 2, panel B). With vaccination unchanged and the 2026 rule in force, small municipalities would receive R$ 18.7 million over the three payments of 2027. Under rule A they would receive 16.5% less (10th–90th percentile, 15.2% to 17.9% less), and under rule B 23.7% less (22.4% to 25.0% less). Dividing by 2025 instead of 2024 births gave almost the same decreases for small municipalities (16.4% and 23.8%). Small municipalities would still receive more per inhabitant than large ones under every rule, but the gap would narrow, from 2.9 times as much under the 2026 rule to 2.3 times under rule A and 2.1 times under rule B. The shift is not driven by chance: without any random variation in doses, rule A would still reduce the money of small municipalities by 14.0% to 17.5%, depending on the denominator. It comes from the way each rule scores the same coverage. Under the 2026 rule, small municipalities would obtain 63% of their maximum, compared with 58% for the state as a whole, probably because the band rule pays the full amount when a year-to-date value built from few births stays at or above 95%, or rises while at or above the state median. Under the 12-month ramp, which scores the level of coverage and stops at 95%, they would score 70% of their maximum before scaling to the budget, compared with 78% for the state. Both proposed rules keep the state's per capita values; what small municipalities lose is the advantage that the 2026 rule's scoring gives them.+}

### Table 2

**Table 2.** Vaccine money by municipality size under the 2026 rule and the two proposed rules. (A) The 2026 rule applied to the coverage observed from September 2024 to December 2026 (eight payments; R$ 256.4 million under each rule). (B) Projection of the three payments of 2027 with vaccination unchanged (mean of 1,000 simulations, with the 10th–90th percentile in brackets; R$ 124.2 million under each rule).

| Municipality size (inhabitants) | Rule | Total (R$ million) | Change from 2026 rule | R$ per inhabitant per year | Municipalities losing / unchanged / gaining |
|---|---|---|---|---|---|
| **A. September 2024 to December 2026, 2026 rule applied to each period** |  |  |  |  |  |
| Small (<20,000; n = 384) | 2026 rule | 41.5 | – | 5.01 | – |
|  | Rule A | 35.1 | −15.5% | 4.23 | 288 / 44 / 52 |
|  | Rule B | 32.3 | −22.1% | 3.90 | 315 / 20 / 49 |
| Medium (20,000–100,000; n = 180) | 2026 rule | 69.5 | – | 3.23 | – |
|  | Rule A | 69.1 | −0.6% | 3.21 | 85 / 24 / 71 |
|  | Rule B | 68.1 | −2.0% | 3.16 | 94 / 24 / 62 |
| Large (>100,000; n = 81) | 2026 rule | 145.3 | – | 1.54 | – |
|  | Rule A | 152.2 | +4.7% | 1.61 | 35 / 9 / 37 |
|  | Rule B | 155.9 | +7.3% | 1.65 | 33 / 7 / 41 |
| All (n = 645) | 2026 rule | 256.4 | – | 2.06 | – |
|  | Rule A | 256.4 | 0.0% | 2.06 | 408 / 77 / 160 |
|  | Rule B | 256.4 | 0.0% | 2.06 | 442 / 51 / 152 |
| **B. Projection for 2027, vaccination unchanged** |  |  |  |  |  |
| Small (<20,000; n = 384) | 2026 rule | 18.7 | – | 6.02 | – |
|  | Rule A | 15.6 | −16.5% [−17.9; −15.2] | 5.03 | 289 / 38 / 57 |
|  | Rule B | 14.3 | −23.7% [−25.0; −22.4] | 4.59 | 303 / 26 / 55 |
| Medium (20,000–100,000; n = 180) | 2026 rule | 32.8 | – | 4.06 | – |
|  | Rule A | 31.4 | −4.1% [−5.6; −2.7] | 3.89 | 90 / 24 / 65 |
|  | Rule B | 30.9 | −5.9% [−7.3; −4.5] | 3.82 | 97 / 21 / 62 |
| Large (>100,000; n = 81) | 2026 rule | 72.7 | – | 2.05 | – |
|  | Rule A | 77.1 | +6.1% [+5.2; +7.0] | 2.18 | 31 / 9 / 41 |
|  | Rule B | 79.1 | +8.8% [+7.8; +9.7] | 2.23 | 31 / 8 / 42 |
| All (n = 645) | 2026 rule | 124.2 | – | 2.66 | – |
|  | Rule A | 124.2 | 0.0% | 2.66 | 411 / 71 / 164 |
|  | Rule B | 124.2 | 0.0% | 2.66 | 431 / 55 / 159 |

Size groups by 2026 population. Amounts on the 2026 basis (2026 population and per capita values), before the 10-point cap. Panel A: the 2026 rule applied to every payment, including the 2024 and 2025 payments that were made under an earlier rule; December 2026 is a forecast; per inhabitant per year divides the period total by the 2.67 years covered by the eight payments. Panel B: monthly doses drawn from a Poisson distribution with the mean of August 2025 to July 2026, 2024 births as the denominator, 60% variable share; counts of municipalities are means across simulations, rounded, and may not add up to the group size. A municipality is counted as unchanged when its total differs by 5% or less from the amount under the 2026 rule. Rules A and B spend the same total as the 2026 rule in each panel.

## 7. Discussion: the paragraph on the proposed rules, rewritten

Replace the whole paragraph that starts "The rules we propose keep the program's budget, its 95% target…". The copy button copies the clean new version. {+green+} = new text, {-red-} = removed.

The rules we propose keep the program's budget, its 95% target, its four vaccines and its per capita values, which already direct more resources to smaller and poorer municipalities, and change {-only -}how coverage is measured and how it is turned into money. Measuring coverage over the previous 12 months removes the calendar effect, because every month of the year is counted once. Paying in proportion to coverage between a floor and the target follows designs used in other programs. Medicare's hospital value-based purchasing program returns payments through a single linear scale, with standards announced before the performance period (55,56), and the 1990 UK general practitioner contract paid part of the amount at 70% childhood immunization coverage and the full amount at 90%, after which coverage rose (57,58). A proportional scale also avoids the cliff of all-or-nothing thresholds, which tend to reward those already above them (64), and placing the full value at the program's own target avoids capping effort below the goal (65). Several Brazilian states already link primary care funding to vaccination with fixed targets (59–63). A fixed budget remains possible with a fixed scale: the value of a point can be announced at the start of the year, based on the previous year's results, with any difference settled the following year. Paying per child{+, as in rule B,+} is a choice about what the vaccination component should reward, and the state may weigh it against other aims of the program{+, including its support for small municipalities+}. {+Both rules would also move part of the money from small to large municipalities, both in the comparison with past payments and in the projection for 2027 (Table 2). The per capita values do not change. The difference is that the band rule, applied to year-to-date values built from few births, pays small municipalities a larger share of their maximum than the state as a whole. A 12-month measure scored on a ramp does not. If the state wishes to keep its current level of support for small municipalities, it can do so explicitly rather than through the way coverage is measured. In our projection for 2027, giving municipalities with fewer than 20,000 inhabitants a 25% larger weight in the allocation under rule A would keep their total close to that under the 2026 rule (1.2% more; 10th–90th percentile, 0.5% less to 2.8% more), mainly at the expense of medium-sized municipalities (7.0% less), while large municipalities would still receive 2.9% more.+} Two complements could address what remains: longer measurement periods or size-based margins for small municipalities (68){+, such as the weight described above,+} and a small share of the budget paid on regional coverage, to reward cooperation where children move between municipalities (22).

Base text copied from the Doc on 2026-11-09. If you edited this paragraph after that, apply the changes by hand instead of replacing it.

## 8. Limitations: the Fourth limitation

In the paragraph "This study has limitations.", replace the sentence that starts "Fourth, the comparison of rules applies the current rule…". The description of the earlier rule now lives in Methods (block 3b).

Fourth, the comparison of rules {+with past payments is a counterfactual: it +}applies the {-current rule-}{+2026 rule+} and the 2026 money basis to every payment{-; it does not reproduce the earlier rule used in 2024 and 2025-}{+, so it does not show what municipalities were paid in 2024 and 2025+}, and the December 2026 and 2027 values depend on stated assumptions about the pace of vaccination.

## 9. Abstract and Table 1: checked

The Abstract contains no number on the proposed rules or on municipality size, and nothing in it contradicts the new text. Its "Under the current rules" refers to the real September 2026 payment and stays. The optional Abstract sentence from v1 ("kept the gradient in favor of small municipalities set by the state's per capita values") is withdrawn. It held for rule A in the backward comparison (2.6 times, the per capita ratio), but not in the 2027 projection (2.3 times). Table 1 lists the 2026 comparisons, which the 2026 rule governs. Only its note changes (block 2), plus the May/June question in block 1.

## 10. Every "current rule" in the Doc, and what to do

| Where | Text | Proposal |
|---|---|---|
| Abstract | Under the current rules, vaccination scores declined… | Keep (the real September 2026 payment). |
| Introduction, last paragraph | we present the current rules / model the effects of the current rules | Keep (general). |
| 2.3, item (i) | the current rule, as described in Section 2.1 | Change (block 3a). |
| 2.3, item (ii) | the budget shared per inhabitant, as under the current rule | Keep (reads fine; true of both rules). |
| 2.3, budget sentence | the mean amount paid under the current rule: R$ 32.0 million | Change (block 3c). |
| 2.3, one more child | Under the current rule, a child changes the payment only when… | Keep (describes the mechanism). |
| 3.1 | This is an artifact introduced by the current rule | Keep (real 2026 payments). |
| 3.3, first paragraph | the average budget allocated under the current rule (R$32.0 million per payment) | Change (block 5a). |
| 3.3, second paragraph | 36% to 68% / 12.5 to 37.5 points / 14 to 164 under the current rule | Change all three (block 5b). These are counterfactual ranges for September 2024 to September 2026. |
| 3.3, second paragraph | the municipalities that the current rule left without money | Keep (real September 2026 payment). |
| Figure 3 caption (B, C) | under the current rule (January–April 2026 value) | Keep (real September 2026 payment). |
| Discussion, second paragraph | The current rule compares consecutive periods… | Keep (describes the rule in force). |
| Limitations, Fourth | applies the current rule and the 2026 money basis | Change (block 8). |

One more thing to check: Figure 3A's 2027 values come from the simulator's deterministic 2025 pace, while Table 2B comes from the Poisson projection with the August 2025–July 2026 pace. Both are described in Methods. If you want one 2027 method only, say so and the Figure can be redrawn from the projection.

## Sources of every number

**Panel A and the backward Results sentences:** `node simulacoes/igm-sp/trabalho/tamanho_municipio.js` (COORTE worktree), checked in section 8 of `teste_referencia_v2.js`.

**Two 2026 payments, 16.2% → 13.9%, −14%:** motor_v2.js, R0 vs R3b over the first two 2026 payments (recomputed 2026-11-09; with the December 2026 forecast added, −10%).

**Panel B, the 2027 paragraph and the Discussion margin numbers:** PrefSaoCaetano `outputs/vacinacao/projecao_2027/resumo_tamanho.csv` (S24, and S25 for the 2025-birth sentence).

**No-noise 14.0% / 17.5% and the 63/58 and 70/78 shares of the maximum:** `docs/simulacao_estadual/Projecao_2027_tamanho.md` (sensitivity table; money-weighted `frac_max_*_pond`).
