#!/usr/bin/env bash
# Run manually with sudo where needed.
set -euo pipefail

echo "== Required sudo steps for IDS/IPS readiness =="
echo

echo "1) Kernel + capture prerequisites"
echo "sudo sysctl -w vm.max_map_count=262144"
echo "echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-insights-siem.conf"
echo

echo "2) Install packet capture + audit sources"
echo "sudo apt update"
echo "sudo apt install -y tcpdump audispd-plugins auditd"
echo

echo "3) Enable auditd"
echo "sudo systemctl enable --now auditd"
echo

echo "4) IPS mode (optional, staged): NFQUEUE"
echo "# WARNING: test in maintenance window"
echo "sudo iptables -I INPUT -j NFQUEUE --queue-num 0"
echo "sudo iptables -I FORWARD -j NFQUEUE --queue-num 0"
echo "sudo iptables -I OUTPUT -j NFQUEUE --queue-num 0"
echo "# rollback"
echo "sudo iptables -D INPUT -j NFQUEUE --queue-num 0"
echo "sudo iptables -D FORWARD -j NFQUEUE --queue-num 0"
echo "sudo iptables -D OUTPUT -j NFQUEUE --queue-num 0"
echo

echo "5) Verify network interface for Suricata"
echo "ip -br a"
echo "# then set INSIGHTS_IFACE in .env if needed (e.g., INSIGHTS_IFACE=wlp2s0)"
