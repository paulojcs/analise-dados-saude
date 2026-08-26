# Coorte — handoff para o Claude Design

Dois prompts prontos para colar em **claude.ai/design**. O primeiro constrói o sistema; o segundo aplica o sistema às telas. Rode nessa ordem — o segundo depende do primeiro.

---

## Prompt 1 — Sistema de design

> Sou sócio da **Coorte**, um núcleo brasileiro de ciência de dados em saúde. Fazemos três coisas: estudos epidemiológicos com dados de rotina do SUS e de hospitais, indicadores e painéis para gestão, e produtos de dados (vigilância, alertas, listas de trabalho). Nossos clientes são secretarias municipais de saúde, hospitais e CCIH, e indústria farmacêutica e de diagnóstico. Tudo em português do Brasil.
>
> O registro da marca é **científico-institucional sóbrio** — referências: Institute for Health Metrics, publicações de sociedades médicas, o *Financial Times* impresso. Explicitamente **não** é startup-tech: nada de gradiente saturado, nada de cartão com borda colorida à esquerda, nada de emoji, nada de Inter como fonte de título.
>
> Quero que você construa o **sistema de design da Coorte**, num canvas com uma página para os fundamentos e outra para os componentes. Já temos os tokens definidos — use exatamente estes, não invente cores novas:
>
> **Cores institucionais**
> `--navy: #123A5C` (institucional) · `--navy-deep: #08192A` (fundos escuros) · `--ink: #0E1F2E` (títulos) · `--text: #16232E` · `--text-2: #4E5C68` · `--text-3: #7C8892` · `--paper: #FBFAF7` (fundo de página, off-white quente) · `--surface: #FFFFFF` · `--sand: #EEE9DE` · `--rule: #DCD6C9` (linhas e bordas) · `--clay: #B0533A` (acento, no máximo dois elementos por tela).
>
> **Paleta de dados** (só para séries de gráfico, nunca para interface): `#2A6FB0`, `#D2694A`, `#2FA38C`, `#C79A16`, nessa ordem fixa. Já foi validada para daltonismo — não reordene nem substitua. A quarta cor tem contraste baixo e exige rótulo direto visível.
>
> **Tipografia**: **Spectral** para títulos (serifada, peso 500, letter-spacing negativo em tamanhos grandes), **Inter** para corpo e interface, **IBM Plex Mono** para rótulos, etiquetas e eixos — sempre em caixa alta pequena com letter-spacing .12em.
>
> **Regras de composição**: separação por linha de 1px em `--rule`, nunca por sombra; raio de canto no máximo 2px (4px só na ponta de barra de gráfico); grade rígida de 1120–1180px; gráfico no lugar onde outras empresas põem ícone.
>
> Monte:
>
> **Página "Fundamentos"** — escala tipográfica completa com exemplos reais em português; amostras das duas paletas com hex e papel de cada cor; escala de espaçamento; tratamento de linhas e bordas; o símbolo da marca (um quadrado com três barras horizontais de larguras decrescentes — uma coorte estratificada — a do meio em terracota) em três tamanhos.
>
> **Página "Componentes"** — cada um como um artboard próprio, em estados: cartão de indicador (rótulo, valor grande, variação); cabeçalho de seção com etiqueta mono; tabela de dados densa (cabeçalho mono, números alinhados à direita, tabular-nums); etiqueta de status em quatro níveis (bom, atenção, sério, crítico) sempre com texto além da cor; barra horizontal com linha de meta; moldura de janela de aplicativo (barra de título com pontos, menu lateral, área de conteúdo) — é como apresentamos painéis; botão primário, secundário e sobre fundo escuro; campo de formulário com rótulo mono.
>
> Preencha tudo com conteúdo real do nosso domínio — cobertura de rastreamento, resistência antimicrobiana, internações sensíveis à atenção primária, listas de busca ativa por unidade — nunca lorem ipsum. Todos os números devem ser fictícios e o material deve dizer isso.

---

## Prompt 2 — Telas, depois do sistema pronto

> Usando o sistema de design da Coorte que acabamos de montar, desenhe:
>
> 1. **Página inicial** — hero escuro (`--navy-deep`) com manchete serifada gigante em três linhas ("Do dado bruto / *à decisão* / em saúde."), uma linha de apoio, dois botões, e ao fundo à direita uma malha de nós em perspectiva desenhada em SVG, discreta, atrás de um degradê que protege a legibilidade. Depois: faixa de quatro números, método em quatro etapas, dois casos apresentados como capturas de painel, lista nua de serviços sobre fundo escuro, formulário de contato.
> 2. **Página "Sobre"** — hero menor, dois parágrafos, três integrantes com retrato 4:3, três compromissos sobre fundo escuro.
> 3. **Modelo de painel** — a moldura de janela aplicada a um painel de indicadores da atenção primária, com quatro cartões de indicador, uma barra horizontal com meta e uma lista de busca ativa.
> 4. **Modelo de relatório institucional** — capa e uma página interna com títulos, tabela e figura, para PDF em A4.
>
> Uma ação principal por página. Copy específico do domínio, em português, sem palavra de marketing genérica. Onde faltar um dado real, deixe `[A PREENCHER]` visível em vez de inventar.

---

## Meu parecer sobre o design system

**Vale a pena, mas não pelo site.** Duas páginas não justificam um sistema. O que justifica é o outro lado do negócio: os pipelines de São Caetano e do HC já cospem dezenas de painéis HTML, apresentações para a secretaria e relatórios institucionais, e hoje **cada um sai com uma cara diferente**. Um sistema pequeno resolve isso de uma vez e o código do pipeline passa a gerar entregável já na marca — que é, para um cliente público ou hospitalar, metade da percepção de competência.

**O que construir agora**

1. Um arquivo de tokens (`coorte.css`) que os painéis e relatórios importam.
2. A paleta de dados com a regra de uso escrita — é o que impede que cada análise escolha cor por conta.
3. Cinco componentes: cartão de indicador, cabeçalho de seção, tabela densa, etiqueta de status, moldura de janela.
4. Três modelos de documento: painel, relatório, apresentação.

**O que não construir agora**

Biblioteca no Figma, conjunto próprio de ícones, documentação de sistema com versionamento, tema escuro completo. Para um núcleo de duas a cinco pessoas isso vira manutenção antes de virar utilidade.

**O teste para saber se valeu:** daqui a um mês, gerar um painel novo para a secretaria deve ser importar o CSS e escrever o conteúdo — não escolher cor, fonte e espaçamento de novo.

---

## Detalhe técnico que economiza retrabalho

Peça ao Claude Design para exportar os tokens como **variáveis CSS com os mesmos nomes** que já estão no `index.html` (`--navy`, `--paper`, `--rule`, `--clay`, `--s1` a `--s4`). Assim o site atual e tudo que vier do sistema falam a mesma língua, e o pipeline pode gerar painel com o mesmo arquivo.
