# Simulador IGM SP (coorte.io/simulacoes/igm-sp/), versão 2

A versão 2 **substituiu a v1** no endereço do artigo, `marca_coorte/site/simulacoes/igm-sp/` (decisão de Paulo,
10/11/2026). A v1 fica só no histórico do git (branch `feat/simulacao-igm-sp`, notas em `NOTAS_v1.md`).
`/simulacoes/igm-sp-v2/` redireciona para cá (`marca_coorte/site/_redirects`). Branch `feat/simulacao-igm-sp-v2`,
**ainda não publicada**: nada disto está no ar (coorte.io/simulacoes/igm-sp/ dá 404 até o merge em `main`).
Arquivos de trabalho (maquete, textos e números do artigo) ficam em `simulacoes/igm-sp/trabalho/`, fora do site.

## Página reorganizada (10/11/2026)

- **Parte 1, Os dados**: mapa (415 de 645), calendário, denominador, acaso e atraso. **Parte 2, A simulação**: Duas
  regras (A e B), Monte sua regra. **Como contamos** no fim. Divisórias `#dados` e `#simulacao`; menu do topo
  agrupado (Dados · Simulação · Duas regras · Monte sua regra · Como contamos · Atlas; as duas sub-entradas somem
  abaixo de 1240 px, o menu inteiro abaixo de 760 px).
- **Saiu a seção "Quanto vale vacinar uma criança a mais?"** (`#crianca`, curva por município e escolha da parcela).
  A ideia ficou em dois lugares: (1) um card em Duas regras (`#crCard`): regra de 2026 = R$ 0 ou um salto (34% dos
  municípios a uma criança de um corte em set/2026, salto mediano R$ 2.349; Ribeirão Pires e Tatuí: R$ 0, com 33 e 32
  crianças a mais passariam a R$ 40.702 e R$ 40.344) contra Regras A/B = um valor conhecido por criança (Penta, set/2026:
  Ribeirão Pires R$ 214 na A e R$ 149 na B; Tatuí R$ 122 e R$ 149, como no artigo); (2) uma linha no cartão Seu município
  (`#mCrianca`): "Com esta regra, cada criança vacinada a mais vale R$ X" (Penta, set/2026, por vacina e parcela, dentro
  da rampa; estado = mediana dos municípios na rampa, R$ 263 na Regra A; regras de faixas = "—", tudo ou nada). O gráfico
  "por criança nascida, por faixa de per capita" foi para Duas regras. `IGM.criancaAMais` continua no motor (teste).
- **2027 com um único ano de nascidos (SINASC 2024)**, dados 1.3 (PrefSaoCaetano c376f1c: `s10_regras_periodos.py`
  rev. 10/11, `s06_painel.py --publico --json`, `s11_valida_export.py` 924 conferências). Só as linhas de set e dez/2027
  mudam. Antes → agora: B60 R$ 35,70 → 39,25 mi; regra atual set/27 R$ 25,52 → 20,88 mi (zerados 222 → 237), dez/27
  R$ 30,90 → 46,19 mi (98 → 35); Regra A sem orçamento 55,00/58,47/54,93 → 55,00 nas três. A nota do denominador misto
  saiu dos métodos; fica a nota simples de que 2027 é projeção sem mudança na vacinação. **O artigo fica desatualizado em
  2027** (Figura 3A, "R$ 35.7 million in 2027"), se mantiver os valores determinísticos de 2027.
- Publicação: `noindex` fora, canonical/og:url = `/simulacoes/igm-sp/`, JSON-LD (versão 2.0, título atual do artigo),
  sem a nota "versão 2 (em desenvolvimento)" nem os links para a v1; sitemap lastmod 10/11/2026; a imagem og é a da v1
  (`og-igm-sp-1200x630.png`, "415 de 645"), que continua certa.
- Teste: seção 10 (uma criança a mais = artigo: 214/122/149/149; mediana R$ 263; 34% e R$ 2.349; SINASC 2024 em 2027;
  B60 R$ 39,25 mi; Regra A sem orçamento igual nas três parcelas de 2027). 2027 nas verificações da Figura 3A e nos
  totais por porte de 11 parcelas atualizados para os dados 1.3.

