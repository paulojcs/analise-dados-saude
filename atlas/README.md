# Atlas da APS

Mapa em pixels do financiamento da atenção primária, publicado em <https://coorte.io/atlas/>.
Só dados públicos e agregados.

```
atlas/
  web/            página: index.src.html + atlas.js → build_page.py → marca_coorte/site/atlas/index.html
  pipeline/       coletores, build e publicação (rodam no zen, contêiner coorte-atlas)
  estatico/       o que muda raramente: malhas IBGE simplificadas, nomes, IGM pelas Resoluções SS
  run.sh          uma rodada completa (semanal)
  Dockerfile, requirements.txt
```

## Como os dados chegam ao site

```
zen (cron semanal) ──► contêiner coorte-atlas ──► R2 (bucket coorte-atlas) ──► Worker do site ──► coorte.io/atlas/data/*
                         coleta → build → publish        v/<versão>/…  current.json       (worker/index.js)
```

A página (`marca_coorte/site/atlas/index.html`) vai no git e sai no deploy normal do site. Ela lê
`/atlas/data/current.json`, que aponta a versão publicada, e depois `v/<versão>/br.json` e
`v/<versão>/uf/<cod>.json` (sob demanda). As versões são imutáveis, com cache longo; `current.json` tem cache de 5 min.
O publicador só sobe uma versão nova quando o conteúdo muda (hash) e mantém as 3 últimas.

## Fontes

| Dado | Fonte | Coletor | Frequência |
|---|---|---|---|
| Repasse federal da APS por município, 180 campos | relatorioaps-prd.saude.gov.br (API pública) | `relatorioaps_brasil.py tier1` | parcela nova (mensal) |
| Situação de cada eSF/eAP de SP por parcela | idem, relatório detalhado | `relatorioaps_brasil.py detalhe SP` | parcela nova |
| IGM SUS Paulista, pontos e valores do ciclo | Power BI público da SES-SP (NIES) | `igm_powerbi.py atual legado` | toda semana |
| IGM 2024 a 2026, valores pagos | Resoluções SS (atos de pagamento) | `estatico/igm/` (parser + tabela) | quando sai resolução nova |
| Equipes no CNES (Brasil) | FTP DATASUS, arquivos EP | `cnes_ep.py` | competência nova |
| População | IBGE SIDRA 6579 | `build.py` | a cada rodada (cópia local se cair) |
| Malhas | IBGE API de malhas v3 | `prep_estatico.py` | quando houver município novo |

O painel legado do IGM soma uma coluna "dengue" que nenhuma resolução paga; por isso os valores de 2024–25
vêm das resoluções (ver `estatico/igm/README.md`). Ciclos novos aparecem primeiro pelo painel atual (que
bateu com as resoluções de 2026 em 645/645 municípios) e passam às resoluções quando o parser for rodado
com o PDF novo.

## Operação no zen

- Código: `/srv/atlas/repo` (clone deste repositório, branch `main`; `rodar.sh` faz `git pull` antes de cada rodada).
- Dados: `/srv/atlas/dados` (montado em `/dados`), cerca de 1 GB. Logs em `/srv/atlas/dados/logs/`.
- Segredos: `/srv/atlas/.env` (chmod 600, fora do git): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, `R2_BUCKET=coorte-atlas`, `ATLAS_ALERT_TOKEN`.
- Agenda: cron do usuário `ubuntu`, segunda-feira 06:00 (BRT). Em falha, e-mail por `POST /api/atlas-alert`.
- Rodar à mão: `/srv/atlas/rodar.sh` (ou `FORCAR=1 /srv/atlas/rodar.sh` para refazer o federal).

Isolado do workbench de São Caetano: outro diretório, outro contêiner, só dados públicos, só conexões de saída.

## Desenvolvimento local

```bash
ATLAS_HOME=atlas/_dados python atlas/pipeline/build.py     # precisa de uma cópia dos dados em atlas/_dados
python atlas/web/build_page.py
npx wrangler dev                                           # R2 local: wrangler r2 object put … --local
```

Valor por equipe e "oportunidade de aumento" são estimativas da Coorte (explicadas na própria página).
