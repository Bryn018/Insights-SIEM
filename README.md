# Insights SIEM

Personal SIEM + IDS/IPS + host monitoring stack.

## Quick Deploy (full stack)
```bash
cd /home/waly/.openclaw/workspace/insights-siem
./scripts/deploy-full-stack.sh
```

## Core URLs
- Dashboards: http://127.0.0.1:5601
- Grafana: http://127.0.0.1:3000
- Prometheus: http://127.0.0.1:9090
- Alertmanager: http://127.0.0.1:9093

## What is implemented
- Host logs ingestion (`insights-host-logs-*`)
- Network IDS ingestion via Suricata EVE (`insights-network-logs-*`)
- Data views + Discover saved view (`Insights - IDS Alerts`)
- Index templates + retention policy scaffolding
- Infra monitoring (node-exporter, cAdvisor, Prometheus, Grafana)
- Baseline alert rules for CPU/RAM/disk

## Sudo-required steps (manual)
Run and follow:
```bash
./scripts/sudo-required-steps.sh
```

## Detection packs
- `configs/detections.json`
- `configs/network-detections.md`
- `configs/opensearch-monitors/README.md`

## Notes
- Current mode is local-dev (OpenSearch security plugin disabled for speed).
- Before production/public exposure, re-enable OpenSearch auth/TLS.