## O que a v2 acrescenta

| Arquivo (em `marca_coorte/site/simulacoes/igm-sp/`, antes `igm-sp-v2/`) | O quê |
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

URL: `?preset=atual|atual12|A|B|Am|R1|R2|R3|R4&medida=acum|c12&regra=faixas|rampa&corte=mediana|50–95&piso=&alvo=&aloc=hab|crianca&fixo=0–100&orc=sem|atual|<R$ mi>&sv27=50–100&margem=100–300&parc=<AAAA-MM>`,
além de `?m=` e `?lang=en`. Parâmetro inválido volta ao padrão sem aviso. Padrão = Regra A (preset padrão desde 09/11/2026; antes, Regra B).

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

## Publicar (preparado em 10/11/2026; esperando o OK explícito de Paulo)

Ver o plano em "Merge e deploy" no fim deste arquivo.

## Revisão de 08/11/2026: as figuras finais do artigo

Decisões de Paulo: o artigo tem só três regras, **regra atual, Regra A (R3b) e Regra B (R4v)** (em 08/11 a B era o padrão; em 09/11 a **A** passou a ser o padrão, ver abaixo); R1, R2, R4 e
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

## Revisão de 09/11/2026: resultados por porte, Regra A como padrão, margem para pequenos

Pedido: a seção "Monte sua regra" mostrava oito saídas e não respondia, para um leigo, "o que muda se usarmos a minha
regra em vez da atual?". Maquete (`trabalho/mock-monte.html`, sem mexer na seção `#monte`): frase ao vivo
(ganham / perdem / praticamente iguais), mapa de ganho e perda, barras por porte, cartão "Seu município" com a linha
pelas parcelas e "ver detalhes" para o resto. A comparação está em `comparar.js` (usado pela maquete e pelo teste).

Decisões de Paulo (09/11): **praticamente igual = diferença de até 5% do que o município recebe na regra atual**
(no mesmo período); a frase usa **o período todo** (sem escolher parcela); **Regra A é o padrão** (o artigo nunca
disse qual preferia; Paulo apagou "we prefer rule B" do Google Doc); a maquete compara A × atual.

Depois (09/11, aprovado): a comparação usa **as 8 parcelas de set/2024 a dez/2026** (o período do orçamento do artigo,
R$ 256,4 mi; não as 11 da maquete); o artigo **não** dirá que a A é a preferida, e a página
também não (o rótulo "(preferida)" saiu em 09/11; a A é só o padrão); arquivos de trabalho fora de `marca_coorte/site`, em `simulacoes/igm-sp-v2/trabalho/`.

**Seção #monte (passos 2–5 da handoff, 09/11).** Embaixo do construtor: frase ao vivo, mapa de ganho e perda
(azul ganha, laranja perde, cinza praticamente igual; clique escolhe o município), barras por porte, cartão "Seu
município" (busca; R$ atual → R$ da regra escolhida nas 8 parcelas; linha pelas 11 parcelas) e "Ver detalhes" com o
resto (dinheiro e zerados por parcela, mudança, escolha da parcela + uma criança a mais, mapa por parcela, zerados mas
vacinando bem; redesenham ao abrir). Saíram o gráfico por terço da natalidade e o gráfico por município (virou o
cartão). Regra A: 160 ganham / 408 perdem / 77 iguais; R$ 256,4 mi nas duas; zerados em ao menos uma parcela 344 → 60.
Regra atual contra ela mesma: frase própria ("Esta é a regra atual…"). Regra com parcelas sem valor (R0s): a soma usa
só as parcelas com valor nas duas regras (7). Teste: para todo preset, frase = mapa = barras = 645.
Revisão independente (agente, 09/11): números conferidos por script próprio (A 160/408/77, B 152/442/51, R3m 257/292/96,
R0s 332/196/117, R1 230/54/361, atual 0/0/645), URL, idioma, seleção em sincronia, 375 px sem estouro, nada de
`trabalho/` publicado, sem erros no console. Corrigido: título/subtítulo neutros com a regra atual escolhida; frase
dos zerados diz o período (8 ou as parcelas comparadas); nota do cartão com o período certo; diferença do cartão a
partir dos valores arredondados; "in reais" → "in money terms"/"in BRL"; lista de sugestões do cartão fecha ao
escolher; "Grande ABC". Não mexido: cores do mapa em RGB (cópia de --sobe/--desce), "Sep 26" nos gráficos (da v1),
mapa só com mouse (a busca cobre o teclado). Teste 1577/0.

