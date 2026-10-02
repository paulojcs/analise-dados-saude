# IGM SUS Paulista: repasses por município segundo as Resoluções SS (2024–2026)

Tabela oficial por município (645 municípios de SP) lida dos Anexos das Resoluções SS de pagamento, para substituir os valores do painel SES "legado". Gerada em 2026-10-02 por `parse_resolucoes.py`. Os PDFs são os atos publicados na BVS SES-SP; o script lê a pasta indicada em `IGM_NORMAS`. As tabelas são lidas do PDF com pdfplumber, e não do .txt, que embaralha as colunas.

```
python parse_resolucoes.py   # ~3 min; regrava os CSVs e _validacao.txt
```

## Arquivos
- `igm_resolucoes_longo.csv`: uma linha por município × resolução × parcela × componente (10.320 linhas). As colunas são `ibge, municipio, ano, resolucao, data_publicacao, parcela, componente, valor, arquivo`.
- `igm_resolucoes_ciclo.csv`: uma linha por município × ciclo (645 × 8). As colunas são `fixo, variavel, ajuste, bonus, total, resolucoes, nota`. Um componente fica vazio quando não existe naquele ciclo.
- `_validacao.txt`: contagens, somas contra os totais impressos, conferência de SCS e comparação com o painel legado.
- `_comparacao_legado.csv`: comparação município × ciclo com o painel legado.

## O que cada resolução paga

| Resolução (arquivo) | Publicação | Paga | Total no Anexo |
|---|---|---|---|
| Res SS 18/2024 (E_R-SS-18_080224) | 08/02/2024 | 1ª parcela fixa de 2024, antecipada de maio | 137.218.476,60 |
| Res SS 140/2024 (E_R-SS-140_200624) | 20/06/2024 | Fixo da 2ª e da 3ª parcela e variável da 2ª e da 3ª parcela, tudo antecipado. O variável usa a base 3º quad./2023 contra o 2º quad./2023 | 412.890.761,78 |
| Res SS 13/2025 (E_R-SS-13_240125) | 24/01/2025 | Parcela 1 fixa de 2025, antecipada | 114.348.730,50 |
| Res SS 97/2025 (E_R-SS-97_300525) | 30/05/2025 | Parcela 2 fixa de 2025, antecipada de setembro | 114.348.730,50 |
| Res SS 180/2025 + RET (E_RS-SS-180_081025, E_RS-SS-180-RET_081025) | 08/10/2025 | As duas parcelas variáveis do 1º e do 2º quad. de 2025 num único valor, calculado com o 1º quad./2025 contra o 3º quad./2024. A retificação muda só o texto do art. 2º; os valores não mudam | 109.242.501,33 |
| Res SS 230/2025 (E_RS-SS-230_091225) | 09/12/2025 | Col. A: variável do 3º quad. (base 2º quad./2025) e fixo do 3º quad. Col. B: ajuste do 2º quad. Col. C: bônus excepcional de 2025 | 230.835.172,56 |
| Res SS 111/2026 (E_RS-SS-111_090626) | 09/06/2026 | 1ª parcela de 2026: fixo e variável | 201.769.088,13 |
| Res SS 185/2026 (E_RS-SS-185_080926) | 08/09/2026 | 2ª parcela de 2026: fixo e variável | 185.814.716,99 |

A Res SS 11/2024 não traz pagamento. Seu Anexo III dá só os per capita anuais (SCS: fixo R$ 9,00 e variável R$ 6,00), e 9 × 162.763 / 3 = 488.289,00 confere com a parcela fixa de 2024.

No `longo`, a coluna `parcela` traz o número da parcela que o ato declara. O ajuste da Res 230 recebe `parcela=2`, porque corrige o 2º quad. O bônus recebe `parcela=2025`, porque é anual.

## Regras de mapeamento para ciclos (`igm_resolucoes_ciclo.csv`)

O ciclo é o quadrimestre de pagamento previsto: Q1 = maio, Q2 = setembro, Q3 = dezembro.

| Ciclo | Fontes | Regra |
|---|---|---|
| Q1.2024 | Res 18 | Só fixo. O variável é 0 pela Res 11/2024, art. 4º, item 1 |
| Q2.2024 | Res 140 | Fixo e variável "ref. set/2024", pagos em junho/2024 |
| Q3.2024 | Res 140 | Fixo e variável "ref. dez/2024", pagos em junho/2024 |
| Q1.2025 | Res 13 + Res 97 | Duas parcelas fixas. A Res 230, art. 2º, §1º, diz que o 1º quad. foi pago com duas parcelas fixas, embora a Res 97 se chame "2ª parcela" |
| Q2.2025 | Res 180 + Res 230 col. B | As duas parcelas variáveis, mais o ajuste pago em dez/2025 que corrige esse cálculo (Res 230, art. 2º, §2º) |
| Q3.2025 | Res 230 col. A + col. C | Fixo e variável do 3º quad., mais o bônus anual |
| Q1.2026 | Res 111 | Fixo e variável |
| Q2.2026 | Res 185 | Fixo e variável |

