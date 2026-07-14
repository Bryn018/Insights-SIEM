#!/usr/bin/env python3
"""
Insights SIEM - Windows Capture Agent
=====================================
Runs on the WINDOWS side (because WSL2 can't see the laptop's WiFi card).
Captures traffic with tshark (Wireshark CLI) and pushes events into the
Insights SIEM dashboard via POST /api/alerts.

Modes
-----
  --test     Synthetic feed (no adapter needed) -> proves the pipeline.
  (default)  Real capture of this laptop's traffic (promiscuous).
  --monitor  Whole-house WiFi metadata (Step 2): captures other devices too.
             Encrypted WiFi => we see WHO/WHEN/HOW-MUCH, not packet contents.

Event -> Alert mapping
----------------------
We translate packet metadata into the SIEM's existing Alert schema so the
dashboard, timeline, MITRE view and rules all work unchanged.
"""
import argparse
import json
import os
import subprocess
import sys
import time
import urllib.request
import urllib.error

DASHBOARD_DEFAULT = "http://localhost:3000/api/alerts"

# Severity ladder used by the dashboard
SEV = ["informational", "low", "medium", "high", "critical"]


def post_alert(dashboard_url: str, alert: dict, timeout=15, retries=2):
    """POST one alert to the SIEM dashboard. Returns (ok, status).

    Retries on transient failures (e.g. a slow dev server). We never crash
    the whole feed over one dropped event - just skip and keep capturing.
    """
    payload = json.dumps(alert).encode("utf-8")
    last_err = None
    for attempt in range(1, retries + 1):
        req = urllib.request.Request(
            dashboard_url,
            data=payload,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return True, r.status
        except urllib.error.HTTPError as e:
            return False, e.code  # 4xx/5xx = real reject, don't retry
        except Exception as e:  # timeout, connection refused, etc.
            last_err = e
            if attempt < retries + 1:
                time.sleep(0.5 * attempt)
    print(f"[!] post failed after {retries} tries: {last_err}", file=sys.stderr)
    return False, 0


def classify(ip_src, ip_dst, dport, proto):
    """
    Lightweight, explainable heuristics turning a flow into a SIEM alert.
    This is NOT a full IDS - it mirrors what the dashboard already models
    (brute_force, anomaly, policy_violation) so the demo feels real.
    """
    title = None
    desc = None
    severity = "informational"
    category = "anomaly"
    mitre = None
    tags = "capture-agent"

    well_known = {53: "DNS", 80: "HTTP", 443: "HTTPS", 22: "SSH",
                  3389: "RDP", 445: "SMB", 23: "Telnet", 21: "FTP",
                  25: "SMTP", 8080: "HTTP-alt", 8443: "HTTPS-alt"}

    if dport in (22, 23, 3389, 445) and proto == "TCP":
        title = f"Sensitive service contacted ({well_known.get(dport, dport)})"
        desc = f"Outbound {proto} to {ip_dst}:{dport}. Admin/service port exposed."
        severity = "medium"
        category = "policy_violation"
        mitre = "Initial Access"
        tags = "capture-agent,exposed-service"
    elif dport == 53:
        title = "DNS lookup observed"
        desc = f"DNS query from {ip_src} -> {ip_dst}."
        severity = "informational"
        category = "anomaly"
        tags = "capture-agent,dns"
    elif dport in (80,):
        title = "Plaintext HTTP traffic"
        desc = f"Unencrypted HTTP to {ip_dst}:80."
        severity = "low"
        category = "policy_violation"
        mitre = "Credential Access"
        tags = "capture-agent,http"
    else:
        title = f"{proto} flow to {ip_dst}:{dport}"
        desc = f"{proto} {ip_src} -> {ip_dst}:{dport}."
        severity = "informational"
        category = "anomaly"
        tags = f"capture-agent,{well_known.get(dport, 'port-%s' % dport) if dport else 'ip'}"

    return title, desc, severity, category, mitre, tags


def make_alert(ip_src, ip_dst, sport, dport, proto, monitor=False):
    title, desc, severity, category, mitre, tags = classify(
        ip_src, ip_dst, dport, proto
    )
    if monitor:
        # In monitor mode the "source" is the observed device, not this laptop.
        tags = (tags or "") + ",monitor-mode,other-device"
        if ip_src and ip_src != _local_ip():
            desc = f"[other device {ip_src}] {desc}"
    return {
        "title": title,
        "description": desc,
        "severity": severity,
        "category": category,
        "source": "capture-agent",
        "sourceIp": ip_src,
        "destIp": ip_dst,
        "sourcePort": sport,
        "destPort": dport,
        "protocol": proto,
        "hostname": "laptop" if not monitor else None,
        "rawLog": json.dumps({
            "ip_src": ip_src, "ip_dst": ip_dst,
            "port_src": sport, "port_dst": dport, "proto": proto,
            "monitor": monitor,
        }),
        "mitreTactic": mitre,
        "mitreTechnique": None,
        "tags": tags,
    }


def _local_ip():
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return None


def run_test(dashboard_url, every=4):
    """Synthetic feed: proves the whole pipeline without a WiFi adapter."""
    import random
    print(f"[test] posting synthetic events to {dashboard_url} every {every}s (Ctrl+C to stop)")
    homes = ["192.168.1.10", "192.168.1.20", "192.168.1.35", "192.168.1.50",
             "203.0.113.50", "185.220.101.45", "8.8.8.8", "1.1.1.1"]
    ports = [443, 80, 53, 22, 3389, 445, 8080, 8443]
    protos = ["TCP", "UDP"]
    samples = [
        ("Brute Force Attempt on SSH", "Multiple failed SSH logins from external host.",
         "critical", "brute_force", "Initial Access", "T1110", "ssh,brute-force"),
        ("Suspicious Outbound Connection",
         "Laptop contacted a known-bad IP on a non-standard port.",
         "high", "anomaly", "Command and Control", "T1071", "c2,suspicious"),
        ("Plaintext Credential Submit", "Login form submitted over HTTP (unencrypted).",
         "medium", "policy_violation", "Credential Access", "T1559", "http,creds"),
        ("New Device Joined WiFi", "A previously unseen device associated to the network.",
         "low", "anomaly", None, None, "monitor-mode,new-device"),
        ("DNS Tunneling Pattern", "Unusually long DNS subdomain queries detected.",
         "medium", "anomaly", "Command and Control", "T1071.004", "dns,c2"),
    ]
    n = 0
    try:
        while True:
            if random.random() < 0.45:
                # realistic flow
                a = make_alert(random.choice(homes), random.choice(homes),
                               random.randint(1024, 65535), random.choice(ports),
                               random.choice(protos), monitor=random.random() < 0.4)
            else:
                # curated scenario alert
                t, d, sev, cat, m, tech, tg = random.choice(samples)
                a = {"title": t, "description": d, "severity": sev, "category": cat,
                     "source": "capture-agent", "sourceIp": random.choice(homes),
                     "destIp": random.choice(homes), "protocol": "TCP",
                     "hostname": "laptop", "rawLog": json.dumps({"synthetic": True}),
                     "mitreTactic": m, "mitreTechnique": tech, "tags": "capture-agent," + tg}
            ok, status = post_alert(dashboard_url, a)
            n += 1
            print(f"[{n}] {'OK' if ok else 'FAIL'} {status}  {a['severity']:<12} {a['title']}")
            time.sleep(every)
    except KeyboardInterrupt:
        print("\n[test] stopped.")


def build_tshark_cmd(monitor=False, iface=None, read_file=None):
    """Build the tshark field-extraction command. If read_file is set,
    replay a PCAP instead of capturing a live interface (same parse path).
    TSHARK_BIN env var overrides the binary (e.g. Windows tshark.exe from WSL)."""
    tshark_bin = os.environ.get("TSHARK_BIN", "tshark")
    cmd = [tshark_bin, "-l", "-T", "fields",
           "-e", "ip.src", "-e", "ip.dst",
           "-e", "tcp.srcport", "-e", "tcp.dstport",
           "-e", "udp.srcport", "-e", "udp.dstport",
           "-e", "ip.proto",
           "-E", "separator=|", "-E", "occurrence=f"]
    if read_file:
        cmd += ["-r", read_file]          # replay mode (PCAP)
    else:
        if monitor:
            cmd += ["-I"]                 # monitor mode (whole-house metadata)
        else:
            cmd += ["-p"]                 # promiscuous on this laptop's traffic
        if iface:
            cmd += ["-i", iface]
        else:
            cmd += ["-i", "any"]
    return cmd


def run_live(dashboard_url, monitor=False, iface=None, read_file=None):
    """
    Real capture with tshark (or PCAP replay with --read). Emits one line per
    frame with ip.src/ip.dst/ports/proto, then maps each to a SIEM alert.
    """
    cmd = build_tshark_cmd(monitor=monitor, iface=iface, read_file=read_file)
    print(f"[live] posting to {dashboard_url} (Ctrl+C to stop)")
    seen: dict[str, float] = {}
    try:
        proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                text=True, bufsize=1)
    except FileNotFoundError:
        print("[!] tshark not found. Install Wireshark + Npcap on Windows.", file=sys.stderr)
        sys.exit(1)

    try:
        assert proc.stdout is not None, "tshark produced no stdout"
        for line in proc.stdout:
            parts = line.strip().split("|")
            if len(parts) < 7:
                continue
            ip_src, ip_dst = parts[0], parts[1]
            tcp_s, tcp_d, udp_s, udp_d, proto = parts[2], parts[3], parts[4], parts[5], parts[6]
            if not ip_src or not ip_dst:
                continue
            sport = int(tcp_s or udp_s or 0) or None
            dport = int(tcp_d or udp_d or 0) or None
            proto = {"6": "TCP", "17": "UDP", "1": "ICMP"}.get(proto, proto or "TCP")
            key = f"{ip_src}:{sport}->{ip_dst}:{dport}:{proto}"
            now = time.time()
            if key in seen and now - seen[key] < 10:
                continue  # de-dupe bursts
            seen[key] = now
            alert = make_alert(ip_src, ip_dst, sport, dport, proto, monitor=monitor)
            ok, status = post_alert(dashboard_url, alert)
            print(f"{'OK' if ok else 'FAIL'} {status}  {alert['severity']:<12} {alert['title']}")
    except KeyboardInterrupt:
        print("\n[live] stopped.")
    finally:
        proc.terminate()


