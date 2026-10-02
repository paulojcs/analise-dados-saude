"""Publica ATLAS_HOME/site no R2 (bucket do site), se o conteúdo mudou desde a última publicação.

Layout no bucket (servido pelo Worker em coorte.io/atlas/data/...):
  v/<versao>/br.json, v/<versao>/uf/<cod>.json   imutáveis (cache longo), gravados já em gzip
  current.json                                    {"v": "<versao>", ...manifest}: o que a página lê primeiro
Mantém as 3 versões mais recentes. Credenciais no ambiente (arquivo .env no zen, fora do git):
  R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
    python atlas/pipeline/publish.py [--force]
"""
import gzip, json, os, sys
from pathlib import Path

import boto3

H = Path(os.environ.get('ATLAS_HOME', Path(__file__).resolve().parent.parent / '_dados'))
SITE = H / 'site'
BUCKET = os.environ['R2_BUCKET']
s3 = boto3.client('s3', endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
                  aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
                  region_name='auto')
man = json.loads((SITE / 'manifest.json').read_text(encoding='utf8'))
try:
    atual = json.loads(s3.get_object(Bucket=BUCKET, Key='current.json')['Body'].read())
except s3.exceptions.NoSuchKey:
    atual = {}
if atual.get('hash') == man['hash'] and '--force' not in sys.argv:
    print(f"publish: sem mudança (hash {man['hash']}), nada a fazer")
    sys.exit(0)

versao = man['gerado'][:16].replace(':', '').replace('T', '-') + '-' + man['hash'][:6]
for rel in man['arquivos']:
    corpo = gzip.compress((SITE / rel).read_bytes(), 9)
    s3.put_object(Bucket=BUCKET, Key=f'v/{versao}/{rel}', Body=corpo, ContentType='application/json; charset=utf-8',
                  ContentEncoding='gzip', CacheControl='public, max-age=31536000, immutable')
s3.put_object(Bucket=BUCKET, Key='current.json', Body=json.dumps({'v': versao, **man}, ensure_ascii=False).encode(),
              ContentType='application/json; charset=utf-8', CacheControl='public, max-age=300')
print(f"publish: versão {versao} ({len(man['arquivos'])} arquivos)")

# limpeza: só as 3 versões mais novas
pag = s3.get_paginator('list_objects_v2')
vs = sorted({o['Key'].split('/')[1] for p in pag.paginate(Bucket=BUCKET, Prefix='v/') for o in p.get('Contents', [])})
for velha in vs[:-3]:
    objs = [{'Key': o['Key']} for p in pag.paginate(Bucket=BUCKET, Prefix=f'v/{velha}/') for o in p.get('Contents', [])]
    for i in range(0, len(objs), 1000):
        s3.delete_objects(Bucket=BUCKET, Delete={'Objects': objs[i:i + 1000]})
    print(f'publish: removida a versão {velha}')
