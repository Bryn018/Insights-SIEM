# Insights SIEM - Live Capture Agent (Windows)

Turns the Insights SIEM dashboard into a live network monitor for YOUR laptop
(Step 1) and your whole-home WiFi (Step 2). The agent runs on **Windows**
because WSL2 cannot see the laptop's WiFi card.

## What it does
- Captures real network traffic on Windows with `tshark` (Wireshark CLI).
- Maps each flow into the SIEM `Alert` schema and POSTs it to the dashboard.
- Dashboard shows it live: Alerts view, timeline, MITRE mapping, severity counts.

## One-time setup (on Windows)
1. Install **Npcap** — https://npcap.com/#download
   - check "Install in WinPcap API-compatible mode"
2. Install **Wireshark** — https://www.wireshark.org/#download
   - we only use `tshark.exe`; add it to PATH (default install does).
3. Make sure the SIEM dashboard is running (in WSL2):
   ```
   cd /home/Insights/siem-test
   NEXT_TEST_WASM=1 npx next dev -p 3000 -H 0.0.0.0 --webpack
   ```
   WSL2 `localhost` is shared with Windows, so the agent posts to
   `http://localhost:3000/api/alerts`.

## Run it
From a Windows terminal, in this folder:

| Goal | Command |
|------|---------|
| Step 1 - your laptop's traffic | `capture-agent.bat` |
| Step 2 - whole-house WiFi metadata | `capture-agent.bat --monitor` |
| Prove the pipeline (no adapter) | `capture-agent.bat --test` |
| Force a specific interface | `capture-agent.bat --iface "Wi-Fi"` |

`Ctrl+C` stops it.

## Step 1 vs Step 2 (what you'll actually see)
- **Step 1 (default):** promiscuous capture of your laptop's own traffic.
  You see your real connections: which sites, which ports, plaintext HTTP,
  SSH/RDP exposed, etc.
- **Step 2 (`--monitor`):** WiFi monitor mode. Your card hears EVERY device on
  the network, so you see other phones/TVs/IoT too. IMPORTANT: WPA2/WPA3
  encryption means you see **who/ when / how-much**, not the packet contents.
  Tagged `monitor-mode,other-device` in the dashboard.

## Honest limitations
- A stock consumer router does NOT mirror other devices' traffic to your laptop
  by default. That is why Step 2 relies on WiFi monitor mode (metadata only).
  For full-content whole-house capture, put Suricata on an OpenWrt/OPNSense
  router and point it here (the `source: suricata` path already exists).
- This agent is a lightweight heuristic sensor, not a full IDS like Suricata.
  It demonstrates the live pipeline; swap in Suricata EVE output for production.

## Files
- `capture-agent.bat` - Windows launcher (sets mode, finds tshark).
- `capture_agent.py` - the agent: tshark reader + `--test` synthetic feed +
  Alert mapping + POST to dashboard.