def detect_capture_source(iface=None):
    """
    Auto-detect where tshark should run.
    - Native Linux with a wlan/wifi interface -> use it directly (no Windows).
    - WSL2 (virtual NIC, no native WiFi) -> bridge to Windows tshark.exe,
      which can see the real WiFi card. Returns (tshark_bin, iface).
    """
    if iface and os.environ.get("TSHARK_BIN"):
        return os.environ["TSHARK_BIN"], iface

    # 1) Native Linux wireless interface?
    try:
        out = subprocess.run(["bash", "-c", "ls /sys/class/net 2>/dev/null"],
                             capture_output=True, text=True, timeout=5).stdout
        nics = out.split()
        wifi_prefixes = ("wlan", "wl", "wifi")
        native_wifi = next((n for n in nics if n == "wifi" or n.startswith(wifi_prefixes)), None)
        if native_wifi and not iface:
            return "tshark", native_wifi
    except Exception:
        pass

    # 2) Windows tshark.exe reachable from WSL (the bridge)?
    win_tshark = "/mnt/c/Program Files/Wireshark/tshark.exe"
    if os.path.exists(win_tshark):
        os.environ["TSHARK_BIN"] = win_tshark
        # pick the Windows Wi-Fi adapter if none forced
        if not iface:
            try:
                out = subprocess.run(
                    [win_tshark, "-D"], capture_output=True, text=True, timeout=10
                ).stdout
                for line in out.splitlines():
                    if "(Wi-Fi)" in line or "Wi-Fi" in line:
                        # tshark -D prints: N. \Device\NPF_... (Wi-Fi)
                        iface = (
                            line.split("(", 1)[-1].rstrip(")").strip() or "Wi-Fi"
                        )
                        break
            except Exception:
                iface = iface or "Wi-Fi"
        print(f"[detect] using Windows tshark bridge -> interface '{iface}'", file=sys.stderr)
        return win_tshark, (iface or "Wi-Fi")

    # 3) Fallback: native tshark on 'any'
    return "tshark", (iface or "any")


def main():
    ap = argparse.ArgumentParser(
        description="Insights SIEM capture agent (Linux-first, Windows-bridge aware)"
    )
    ap.add_argument("--test", action="store_true", help="synthetic feed, no adapter")
    ap.add_argument("--monitor", type=int, default=0, help="1 = whole-house WiFi metadata")
    ap.add_argument("--iface", default=None, help="force interface name (e.g. 'Wi-Fi' or 'wlan0')")
    ap.add_argument("--read", default=None,
                    help="replay a PCAP file instead of live capture (same parse path)")
    ap.add_argument("--dashboard", default=os.environ.get("DASHBOARD_URL", DASHBOARD_DEFAULT))
    ap.add_argument("--every", type=float, default=4, help="test-mode interval (s)")
    args = ap.parse_args()

    if args.test:
        run_test(args.dashboard, every=args.every)
    else:
        tshark_bin, iface = detect_capture_source(args.iface)
        os.environ["TSHARK_BIN"] = tshark_bin
        run_live(args.dashboard, monitor=bool(args.monitor), iface=iface, read_file=args.read)


if __name__ == "__main__":
    main()
