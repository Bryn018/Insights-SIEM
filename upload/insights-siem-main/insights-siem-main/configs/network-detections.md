# Insights SIEM - Network Detection Queries (KQL)

1. Port scanning / recon
```kql
event_type:flow and dest_port < 1024
```

2. Suricata IDS alerts
```kql
event_type:alert
```

3. DNS suspicious volume
```kql
event_type:dns
```

4. Potential C2 beaconing (repeat same dst)
```kql
event_type:flow and proto:TCP
```

5. Cleartext credential risk
```kql
event_type:http and http.url:*
```