**Achado: as Regras A e B tiram dinheiro dos municípios pequenos.** Nas 8 parcelas de set/2024 a dez/2026 (período do
orçamento do artigo, mesmo dinheiro nas três regras, R$ 256,4 mi), os pequenos (< 20 mil hab., 384) recebem
R$ 41,5 mi na regra atual, R$ 35,1 mi na A (−15,5%) e R$ 32,3 mi na B (−22,1%); os grandes (> 100 mil, 81) ganham
6,9 e 10,6 mi. Por habitante e ano, pequenos ÷ grandes: 3,26× hoje, 2,63× na A (= a razão do próprio per capita,
2,61×) e 2,37× na B (os pequenos têm menos nascidos por habitante: 9,6 contra 10,5 por mil). Nas 11 parcelas da
maquete: 3,44×, 2,66×, 2,39×. O per capita fica; o que sai é a vantagem que a pontuação atual dá aos pequenos (parte
média do próprio máximo 63,9% contra 52,8% dos grandes; nas Regras A/B 77,9 contra 78,0). A vantagem vem em parte do
acaso: o valor acumulado do ano dos pequenos se afasta 18,5 pontos, em média, da cobertura de 12 meses (5,8 nos
grandes), e as faixas pagam cheio quando esse valor passa de 95% ou sobe; em parte é cobertura real (63% dos pares
dos pequenos com 12 meses ≥ 95%, contra 41%). Decomposição dos pequenos (8 parcelas): orçamento fixo +1,3; rampa
−3,7; 12 meses −4,0 (= Regra A); por criança −2,7 (= Regra B).

**Regra A + margem para pequenos** (preset `Am` = R3m; campo novo `margem` no motor, padrão 1; na URL
`margem=100–300`, em %): a Regra A com o peso de repartição dos municípios com menos de 20 mil habitantes
multiplicado por 1,25 (com orçamento, o mesmo orçamento repartido de novo; sem orçamento, o máximo deles sobe 25%).
1,25 foi escolhido porque devolve aos pequenos, nas 11 parcelas, o que recebem hoje (60,7 contra 60,6 mi); nas 8
parcelas, 42,4 contra 41,5 mi. Quem paga: os médios (−2,7 mi nas 8 parcelas, −3,9%); os grandes ainda ganham
1,8 mi. Fica fora dos Resultados do artigo; só a Discussão a cita.

Números para o artigo: `node simulacoes/igm-sp-v2/trabalho/tamanho_municipio.js` (8 parcelas; `todas` = 11). Texto
proposto: `trabalho/paper_tamanho_municipio.md` (também em `orchestrator/handoffs/coorte-igm-paper-size-paragraph-2026-11-09.md`).
Teste: seção 8 do `teste_referencia_v2.js` (margem 1 = Regra A; R3m soma o orçamento, = A × fator com os pequenos
× 1,25; totais por porte e ganham/perdem/iguais nos dois períodos; classes do mapa = frase).

## Revisão de 09/11/2026 (noite): regra de 2026 aplicada para trás, maio, denominador misto de 2027

Verificação (sessão do orquestrador): a coluna "regra atual" é a regra de 2026 (CIB 24 e 25/2026) aplicada a todas as
parcelas com o dinheiro de 2026; em 2024–25 o estado pagou pela CIB 117/2023 (nascidos do mesmo ano, outra parte
variável). As parcelas são pagas no 5º dia útil de maio, setembro e dezembro. Mudanças na página:
- Rótulo da primeira parcela do ano: **mai** (os ids dos dados continuam `AAAA-06`; `PAG_L` troca só o rótulo), e
  os textos "junho / jun / June" das parcelas viraram maio/May.
- Métodos (PT e EN, "Outras regras"): uma frase dizendo que a "regra atual" é a regra de 2026 aplicada a todas as
  parcelas, que 2024–25 seguiram a CIB 117/2023 e que essas parcelas mostram o que os municípios teriam recebido.
