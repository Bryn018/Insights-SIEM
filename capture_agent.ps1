<#
.SYNOPSIS
    Insights SIEM - Windows Capture Agent (native PowerShell, no Python needed)
.DESCRIPTION
    Captures real network traffic on Windows with tshark.exe (Wireshark) and
    POSTs events into the Insights SIEM dashboard (running in WSL2 at
    http://localhost:3000). Works because Windows and WSL2 share localhost.

    Step 1 (default): your laptop's own traffic (promiscuous).
    Step 2 (-Monitor): whole-house WiFi metadata - other devices too.
      Encrypted WiFi (WPA2/WPA3) => you see WHO/WHEN/HOW-MUCH, not contents.
.PARAMETER Test      Synthetic feed (no adapter needed) - proves the pipeline.
.PARAMETER Monitor   Whole-house WiFi metadata mode (Step 2).
.PARAMETER Interface Force a specific interface name (e.g. "Wi-Fi").
.PARAMETER Dashboard Dashboard alerts endpoint (default http://localhost:3000/api/alerts).
.PARAMETER Every     Test-mode interval in seconds.
#>
[CmdletBinding()]
param(
    [switch]$Test,
    [switch]$Monitor,
    [string]$Interface,
    [string]$Dashboard = "http://localhost:3000/api/alerts",
    [int]$Every = 3
)

$ErrorActionPreference = "Stop"

function Find-Tshark {
    # tshark usually in Wireshark install dir; add common spots to PATH probe
    $candidates = @(
        "tshark.exe",
        "$env:ProgramFiles\Wireshark\tshark.exe",
        "${env:ProgramFiles(x86)}\Wireshark\tshark.exe"
    )
    foreach ($c in $candidates) {
        try { if (Test-Path $c) { return $c } } catch {}
        # try resolving via where
        try {
            $r = (Get-Command tshark.exe -ErrorAction SilentlyContinue)
            if ($r) { return $r.Source }
        } catch {}
    }
    return $null
}

function Send-Alert {
    param($Alert, $Url, $Retries = 2)
    $body = $Alert | ConvertTo-Json -Compress
    for ($i = 1; $i -le $Retries; $i++) {
        try {
            Invoke-RestMethod -Uri $Url -Method Post -ContentType "application/json" -Body $body -TimeoutSec 15 | Out-Null
            return $true
        } catch [System.Net.WebException] {
            if ($_.Exception.Response) {
                # real HTTP reject (4xx/5xx) - don't retry
                Write-Host ("[!] post rejected: " + $_.Exception.Response.StatusCode) -ForegroundColor Yellow
                return $false
            }
            if ($i -lt $Retries) { Start-Sleep -Milliseconds ($i * 500) }
        } catch {
            if ($i -lt $Retries) { Start-Sleep -Milliseconds ($i * 500) }
        }
    }
    Write-Host ("[!] post failed after $Retries tries") -ForegroundColor Red
    return $false
}

function Classify {
    param($ipSrc, $ipDst, $dport, $proto)
    $title = $null; $desc = $null; $severity = "informational"
    $category = "anomaly"; $mitre = $null; $tags = "capture-agent"
    $wellKnown = @{53="DNS";80="HTTP";443="HTTPS";22="SSH";3389="RDP";445="SMB";23="Telnet";21="FTP";25="SMTP";8080="HTTP-alt";8443="HTTPS-alt"}
    if (($dport -in @(22,23,3389,445)) -and $proto -eq "TCP") {
        $title = "Sensitive service contacted ($($wellKnown[$dport]))"
        $desc  = "Outbound $proto to $ipDst`:$dport. Admin/service port exposed."
        $severity = "medium"; $category = "policy_violation"; $mitre = "Initial Access"
        $tags = "capture-agent,exposed-service"
    } elseif ($dport -eq 53) {
        $title = "DNS lookup observed"; $desc = "DNS query from $ipSrc -> $ipDst."
        $severity = "informational"; $tags = "capture-agent,dns"
    } elseif ($dport -eq 80) {
        $title = "Plaintext HTTP traffic"; $desc = "Unencrypted HTTP to $ipDst`:80."
        $severity = "low"; $category = "policy_violation"; $mitre = "Credential Access"; $tags = "capture-agent,http"
    } else {
        $label = if ($dport) { $wellKnown[$dport] } else { "ip" }
        $title = "$proto flow to $ipDst`:$dport"; $desc = "$proto $ipSrc -> $ipDst`:$dport."
        $severity = "informational"; $tags = "capture-agent,$label"
    }
    return $title, $desc, $severity, $category, $mitre, $tags
}

function New-Alert {
    param($ipSrc, $ipDst, $sport, $dport, $proto, $monitor=$false)
    $t, $d, $sev, $cat, $m, $tg = Classify $ipSrc $ipDst $dport $proto
    if ($monitor) {
        $tg = "$tg,monitor-mode,other-device"
        if ($ipSrc -and $ipSrc -ne (LocalIp)) { $d = "[other device $ipSrc] $d" }
    }
    $raw = @{ip_src=$ipSrc; ip_dst=$ipDst; port_src=$sport; port_dst=$dport; proto=$proto; monitor=$monitor} | ConvertTo-Json -Compress
    $ht = @{}
    $ht.title = $t; $ht.description = $d; $ht.severity = $sev; $ht.category = $cat
    $ht.source = "capture-agent"; $ht.sourceIp = $ipSrc; $ht.destIp = $ipDst
    $ht.sourcePort = $sport; $ht.destPort = $dport; $ht.protocol = $proto
    $ht.hostname = if (-not $monitor) { "laptop" } else { $null }
    $ht.rawLog = $raw; $ht.mitreTactic = $m; $ht.mitreTechnique = $null; $ht.tags = $tg
    return $ht
}

function LocalIp {
    try { return (Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Select-Object -First 1 |
                  ForEach-Object { (Get-NetIPAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4).IPAddress }) } catch { return $null }
}

function Run-Test {
    param($Url, $Every)
    $homes = @("192.168.1.10","192.168.1.20","192.168.1.35","192.168.1.50","203.0.113.50","185.220.101.45","8.8.8.8","1.1.1.1")
    $ports = @(443,80,53,22,3389,445,8080,8443); $protos = @("TCP","UDP")
    $samples = @(
        @("Brute Force Attempt on SSH","Multiple failed SSH logins from external host.","critical","brute_force","Initial Access","T1110","ssh,brute-force"),
        @("Suspicious Outbound Connection","Laptop contacted a known-bad IP on a non-standard port.","high","anomaly","Command and Control","T1071","c2,suspicious"),
        @("Plaintext Credential Submit","Login form submitted over HTTP (unencrypted).","medium","policy_violation","Credential Access","T1559","http,creds"),
        @("New Device Joined WiFi","A previously unseen device associated to the network.","low","anomaly",$null,$null,"monitor-mode,new-device"),
        @("DNS Tunneling Pattern","Unusually long DNS subdomain queries detected.","medium","anomaly","Command and Control","T1071.004","dns,c2")
    )
    Write-Host ("[test] posting synthetic events to $Url every ${Every}s (Ctrl+C to stop)") -ForegroundColor Cyan
    $n = 0
    while ($true) {
        if ((Get-Random -Minimum 0 -Maximum 100) -lt 45) {
            $a = New-Alert ($homes | Get-Random) ($homes | Get-Random) (Get-Random -Minimum 1024 -Maximum 65535) ($ports | Get-Random) ($protos | Get-Random) ($Monitor.IsPresent)
        } else {
            $s = $samples | Get-Random
            $a = @{title=$s[0]; description=$s[1]; severity=$s[2]; category=$s[3]; source="capture-agent";
                   sourceIp=($homes|Get-Random); destIp=($homes|Get-Random); protocol="TCP"; hostname="laptop";
                   rawLog=([pscustomobject]@{synthetic=$true}|ConvertTo-Json -Compress); mitreTactic=$s[4]; mitreTechnique=$s[5];
                   tags="capture-agent,"+$s[6]}
        }
        $ok = Send-Alert $a $Url
        $n++
        $col = if ($ok) { "Green" } else { "Red" }
        Write-Host ("[$n] " + $(if($ok){"OK"}else{"FAIL"}) + "  " + $a.severity.PadRight(12) + " " + $a.title) -ForegroundColor $col
        Start-Sleep -Seconds $Every
    }
}

function Run-Live {
    param($Url, $monitor, $iface)
    $tshark = Find-Tshark
    if (-not $tshark) {
        Write-Host "[!] tshark.exe not found. Install Wireshark (and ensure it is on PATH)." -ForegroundColor Red
        exit 1
    }
    # Auto-detect a real interface. On Windows "-i any" is NOT valid - you must
    # name the adapter (e.g. "Wi-Fi", "Ethernet"). Pick the first non-loopback.
    if (-not $iface) {
        try {
            $devs = & $tshark -D 2>$null
            $real = $devs | Where-Object { $_ -notmatch "Loopback|Adapter for loopback" } | Select-Object -First 1
            if ($real -match '^\d+\.\s*(.+)$') {
                # tshark -D prints "1. \Device\...\Wi-Fi" or "1. Wi-Fi (...)"; take text after ". "
                $iface = ($real -replace '^\d+\.\s*','') -split '\s+\(' | Select-Object -First 1
            }
            Write-Host ("[live] auto-selected interface: $iface") -ForegroundColor Cyan
        } catch {
            Write-Host ("[!] could not list interfaces: " + $_.Exception.Message) -ForegroundColor Yellow
        }
        if (-not $iface) { $iface = "Wi-Fi" }  # last-resort guess
    }

    $args = @("-l","-T","fields","-e","ip.src","-e","ip.dst","-e","tcp.srcport","-e","tcp.dstport",
              "-e","udp.srcport","-e","udp.dstport","-e","ip.proto","-E","separator=|","-E","occurrence=f")
    if ($monitor) { $args += "-I" } else { $args += "-p" }
    $args += @("-i", $iface)

    Write-Host ("[live] launching: $tshark " + ($args -join " ")) -ForegroundColor Cyan
    Write-Host ("[live] posting to $Url (Ctrl+C to stop)") -ForegroundColor Cyan
    $seen = @{}
    try {
        # 2>&1 so any tshark error is printed and we can see it
        & $tshark @args 2>&1 | ForEach-Object {
            $line = $_
            if ($line -is [System.Management.Automation.ErrorRecord] -or ($line -match "error|Error|capturing|failed|denied")) {
                Write-Host ("[tshark] " + $line) -ForegroundColor Yellow
                return
            }
            $parts = ($line -split "\|")
            if ($parts.Count -lt 7) { return }
            $ipSrc, $ipDst = $parts[0], $parts[1]
            $tcpS, $tcpD, $udpS, $udpD, $proto = $parts[2], $parts[3], $parts[4], $parts[5], $parts[6]
            if (-not $ipSrc -or -not $ipDst) { return }
            $srcPortRaw = if ($tcpS) { $tcpS } else { $udpS }
            $dstPortRaw = if ($tcpD) { $tcpD } else { $udpD }
            $sport = $null; if ($srcPortRaw -and [int]::TryParse($srcPortRaw, [ref]$null)) { $sport = [int]$srcPortRaw }
            $dport = $null; if ($dstPortRaw -and [int]::TryParse($dstPortRaw, [ref]$null)) { $dport = [int]$dstPortRaw }
            $protoName = @{ "6"="TCP"; "17"="UDP"; "1"="ICMP" }.($proto)
            if (-not $protoName) { $protoName = if ($proto) { $proto } else { "TCP" } }
            $key = "$ipSrc`:$sport->$ipDst`:$dport`:$protoName"
            $now = [DateTimeOffset]::Now.ToUnixTimeSeconds()
            if ($seen.ContainsKey($key) -and ($now - $seen[$key]) -lt 10) { return }
            $seen[$key] = $now
            $a = New-Alert $ipSrc $ipDst $sport $dport $protoName $monitor
            $ok = Send-Alert $a $Url
            Write-Host ($(if($ok){"OK"}else{"FAIL"}) + "  " + $a.severity.PadRight(12) + " " + $a.title)
        }
    } catch [System.Management.Automation.PipelineStoppedException] {
        Write-Host "`n[live] stopped." -ForegroundColor Cyan
    }
}

# ---- main ----
if ($Test) {
    Run-Test $Dashboard $Every
} else {
    Run-Live $Dashboard $Monitor.IsPresent $Interface
}
