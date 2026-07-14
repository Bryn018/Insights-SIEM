#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p data/suricata

# Auto-detect a real capture interface if not explicitly set.
if [ -z "${INSIGHTS_IFACE:-}" ] || [ "${INSIGHTS_IFACE}" = "any" ]; then
  INSIGHTS_IFACE="$(ip route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="dev") {print $(i+1); exit}}')"
fi
if [ -z "${INSIGHTS_IFACE:-}" ]; then
  INSIGHTS_IFACE="$(ip -o link show | awk -F': ' '$2 != "lo" {print $2; exit}')"
fi
export INSIGHTS_IFACE

echo "Using capture interface: ${INSIGHTS_IFACE}"

echo "[1/4] Starting full Insights SIEM stack..."
docker compose -f docker-compose.full.yml up -d

echo "[2/4] Waiting for OpenSearch..."
until curl -fsS http://127.0.0.1:9200 >/dev/null; do sleep 2; done

echo "[3/4] Bootstrapping SIEM templates/policies..."
./scripts/bootstrap.sh || true
./scripts/enable-network-sensor.sh || true
./scripts/fix-discover.sh || true

echo "[4/4] Service summary"
docker compose -f docker-compose.full.yml ps

echo
cat <<EOF
Insights SIEM full stack deployed.
Dashboards:   http://127.0.0.1:5601
Grafana:      http://127.0.0.1:3000
Prometheus:   http://127.0.0.1:9090
Alertmanager: http://127.0.0.1:9093
EOF
