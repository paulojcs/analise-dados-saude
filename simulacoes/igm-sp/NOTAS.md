# Simulador IGM SP (coorte.io/simulacoes/igm-sp/)

Página pública que acompanha o artigo "Do vaccination incentives pay for vaccination? A statewide analysis of
São Paulo's primary care incentive". Branch `feat/simulacao-igm-sp`. **Não publicada**: merge em `main` = deploy.

## O que tem

| Arquivo (em `marca_coorte/site/simulacoes/igm-sp/`) | O quê |
|---|---|
| `index.html` | A página (PT-BR, inglês com o botão EN ou `?lang=en`; `?m=<IBGE>` abre com um município) |
| `motor.js` | As regras de pagamento; roda na página e no teste (o mesmo código) |
| `teste_referencia.js` | `node teste_referencia.js`: recalcula as 7 regras do artigo e os números da história; tem de dar 0 falhas |
| `dados/` | Dados públicos exportados do projeto PrefSaoCaetano (+ `pontos_publicados_2026.csv`, ver abaixo) |
| `og-igm-sp-1200x630.png` | Imagem de compartilhamento; gerada por `simulacoes/igm-sp/gerar_og.py` |

Fora da página: entrada no `sitemap.xml`; no Atlas, link para o simulador na caixa de fontes do IGM
(`atlas/web/index.src.html`, gerado com `python atlas/web/build_page.py`).

## O desenho (vs. o painel antigo em abas)

Sete vistas em sequência, cada uma com um título curto e um ⓘ com o detalhe; métodos à parte no fim.

1. **Mapa** (primeira tela): mudança nos pontos de vacina jun → set/2026 como a SES publicou (415 perderam), busca;
   o município escolhido guia todas as vistas.
2. **Calendário**: nascidos por mês (jan–abr em destaque) e a mediana acumulada em degrau, com um controle de tempo.
3. **Denominador velho**: histograma do teto 100 × nascidos 2025 ÷ nascidos 2024 (185 abaixo de 95%).
4. **Acaso e atraso**: oscilação da Penta por número de nascidos; três municípios grandes com a releitura.
5. **Regras**: escolher a regra, o piso da proporcional (70–90%), o mesmo orçamento; ver o total do estado ou a
   distribuição de cada município (% do próprio máximo); o município escolhido em barras.
6. **Uma criança a mais**: município, vacina e ±N crianças; a curva do dinheiro em cada regra.
7. **Como contamos**: citação, conflito de interesse, regras, leituras, aproximações, fontes, arquivos.

Decisões de Paulo (01/11/2026): mapa com os pontos **publicados** (415, não a reconstrução 419); a medida da
cobertura segue a regra (faixas = acumulado da SES, proporcional e por criança = 12 meses); abre no estado
inteiro, sem município pré-escolhido; a vista "cada município" entra como alternativa, com o total do estado como padrão.

## Atualizar os dados quando o PrefSaoCaetano reexportar

1. Copiar o conteúdo de `PrefSaoCaetano\outputs\simulacao_estadual\painel\publico\dados\` para `dados/`
   (sobrescreve; **não apagar** `pontos_publicados_2026.csv` se a nova exportação ainda não o trouxer).
2. `pontos_publicados_2026.csv` veio de `PrefSaoCaetano\outputs\vacinacao\paper_v09\m_mapa_pontos.csv`
   (colunas `ibge, Q1.2026, Q2.2026` → `mun, pts_jun, pts_set`, arredondadas a 4 casas). O ideal é que a
   exportação do PrefSaoCaetano passe a incluí-lo.
3. `node teste_referencia.js` dentro da pasta da página. Se um número da história mudar (415, 185, 37,5–42,0%...),
   o teste acusa: confira com o artigo e atualize o teste e o texto fixo (métodos, `og:description`).
4. `python simulacoes/igm-sp/gerar_og.py` se o mapa ou o 415 mudarem.
5. Ver a página localmente: `python -m http.server 8765` em `marca_coorte/site` → http://localhost:8765/simulacoes/igm-sp/

## Publicar (quando Paulo decidir; plano: junto com a submissão do artigo)

1. Conferir: `node marca_coorte/site/simulacoes/igm-sp/teste_referencia.js` = 0 falhas; olhar a página no celular.
2. Se houver DOI: trocar "Manuscrito em preparação" / "Manuscript in preparation" (bloco "Como contamos" e JSON-LD).
3. Opcional: incluir o artigo em `publicacoes.html` (lista `PUBS`, por PMID, quando existir).
4. `git switch main && git merge feat/simulacao-igm-sp && git push` → o Workers Builds publica sozinho.
5. Depois: Search Console → inspeção de URL → solicitar indexação de `https://coorte.io/simulacoes/igm-sp/`.

Lembretes: tudo em `marca_coorte/site/` é público (inclui `dados/README.md` e o teste). O dinheiro aqui é o das
vacinas antes do teto de 10 pontos; o Atlas mostra o IGM efetivamente pago, por isso os valores diferem (explicado
nas duas páginas).

## Registro

- 2026-11-01: página criada (rascunho → versão completa), revisão independente, correções; teste 972/972. Não publicada.

## Revisão independente (01/11/2026)

Conferiu de forma independente (Python próprio) as 7 regras nas 11 parcelas e todos os números da história: batem.
Corrigido na página: Santo André **não** ficou com zero pontos no publicado (0,65; só na reconstrução) → "dois dos
três"; "nada mudou na vacinação" → "sobretudo o calendário; parte foi dado atrasado" (como o artigo); Regras abrem com
o mesmo orçamento (comparação a custo igual); Uma criança a mais usa a proporcional com orçamento (R3b), como o
artigo (R$ 236–279); coberturas > 100% = sinal de denominador impreciso, não "reais"; previsão/projeção marcadas em
todo lugar (botões tracejados); texto dos gráficos legível no celular (desenho na largura real); regra do c0 ≥ 95%
que cai para a mediana (75%) nos métodos; "pseudonimizados".

**Para levar ao PrefSaoCaetano / artigo (não corrigido aqui):**
- Artigo §3.1 diz que os três municípios grandes "had scored zero"; no publicado, Santo André teve 0,65 ponto em set/2026.
- O texto do artigo sobre a regra omite o caso c0 ≥ 95% que cai mas fica na mediana (75%); o motor e a página têm.
- `dados/README.md` (da exportação): caveat 5 chama coberturas > 100% de "real"; e cita um "Python twin" que não é público.
- Incluir `pontos_publicados_2026.csv` na exportação.

**Decisão de Paulo pendente:** o conflito de interesse não nomeia o município (São Caetano do Sul); os dados de
referência o identificam (`scs`, linhas de referência). Nomear ou não?
