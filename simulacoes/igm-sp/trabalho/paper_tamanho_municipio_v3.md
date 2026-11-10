<!-- Markdown copy of orchestrator/handoffs/coorte-igm-paper-size-v3-2026-11-10.html (the HTML page is the one to paste from). {+ +} = inserted, {- -} = deleted. -->

# IGM paper: money by municipality size (v3)

**v3 replaces v1 and v2.** Don't paste from the earlier pages.

v3 follows Paulo's decision of 2026-11-10. Results show only the counterfactual comparison: rules A and B as proposed, against the 2026 rule applied to the coverage observed from September 2024 to December 2026.
The Poisson 2027 projection is out of the paper: no Table 2 panel B, no 2027 paragraph and no Poisson Methods.The paper still has the deterministic 2027 values, which assume the 2025 pace. They appear in Methods 2.3, in Figure 3A (September 2024 to December 2027), in the budget sentence ("R$ 35.7 million in 2027"), in the Fourth limitation and in the Abstract ("from 2024 to 2027"). Keeping or cutting them is Paulo's call (block 9).
The ways to protect small municipalities appear only in the Discussion, with numbers from the same counterfactual.

Doc re-read on 2026-11-10. It has about 60 pending suggested edits, mostly in the Introduction and Methods 2.2–2.3. The quoted anchors and the red deletions below use the Doc with the suggestions accepted: for example, item (i) now reads "The current rule" and the budget sentence reads "To compare rules with similar cost". If you reject a suggestion in one of these sentences, edit by hand. The Doc still has none of the size text. Every "Copy" button copies plain text. The table copies as a real table. Blocks with {+green+}/{-red-} copy the clean new version. Nothing has been changed in the Doc.

## 1. Methods 2.1: payment dates

Paragraph that starts "The state pays the yearly funding in three installments…" (first sentence).

The state pays the yearly funding in three installments{+, on the fifth business day of May, September, and December+}{- in June, September, and December-}.

Still open: the paper calls the first 2026 payment "June" in about 9 places (Abstract, Table 1, 3.1, 3.2, Figure 1 and 2 captions, 3.3). Either rename them all to May, or keep "June" and add "(published by the state in June)" once. Those places are not changed here. The simulator now labels this payment May.

## 2. Table 1 note

The note under Table 1 that starts "For the vaccination indicators, each value is…". The 2024 sentence describes our simulation, not what the state did in 2024–2025, so it moves to Methods 2.3 (block 3b).

For the vaccination indicators, each value is the number of children vaccinated in that period, divided by the live births of the same period in the latest year with consolidated births. {-Values for 2024 were divided by 2023 births, and values-}{+Values+} for 2025 and 2026 {+were divided +}by 2024 births, because 2025 births had not been consolidated. Source: CIB {+Resolutions+} 24/2026 {+and 25/2026+}.

## 3. Methods 2.3: the rules compared

### 3a. Item (i)

Replace "(i) The current rule, as described in Section 2.1;"

(i) The {-current rule-}{+2026 rule (CIB Resolutions 24/2026 and 25/2026)+}, as described in Section 2.1;

### 3b. New paragraph after item (iii)

Insert as its own paragraph right after "(iii) Rule B: … multiplied by the state's per capita value." and before "The target of 95% is the program's own…". It takes over the second half of the current Fourth limitation (block 7).

{+The 2026 rule governed only the 2026 payments. Payments in 2024 and 2025 followed an earlier resolution (CIB 117/2023), which divided coverage by births of the same year and used a different variable share. We applied the 2026 rule to every payment so that all rules are compared on the same terms, and the 2024 and 2025 values were divided by births of the latest consolidated year, as the 2026 rule prescribes (2023 births for 2024 and 2024 births for 2025). The values for 2024 and 2025 therefore show what municipalities would have received had the 2026 rule been in force, not what they were paid.+}

Add the CIB 117/2023 reference number. The facts in this block come from the read-only check of the norms (orchestrator, 2026-11-09). They are not computed here.

### 3c. Budget sentence

Paragraph that starts "The target of 95% is the program's own…", second sentence.

To compare rules with similar cost, rules A and B were run within a fixed budget equal to the mean amount {-paid under the current rule-}{+that the 2026 rule would pay over the same payments+}: R$ 32.0 million per payment from September 2024 to December 2026 (including the December forecast) and R$ 35.7 million in 2027.

