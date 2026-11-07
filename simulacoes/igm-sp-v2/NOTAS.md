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

Valores da sessão de análise (de `periodos_cobertura.csv.gz`), no teste como provisórios:
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

## Perguntas abertas para Paulo

1. R0s: mediana por vacina (19 em jun/2026, página atual) ou corte único (20, valores provisórios)?
2. Figura G: "parte do máximo" das Regras A e B = o que ganharam antes de repartir o orçamento (as linhas A e B
   ficam quase iguais). É assim que o artigo vai mostrar, ou em R$ com a Regra A escalada à média da atual?
3. Orçamento "valor próprio" cresce em 2027 na proporção da parte variável (×1,2). Ou o mesmo R$ em todas?
4. "Zerados mas vacinando bem" usa o piso da rampa (80 em regras de faixas). Quer um controle próprio?
5. A v2 substitui a v1 na mesma URL quando publicar?

## Registro

- 2026-11-07: v2 criada (motor parametrizado, teste 1370/0, seção Monte sua regra, Figura G com quatro linhas);
  revisão independente em Python (ver commit).
