@echo off
REM ============================================================================
REM  Insights SIEM - Windows Capture Agent (Step 1 + Step 2)
REM ----------------------------------------------------------------------------
REM  What this does:
REM    Watches your laptop's network traffic on Windows and feeds real events
REM    into the Insights SIEM dashboard (running in WSL2 at http://localhost:3000).
REM
REM  STEP 1 (laptop-only): capture your own laptop's traffic.
REM  STEP 2 (whole-house): flip to monitor/promiscuous mode to see other
REM    devices' connection metadata on your WiFi (contents stay encrypted).
REM
REM  REQUIREMENTS (one-time, on Windows):
REM    1. Install Npcap  -> https://npcap.com/#download  (check "Install in
REM       WinPcap API-compatible mode")
REM    2. Install Wireshark -> https://www.wireshark.org/#download  (we only
REM       use its tshark.exe command-line tool)
REM    3. Add tshark to PATH, OR set TSHARK path below.
REM
REM  USAGE:
REM    capture-agent.bat --test           (synthetic feed, no adapter needed)
REM    capture-agent.bat                  (real laptop traffic, promiscuous)
REM    capture-agent.bat --monitor        (whole-house WiFi metadata, Step 2)
REM    capture-agent.bat --iface "Wi-Fi"  (force a specific interface name)
REM ============================================================================

SETLOCAL
SET "DASHBOARD=http://localhost:3000/api/alerts"
SET "TSHARK=tshark"
SET "MODE=live"
SET "IFACE="
SET "MONITOR=0"

:parse
IF "%~1"=="" GOTO run
IF /I "%~1"=="--test"    SET "MODE=test" & SHIFT & GOTO parse
IF /I "%~1"=="--monitor" SET "MONITOR=1" & SHIFT & GOTO parse
IF /I "%~1"=="--iface"   SET "IFACE=%~2" & SHIFT & SHIFT & GOTO parse
ECHO Unknown arg: %~1 & EXIT /B 1

:run
WHERE %TSHARK% >nul 2>&1 || (
  ECHO [!] tshark not found on PATH. Install Wireshark and add it to PATH,
  ECHO     or set TSHARK= to its full path at the top of this script.
  EXIT /B 1
)

IF "%MODE%"=="test" (
  ECHO [i] TEST MODE: generating a synthetic feed (no WiFi adapter needed).
  ECHO [i] Point your browser at http://localhost:3000 and watch Alerts fill in.
  python.exe "%~dp0capture_agent.py" --test --dashboard "%DASHBOARD%"
  GOTO end
)

ECHO [i] LIVE MODE: capturing real traffic from this laptop.
IF "%MONITOR%"=="1" (
  ECHO [i] MONITOR MODE (Step 2): capturing other devices' WiFi metadata too.
  ECHO [i] NOTE: WPA2/WPA3 encryption means you see WHO/WHEN/HOW-MUCH, not contents.
)
python.exe "%~dp0capture_agent.py" --dashboard "%DASHBOARD%" --monitor %MONITOR% --iface "%IFACE%"

:end
ENDLOCAL
