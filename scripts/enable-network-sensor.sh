#!/usr/bin/env bash
set -euo pipefail

OS_URL="${OS_URL:-http://127.0.0.1:9200}"

# Auto-detect a real capture interface if not explicitly set.
if [ -z "${INSIGHTS_IFACE:-}" ] || [ "${INSIGHTS_IFACE}" = "any" ]; then
  INSIGHTS_IFACE="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") {print $(i+1); exit}}')"
fi
if [ -z "${INSIGHTS_IFACE:-}" ]; then
  INSIGHTS_IFACE="$(ip -o link show | awk -F': ' '$2 != "lo" {print $2; exit}')"
fi
export INSIGHTS_IFACE

echo "Using capture interface: ${INSIGHTS_IFACE}"

mkdir -p ./data/suricata

echo "[1/4] Installing network index template..."
curl -fsS -X PUT "$OS_URL/_index_template/insights-network-template" \
  -H 'Content-Type: application/json' \
  -d @./configs/index-template-network.json >/dev/null

echo "[2/4] Recreate collectors + sensor..."
docker compose up -d suricata fluent-bit

echo "[3/4] Waiting for Suricata EVE log..."
for i in {1..40}; do
  if [ -f ./data/suricata/eve.json ]; then
    break
  fi
  sleep 2
done

echo "[4/4] Verifying indices..."
curl -fsS "$OS_URL/_cat/indices?v" | grep -E 'insights-(host|network)-logs' || true

echo "Done. In Dashboards create data view: insights-network-logs-* (time field @timestamp)."
