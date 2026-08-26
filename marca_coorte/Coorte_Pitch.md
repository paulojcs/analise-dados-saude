# Coorte — pitch

Três formatos, a mesma espinha. Todos derivam do copy da página, para que quem ouve o pitch e depois abre o site encontre as mesmas palavras.

---

## 1. Trinta segundos (elevador, abertura de reunião, apresentação em evento)

> A Coorte é um núcleo de ciência de dados em saúde. Hospitais e secretarias já produzem, todo mês, muito mais registro do que conseguem ler — e o que falta não é dado, é o caminho entre o dado e a decisão. A gente constrói esse caminho: pega prontuário, laboratório, prescrição e dispensação, verifica a ligação entre eles no nível do paciente e devolve evidência epidemiológica, indicador de gestão e, quando faz sentido, um sistema que continua rodando sozinho. Já fizemos isso com dez anos de microbiologia do Hospital das Clínicas e com a rede municipal inteira de São Caetano do Sul. E fazemos dentro da casa do cliente: o dado não precisa sair da instituição.

*Duração real: ~35 s falado. Corte a última frase se for um interlocutor privado; ela é o argumento decisivo no setor público.*

---

## 2. Dois minutos (reunião de qualificação, primeira conversa com secretário, diretor ou head de RWE)

**Abertura — o problema, na linguagem de quem ouve**

> Toda instituição de saúde com que conversamos diz a mesma frase: "dado a gente tem demais". E é verdade. O problema aparece em três pontos, sempre os mesmos.
> Primeiro, o dado existe mas não é confiável — texto livre, código sem padrão, identificador que não liga entre sistemas. Sem uma fundação verificada, todo número seguinte é opinião.
> Segundo, o relatório existe mas não vira ação — um PDF com trinta gráficos não diz a ninguém o que fazer na segunda-feira.
> Terceiro, o projeto existe mas não sobrevive — quando a análise mora no notebook de um consultor, ela morre junto com o contrato.

**Meio — o que fazemos, com nome de coisa concreta**

> A Coorte trabalha sobre três frentes, mas sempre a partir da mesma fundação de dados: ingestão reprodutível, correção de codificação, ligação de registros verificada e dicionário publicado.
> A primeira frente é **evidência**: coorte retrospectiva, prevalência com recorte de equidade, modelo de risco, avaliação de intervenção por série temporal interrompida. Sai artigo, parecer ou dossiê.
> A segunda é **gestão**: indicador com definição escrita, painel territorial e lista nominal de busca ativa — quem está sem exame, quem está sem tratamento, qual prescrição saiu da diretriz.
> A terceira é **produto**: quando a análise precisa rodar todo mês sozinha, viramos pipeline, alerta e interface, instalados na infraestrutura do cliente, com trilha de auditoria.

**Prova — dois casos, sem adjetivo**

> No Hospital das Clínicas da FMUSP, reconstruímos dez anos de hemoculturas — da extração bruta do laboratório e do equipamento até tendência de resistência por instituto, tempo até detecção, qualidade de coleta e sinalização de aglomerados. Saiu relatório institucional, painel e o protótipo de um sistema de vigilância.
> Em São Caetano do Sul, integramos cinco bases municipais e verificamos a ligação no nível do paciente. Sobre ela construímos uma coorte de mais de 64 mil episódios de infecção urinária, com itinerário de cuidado, desfechos, classificação AWaRe do antimicrobiano e avaliação do efeito de uma diretriz municipal — além dos indicadores de atenção primária e das listas de busca ativa que a secretaria usa.

**Fechamento — o próximo passo, pequeno**

> A porta de entrada é um diagnóstico de dados: duas a três semanas sobre uma amostra das bases, com um relatório do que existe, do que está quebrado e de quais perguntas já dá para responder. É o menor compromisso possível — e é o que torna qualquer projeto seguinte previsível, para nós e para vocês.

---

## 3. Deck — estrutura de 12 slides

Um slide, uma ideia, um título afirmativo. Título que é frase, não rótulo: *"O gargalo não é falta de dado"*, nunca *"Contexto"*.

