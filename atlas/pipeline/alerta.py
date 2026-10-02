"""Manda um e-mail pelo Worker do site (POST /api/atlas-alert, protegido por ATLAS_ALERT_TOKEN).
    python atlas/pipeline/alerta.py "assunto" [arquivo_de_log]
"""
import json, os, sys, urllib.request

assunto = sys.argv[1]
log = sys.argv[2] if len(sys.argv) > 2 else None
texto = open(log, encoding='utf8', errors='replace').read()[-12000:] if log and os.path.exists(log) else ''
req = urllib.request.Request(os.environ.get('ATLAS_ALERT_URL', 'https://coorte.io/api/atlas-alert'),
                             data=json.dumps({'assunto': assunto, 'texto': texto}).encode(), method='POST',
                             headers={'Content-Type': 'application/json', 'Authorization': f"Bearer {os.environ['ATLAS_ALERT_TOKEN']}"})
print(urllib.request.urlopen(req, timeout=60).status)
