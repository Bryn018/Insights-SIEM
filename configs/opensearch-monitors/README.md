# OpenSearch Monitor Pack (manual import)

Use these query ideas to create monitors in OpenSearch Alerting UI.

## Host monitors
1. SSH brute force
   - Query: message:("Failed password" OR "authentication failure" OR "Invalid user")
2. Suspicious sudo
   - Query: message:("sudo:" AND ("COMMAND=" OR "session opened for user root"))
3. New user added
   - Query: message:("useradd" OR "adduser" OR "new user")

## Network monitors
4. IDS alerts
   - Query: event_type:alert
5. DNS spikes
   - Query: event_type:dns

Suggested trigger: hits > 0 in 5 minutes.
