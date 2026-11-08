# Simulador IGM SP, versão 2 (coorte.io/simulacoes/igm-sp-v2/)

Segunda versão da página do simulador, com a seção **Monte sua regra / Build your own rule**. Branch
`feat/simulacao-igm-sp-v2` (criada de `feat/simulacao-igm-sp`). **Rascunho, não publicada**: tem `noindex`, não está
no sitemap, na página inicial, em Publicações nem no Atlas, e a v1 não aponta para ela. A v1
(`marca_coorte/site/simulacoes/igm-sp/`, validada em 04/11/2026) ficou intocada.

## O que a v2 acrescenta

| Arquivo (em `marca_coorte/site/simulacoes/igm-sp-v2/`) | O quê |
|---|---|
| `index.html` | A página da v1 (mesmas seções) + seção "Monte sua regra" depois das Regras, nota "versão 2 (em desenvolvimento)" com link para a v1, parágrafo novo em "Como contamos" |
| `motor_v2.js` | Uma regra parametrizada; R0–R4v e R0s são presets. Mantém as funções da v1 (`regra`, `criancaAMais`, `PRESETS_V1`) para as seções copiadas |
| `teste_referencia_v2.js` | `node teste_referencia_v2.js`: 0 falhas (1370 conferências em 07/11/2026) |
| `dados/` | Cópia de `igm-sp/dados/` (sem mudança) |

A regra única tem seis escolhas: medida (`acum` acumulada desde janeiro | `c12` 12 meses), pontuação (`faixas` da
CIB 25 contra corte = mediana por vacina limitada a 95 ou fixo | `rampa` piso→alvo, só o nível), repartição (`hab`
valor do ponto | `crianca` nascidos × per capita ÷ 30), parte fixa 0–100%, orçamento (`sem` | `atual` = B50/B60 |
R$ próprio por parcela, que em 2027 cresce com a parte variável) e parte variável de 2027 (padrão 60%; muda o vp de
2027 para todas as regras, inclusive a de referência, e portanto o B60).

Definições novas (não estão no README da exportação):
- **Sem orçamento + por criança**: o máximo do estado (Σ 5,2 × vp) é repartido pelo peso; cada município recebe a sua
  parte do próprio máximo.
- **Parte do máximo** (Figura G e o gráfico da regra montada) = Σ a(f + (1−f)·sbar) / Σ a, isto é, o que os
  municípios ganharam do que poderiam ganhar, antes de repartir o orçamento. Sem orçamento e por habitante é
  exatamente total ÷ máximo (R0: 36–71%; R3/Regra A: 74–86%, como o texto do artigo).
- **Zerados** = parte variável < R$ 0,005 (como a R4 no README). **Estabilidade** = mediana de |Δ sbar| × 100 contra a
  parcela *disponível* anterior (a R0s pula set/2024 e jun/2027).
- **Uma criança a mais**: faixas = % de municípios com alguma vacina a uma criança de um corte (para cima ou para
  baixo) e salto mediano em R$; rampa = R$ por criança dentro de [piso, alvo), mediana; fator do orçamento fixo.
  Reproduz `reg[*].perto/salto/faixa/marg` do objeto de dados nas 11 parcelas e a Figura H (terços de `cr.terc`).
- **Zerados mas vacinando bem**: zerados na regra atual na parcela escolhida; piso = o piso da rampa da regra montada
  (80 se for de faixas e ninguém mexeu); "pagos" = parte variável ≥ R$ 0,005.

URL: `?preset=atual|atual12|A|B|R1|R2|R3|R4&medida=acum|c12&regra=faixas|rampa&corte=mediana|50–95&piso=&alvo=&aloc=hab|crianca&fixo=0–100&orc=sem|atual|<R$ mi>&sv27=50–100&parc=<AAAA-MM>`,
além de `?m=` e `?lang=en`. Parâmetro inválido volta ao padrão sem aviso. Padrão = Regra B.

## R0s (regra atual com 12 meses): PROVISÓRIO

(08/11: Paulo confirmou a mediana por vacina; a R0s saiu do artigo.) Valores da sessão de análise (de `periodos_cobertura.csv.gz`), no teste como provisórios:
dez/24 73,7% e 28 · jun/25 65,0 e 48 · set/25 52,6 e 22 · dez/25 38,9 e 46 · jun/26 57,0 e 20 · set/26 56,1 e 37 ·
dez/26 59,0 e 28 · set/27 65,1 e 58 · dez/27 42,4 e 107; estabilidade 12,5 ou 25,0.