- Métodos ("Previsões, projeções e aproximações"): nota sobre o **denominador misto de 2027** (meses de 2026 no SINASC
  2024, de 2027 no SINASC 2025). Na projeção à parte (PrefSaoCaetano `docs/simulacao_estadual/Projecao_2027_tamanho.md`),
  só essa mistura leva a perda dos pequenos na Regra A de cerca de −16% (um único ano de nascidos) para −20,5%.
  **Recomendação:** alinhar 2027 a um único ano de nascidos (SINASC 2024, como o painel lido em 19/09 e como o
  cenário principal do artigo; o SINASC 2025 é preliminar e não tem data de troca). Ainda não feito: precisa
  reexportar `cobertura.csv.gz` de 2027 no PrefSaoCaetano e atualizar `referencia.json` e o teste.
Texto do artigo reformulado (contrafactual + projeção de 2027 como confirmação): `trabalho/paper_tamanho_municipio_v2.md`
(página para colar: `orchestrator/handoffs/coorte-igm-paper-size-v2-2026-11-09.html`).

## Revisão de 10/11/2026: pesos que protegem os municípios pequenos

Decisão de Paulo: o artigo mostra só que as Regras A e B, como propostas, tiram dinheiro dos pequenos (contrafactual das
8 parcelas); a projeção de 2027 sai do artigo; as formas de proteger os pequenos vão para a Discussão e para presets.
Motor: campos novos `margemMed` (peso dos médios, 20–100 mil) e `afina`/`afP1`/`afP2` (peso decrescente pela população
de 2026: `afina` até afP1, linear até 1 em afP2); `pesoTamanho()` multiplica os três pesos. URL: `margemMed=100–300`,
`afina=100–300` (%), `afP1`/`afP2` em mil habitantes. Controles em Avançado. Presets (fonte: PrefSaoCaetano
`src/vacinacao/s12_variantes_pequenos.py`, `outputs/vacinacao/variantes_pequenos/`, commit a9207f7):
- `At` = R3t, **Regra A + peso decrescente para pequenos**: 1,30 até 10 mil, 1 em 30 mil (a V2_taper30 que a s12
  recomenda). 8 parcelas: pequenos +2,26%, médios −2,81%, grandes +0,70%; 268/267/110 (reproduz a s12 exatamente).
- `Ap` = R3p, **Regra A + pesos por porte**: 1,24 / 1,05 = os pesos calibrados **para trás** (1,239 / 1,054), não os
  para a frente (1,271 / 1,107), porque o artigo e a página usam as 8 parcelas. Com o arredondamento: +0,14 / −0,28 /
  +0,09%; 250/293/102. (Os para a frente, nas 8 parcelas, dariam +0,8 / +3,2 / −1,8%.)
- `Am` = R3m, renomeado **Regra A + peso único para pequenos** (1,25): +2,1 / −3,9 / +1,3%.
Teste seção 9: R3t e as variantes calibradas da s12 (V2_taper, V2_tier, V2_w) batem com o resumo.csv da s12 a menos de
0,01 ponto; pesos = 1 é a Regra A; orçamento fecha; para todo preset frase = mapa = barras = 645. Teste 1625/0.

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
- 2026-11-09: worktree movida para `COORTE/wt/simulacao-igm-sp-v2`; maquete da seção Monte sua regra; Regra A como padrão;
  preset Regra A + margem para pequenos; teste 1545/0.
- 2026-11-09 (tarde): seção #monte nova ligada (8 parcelas, ±5%, Regra A padrão); trabalho/ fora do site; revisão
  independente aplicada; teste 1577/0.
- 2026-11-09 (noite): "(preferida)" tirado da página (definições, métodos, botão do preset); a Regra A continua o padrão,
  sem ser chamada de preferida (decisão de Paulo).
- 2026-11-09 (noite): maio no rótulo da 1ª parcela; métodos dizem que a regra atual é a de 2026 aplicada para trás;
  nota do denominador misto de 2027; teste 1577/0.
- 2026-11-10: pesos por tamanho no motor (margemMed, afina); presets peso decrescente, pesos por porte, peso único;
  teste 1625/0.
