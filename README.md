# Coorte — análise de dados em saúde

Site institucional e material de marca da **Coorte**: epidemiologia, análise de dados
e produtos digitais para hospitais, redes públicas de saúde e indústria.

## Estrutura

```
marca_coorte/
  site/                       # site publicado
    index.html                # home (hero, método, casos, serviços, contato)
    sobre.html                # sobre + equipe
  Coorte_Marca_e_Linguagem.md # guia de marca e tom de voz
  Coorte_Pitch.md             # pitch
  Coorte_Prompt_ClaudeDesign.md
  Coorte mesh network directions/   # explorações de identidade visual
  index.html                  # versão anterior da home (histórico)
.github/workflows/pages.yml   # publicação automática no GitHub Pages
```

## Publicação

O site é estático — dois arquivos HTML sem build, sem dependências além do
Google Fonts. Todo push para `main` republica `marca_coorte/site` via GitHub Pages.

Para ativar (uma vez): **Settings → Pages → Source: GitHub Actions**.

## Rodar localmente

```bash
cd marca_coorte/site
python -m http.server 8000
# http://localhost:8000
```

## Pendências de conteúdo

- `sobre.html` — parágrafos de "Quem somos" ainda em placeholder.
- Retratos da equipe (4:3), sobrenome e LinkedIn do Henrique, Lattes/ORCID do Paulo.
- Confirmar com Ester Cerdeira Sabino como quer ser descrita e qual vínculo declarar.
