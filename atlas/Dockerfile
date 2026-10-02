# Contêiner do pipeline do Atlas da APS (zen, aarch64). Só dados públicos; separado do workbench de SCS.
# Construir na raiz do repositório:  docker build -f atlas/Dockerfile -t coorte-atlas .
FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends git build-essential ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/*
COPY atlas/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
ENV ATLAS_HOME=/dados TZ=America/Sao_Paulo PYTHONUNBUFFERED=1
WORKDIR /repo
CMD ["bash", "atlas/run.sh"]