| # | Slide | Conteúdo | O que o slide tem que provar |
|---|---|---|---|
| 1 | Capa | Coorte · Ciência de dados em saúde + a manchete | Que isto é sério |
| 2 | O problema | Os três pontos de fratura, um por coluna | Que entendemos a casa de quem ouve |
| 3 | Por que agora | Volume de registro eletrônico, exigência de indicador, pressão de resistência antimicrobiana, LGPD fechando a porta da nuvem | Que a janela é esta |
| 4 | O que fazemos | Fundação de dados + três frentes | Que a oferta é legível |
| 5 | Método | As cinco etapas | Que existe processo, não talento avulso |
| 6 | Caso 1 — HCFMUSP | Antes/depois: arquivo bruto → vigilância. Números e entregáveis | Escala e ambiente hospitalar |
| 7 | Caso 2 — São Caetano | Cinco bases ligadas → coorte, indicadores, listas | Escala e ambiente de rede pública |
| 8 | Como a entrega se parece | Os painéis e as listas (dados sintéticos, com aviso na tela) | Que a saída é concreta |
| 9 | O que nos diferencia | Os quatro diferenciais, um por linha | Por que nós e não um BI ou um grupo acadêmico |
| 10 | Dado e conformidade | Instalação local, trilha de auditoria, ética, LGPD | Que não somos um risco jurídico |
| 11 | Quem faz | As três competências, com rosto e trajetória | Que o time existe |
| 12 | Próximo passo | Diagnóstico de dados: escopo, prazo, entregável, preço | Que dá para começar amanhã |

*Se o público for indústria, troque o slide 3 por "onde entramos no seu ciclo de evidência" (burden of disease, RWE para acesso, validação de algoritmo) e o slide 12 por um escopo de estudo.*
*Se for secretaria, mantenha o 3 e reforce o 8 com o painel e a lista de busca ativa — é o que o secretário consegue mostrar ao prefeito.*

---

## 4. Objeções e respostas

| Objeção | Resposta |
|---|---|
| "Nosso dado é uma bagunça, não dá para analisar." | É exatamente por isso que a primeira etapa é o diagnóstico, e não a análise. Nunca começamos por um dado limpo — em nenhum dos projetos. |
| "Já temos um BI." | O BI mostra o que já está estruturado. Nosso trabalho começa antes: verificar se o número está certo, ligar o paciente entre os sistemas e definir o caso. O BI de vocês fica melhor depois, não sem uso. |
| "Não podemos mandar dado de paciente para fora." | Nem pedimos. Trabalhamos preferencialmente dentro da infraestrutura da instituição, com trilha de auditoria. Nuvem só quando é escolha de vocês. |
| "Temos um grupo de pesquisa da universidade fazendo isso." | Ótimo — costumamos trabalhar junto. A diferença é que entregamos também a parte que a academia não entrega: o pipeline que roda mês que vem e a lista que a equipe usa. |
| "Quanto custa?" | O diagnóstico tem escopo e preço fechados. O que vem depois é orçado a partir dele, porque orçar análise sobre dado que ninguém abriu é chutar. |
| "Em quanto tempo vemos resultado?" | Diagnóstico em duas a três semanas. Primeiro indicador ou primeira análise descritiva publicável, em geral entre o segundo e o terceiro mês. |
| "Vocês vão ficar donos do nosso dado?" | Não. O dado é da instituição, o código é entregue e documentado, e a operação é transferida para a equipe de vocês. |

---

## 5. Pendências para fechar o pitch

- Preço e escopo exatos do **diagnóstico de dados** (dias, entregáveis, valor).
- Uma **métrica de impacto** por caso — algo do tipo "X% de redução no tempo até a detecção", "Y pacientes chamados a partir da lista". É o que falta para o pitch sair de "fizemos análise" e chegar em "mudou o desfecho". Se ainda não existe, vale medir no próximo ciclo.
- Autorização formal para citar nominalmente as instituições em material comercial.
- Definir se o produto de vigilância entra no pitch como oferta ou como prova de capacidade — hoje ele é protótipo, e prometer produto que não está em operação é o jeito mais rápido de queimar credibilidade com um comprador técnico.