## 4. Methods 2.3: new paragraph on municipality size

Add after the paragraph that starts "For each rule and payment, we report the money paid as a share of the maximum…" and ends "…whose birth rates differed most."

{+To examine how each rule distributes the money among municipalities of different sizes, we summed the amount each municipality would have received over the eight payments from September 2024 to December 2026, the period in which the three rules spend the same budget. We grouped municipalities by their 2026 population into small (fewer than 20,000 inhabitants, n = 384), medium (20,000 to 100,000, n = 180) and large (more than 100,000, n = 81). A municipality was considered to gain or lose under a proposed rule when its total differed by more than 5% from the amount under the 2026 rule, and smaller differences were treated as no change. Amounts per inhabitant are annual, dividing each total by the 2026 population and by the 2.67 years covered by the eight payments.+}

## 5. Results 3.3: budget wording and the 2026 rule

### 5a. First paragraph of 3.3

Paragraph that starts "We propose two alternative rules…", first sentence.

We propose two alternative rules, both calibrated to {-remain within the average budget allocated under the current rule-}{+spend the average amount that the 2026 rule would pay over the same payments+} (R${+ +}32.0 million per payment).

### 5b. Second paragraph of 3.3

The paragraph that starts "Both rules eliminated the seasonal artifact…": replace its second, third and fourth sentences. The first one also says that the 74–86% are scores before scaling to the budget, as the Figure 3 caption does. The later mention ("the municipalities that the current rule left without money") refers to the real September 2026 payment and stays.

From September 2024 to September 2026, {-they paid between 74% and 86% of the maximum amount in every payment round, compared with 36% to 68% under the current rule-}{+their scores reached between 74% and 86% of the maximum in every payment round, before scaling to the budget, compared with 36% to 68% paid under the 2026 rule+}. Between consecutive payments, the median municipality's share of its maximum varied by only 3.7 to 6.9 percentage points, compared with 12.5 to 37.5 points under the {-current rule-}{+2026 rule+}. Between 5 and 24 municipalities were left without vaccine money in each payment, compared with 14 to 164 under the {-current rule-}{+2026 rule+}.

## 6. Results 3.3: new paragraphs on municipality size, and Table 2

Add two paragraphs after the paragraph that starts "Under both rules, every child vaccinated between 80% and 95% adds a fixed amount…" (it ends "…which favor smaller and poorer municipalities by design.") and before "These are two of many possible rules." Table 2 goes right after them. The paper has only Table 1, so nothing needs renumbering.

{+The proposed rules also change how the money is distributed among municipalities of different sizes (Table 2). Had the 2026 rule been applied to the coverage observed from September 2024 to December 2026, small municipalities would have received R$ 41.5 million over the eight payments, compared with R$ 35.1 million under rule A (15.5% less) and R$ 32.3 million under rule B (22.1% less), out of the same R$ 256.4 million. Large municipalities would have received R$ 6.9 million more under rule A and R$ 10.6 million more under rule B, whereas medium-sized municipalities would have changed little (0.6% and 2.0% less). Of the 384 small municipalities, 288 would have received more than 5% less under rule A, and 315 under rule B. The result is similar when the comparison is restricted to the first two payments of 2026, the only payments in the period made under the 2026 rule: the share of the money going to small municipalities would have fallen from 16.2% to 13.9% under rule A, a relative decrease of 14%.+}

{+Small municipalities would still receive more per inhabitant than large ones under both rules, but the gap would narrow, from 3.3 times as much under the 2026 rule to 2.6 times under rule A and 2.4 times under rule B. The ratio under rule A is the one built into the state's per capita values, which would pay a small municipality 2.6 times as much per inhabitant as a large one if every municipality scored in full. Rule B narrows the gap further because small municipalities have fewer births per inhabitant (9.6 against 10.5 per 1,000). Both proposed rules keep the per capita values; what small municipalities lose is an additional advantage from the 2026 rule's scoring. Under the 2026 rule, they would have received on average 64% of their maximum, compared with 53% for large municipalities, whereas under the proposed scoring both groups scored about 78% of their maximum before scaling to the budget. Part of this advantage probably reflects chance: in small municipalities, the year-to-date value used by the 2026 rule differed from the 12-month coverage by 18.5 percentage points on average, against 5.8 points in large municipalities. Part of it reflects higher coverage, since 63% of the 12-month values of small municipalities were at or above 95%, against 41% in large municipalities, and our data do not allow us to separate the two.+}

