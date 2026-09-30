# Coorte — análise de dados em saúde

Site institucional e material de marca da **Coorte**: epidemiologia, análise de dados
e produtos digitais para hospitais, redes públicas de saúde e indústria.

## Estrutura

```
marca_coorte/
  site/                       # site publicado
    index.html                # home (hero, sobre, método, casos, publicações, serviços, contato)
    sobre.html                # quem somos, equipe, compromissos
    privacidade.html          # política de privacidade (LGPD)
    img/                      # retratos da equipe
  logo/                       # marca (SVG da opção 02, "CO" entrelaçado)
  Coorte_Marca_e_Linguagem.md # guia de marca e tom de voz
  Coorte_Pitch.md             # pitch
  Coorte_Prompt_ClaudeDesign.md
  index.html                  # versão anterior da home (histórico)
worker/index.js               # /api/contato: formulário → e-mail
wrangler.jsonc                # configuração do Worker que serve o site
```

A pasta `referencias/` (fora do git) guarda o material de trabalho: o
protótipo da v2, as explorações de identidade visual do Claude Design, as
opções de logo, fotos originais e revisões de texto.

## Publicação

O site é estático — arquivos HTML sem build, sem dependências além do
Google Fonts. Ele é servido por um Worker chamado `coorte`, descrito em
`wrangler.jsonc`, no domínio <https://coorte.io>.

O Worker só executa código em `/api/*`: `worker/index.js` recebe o formulário de
contato (`POST /api/contato`) e envia a mensagem por e-mail pelo Email Routing
do coorte.io (binding `send_email`, sem serviço externo nem chave de API). O
destino precisa ser um endereço verificado em Email Routing → Destination
addresses. Os endereços `contato@` e `privacidade@coorte.io` são regras de
encaminhamento no mesmo painel.

Para testar localmente: `npx wrangler dev`. O envio é simulado e cada mensagem
vira um arquivo `.eml` em `.wrangler/tmp/email/`.

O deploy é feito pelo Cloudflare Workers Builds: o repositório está conectado ao
Worker e todo push em `main` gera uma nova versão automaticamente. Não há
GitHub Action envolvida.

Para publicar da máquina local, fora do fluxo automático:

```bash
npx wrangler deploy
```

## Rodar localmente

```bash
cd marca_coorte/site
python -m http.server 8000
# http://localhost:8000
```

## Pendências de conteúdo

- Confirmar com Ester Cerdeira Sabino como quer ser descrita e qual vínculo declarar.
- Retrato do Henrique em resolução maior (o atual tem 400×399 px).
- O formulário de contato ainda é demonstração: falta ligar a e-mail ou CRM.