**Achado (07/11/2026).** Com a mediana **por vacina** (como a R0; a definição pedida) seis batem e três não:
dez/25 41,4% e 45, jun/26 58,9% e **19**, dez/27 42,7% e 107. Não é a forma de montar o valor de comparação (testado:
mesma parcela, arredondamentos, medianas separadas, medianas do CSV): é o corte. São exatamente as parcelas em que a
mediana de 12 meses de alguma vacina fica abaixo de 95 (nas outras o limite faz o corte = 95 sempre). Os nove valores
provisórios saem exatos com **um corte único para as quatro vacinas** (mediana conjunta, sempre ≥ 95 → corte 95) ou
com corte fixo de 95. A página usa a mediana por vacina, que dá **19** em jun/2026, igual à rodada antiga (s08). O
teste confere os dois: R0s por vacina (com os três valores acima) e a rodada provisória reproduzida com corte único.
**Decidir com a análise** qual é a definição do artigo.

Indisponíveis: set/2024 (2023-Q3 não é bloco avaliado de nenhuma parcela) e jun/2027 (o bloco de comparação é
`P2026-Q2`, projetado; dez/2026 avalia `2026-Q2`, previsto: rótulos diferentes, não se casam).

**A fazer no PrefSaoCaetano:** acrescentar R0s ao `s10_regras_periodos.py` e ao `referencia.json` da exportação
(totais, máximo, zerados, mudança, com `null` nas indisponíveis), e trocar o bloco provisório do teste pela leitura do
`referencia.json`.

## Outros números conferidos (set/2026, releitura de 19/09)

163 sem dinheiro de vacina na regra atual; 128 deles com 12 meses ≥ 80% nas quatro; **90,5% é a mediana dos 12 meses
das vacinas dos 163** (dos 128 seria 92,4); 155 dos 163 recebem na R3; **70% é a mediana da parte do máximo dos 163**
na R3 (dos 155 seria 72%). Publicado (5,2 pontos): 224 cheios em jun/2026, 136 em set/2026. Ajustar a redação do
artigo se ela diz "of these 128" / "of the 155".

## Publicar (quando Paulo decidir)

1. `node marca_coorte/site/simulacoes/igm-sp-v2/teste_referencia_v2.js` = 0 falhas; olhar no celular.
2. Decidir se a v2 substitui a v1 (copiar para `igm-sp/`, mantendo a URL que o Substack vai linkar) ou vive ao
   lado. Se substituir: tirar `noindex`, canonical/og:url de volta para `igm-sp/`, recolocar o JSON-LD (versão 2),
   tirar a nota "versão 2 (em desenvolvimento)" e o link para a v1, trocar `motor.js` → `motor_v2.js` na lista de
   arquivos; o `teste_referencia.js` da v1 pode ser aposentado (o v2 cobre tudo).
3. R0s fora do provisório (acima).
4. `git switch main && git merge feat/simulacao-igm-sp-v2 && git push` (Workers Builds publica).

## Revisão de 08/11/2026: as figuras finais do artigo

Decisões de Paulo: o artigo tem só três regras, **regra atual, Regra A (R3b) e Regra B (R4v, preferida)**; R1, R2, R4 e
a regra atual com 12 meses (R0s) ficam como presets secundários em "Outras (fora do artigo)". R0s fica com a mediana
por vacina (19 zerados em jun/2026). "% do máximo" é antes de repartir o orçamento, e A e B são **uma linha só**
("Regras A e B (mesma pontuação)"). Orçamento próprio em 2027 (×1,2 com a parte variável): não decidido, deixado como
está. "Zerados mas vacinando bem" usa o piso da regra, sem controle próprio. v2 substituir a v1: decisão de Paulo depois.

O que mudou na página:
- **Figura 1C** (Calendário): nascidos por mês em 2024 (barras, jan–abr em destaque) + Penta completa em 2025 como
  **média mensal de cada quadrimestre** (linha em degrau), mesmo eixo; totais 168.131 / 156.800 / 145.952 e
  140.474 / 134.492 / 149.407. O dado MENSAL das doses não está na exportação: os totais por quadrimestre saem de
  c1 × nasc_aval ÷ 100 (jan–abr, jan–ago, jan–dez de 2025, por diferença). Para a linha mês a mês, exportar as doses
  mensais da Penta 2025 no PrefSaoCaetano.
