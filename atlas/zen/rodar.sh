#!/usr/bin/env bash
# Disparo do Atlas da APS no host zen (cron do usuário ubuntu, segundas 06:00 BRT):
#   atualiza o código, reconstrói a imagem se o Dockerfile/requirements mudou e roda atlas/run.sh no contêiner.
# Instalação: ver atlas/README.md ("Operação no zen").
set -uo pipefail
RAIZ=/srv/atlas
exec 9>"$RAIZ/.lock"
flock -n 9 || { echo "$(date -Is) outra rodada em andamento"; exit 0; }
if [ ! -f "$RAIZ/.env" ]; then echo "$(date -Is) sem $RAIZ/.env (credenciais do R2 e do alerta); nada a fazer"; exit 1; fi

cd "$RAIZ/repo"
RAMO=$(grep -E '^ATLAS_BRANCH=' "$RAIZ/.env" | cut -d= -f2); RAMO=${RAMO:-main}
git fetch -q origin "$RAMO" && git reset -q --hard "origin/$RAMO" || echo "$(date -Is) git fetch falhou; rodando com o código atual"

TAG=$(cat atlas/Dockerfile atlas/requirements.txt | sha1sum | cut -c1-12)
docker image inspect "coorte-atlas:$TAG" >/dev/null 2>&1 || docker build -q -f atlas/Dockerfile -t "coorte-atlas:$TAG" -t coorte-atlas . >/dev/null

docker run --rm --name coorte-atlas-run --user "$(id -u):$(id -g)" \
  -e PYTHONDONTWRITEBYTECODE=1 -e FORCAR="${FORCAR:-}" \
  -v "$RAIZ/repo:/repo:ro" -v "$RAIZ/dados:/dados" --env-file "$RAIZ/.env" \
  "coorte-atlas:$TAG"
