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

## O desenho (versão final, validada por Paulo em 04/11/2026)

Gráficos simples, em reais quando o assunto é dinheiro; um título curto por seção e o detalhe no ⓘ (que termina
com a fonte em uma frase: "Fonte: valores publicados pela SES", "painel federal relido em 19/09/2026"...).
Um seletor de município no topo fixo (× volta ao estado); a página abre no estado inteiro.

1. **Setembro de 2026**: mapa (pontos publicados jun → set; 415 perderam) + duas barras do dinheiro das vacinas
   jun R$ 39,1 mi → set R$ 22,9 mi (−41%) + barra 415 / 105 / 125. Com município: o dinheiro dele.
2. **Calendário**: nascidos por mês (mais crianças de jan a abr) e a mediana acumulada × 12 meses, com controle de tempo.
3. **Denominador velho**: histograma do teto 100 × nascidos 2025 ÷ nascidos 2024 (185 abaixo de 95%).
4. **Acaso e atraso**: oscilação da Penta por nascidos; três municípios grandes na releitura.
5. **Regras**: definições em uma linha; escada × rampa; total do estado por ano em R$ (mesmo orçamento = mesmo
   total); parcela a parcela (estado ou município) nas regras atual, proporcional e por criança.
6. **Uma criança a mais**: sem município, a parte dos municípios a uma criança de um corte em cada parcela e o salto
   mediano; com município, a curva do dinheiro (atual, proporcional, por criança); por fim, R$ por criança nascida
   por faixa de per capita do estado.
7. **Como contamos**.

Decisões de Paulo: mapa com os pontos **publicados** (415, não a reconstrução 419); a medida da cobertura segue a
regra; abre no estado; proporcional e por criança sempre com o mesmo orçamento da regra atual; sem o controle do
piso (80% fixo, como no artigo); fontes no ⓘ, não em etiquetas sob os gráficos.

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

Antes (estado em 04/11/2026): aprovação da Prefeitura de São Caetano do Sul **não** é mais necessária (o artigo
não trata mais do município). Pendentes: conflito de interesse (o artigo está em branco; a página ainda diz que
alguns autores trabalham na gestão de um município paulista); frase do artigo §3.1 sobre Santo André; README da
exportação. Paulo vai linkar a página a partir da publicação dele no Substack (pôr o link de volta na página quando
houver a URL; usar `?m=<IBGE>` para links que abrem num município).

1. Conferir: `node marca_coorte/site/simulacoes/igm-sp/teste_referencia.js` = 0 falhas; olhar a página no celular.
2. Se houver DOI: trocar "Manuscrito em preparação" / "Manuscript in preparation" (bloco "Como contamos" e JSON-LD).
3. Opcional: incluir o artigo em `publicacoes.html` (lista `PUBS`, por PMID, quando existir).
4. `git switch main && git merge feat/simulacao-igm-sp && git push` → o Workers Builds publica sozinho.
5. Depois: Search Console → inspeção de URL → solicitar indexação de `https://coorte.io/simulacoes/igm-sp/`.

Lembretes: tudo em `marca_coorte/site/` é público (inclui `dados/README.md` e o teste). O dinheiro aqui é o das
vacinas antes do teto de 10 pontos; o Atlas mostra o IGM efetivamente pago, por isso os valores diferem (explicado
nas duas páginas).

## Registro

- 2026-11-01: página criada (rascunho → versão completa), revisão independente, correções; teste 972/972.
- 2026-11-04: citação com os autores (Suen, Oikawa, Malik, Sabino, Leal; FMUSP), conferida com o artigo.
- 2026-11-04: redesenho mais simples (gráficos em reais, seletor no topo, fontes no ⓘ); validado por Paulo. Não publicada.

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
