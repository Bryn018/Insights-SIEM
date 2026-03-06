#!/usr/bin/env bash
set -euo pipefail

OS_URL="${OS_URL:-http://127.0.0.1:9200}"
DASH_URL="${DASH_URL:-http://127.0.0.1:5601}"

echo "[1/5] Waiting for OpenSearch..."
until curl -fsS "$OS_URL" >/dev/null; do sleep 2; done

echo "[2/5] Creating index template..."
curl -fsS -X PUT "$OS_URL/_index_template/insights-host-template" \
  -H 'Content-Type: application/json' \
  -d @./configs/index-template.json >/dev/null

echo "[3/5] Installing ISM policy..."
curl -fsS -X PUT "$OS_URL/_plugins/_ism/policies/insights-hot-delete-30d" \
  -H 'Content-Type: application/json' \
  -d @./configs/ism-policy.json >/dev/null || true

echo "[4/5] Attaching ISM template..."
curl -fsS -X PUT "$OS_URL/_index_template/insights-ism-template" \
  -H 'Content-Type: application/json' \
  -d @./configs/ism-template.json >/dev/null || true

echo "[5/5] Creating seed detection queries doc..."
curl -fsS -X PUT "$OS_URL/insights-meta/_doc/detections" \
  -H 'Content-Type: application/json' \
  -d @./configs/detections.json >/dev/null || true

echo "Done. Next: create Dashboards data view insights-host-logs-* (time field @timestamp)."