- **Figura 2A** (Denominador): dispersão nascidos 2024 (log) × teto de 2025, cores <95 / 95–99,9 / ≥100, linhas em 95 e
  100 (185; 109 com <100 nascidos; mediana 100,9). Substitui o histograma da v1.
- **Figura 2B** (Acaso): barras cinzas pareadas jun/set da mudança mediana da Penta por nascidos de **2024**
  (n 284/219/86/56; jun 11,7/7,2/5,2/5,5; set 22,4/12,3/7,7/3,6). Substitui a dispersão da v1.
- **Figura 3A** (Regras): % do máximo, regra atual × Regras A e B (uma linha), previsão/projeção sombreadas, sem
  losangos. Substitui o "total por ano" da v1 e a antiga "Figura G" da seção Monte sua regra (removida).
- **Figura 3B/C** (Regras): escada × rampa, set/2026, para Ribeirão Pires e Tatuí por padrão ou para o município do
  seletor/`?m=`, com a vacina escolhível; eixo y comum. Regra de escolha do par no ⓘ e nos métodos.
- Regras na página: definições só das três do artigo (+ "Outras"); "parcela a parcela", "uma criança a mais" e "R$ por
  criança por faixa" usam atual / A / B (a v1 usava R4 meio fixo).
- **Zerados mas vacinando bem**: em jun e set/2026 usa os zerados do pagamento **publicado** (164 em set); nas demais
  parcelas, a reconstrução. Set/2026: 164 → 128 com 12 meses ≥ 80% nas quatro, mediana 90,3%, 156 pagos na Regra A.
  **72% é a mediana da parte do máximo entre os 156 pagos** (entre os 164 seria 67%); a página mostra entre os pagos.
- **Moeda**: R$ em português, **BRL** em inglês (formatadores e textos estáticos em inglês).
- Corrigido de passagem (só na v2): na v1, os nomes das regras acima dos gráficos "parcela a parcela" usam a classe
  `pt` e somem em inglês (a regra `html[lang="en"] .pt{display:none}`). Na v2 viraram `ttl`. **A v1 tem esse defeito.**

Números do artigo que **não** se reproduzem com `dados/`: R0s em set/2024 (68,2% e 45) e jun/2027 (51,4% e 8). Em
`fig3_series_full.csv` estão escritos à mão (`fig3ab_v2.py`); o valor de comparação (12 meses até dez/2023; 12 meses
projetados até ago/2026) não está na exportação, e o motor deixa as duas parcelas sem valor. Como a R0s saiu do
artigo, ficou assim. Figura 3A: % do máximo bate com o CSV do artigo a menos de 0,001 ponto (vp arredondado a 5 casas
na exportação; o teste usa essa tolerância).

## Perguntas abertas para Paulo

1. Orçamento próprio em 2027 (cresce ×1,2 com a parte variável)? Não decidido.
2. A v2 substitui a v1 na mesma URL quando publicar?
3. Figura 1C: exportar as doses mensais da Penta 2025 para a linha mês a mês, ou basta a média por quadrimestre?
4. R0s set/2024 e jun/2027: de onde vieram 68,2/45 e 51,4/8? Se forem entrar em algum lugar, exportar os valores de
   comparação.
5. Corrigir na v1 o nome das regras que some em inglês (fora do escopo desta branch)?

## Registro

- 2026-11-07: v2 criada (motor parametrizado, teste 1370/0, seção Monte sua regra, Figura G com quatro linhas);
  revisão independente em Python (próprio código, sem ler o motor): R0, R0s, R3b, R4v e 3 regras personalizadas × 11
  parcelas, 0 divergências (total relativo 2e-15, zerados e estabilidade exatos); confirmou 163/128/90,5/155/70%,
  224/136 e o achado da R0s (corte único ou fixo 95 explica os provisórios). Pontos que levantou: o casamento exato
  dos rótulos de bloco (jun/2027 sem valor) é uma escolha; a "parte do máximo" é ponderada pelo peso de repartição;
  não há c12 faltando em nenhuma parcela.
- 2026-11-08: figuras finais do artigo (1C, 2A, 2B, 3A, 3B/C), três regras do artigo, 164 publicados, BRL em inglês;
  teste 1481/0 (v1 972/0).