### Table 2

**Table 2.** Vaccine money by municipality size under the 2026 rule and the two proposed rules, September 2024 to December 2026, with all rules applied to the coverage observed in each period (eight payments; R$ 256.4 million under each rule).

| Municipality size (inhabitants) | Rule | Total (R$ million) | Change from 2026 rule | R$ per inhabitant per year | Municipalities losing / unchanged / gaining |
|---|---|---|---|---|---|
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

Size groups by 2026 population. The 2026 rule is applied to every payment, including the 2024 and 2025 payments that were made under an earlier rule. Amounts on the 2026 basis (2026 population and per capita values), without the 10-point limit of the variable component; December 2026 is a forecast. R$ per inhabitant per year is the period total divided by the 2026 population and by the 2.67 years covered by the eight payments. A municipality is counted as unchanged when its total differs by 5% or less from the amount under the 2026 rule. With all four vaccines in full, the state's per capita values would pay small municipalities 2.6 times as much per inhabitant as large ones.

## 7. Limitations: the Fourth limitation

In the paragraph "This study has limitations.", replace the sentence that starts "Fourth, the comparison of rules applies the current rule…". The description of the earlier rule now lives in Methods (block 3b).

Fourth, the comparison of rules {+with past payments is a counterfactual: it +}applies the {-current rule-}{+2026 rule+} and the 2026 money basis to every payment{-; it does not reproduce the earlier rule used in 2024 and 2025-}{+, so it does not show what municipalities were paid in 2024 and 2025+}, and the December 2026 and 2027 values depend on stated assumptions about the pace of vaccination.

## 8. Discussion: the paragraph on the proposed rules, rewritten

Replace the whole paragraph that starts "The rules we propose keep the program's budget, its 95% target…". The copy button copies the clean new version. {+green+} = new text, {-red-} = removed.

The rules we propose keep the program's budget, its 95% target, its four vaccines and its per capita values, which already direct more resources to smaller and poorer municipalities, and change {-only -}how coverage is measured and how it is turned into money. Measuring coverage over the previous 12 months removes the calendar effect, because every month of the year is counted once. Paying in proportion to coverage between a floor and the target follows designs used in other programs. Medicare's hospital value-based purchasing program returns payments through a single linear scale, with standards announced before the performance period (55,56), and the 1990 UK general practitioner contract paid part of the amount at 70% childhood immunization coverage and the full amount at 90%, after which coverage rose (57,58). A proportional scale also avoids the cliff of all-or-nothing thresholds, which tend to reward those already above them (64), and placing the full value at the program's own target avoids capping effort below the goal (65). Several Brazilian states already link primary care funding to vaccination with fixed targets (59–63). A fixed budget remains possible with a fixed scale: the value of a point can be announced at the start of the year, based on the previous year's results, with any difference settled the following year. Paying per child{+, as in rule B,+} is a choice about what the vaccination component should reward, and the state may weigh it against other aims of the program{+, including its support for small municipalities+}. {+As proposed, both rules would also move part of the money from small to large municipalities (Table 2). The per capita values are unchanged; the shift comes from how coverage is scored, since the band rule, applied to year-to-date values, paid small municipalities a larger share of their maximum than a 12-month measure scored on a ramp, partly through chance and partly through higher coverage. Under rule A, an allocation weight of 1.30 for municipalities with up to 10,000 inhabitants, falling linearly to 1 at 30,000, would have given small municipalities 2.3% more than the 2026 rule over the eight payments, at a cost of 2.8% to medium-sized municipalities and without a step in the value of a vaccinated child at any population threshold. Weights of 1.24 for small and 1.05 for medium-sized municipalities would instead keep each size group within 0.3% of its amount under the 2026 rule, at the cost of steps in the payment at 20,000 and 100,000 inhabitants. A lower floor of 70% for small municipalities would not be enough (9.7% less), because about 60% of their coverage values were already at or above 95%, and the simulator lets readers test these and other weights.+} Two complements could address what remains: longer measurement periods or size-based margins for small municipalities (68), and a small share of the budget paid on regional coverage, to reward cooperation where children move between municipalities (22).

