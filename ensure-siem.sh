#!/bin/bash
# ensure-siem.sh - start the SIEM dashboard in WSL if not already running.
# Designed to be called from the Windows .bat launchers. Uses setsid + nohup
# so the server keeps running after the launching shell exits.
set -e
cd /home/Insights/siem-test

# already up?
if curl -s --max-time 2 -o /dev/null http://localhost:3000/; then
  echo "[ensure-siem] dashboard already running"
  exit 0
fi

echo "[ensure-siem] starting dashboard..."
# detach fully so it survives the parent shell
setsid bash -c 'cd /home/Insights/siem-test && exec bash start-prod.sh' >/home/Insights/siem-test/ensure-siem.log 2>&1 < /dev/null &
disown 2>/dev/null || true

# wait for it
for i in $(seq 1 40); do
  if curl -s --max-time 2 -o /dev/null http://localhost:3000/; then
    echo "[ensure-siem] dashboard ready"
    exit 0
  fi
  sleep 1
done
echo "[ensure-siem] WARNING: dashboard did not come up in time" >&2
exit 1
