#!/usr/bin/env bash
# Rodada do Atlas da APS (no contêiner coorte-atlas, no zen). Semanal; só republica se os dados mudaram.
#   1. federal: se o relatorioaps tem parcela nova, refaz o tier1 (Brasil) e o detalhe das equipes de SP
#   2. IGM: painel atual e legado da SES-SP (barato; toda semana)
#   3. CNES: arquivos EP novos no FTP do DATASUS (cumulativo)
#   4. build + publicação no R2; em qualquer erro, e-mail pelo Worker do site
# FORCAR=1 refaz o federal mesmo sem parcela nova.
set -uo pipefail
cd "$(dirname "$0")/.."
export ATLAS_HOME=${ATLAS_HOME:-/dados}
mkdir -p "$ATLAS_HOME/logs"
LOG="$ATLAS_HOME/logs/run_$(date +%Y%m%d_%H%M).log"
exec > >(tee -a "$LOG") 2>&1

falha() {
  echo "FALHOU: $1"
  python atlas/pipeline/alerta.py "Atlas da APS: falha em $1" "$LOG" || echo "(alerta também falhou)"
  exit 1
}

P=atlas/pipeline
echo "== $(date -Is) atlas: início (código $(git rev-parse --short HEAD 2>/dev/null || echo '?'))"

NOVA=$(python $P/novidade.py) || falha "consulta de parcelas do relatorioaps"
echo "parcela nova no relatorioaps: $NOVA"
if [ "$NOVA" = sim ] || [ "${FORCAR:-}" = 1 ]; then
  python $P/relatorioaps_brasil.py tier1 || falha "relatorioaps tier1"
  python $P/relatorioaps_brasil.py detalhe SP || falha "relatorioaps detalhe SP"
  # brutos datados: guarda só os 2 últimos tier1
  ls -d "$ATLAS_HOME"/data/public/relatorioaps_br/20*/ | sort | head -n -2 | xargs -r rm -rf
fi

# IGM e CNES não derrubam a rodada: em falha, segue com os últimos arquivos bons e avisa no fim
# (o FTP do DATASUS costuma travar por horas; o painel do IGM muda de chave quando a SES republica)
AVISOS=()
python $P/igm_powerbi.py atual legado || AVISOS+=("IGM (painel da SES-SP)")
ls -d "$ATLAS_HOME"/data/public/igm_sp/20*/ 2>/dev/null | sort | head -n -4 | xargs -r rm -rf
timeout 3h python $P/cnes_ep.py || AVISOS+=("CNES EP (FTP do DATASUS)")

python $P/build.py || falha "build"
python $P/publish.py || falha "publicação no R2"

find "$ATLAS_HOME/logs" -name 'run_*.log' -mtime +120 -delete
if [ ${#AVISOS[@]} -gt 0 ]; then
  echo "AVISOS: ${AVISOS[*]} (publicado com os dados anteriores dessas fontes)"
  python atlas/pipeline/alerta.py "Atlas da APS: rodada com avisos (${AVISOS[*]})" "$LOG" || echo "(alerta falhou)"
fi
echo "== $(date -Is) atlas: fim"