Base text copied from the Doc on 2026-11-10; this paragraph has no pending suggestions. The new size text is five sentences. The existing sentence on size-based margins (68) stays as it is. If it has to be shorter, drop the lower-floor sentence. Large municipalities would receive 0.7% more under the tapered weight; this is left out to keep the text short.

## 9. Abstract and Table 1: checked

The Abstract has no number on the proposed rules or on municipality size, and nothing in it contradicts the new text. Its "Under the current rules" refers to the real September 2026 payment and stays. Table 1 lists the 2026 comparisons, which the 2026 rule governs. Only its note changes (block 2), plus the May/June question in block 1. One leftover, not about size: Methods 2.3 still describes the deterministic 2027 values ("assuming each municipality will keep its 2025 pace"), which Figure 3A uses. That is correct as it stands, since the Poisson projection is no longer in the paper. If Paulo wants no 2027 at all, five places change: Figure 3A loses its 2027 points, the Methods 2.3 sentence on 2027, the budget sentence ("and R$ 35.7 million in 2027"), the Fourth limitation ("…and the December 2026 value depends on stated assumptions about the pace of vaccination") and the Abstract ("from 2024 to 2026").

## 10. Every "current rule" in the Doc, and what to do

| Where | Text | Proposal |
|---|---|---|
| Abstract | Under the current rules, vaccination scores declined… | Keep (the real September 2026 payment). |
| Introduction, last paragraph | we present the current rules / model the effects of the current rules | Keep (general). |
| 2.3, item (i) | The current rule, as described in Section 2.1 | Change (block 3a). |
| 2.3, item (ii) | the budget shared per inhabitant, as under the current rule | Keep (reads fine; true of both rules). |
| 2.3, budget sentence | the mean amount paid under the current rule: R$ 32.0 million | Change (block 3c). |
| 2.3, one more child | Under the current rule, a child changes the payment only when… | Keep (describes the mechanism). |
| 3.1 | This is an artifact introduced by the current rule | Keep (real 2026 payments). |
| 3.3, first paragraph | the average budget allocated under the current rule (R$32.0 million per payment) | Change (block 5a). |
| 3.3, second paragraph | 36% to 68% / 12.5 to 37.5 points / 14 to 164 under the current rule | Change all three (block 5b). These are counterfactual ranges for September 2024 to September 2026. |
| 3.3, second paragraph | the municipalities that the current rule left without money | Keep (real September 2026 payment). |
| Figure 3 caption (B, C) | under the current rule (January–April 2026 value) | Keep (real September 2026 payment). |
| Discussion, second paragraph | The current rule compares consecutive periods… | Keep (describes the rule in force). |
| Limitations, Fourth | applies the current rule and the 2026 money basis | Change (block 7). |

## Sources of every number

**Table 2 and the two Results paragraphs** (totals, % changes, counts, R$ per inhabitant, 3.3/2.6/2.4 and the 2.6 per capita ratio, 9.6 vs 10.5 births per 1,000, 64% vs 53% and the 78% scores, 18.5 vs 5.8 points, 63% vs 41%): `node simulacoes/igm-sp/trabalho/tamanho_municipio.js` in the COORTE worktree, checked in section 8 of `teste_referencia_v2.js`.

**First two 2026 payments, 16.2% → 13.9%, −14%:** motor_v2.js, the 2026 rule (R0) against rule A (R3b) over the 2026-06 and 2026-09 payments, recomputed 2026-11-09 (16.20 → 13.92, −14.1%).

**Discussion:** PrefSaoCaetano `outputs/vacinacao/variantes_pequenos/resumo.csv`, base BACK (s12, commit a9207f7).

Tapered weight: V2_taper30 (+2.26% small, −2.81% medium, +0.70% large).
Size-band weights: V2_tier, calibrated backward (1.239/1.054, 0/0/0; `pesos.csv`).
70% floor: V3_r70 (−9.67% small). Size-band weights as rounded (1.24/1.05): +0.14 / −0.28 / +0.09%, simulator preset R3p.
"Most coverage values at or above 95%" (60% of small-municipality × vaccine values, September 2026): `docs/simulacao_estadual/Variantes_pequenos.md`.
The COORTE simulator reproduces V2_taper30 and V2_tier to within 0.01 point (`teste_referencia_v2.js`, section 9).

**Not used:** the 2027 projection (s11) and the forward-calibrated weights (1.271/1.107). The paper uses the backward base only.