Não se inventou divisão. Em 2025 não há divisão oficial do variável entre o 1º e o 2º quad.: a Res 180 paga as duas parcelas juntas, e o ajuste da Res 230 não é atribuído a um quadrimestre de avaliação. O texto da Res 230 sugere que o ajuste corresponde à parcela do 1º quad. recalculada com o 3º quad./2024, mas isso não está tabelado. Por isso os totais anuais são a comparação mais segura.

## Validação
- **Municípios:** todas as 8 resoluções têm 645 municípios, sem valor ausente. A soma das colunas confere com a coluna de total da linha na Res 140, na Res 230, na Res 111 e na Res 185.
- **Somas contra o total impresso:** a Res 18 e a Res 180 batem exatamente. Nas outras a diferença vai de R$ 0,06 a R$ 0,83, o que é arredondamento de centavo por linha: o total impresso soma valores sem arredondar.
- **São Caetano do Sul (354880):** os 16 valores conferidos coincidem com os do README das normas. A tabela abaixo dá o total de SCS por ciclo.

  | Ciclo | Fixo | Variável | Ajuste | Bônus | Total |
  |---|---:|---:|---:|---:|---:|
  | Q1.2024 | 488.289,00 | 0 | | | 488.289,00 |
  | Q2.2024 | 488.289,00 | 222.008,73 | | | 710.297,73 |
  | Q3.2024 | 488.289,00 | 222.008,73 | | | 710.297,73 |
  | Q1.2025 | 813.815,00 | | | | 813.815,00 |
  | Q2.2025 | | 325.526,00 | 105.795,95 | | 431.321,95 |
  | Q3.2025 | 406.907,50 | 380.458,51 | | 0,00 | 787.366,01 |
  | Q1.2026 | 406.907,50 | 292.973,40 | | | 699.880,90 |
  | Q2.2026 | 406.907,50 | 187.177,45 | | | 594.084,95 |

- **Totais por ano (estado):**
  - 2024: R$ 550.109.238,48 (fixo 411,66 mi, variável 138,45 mi).
  - 2025: R$ 568.775.135,84 (fixo 343,05 mi, variável 191,24 mi, ajuste 28,02 mi, bônus 6,47 mi).
  - 2026 até a 2ª parcela: R$ 387.583.805,94.

## Comparação com o painel legado (estado, por ciclo)

| Ciclo | Resoluções | Legado (total) | Diferença | Explicação |
|---|---:|---:|---:|---|
| Q1.2024 | 137.218.476,60 | 205.827.714,90 | −68.609.238,30 | O legado soma uma coluna "dengue" igual a 50% do fixo, que nenhum ato de pagamento sustenta |
| Q2.2024 | 206.445.380,94 | 206.445.380,89 | 0,05 | Centavos |
| Q3.2024 | 206.445.380,94 | 206.445.380,89 | 0,05 | Centavos |
| Q1.2025 | 228.697.461,12 | 343.046.191,50 | −114.348.730,38 | Três diferenças: (1) o legado mostra a Res 97, que é fixa, como "variável"; (2) soma "dengue" igual a mais uma parcela fixa (50% de Res 13 + Res 97); (3) nenhuma resolução sustenta esse valor |
| Q2.2025 | 137.266.448,26 | 137.266.447,91 | 0,35 | O legado já soma o ajuste da Res 230 col. B ao variável |
| Q3.2025 | 202.811.226,46 | 202.811.225,98 | 0,48 | O legado soma o bônus da Res 230 col. C ao total |

Por município, sem a coluna dengue, o total coincide em 645 de 645 municípios em todos os ciclos de 2024 e 2025, com tolerância de 1 centavo. A divergência entre o legado e as resoluções está, portanto, em dois pontos:
- a coluna "dengue" em Q1.2024 e em Q1.2025;
- a forma de rotular os componentes: em Q2.2025 o ajuste e as duas parcelas variáveis aparecem como um único "variável", e em Q1.2025 a 2ª parcela fixa aparece como "variável".

## Ressalvas
- A coluna "dengue" do legado vale exatamente 0,5 × o fixo pago no Q1 em todos os municípios. Isso sugere que o painel registrou em dobro a antecipação, justificada pela dengue, e não um repasse adicional. Se existir um ato específico de incentivo à dengue fora desta pasta, ele não foi verificado aqui. Vale procurar na BVS SES-SP antes de descartar a coluna de vez.
- O Q1.2025 mostra mais fixo (duas parcelas) e o Q2.2025 não mostra fixo, por causa do cronograma de 2025. O fixo anual (3 × 114,35 mi) e o variável anual estão completos. Para comparar 2025 com outros anos, prefira o total anual.
- Os nomes de município vêm da Res 13/2025 (com acentos). Na Res 97 o .txt desalinha os nomes; o PDF lido por posição está correto.
