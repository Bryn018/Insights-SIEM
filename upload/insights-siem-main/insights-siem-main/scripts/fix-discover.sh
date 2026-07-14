#!/usr/bin/env bash
set -euo pipefail

OS_URL="${OS_URL:-http://127.0.0.1:9200}"
DASH_URL="${DASH_URL:-http://127.0.0.1:5601}"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

echo "[1/6] Restarting collectors"
docker compose up -d fluent-bit suricata >/dev/null

echo "[2/6] Seeding one test event"
curl -sS -X POST "$OS_URL/insights-network-logs-manual/_doc" \
  -H 'Content-Type: application/json' \
  -d "{\"@timestamp\":\"$NOW\",\"event_type\":\"alert\",\"alert\":{\"signature\":\"Insights SIEM test event\",\"severity\":3},\"src_ip\":\"127.0.0.1\",\"dest_ip\":\"127.0.0.1\",\"proto\":\"TCP\",\"siem\":\"Insights-SIEM\",\"sensor\":\"suricata\"}" >/dev/null

echo "[3/6] Recreating data view"
curl -sS -X DELETE "$DASH_URL/api/saved_objects/index-pattern/insights-network-logs" -H 'osd-xsrf: true' >/dev/null || true
curl -sS -X POST "$DASH_URL/api/saved_objects/index-pattern/insights-network-logs" \
  -H 'osd-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"attributes":{"title":"insights-network-logs-*","timeFieldName":"@timestamp"}}' >/dev/null

echo "[4/6] Setting default index"
curl -sS -X POST "$DASH_URL/api/opensearch-dashboards/settings/defaultIndex" \
  -H 'osd-xsrf: true' -H 'Content-Type: application/json' \
  -d '{"value":"insights-network-logs"}' >/dev/null

echo "[5/6] Recreating saved Discover view"
curl -sS -X DELETE "$DASH_URL/api/saved_objects/search/insights-ids-alerts" -H 'osd-xsrf: true' >/dev/null || true
cat >/tmp/insights_search_payload.json <<'JSON'
{
  "attributes": {
    "title": "Insights - IDS Alerts",
    "columns": ["@timestamp","event_type","alert.signature","src_ip","dest_ip","dest_port","proto","alert.severity"],
    "sort": [["@timestamp","desc"]],
    "kibanaSavedObjectMeta": {
      "searchSourceJSON": "{\"index\":\"insights-network-logs\",\"query\":{\"language\":\"kuery\",\"query\":\"event_type:alert\"},\"filter":[]}"
    }
  }
}
JSON
curl -sS -X POST "$DASH_URL/api/saved_objects/search/insights-ids-alerts?overwrite=true" \
  -H 'osd-xsrf: true' -H 'Content-Type: application/json' \
  --data @/tmp/insights_search_payload.json >/dev/null

echo "[6/6] Verify"
curl -sS "$OS_URL/_cat/indices?v" | grep insights-network || true

echo "Done. Open: $DASH_URL/app/data-explorer/discover#/"
echo "Then Open saved search: Insights - IDS Alerts"
