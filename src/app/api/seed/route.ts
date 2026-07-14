import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { cache } from '@/lib/cache';

export async function POST() {
  try {
    // Check if data already exists
    const existingUsers = await db.user.count();
    if (existingUsers > 0) {
      return NextResponse.json({
        message: 'Database already has data. Skipping seed.',
        counts: {
          users: existingUsers,
        },
      });
    }

    // ===== Create Users =====
    const users = await Promise.all([
      db.user.create({
        data: {
          email: 'admin@insights-siem.local',
          name: 'Admin User',
          passwordHash: '$2a$10$dummy.hash.for.demo.admin',
          role: 'admin',
          isActive: true,
          lastLoginAt: new Date(),
        },
      }),
      db.user.create({
        data: {
          email: 'analyst@insights-siem.local',
          name: 'Sarah Chen',
          passwordHash: '$2a$10$dummy.hash.for.demo.analyst',
          role: 'analyst',
          isActive: true,
          lastLoginAt: new Date(Date.now() - 3600000),
        },
      }),
      db.user.create({
        data: {
          email: 'responder@insights-siem.local',
          name: 'James Wilson',
          passwordHash: '$2a$10$dummy.hash.for.demo.responder',
          role: 'responder',
          isActive: true,
        },
      }),
      db.user.create({
        data: {
          email: 'viewer@insights-siem.local',
          name: 'Emily Rodriguez',
          passwordHash: '$2a$10$dummy.hash.for.demo.viewer',
          role: 'viewer',
          isActive: true,
        },
      }),
    ]);

    const adminUser = users[0];
    const analystUser = users[1];
    const responderUser = users[2];

    // ===== Create Assets =====
    const assets = await Promise.all([
      db.asset.create({
        data: {
          name: 'WEB-PROD-01',
          type: 'server',
          ipAddress: '10.0.1.10',
          macAddress: '00:1A:2B:3C:4D:01',
          os: 'Ubuntu',
          osVersion: '22.04 LTS',
          status: 'active',
          criticality: 'critical',
          owner: 'DevOps Team',
          department: 'Engineering',
          location: 'US-East Data Center',
          tags: 'production,web,nginx',
          lastSeenAt: new Date(),
        },
      }),
      db.asset.create({
        data: {
          name: 'DB-PROD-01',
          type: 'server',
          ipAddress: '10.0.1.20',
          macAddress: '00:1A:2B:3C:4D:02',
          os: 'CentOS',
          osVersion: '8',
          status: 'active',
          criticality: 'critical',
          owner: 'Database Team',
          department: 'Engineering',
          location: 'US-East Data Center',
          tags: 'production,database,postgresql',
          lastSeenAt: new Date(),
        },
      }),
      db.asset.create({
        data: {
          name: 'APP-PROD-01',
          type: 'server',
          ipAddress: '10.0.1.30',
          os: 'Ubuntu',
          osVersion: '22.04 LTS',
          status: 'active',
          criticality: 'high',
          owner: 'App Team',
          department: 'Engineering',
          location: 'US-East Data Center',
          tags: 'production,application',
          lastSeenAt: new Date(Date.now() - 300000),
        },
      }),
      db.asset.create({
        data: {
          name: 'FIREWALL-01',
          type: 'network_device',
          ipAddress: '10.0.0.1',
          os: 'Palo Alto PAN-OS',
          osVersion: '11.1',
          status: 'active',
          criticality: 'critical',
          owner: 'Network Team',
          department: 'IT Operations',
          location: 'US-East Data Center',
          tags: 'firewall,network,perimeter',
          lastSeenAt: new Date(),
        },
      }),
      db.asset.create({
        data: {
          name: 'WORKSTATION-HR-01',
          type: 'workstation',
          ipAddress: '10.0.5.100',
          os: 'Windows 11',
          osVersion: '23H2',
          status: 'active',
          criticality: 'medium',
          owner: 'HR Department',
          department: 'Human Resources',
          location: 'Building A - Floor 3',
          tags: 'workstation,hr',
          lastSeenAt: new Date(Date.now() - 7200000),
        },
      }),
      db.asset.create({
        data: {
          name: 'SURICATA-IDS',
          type: 'network_device',
          ipAddress: '10.0.0.5',
          os: 'Linux',
          status: 'active',
          criticality: 'high',
          owner: 'Security Team',
          department: 'Information Security',
          location: 'US-East Data Center',
          tags: 'ids,suricata,monitoring',
          lastSeenAt: new Date(),
        },
      }),
      db.asset.create({
        data: {
          name: 'CLOUD-WEB-01',
          type: 'cloud_instance',
          ipAddress: '54.123.45.67',
          os: 'Amazon Linux',
          osVersion: '2023',
          status: 'active',
          criticality: 'high',
          owner: 'Cloud Team',
          department: 'Engineering',
          location: 'AWS us-east-1',
          tags: 'cloud,aws,production',
          lastSeenAt: new Date(),
        },
      }),
      db.asset.create({
        data: {
          name: 'LEGACY-SERVER-01',
          type: 'server',
          ipAddress: '10.0.2.50',
          os: 'Windows Server 2012',
          osVersion: 'R2',
          status: 'maintenance',
          criticality: 'low',
          owner: 'IT Team',
          department: 'IT Operations',
          location: 'Building B - Server Room',
          tags: 'legacy,maintenance',
          lastSeenAt: new Date(Date.now() - 86400000),
        },
      }),
      db.asset.create({
        data: {
          name: 'IOT-CAMERA-01',
          type: 'iot',
          ipAddress: '10.0.6.10',
          status: 'active',
          criticality: 'low',
          owner: 'Facilities',
          department: 'Operations',
          location: 'Building A - Lobby',
          tags: 'iot,camera,physical-security',
          lastSeenAt: new Date(),
        },
      }),
      db.asset.create({
        data: {
          name: 'CONTAINER-REGISTRY',
          type: 'container',
          ipAddress: '10.0.3.15',
          os: 'Linux',
          status: 'active',
          criticality: 'high',
          owner: 'DevOps Team',
          department: 'Engineering',
          location: 'US-East Data Center',
          tags: 'container,docker,registry',
          lastSeenAt: new Date(),
        },
      }),
    ]);

    // ===== Create Alerts (spanning last 7 days) =====
    const now = Date.now();
    const alertData = [
      {
        title: 'Brute Force Attack Detected on SSH',
        description: 'Multiple failed SSH login attempts detected from external IP 203.0.113.50 targeting 10.0.1.10. Over 100 attempts in 5 minutes.',
        severity: 'critical',
        status: 'investigating',
        category: 'brute_force',
        source: 'suricata',
        sourceIp: '203.0.113.50',
        destIp: '10.0.1.10',
        sourcePort: 54321,
        destPort: 22,
        protocol: 'TCP',
        hostname: 'WEB-PROD-01',
        mitreTactic: 'Initial Access',
        mitreTechnique: 'T1110 - Brute Force',
        tags: 'ssh,brute-force,external',
        occurrenceCount: 150,
        firstSeenAt: new Date(now - 2 * 3600000),
        lastSeenAt: new Date(now - 900000),
      },
      {
        title: 'Malware Signature Detected - Trojan.GenericKD',
        description: 'Suricata IDS detected a known malware signature in network traffic from workstation 10.0.5.100 communicating with C2 server at 198.51.100.23.',
        severity: 'critical',
        status: 'new',
        category: 'malware',
        source: 'suricata',
        sourceIp: '10.0.5.100',
        destIp: '198.51.100.23',
        sourcePort: 49872,
        destPort: 443,
        protocol: 'TCP',
        hostname: 'WORKSTATION-HR-01',
        mitreTactic: 'Command and Control',
        mitreTechnique: 'T1071 - Application Layer Protocol',
        tags: 'malware,c2,trojan',
        occurrenceCount: 5,
        firstSeenAt: new Date(now - 30 * 60000),
        lastSeenAt: new Date(now - 5 * 60000),
      },
      {
        title: 'SQL Injection Attempt on Web Server',
        description: 'Detected SQL injection attack pattern in HTTP requests to /api/users endpoint. Attacker attempting UNION-based injection.',
        severity: 'high',
        status: 'acknowledged',
        category: 'policy_violation',
        source: 'suricata',
        sourceIp: '185.220.101.45',
        destIp: '10.0.1.10',
        sourcePort: 37890,
        destPort: 443,
        protocol: 'TCP',
        hostname: 'WEB-PROD-01',
        mitreTactic: 'Initial Access',
        mitreTechnique: 'T1190 - Exploit Public-Facing Application',
        tags: 'sql-injection,web,external',
        occurrenceCount: 12,
        firstSeenAt: new Date(now - 6 * 3600000),
        lastSeenAt: new Date(now - 3 * 3600000),
      },
      {
        title: 'Data Exfiltration - Large Outbound Transfer',
        description: 'Anomalous outbound data transfer detected from 10.0.1.20 (database server). 2.5GB transferred to external IP 198.51.100.50 over port 443.',
        severity: 'high',
        status: 'investigating',
        category: 'anomaly',
        source: 'opensearch',
        sourceIp: '10.0.1.20',
        destIp: '198.51.100.50',
        sourcePort: 5432,
        destPort: 443,
        protocol: 'TCP',
        hostname: 'DB-PROD-01',
        mitreTactic: 'Exfiltration',
        mitreTechnique: 'T1048 - Exfiltration Over Alternative Protocol',
        tags: 'data-exfiltration,anomaly',
        occurrenceCount: 1,
        firstSeenAt: new Date(now - 8 * 3600000),
        lastSeenAt: new Date(now - 7 * 3600000),
      },
      {
        title: 'Suspicious PowerShell Execution',
        description: 'Encoded PowerShell command detected on workstation 10.0.5.100. Command attempts to download and execute remote script.',
        severity: 'high',
        status: 'new',
        category: 'malware',
        source: 'opensearch',
        sourceIp: '10.0.5.100',
        hostname: 'WORKSTATION-HR-01',
        mitreTactic: 'Execution',
        mitreTechnique: 'T1059.001 - PowerShell',
        tags: 'powershell,execution,suspicious',
        occurrenceCount: 3,
        firstSeenAt: new Date(now - 45 * 60000),
        lastSeenAt: new Date(now - 10 * 60000),
      },
      {
        title: 'Port Scan Detected from External IP',
        description: 'NMAP SYN scan detected from 203.0.113.100 scanning multiple ports on 10.0.1.0/24 subnet.',
        severity: 'medium',
        status: 'acknowledged',
        category: 'anomaly',
        source: 'suricata',
        sourceIp: '203.0.113.100',
        destIp: '10.0.1.0',
        protocol: 'TCP',
        mitreTactic: 'Discovery',
        mitreTechnique: 'T1046 - Network Service Discovery',
        tags: 'port-scan,reconnaissance',
        occurrenceCount: 500,
        firstSeenAt: new Date(now - 12 * 3600000),
        lastSeenAt: new Date(now - 11 * 3600000),
      },
      {
        title: 'Failed Login Attempts - Admin Account',
        description: 'Multiple failed login attempts for admin account on database server 10.0.1.20 from internal IP 10.0.5.100.',
        severity: 'medium',
        status: 'resolved',
        category: 'brute_force',
        source: 'opensearch',
        sourceIp: '10.0.5.100',
        destIp: '10.0.1.20',
        destPort: 5432,
        protocol: 'TCP',
        hostname: 'DB-PROD-01',
        mitreTactic: 'Credential Access',
        mitreTechnique: 'T1110 - Brute Force',
        tags: 'brute-force,internal,admin',
        occurrenceCount: 25,
        firstSeenAt: new Date(now - 24 * 3600000),
        lastSeenAt: new Date(now - 22 * 3600000),
      },
      {
        title: 'Unusual DNS Query Pattern',
        description: 'DNS tunneling pattern detected. Multiple long subdomain queries to suspicious domains from 10.0.1.30.',
        severity: 'medium',
        status: 'new',
        category: 'anomaly',
        source: 'suricata',
        sourceIp: '10.0.1.30',
        destPort: 53,
        protocol: 'UDP',
        hostname: 'APP-PROD-01',
        mitreTactic: 'Command and Control',
        mitreTechnique: 'T1071.004 - DNS',
        tags: 'dns-tunneling,c2',
        occurrenceCount: 200,
        firstSeenAt: new Date(now - 4 * 3600000),
        lastSeenAt: new Date(now - 1 * 3600000),
      },
      {
        title: 'Firewall Rule Violation - Unauthorized Outbound',
        description: 'Traffic from production subnet 10.0.1.0/24 to external IP on non-standard port 8443 detected, violating firewall policy.',
        severity: 'medium',
        status: 'acknowledged',
        category: 'policy_violation',
        source: 'suricata',
        sourceIp: '10.0.1.30',
        destIp: '198.51.100.99',
        destPort: 8443,
        protocol: 'TCP',
        hostname: 'APP-PROD-01',
        tags: 'firewall-violation,policy',
        occurrenceCount: 8,
        firstSeenAt: new Date(now - 5 * 3600000),
        lastSeenAt: new Date(now - 2 * 3600000),
      },
      {
        title: 'Suspicious Cron Job Created',
        description: 'New cron job created on WEB-PROD-01 that downloads and executes a script from an external URL every 5 minutes.',
        severity: 'high',
        status: 'escalated',
        category: 'anomaly',
        source: 'opensearch',
        sourceIp: '10.0.1.10',
        hostname: 'WEB-PROD-01',
        mitreTactic: 'Persistence',
        mitreTechnique: 'T1053.003 - Scheduled Task/Job: Cron',
        tags: 'persistence,cron,suspicious',
        occurrenceCount: 1,
        firstSeenAt: new Date(now - 3 * 3600000),
        lastSeenAt: new Date(now - 3 * 3600000),
      },
      {
        title: 'USB Device Connected to Secure Workstation',
        description: 'USB mass storage device connected to workstation in the finance department, violating data handling policy.',
        severity: 'low',
        status: 'resolved',
        category: 'policy_violation',
        source: 'opensearch',
        sourceIp: '10.0.5.50',
        hostname: 'WORKSTATION-FIN-01',
        tags: 'usb,policy-violation,endpoint',
        occurrenceCount: 1,
        firstSeenAt: new Date(now - 48 * 3600000),
        lastSeenAt: new Date(now - 48 * 3600000),
      },
      {
        title: 'SSL Certificate Expiring Soon',
        description: 'SSL certificate for web server WEB-PROD-01 expires in 7 days. Renewal required to prevent service disruption.',
        severity: 'low',
        status: 'acknowledged',
        category: 'compliance',
        source: 'prometheus',
        sourceIp: '10.0.1.10',
        hostname: 'WEB-PROD-01',
        tags: 'ssl,certificate,maintenance',
        occurrenceCount: 1,
        firstSeenAt: new Date(now - 24 * 3600000),
        lastSeenAt: new Date(now - 24 * 3600000),
      },
      {
        title: 'HTTP 500 Error Spike on API Server',
        description: 'Significant increase in HTTP 500 errors on the API server. Error rate exceeded 10% threshold for 15 minutes.',
        severity: 'informational',
        status: 'resolved',
        category: 'anomaly',
        source: 'prometheus',
        sourceIp: '10.0.1.30',
        hostname: 'APP-PROD-01',
        tags: 'api,errors,performance',
        occurrenceCount: 500,
        firstSeenAt: new Date(now - 72 * 3600000),
        lastSeenAt: new Date(now - 70 * 3600000),
      },
      {
        title: 'New Service Detected on Legacy Server',
        description: 'Previously unknown service listening on port 4444 on LEGACY-SERVER-01. This port is commonly associated with reverse shells.',
        severity: 'high',
        status: 'new',
        category: 'anomaly',
        source: 'opensearch',
        sourceIp: '10.0.2.50',
        hostname: 'LEGACY-SERVER-01',
        destPort: 4444,
        protocol: 'TCP',
        mitreTactic: 'Persistence',
        mitreTechnique: 'T1571 - Non-Standard Port',
        tags: 'reverse-shell,legacy,suspicious',
        occurrenceCount: 1,
        firstSeenAt: new Date(now - 1 * 3600000),
        lastSeenAt: new Date(now - 1 * 3600000),
      },
      {
        title: 'DDoS Attack Mitigation Triggered',
        description: 'Volumetric DDoS attack detected targeting external-facing web server. Rate limiting and geo-blocking activated automatically.',
        severity: 'critical',
        status: 'contained',
        category: 'anomaly',
        source: 'suricata',
        sourceIp: '0.0.0.0',
        destIp: '54.123.45.67',
        destPort: 443,
        protocol: 'TCP',
        hostname: 'CLOUD-WEB-01',
        mitreTactic: 'Impact',
        mitreTechnique: 'T1498 - Network Denial of Service',
        tags: 'ddos,network,external',
        occurrenceCount: 10000,
        firstSeenAt: new Date(now - 96 * 3600000),
        lastSeenAt: new Date(now - 90 * 3600000),
      },
      {
        title: 'Container Image Pull from Unknown Registry',
        description: 'Docker container image pulled from unknown external registry (malware-registry.example.com) instead of trusted internal registry.',
        severity: 'medium',
        status: 'new',
        category: 'policy_violation',
        source: 'opensearch',
        sourceIp: '10.0.3.15',
        hostname: 'CONTAINER-REGISTRY',
        tags: 'container,docker,supply-chain',
        occurrenceCount: 2,
        firstSeenAt: new Date(now - 2 * 3600000),
        lastSeenAt: new Date(now - 1 * 3600000),
      },
      {
        title: 'IoT Device Communicating with External Server',
        description: 'Security camera 10.0.6.10 making unexpected outbound connections to external IP on port 8080.',
        severity: 'low',
        status: 'new',
        category: 'anomaly',
        source: 'suricata',
        sourceIp: '10.0.6.10',
        destIp: '203.0.113.200',
        destPort: 8080,
        protocol: 'TCP',
        hostname: 'IOT-CAMERA-01',
        tags: 'iot,camera,anomaly',
        occurrenceCount: 15,
        firstSeenAt: new Date(now - 6 * 3600000),
        lastSeenAt: new Date(now - 1 * 3600000),
      },
      {
        title: 'Privilege Escalation via Sudo Misconfiguration',
        description: 'User exploited sudo misconfiguration on APP-PROD-01 to gain root access. Vulnerability in sudoers file allows user to run vim as root.',
        severity: 'high',
        status: 'investigating',
        category: 'anomaly',
        source: 'opensearch',
        sourceIp: '10.0.1.30',
        hostname: 'APP-PROD-01',
        mitreTactic: 'Privilege Escalation',
        mitreTechnique: 'T1548.003 - Sudo and Sudo Caching',
        tags: 'privilege-escalation,sudo,misconfiguration',
        occurrenceCount: 4,
        firstSeenAt: new Date(now - 7 * 3600000),
        lastSeenAt: new Date(now - 5 * 3600000),
      },
      {
        title: 'Lateral Movement Detected via RDP',
        description: 'RDP connection from compromised workstation 10.0.5.100 to database server 10.0.1.20. Unusual RDP activity for this source-destination pair.',
        severity: 'high',
        status: 'escalated',
        category: 'anomaly',
        source: 'opensearch',
        sourceIp: '10.0.5.100',
        destIp: '10.0.1.20',
        destPort: 3389,
        protocol: 'TCP',
        hostname: 'DB-PROD-01',
        mitreTactic: 'Lateral Movement',
        mitreTechnique: 'T1021.001 - Remote Services: Remote Desktop Protocol',
        tags: 'rdp,lateral-movement',
        occurrenceCount: 3,
        firstSeenAt: new Date(now - 4 * 3600000),
        lastSeenAt: new Date(now - 2 * 3600000),
      },
      {
        title: 'Log Source Gap Detected',
        description: 'No logs received from FIREWALL-01 for the past 2 hours. Possible logging service failure or deliberate log tampering.',
        severity: 'medium',
        status: 'acknowledged',
        category: 'compliance',
        source: 'prometheus',
        sourceIp: '10.0.0.1',
        hostname: 'FIREWALL-01',
        tags: 'logging,gap,availability',
        occurrenceCount: 1,
        firstSeenAt: new Date(now - 2 * 3600000),
        lastSeenAt: new Date(now - 2 * 3600000),
      },
    ];

    // Create alerts with varying timestamps spread across 7 days
    const alerts: Awaited<ReturnType<typeof db.alert.create>>[] = [];
    for (const data of alertData) {
      const alert = await db.alert.create({ data });
      alerts.push(alert);
    }

    // Add some alerts from past days for trend data
    const pastAlerts = [
      { dayOffset: 6, severity: 'high', category: 'brute_force', title: 'SSH Brute Force Attempt' },
      { dayOffset: 6, severity: 'medium', category: 'anomaly', title: 'Unusual Network Traffic' },
      { dayOffset: 5, severity: 'critical', category: 'malware', title: 'Ransomware Detected' },
      { dayOffset: 5, severity: 'high', category: 'policy_violation', title: 'Unauthorized Software' },
      { dayOffset: 5, severity: 'low', category: 'compliance', title: 'Patch Not Applied' },
      { dayOffset: 4, severity: 'medium', category: 'anomaly', title: 'Port Scan from Internal' },
      { dayOffset: 4, severity: 'high', category: 'brute_force', title: 'Web App Brute Force' },
      { dayOffset: 4, severity: 'medium', category: 'policy_violation', title: 'Clear Text Credential' },
      { dayOffset: 3, severity: 'critical', category: 'malware', title: 'C2 Communication Detected' },
      { dayOffset: 3, severity: 'low', category: 'anomaly', title: 'Slow HTTP Scan' },
      { dayOffset: 2, severity: 'high', category: 'anomaly', title: 'Suspicious File Download' },
      { dayOffset: 2, severity: 'medium', category: 'policy_violation', title: 'Data Access Policy Violation' },
      { dayOffset: 1, severity: 'high', category: 'brute_force', title: 'VPN Brute Force Attack' },
      { dayOffset: 1, severity: 'informational', category: 'compliance', title: 'Audit Log Rotation' },
      { dayOffset: 1, severity: 'medium', category: 'anomaly', title: 'DNS Anomaly' },
    ];

    for (const pa of pastAlerts) {
      const ts = new Date(now - pa.dayOffset * 24 * 3600000);
      await db.alert.create({
        data: {
          title: pa.title,
          description: `Demo alert for trend data - ${pa.title}`,
          severity: pa.severity,
          status: 'resolved',
          category: pa.category,
          source: ['suricata', 'opensearch', 'prometheus'][Math.floor(Math.random() * 3)],
          firstSeenAt: ts,
          lastSeenAt: ts,
          createdAt: ts,
        },
      });
    }

    // ===== Create Incidents =====
    const incident1 = await db.incident.create({
      data: {
        title: 'Active Brute Force Campaign Against Production Servers',
        description: 'Coordinated brute force attacks targeting multiple production servers. Attack originating from multiple external IPs. SSH and web application targets identified.',
        severity: 'critical',
        status: 'investigating',
        priority: 'p1',
        category: 'security_breach',
        attackVector: 'External - Network',
        impact: 'Potential unauthorized access to production systems. Risk of data exfiltration and system compromise.',
        dueAt: new Date(now + 4 * 3600000),
      },
    });

    // Link alerts to incident 1
    await db.incidentAlert.create({ data: { incidentId: incident1.id, alertId: alerts[0].id } });
    await db.incidentAlert.create({ data: { incidentId: incident1.id, alertId: alerts[5].id } });

    // Create timeline for incident 1
    await Promise.all([
      db.incidentTimeline.create({
        data: { incidentId: incident1.id, event: 'Incident created by automated detection', eventDate: new Date(now - 2 * 3600000) },
      }),
      db.incidentTimeline.create({
        data: { incidentId: incident1.id, event: 'Assigned to Sarah Chen (Lead Analyst)', eventDate: new Date(now - 1.8 * 3600000) },
      }),
      db.incidentTimeline.create({
        data: { incidentId: incident1.id, event: 'Port scan activity linked to same threat actor', eventDate: new Date(now - 1.5 * 3600000) },
      }),
      db.incidentTimeline.create({
        data: { incidentId: incident1.id, event: 'Firewall rules updated to block source IPs', eventDate: new Date(now - 3600000) },
      }),
      db.incidentTimeline.create({
        data: { incidentId: incident1.id, event: 'Status changed to investigating', eventDate: new Date(now - 30 * 60000) },
      }),
    ]);

    // Assign incident
    await db.incidentAssignment.create({
      data: { incidentId: incident1.id, userId: analystUser.id, role: 'lead' },
    });
    await db.incidentAssignment.create({
      data: { incidentId: incident1.id, userId: responderUser.id, role: 'responder' },
    });

    const incident2 = await db.incident.create({
      data: {
        title: 'Malware Infection on HR Workstation',
        description: 'Trojan malware detected on HR workstation. C2 communication confirmed. Potential data access by unauthorized party.',
        severity: 'high',
        status: 'contained',
        priority: 'p2',
        category: 'malware_outbreak',
        attackVector: 'External - Phishing',
        impact: 'HR workstation compromised. Possible access to employee PII data.',
        resolution: 'Machine isolated from network. Malware quarantine initiated. Re-image scheduled.',
      },
    });

    await db.incidentAlert.create({ data: { incidentId: incident2.id, alertId: alerts[1].id } });
    await db.incidentAlert.create({ data: { incidentId: incident2.id, alertId: alerts[4].id } });
    await db.incidentAlert.create({ data: { incidentId: incident2.id, alertId: alerts[18].id } });

    await Promise.all([
      db.incidentTimeline.create({
        data: { incidentId: incident2.id, event: 'Malware detected by Suricata IDS', eventDate: new Date(now - 30 * 60000) },
      }),
      db.incidentTimeline.create({
        data: { incidentId: incident2.id, event: 'Machine isolated from network by James Wilson', eventDate: new Date(now - 25 * 60000) },
      }),
      db.incidentTimeline.create({
        data: { incidentId: incident2.id, event: 'Malware quarantined successfully', eventDate: new Date(now - 15 * 60000) },
      }),
      db.incidentTimeline.create({
        data: { incidentId: incident2.id, event: 'Status changed to contained', eventDate: new Date(now - 10 * 60000) },
      }),
    ]);

    await db.incidentAssignment.create({
      data: { incidentId: incident2.id, userId: responderUser.id, role: 'lead' },
    });

    const incident3 = await db.incident.create({
      data: {
        title: 'Potential Data Exfiltration from Database Server',
        description: 'Anomalous outbound data transfer from database server detected. 2.5GB transferred to unknown external endpoint.',
        severity: 'high',
        status: 'open',
        priority: 'p1',
        category: 'data_leak',
        attackVector: 'Internal - Database',
        impact: 'Possible exfiltration of sensitive customer data. Regulatory notification may be required.',
        dueAt: new Date(now + 2 * 3600000),
      },
    });

    await db.incidentAlert.create({ data: { incidentId: incident3.id, alertId: alerts[3].id } });
    await db.incidentTimeline.create({
      data: { incidentId: incident3.id, event: 'Data exfiltration alert triggered by OpenSearch anomaly detection', eventDate: new Date(now - 8 * 3600000) },
    });
    await db.incidentAssignment.create({
      data: { incidentId: incident3.id, userId: analystUser.id, role: 'lead' },
    });

    // A closed incident
    const incident4 = await db.incident.create({
      data: {
        title: 'DDoS Attack on Cloud Web Server',
        description: 'Volumetric DDoS attack targeted external web server. Attack mitigated by rate limiting and geo-blocking.',
        severity: 'critical',
        status: 'recovered',
        priority: 'p2',
        category: 'security_breach',
        attackVector: 'External - Network',
        impact: 'Temporary service degradation. No data compromised.',
        resolution: 'Rate limiting activated, geo-blocking applied, traffic returned to normal after 6 hours.',
        closedAt: new Date(now - 90 * 3600000),
        closedBy: adminUser.id,
      },
    });

    await db.incidentAlert.create({ data: { incidentId: incident4.id, alertId: alerts[14].id } });

    // ===== Create Alert Assignments =====
    await db.alertAssignment.create({
      data: { alertId: alerts[0].id, userId: analystUser.id, action: 'assigned' },
    });
    await db.alertAssignment.create({
      data: { alertId: alerts[1].id, userId: responderUser.id, action: 'assigned' },
    });
    await db.alertAssignment.create({
      data: { alertId: alerts[2].id, userId: analystUser.id, action: 'acknowledged' },
    });
    await db.alertAssignment.create({
      data: { alertId: alerts[9].id, userId: adminUser.id, action: 'escalated' },
    });
    await db.alertAssignment.create({
      data: { alertId: alerts[18].id, userId: responderUser.id, action: 'escalated' },
    });

    // ===== Create Comments =====
    await db.comment.create({
      data: {
        userId: analystUser.id,
        alertId: alerts[0].id,
        content: 'Confirmed brute force pattern. Source IPs correlate with known threat actor infrastructure. Recommending firewall blocking.',
      },
    });
    await db.comment.create({
      data: {
        userId: responderUser.id,
        alertId: alerts[0].id,
        content: 'Firewall rules updated to block /24 subnet of source IPs. Monitoring for further attempts.',
      },
    });
    await db.comment.create({
      data: {
        userId: analystUser.id,
        alertId: alerts[3].id,
        content: 'Data transfer pattern is highly unusual for this server. Investigating if this is authorized maintenance activity.',
      },
    });
    await db.comment.create({
      data: {
        userId: adminUser.id,
        incidentId: incident1.id,
        content: 'Escalating to P1. Multiple servers affected. Coordinating response with network team.',
      },
    });

    // ===== Create Detection Rules =====
    const rules = await Promise.all([
      db.detectionRule.create({
        data: {
          name: 'SSH Brute Force Detection',
          description: 'Detects brute force attacks against SSH services by monitoring failed authentication attempts. Triggers when more than 10 failed attempts from the same source IP within 5 minutes.',
          query: 'event.category:authentication AND event.action:login-failed AND service:ssh',
          queryLanguage: 'kql',
          severity: 'critical',
          category: 'brute_force',
          mitreTactic: 'Initial Access',
          mitreTechnique: 'T1110',
          tags: 'ssh,brute-force,authentication',
          enabled: true,
          isDefault: true,
          schedule: '*/5 * * * *',
          lookback: '5m',
          threshold: 10,
          indexPattern: 'insights-host-logs-*',
          lastRunAt: new Date(now - 5 * 60000),
          lastHitAt: new Date(now - 2 * 3600000),
          hitCount: 45,
          falsePositiveCount: 3,
          createdBy: 'system',
          updatedBy: 'system',
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'Malware C2 Communication',
          description: 'Identifies command and control communication by detecting network connections to known malicious IP addresses and domains from threat intelligence feeds.',
          query: 'destination.ip:* AND threat.indicator.type:ip-address AND network.direction:outbound',
          queryLanguage: 'kql',
          severity: 'critical',
          category: 'malware',
          mitreTactic: 'Command and Control',
          mitreTechnique: 'T1071',
          tags: 'c2,malware,threat-intel',
          enabled: true,
          isDefault: true,
          schedule: '*/1 * * * *',
          lookback: '1m',
          threshold: 1,
          indexPattern: 'insights-network-logs-*',
          lastRunAt: new Date(now - 60000),
          lastHitAt: new Date(now - 30 * 60000),
          hitCount: 12,
          falsePositiveCount: 1,
          createdBy: 'system',
          updatedBy: 'system',
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'SQL Injection Detection',
          description: 'Detects SQL injection attempts in web application HTTP requests by matching common injection patterns in URL parameters and POST data.',
          query: 'http.request.uri:* UNION OR http.request.body:* SELECT OR http.request.uri:* DROP TABLE',
          queryLanguage: 'lucene',
          severity: 'high',
          category: 'policy_violation',
          mitreTactic: 'Initial Access',
          mitreTechnique: 'T1190',
          tags: 'sql-injection,web,owasp',
          enabled: true,
          isDefault: true,
          schedule: '*/2 * * * *',
          lookback: '2m',
          threshold: 3,
          indexPattern: 'insights-web-logs-*',
          lastRunAt: new Date(now - 2 * 60000),
          lastHitAt: new Date(now - 3 * 3600000),
          hitCount: 23,
          falsePositiveCount: 5,
          createdBy: 'system',
          updatedBy: 'system',
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'Data Exfiltration Anomaly',
          description: 'Detects potential data exfiltration by monitoring for anomalous outbound data transfer volumes from internal servers.',
          query: 'network.direction:outbound AND network.bytes:>100MB AND source.ip:10.0.0.0/8',
          queryLanguage: 'kql',
          severity: 'high',
          category: 'anomaly',
          mitreTactic: 'Exfiltration',
          mitreTechnique: 'T1048',
          tags: 'exfiltration,anomaly,data-loss',
          enabled: true,
          isDefault: true,
          schedule: '*/10 * * * *',
          lookback: '10m',
          threshold: 1,
          indexPattern: 'insights-network-logs-*',
          lastRunAt: new Date(now - 10 * 60000),
          lastHitAt: new Date(now - 8 * 3600000),
          hitCount: 3,
          falsePositiveCount: 0,
          createdBy: 'system',
          updatedBy: adminUser.id,
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'Suspicious PowerShell Activity',
          description: 'Monitors for suspicious PowerShell execution including encoded commands, download cradles, and privilege escalation techniques.',
          query: 'process.name:powershell.exe AND (process.args:*-EncodedCommand* OR process.args:*DownloadString* OR process.args:*Invoke-Expression*)',
          queryLanguage: 'lucene',
          severity: 'high',
          category: 'malware',
          mitreTactic: 'Execution',
          mitreTechnique: 'T1059.001',
          tags: 'powershell,execution,windows',
          enabled: true,
          isDefault: true,
          schedule: '*/5 * * * *',
          lookback: '5m',
          threshold: 1,
          indexPattern: 'insights-host-logs-*',
          lastRunAt: new Date(now - 5 * 60000),
          lastHitAt: new Date(now - 45 * 60000),
          hitCount: 8,
          falsePositiveCount: 2,
          createdBy: 'system',
          updatedBy: 'system',
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'Port Scan Detection',
          description: 'Detects network port scanning activity by identifying multiple connection attempts to different ports from a single source IP.',
          query: 'event.category:network AND event.type:connection AND network.transport:tcp AND _count:>20 BY source.ip',
          queryLanguage: 'kql',
          severity: 'medium',
          category: 'anomaly',
          mitreTactic: 'Discovery',
          mitreTechnique: 'T1046',
          tags: 'port-scan,reconnaissance,network',
          enabled: true,
          isDefault: true,
          schedule: '*/5 * * * *',
          lookback: '5m',
          threshold: 20,
          indexPattern: 'insights-network-logs-*',
          lastRunAt: new Date(now - 5 * 60000),
          lastHitAt: new Date(now - 12 * 3600000),
          hitCount: 67,
          falsePositiveCount: 15,
          createdBy: 'system',
          updatedBy: 'system',
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'Lateral Movement via RDP',
          description: 'Detects lateral movement through Remote Desktop Protocol by identifying unusual RDP connections between internal hosts.',
          query: 'destination.port:3389 AND source.ip:10.0.0.0/8 AND NOT source.ip:10.0.0.1',
          queryLanguage: 'kql',
          severity: 'high',
          category: 'anomaly',
          mitreTactic: 'Lateral Movement',
          mitreTechnique: 'T1021.001',
          tags: 'rdp,lateral-movement,windows',
          enabled: true,
          isDefault: true,
          schedule: '*/5 * * * *',
          lookback: '5m',
          threshold: 3,
          indexPattern: 'insights-network-logs-*',
          lastRunAt: new Date(now - 5 * 60000),
          hitCount: 5,
          falsePositiveCount: 1,
          createdBy: 'system',
          updatedBy: 'system',
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'DNS Tunneling Detection',
          description: 'Identifies DNS tunneling by detecting unusually long subdomain queries and high-frequency DNS requests to the same domain.',
          query: 'dns.question.name.length:>50 AND dns.response.code:NOERROR',
          queryLanguage: 'kql',
          severity: 'medium',
          category: 'anomaly',
          mitreTactic: 'Command and Control',
          mitreTechnique: 'T1071.004',
          tags: 'dns,tunneling,c2',
          enabled: true,
          isDefault: false,
          schedule: '*/10 * * * *',
          lookback: '10m',
          threshold: 5,
          indexPattern: 'insights-dns-logs-*',
          lastRunAt: new Date(now - 10 * 60000),
          lastHitAt: new Date(now - 4 * 3600000),
          hitCount: 15,
          falsePositiveCount: 3,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'Privilege Escalation via Sudo',
          description: 'Detects privilege escalation attempts through sudo misconfigurations and exploitation.',
          query: 'process.name:sudo AND process.args:*root* AND NOT process.args:*allowed-command*',
          queryLanguage: 'lucene',
          severity: 'high',
          category: 'anomaly',
          mitreTactic: 'Privilege Escalation',
          mitreTechnique: 'T1548.003',
          tags: 'sudo,privilege-escalation,linux',
          enabled: true,
          isDefault: false,
          schedule: '*/5 * * * *',
          lookback: '5m',
          threshold: 1,
          indexPattern: 'insights-host-logs-*',
          hitCount: 2,
          falsePositiveCount: 0,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      }),
      db.detectionRule.create({
        data: {
          name: 'Unused Rule - Test',
          description: 'Test detection rule that is currently disabled. Used for development and testing purposes.',
          query: 'event.category:custom AND event.type:test',
          queryLanguage: 'kql',
          severity: 'low',
          category: 'anomaly',
          enabled: false,
          isDefault: false,
          schedule: '0 * * * *',
          lookback: '1h',
          threshold: 100,
          indexPattern: 'insights-test-*',
          hitCount: 0,
          falsePositiveCount: 0,
          createdBy: adminUser.id,
          updatedBy: adminUser.id,
        },
      }),
    ]);

    // ===== Create Compliance Frameworks =====
    const pciFramework = await db.complianceFramework.create({
      data: {
        name: 'PCI-DSS',
        version: '4.0',
        description: 'Payment Card Industry Data Security Standard - Required for organizations handling credit card data.',
      },
    });

    const hipaaFramework = await db.complianceFramework.create({
      data: {
        name: 'HIPAA',
        version: '2023',
        description: 'Health Insurance Portability and Accountability Act - Security Rule for protecting health information.',
      },
    });

    const soc2Framework = await db.complianceFramework.create({
      data: {
        name: 'SOC2',
        version: '2017',
        description: 'Service Organization Control 2 - Trust Services Criteria for security, availability, and confidentiality.',
      },
    });

    const nistFramework = await db.complianceFramework.create({
      data: {
        name: 'NIST CSF',
        version: '2.0',
        description: 'National Institute of Standards and Technology Cybersecurity Framework.',
      },
    });

    // PCI-DSS Controls
    const pciControls = [
      { controlId: 'PCI-DSS 1.1', title: 'Install and maintain network security controls', description: 'Network security controls are installed and maintained to protect cardholder data.', category: 'Network Security', status: 'compliant' },
      { controlId: 'PCI-DSS 1.2', title: 'Network security controls are configured and maintained', description: 'All system components are configured and maintained securely.', category: 'Network Security', status: 'compliant' },
      { controlId: 'PCI-DSS 2.1', title: 'Processes and mechanisms for applying secure configurations', description: 'Secure configuration standards are established and applied to all system components.', category: 'Secure Configuration', status: 'partially_compliant' },
      { controlId: 'PCI-DSS 2.2', title: 'System components are configured and managed securely', description: 'All system components are configured and managed securely.', category: 'Secure Configuration', status: 'compliant' },
      { controlId: 'PCI-DSS 3.1', title: 'Processes for protecting stored account data', description: 'Protection methods are defined and implemented to protect stored account data.', category: 'Data Protection', status: 'compliant' },
      { controlId: 'PCI-DSS 4.1', title: 'Strong cryptography for transmission', description: 'Strong cryptography is used to protect account data during transmission over open, public networks.', category: 'Data Protection', status: 'non_compliant' },
      { controlId: 'PCI-DSS 5.1', title: 'Malicious software is prevented or detected and addressed', description: 'Malicious software is prevented or detected and addressed.', category: 'Vulnerability Management', status: 'compliant' },
      { controlId: 'PCI-DSS 5.2', title: 'Malicious software is prevented or detected and addressed', description: 'Malicious software prevention/detection mechanisms are updated, maintained, and addressed.', category: 'Vulnerability Management', status: 'partially_compliant' },
      { controlId: 'PCI-DSS 6.1', title: 'Secure systems and software development', description: 'Secure systems and software development processes are established and maintained.', category: 'Secure Development', status: 'not_assessed' },
      { controlId: 'PCI-DSS 7.1', title: 'Access to system components and data is restricted', description: 'Access to system components and data is restricted based on need-to-know and least privileges.', category: 'Access Control', status: 'compliant' },
      { controlId: 'PCI-DSS 8.1', title: 'User identification and authentication', description: 'User identification and authentication measures are implemented.', category: 'Access Control', status: 'compliant' },
      { controlId: 'PCI-DSS 9.1', title: 'Physical access to cardholder data is restricted', description: 'Physical access to cardholder data is restricted.', category: 'Physical Security', status: 'not_applicable' },
      { controlId: 'PCI-DSS 10.1', title: 'Logging and monitoring mechanisms are in place', description: 'Logging and monitoring mechanisms are in place to track access to system components and cardholder data.', category: 'Monitoring', status: 'partially_compliant' },
      { controlId: 'PCI-DSS 11.1', title: 'Security testing is performed regularly', description: 'Security testing is performed regularly to identify vulnerabilities and address them.', category: 'Testing', status: 'not_assessed' },
      { controlId: 'PCI-DSS 12.1', title: 'Information security policy is maintained', description: 'An information security policy is maintained and disseminated to all relevant personnel.', category: 'Policy', status: 'compliant' },
    ];

    for (const ctrl of pciControls) {
      await db.complianceControl.create({
        data: {
          frameworkId: pciFramework.id,
          ...ctrl,
          assessedAt: ctrl.status !== 'not_assessed' ? new Date() : null,
          assessedBy: ctrl.status !== 'not_assessed' ? adminUser.id : null,
        },
      });
    }

    // HIPAA Controls
    const hipaaControls = [
      { controlId: 'HIPAA 164.308(a)(1)', title: 'Security Management Process', description: 'Implement policies and procedures to prevent, detect, contain, and correct security violations.', category: 'Administrative', status: 'compliant' },
      { controlId: 'HIPAA 164.308(a)(3)', title: 'Workforce Security', description: 'Implement policies and procedures to ensure that all workforce members have appropriate access.', category: 'Administrative', status: 'compliant' },
      { controlId: 'HIPAA 164.308(a)(4)', title: 'Information Access Management', description: 'Implement policies and procedures for authorizing access to ePHI.', category: 'Administrative', status: 'partially_compliant' },
      { controlId: 'HIPAA 164.308(a)(5)', title: 'Security Awareness and Training', description: 'Implement a security awareness and training program for all workforce members.', category: 'Administrative', status: 'non_compliant' },
      { controlId: 'HIPAA 164.310(a)(1)', title: 'Facility Access Controls', description: 'Implement policies and procedures to limit physical access to electronic information systems.', category: 'Physical', status: 'not_assessed' },
      { controlId: 'HIPAA 164.312(a)(1)', title: 'Access Control', description: 'Implement technical policies and procedures for electronic information systems that maintain ePHI.', category: 'Technical', status: 'compliant' },
      { controlId: 'HIPAA 164.312(b)', title: 'Audit Controls', description: 'Implement hardware, software, and/or procedural mechanisms that record and examine activity.', category: 'Technical', status: 'partially_compliant' },
      { controlId: 'HIPAA 164.312(c)(1)', title: 'Integrity Controls', description: 'Implement policies and procedures to protect ePHI from improper alteration or destruction.', category: 'Technical', status: 'compliant' },
      { controlId: 'HIPAA 164.312(d)', title: 'Person or Entity Authentication', description: 'Implement procedures to verify that a person or entity seeking access is the one claimed.', category: 'Technical', status: 'compliant' },
      { controlId: 'HIPAA 164.312(e)(1)', title: 'Transmission Security', description: 'Implement technical security measures to guard against unauthorized access to ePHI being transmitted.', category: 'Technical', status: 'non_compliant' },
    ];

    for (const ctrl of hipaaControls) {
      await db.complianceControl.create({
        data: {
          frameworkId: hipaaFramework.id,
          ...ctrl,
          assessedAt: ctrl.status !== 'not_assessed' ? new Date() : null,
          assessedBy: ctrl.status !== 'not_assessed' ? analystUser.id : null,
        },
      });
    }

    // SOC2 Controls
    const soc2Controls = [
      { controlId: 'SOC2 CC6.1', title: 'Logical and Physical Access Controls', description: 'The entity implements logical access security software, infrastructure, and architectures over protected information assets.', category: 'Security', status: 'compliant' },
      { controlId: 'SOC2 CC6.2', title: 'User Authentication', description: 'Prior to issuing system credentials, the entity registers and authorizes new internal and external users.', category: 'Security', status: 'compliant' },
      { controlId: 'SOC2 CC6.3', title: 'Access Restriction', description: 'The entity authorizes, modifies, or removes access to data, software, functions, and other protected information assets.', category: 'Security', status: 'partially_compliant' },
      { controlId: 'SOC2 CC7.1', title: 'Detection and Monitoring', description: 'The entity uses detection and monitoring procedures to identify changes to configurations, unauthorized activities, and vulnerabilities.', category: 'Security', status: 'partially_compliant' },
      { controlId: 'SOC2 CC7.2', title: 'Incident Response', description: 'The entity evaluates security events and identifies incidents.', category: 'Security', status: 'compliant' },
      { controlId: 'SOC2 A1.1', title: 'System Availability', description: 'The entity maintains, monitors, and evaluates current processing capacity and demand to achieve availability objectives.', category: 'Availability', status: 'compliant' },
      { controlId: 'SOC2 C1.1', title: 'Confidentiality Controls', description: 'The entity maintains, monitors, and evaluates controls to protect confidential information.', category: 'Confidentiality', status: 'not_assessed' },
    ];

    for (const ctrl of soc2Controls) {
      await db.complianceControl.create({
        data: {
          frameworkId: soc2Framework.id,
          ...ctrl,
          assessedAt: ctrl.status !== 'not_assessed' ? new Date() : null,
          assessedBy: ctrl.status !== 'not_assessed' ? adminUser.id : null,
        },
      });
    }

    // NIST Controls
    const nistControls = [
      { controlId: 'NIST ID.AM-1', title: 'Asset Management - Physical devices', description: 'Physical devices and systems within the organization are inventoried.', category: 'Identify', status: 'compliant' },
      { controlId: 'NIST ID.AM-2', title: 'Asset Management - Software platforms', description: 'Software platforms and applications within the organization are inventoried.', category: 'Identify', status: 'partially_compliant' },
      { controlId: 'NIST ID.RA-1', title: 'Risk Assessment', description: 'Asset vulnerabilities are identified and documented.', category: 'Identify', status: 'compliant' },
      { controlId: 'NIST PR.AC-1', title: 'Access Control - Identities and credentials', description: 'Identities and credentials are issued, managed, and verified.', category: 'Protect', status: 'compliant' },
      { controlId: 'NIST PR.AC-4', title: 'Access Control - External parties', description: 'Access permissions and authorizations are managed, incorporating the principles of least privilege and separation of duties.', category: 'Protect', status: 'non_compliant' },
      { controlId: 'NIST PR.DS-1', title: 'Data Security - At rest', description: 'Data-at-rest is protected.', category: 'Protect', status: 'compliant' },
      { controlId: 'NIST DE.AE-1', title: 'Anomalies and Events', description: 'A baseline of network operations and expected data flows is established and managed.', category: 'Detect', status: 'compliant' },
      { controlId: 'NIST DE.CM-1', title: 'Security Continuous Monitoring', description: 'The network is monitored to detect potential cybersecurity events.', category: 'Detect', status: 'compliant' },
      { controlId: 'NIST RS.RP-1', title: 'Response Planning', description: 'Response plan is executed during or after a cybersecurity event.', category: 'Respond', status: 'partially_compliant' },
      { controlId: 'NIST RC.RP-1', title: 'Recovery Planning', description: 'Recovery plan is executed during or after a cybersecurity event.', category: 'Recover', status: 'not_assessed' },
    ];

    for (const ctrl of nistControls) {
      await db.complianceControl.create({
        data: {
          frameworkId: nistFramework.id,
          ...ctrl,
          assessedAt: ctrl.status !== 'not_assessed' ? new Date() : null,
          assessedBy: ctrl.status !== 'not_assessed' ? adminUser.id : null,
        },
      });
    }

    // ===== Create Integrations =====
    await Promise.all([
      db.integration.create({
        data: {
          name: 'OpenSearch Cluster',
          type: 'opensearch',
          config: JSON.stringify({
            host: 'https://opensearch:9200',
            indexPrefix: 'insights-',
            authType: 'basic',
            verifySSL: false,
          }),
          enabled: true,
          lastTestAt: new Date(),
          lastStatus: 'success',
        },
      }),
      db.integration.create({
        data: {
          name: 'Prometheus Server',
          type: 'prometheus',
          config: JSON.stringify({
            host: 'http://prometheus:9090',
            scrapeInterval: '15s',
          }),
          enabled: true,
          lastTestAt: new Date(),
          lastStatus: 'success',
        },
      }),
      db.integration.create({
        data: {
          name: 'Suricata IDS',
          type: 'suricata',
          config: JSON.stringify({
            eveLogPath: '/var/log/suricata/eve.json',
            interface: 'eth0',
          }),
          enabled: true,
          lastTestAt: new Date(Date.now() - 3600000),
          lastStatus: 'success',
        },
      }),
      db.integration.create({
        data: {
          name: 'Slack Notifications',
          type: 'slack',
          config: JSON.stringify({
            webhookUrl: 'https://hooks.slack.com/services/demo/webhook',
            channel: '#security-alerts',
          }),
          enabled: false,
        },
      }),
      db.integration.create({
        data: {
          name: 'Email Alerts (SMTP)',
          type: 'email',
          config: JSON.stringify({
            smtpHost: 'smtp.example.com',
            smtpPort: 587,
            fromAddress: 'siem@insights.local',
            toAddresses: ['security-team@insights.local'],
          }),
          enabled: false,
        },
      }),
      db.integration.create({
        data: {
          name: 'Custom Webhook - SOAR',
          type: 'webhook',
          config: JSON.stringify({
            url: 'https://soar-platform.example.com/api/incidents',
            method: 'POST',
            headers: { 'Authorization': 'Bearer demo-token' },
          }),
          enabled: true,
          lastTestAt: new Date(Date.now() - 86400000),
          lastStatus: 'success',
        },
      }),
    ]);

    // ===== Create System Settings =====
    const settings = [
      { key: 'general.siteName', value: 'Insights SIEM' },
      { key: 'general.timezone', value: 'UTC' },
      { key: 'general.dateFormat', value: 'YYYY-MM-DD HH:mm:ss' },
      { key: 'alerts.autoAcknowledge', value: 'false' },
      { key: 'alerts.defaultSeverity', value: 'medium' },
      { key: 'alerts.retentionDays', value: '90' },
      { key: 'incidents.autoAssign', value: 'true' },
      { key: 'incidents.defaultPriority', value: 'p3' },
      { key: 'notifications.emailEnabled', value: 'false' },
      { key: 'notifications.slackEnabled', value: 'false' },
      { key: 'notifications.inAppEnabled', value: 'true' },
      { key: 'dashboard.refreshInterval', value: '30' },
      { key: 'dashboard.defaultTimeRange', value: '24h' },
      { key: 'integrations.opensearch.batchSize', value: '1000' },
      { key: 'integrations.suricata.logRotation', value: 'daily' },
      { key: 'compliance.reviewCycleDays', value: '90' },
    ];

    for (const setting of settings) {
      await db.systemSetting.create({ data: setting });
    }

    // ===== Create Notifications =====
    await Promise.all([
      db.notification.create({
        data: {
          userId: adminUser.id,
          type: 'alert',
          title: 'Critical Alert: Brute Force Attack',
          message: 'SSH brute force attack detected on WEB-PROD-01 from 203.0.113.50',
          priority: 'critical',
          read: false,
          alertId: alerts[0].id,
        },
      }),
      db.notification.create({
        data: {
          userId: adminUser.id,
          type: 'alert',
          title: 'Critical Alert: Malware Detected',
          message: 'Trojan malware detected on HR workstation communicating with C2 server',
          priority: 'critical',
          read: false,
          alertId: alerts[1].id,
        },
      }),
      db.notification.create({
        data: {
          userId: analystUser.id,
          type: 'incident',
          title: 'Incident Assigned: Brute Force Campaign',
          message: 'You have been assigned as lead analyst for incident: Active Brute Force Campaign',
          priority: 'high',
          read: false,
        },
      }),
      db.notification.create({
        data: {
          userId: analystUser.id,
          type: 'alert',
          title: 'High Alert: Data Exfiltration',
          message: 'Anomalous outbound data transfer detected from DB-PROD-01',
          priority: 'high',
          read: true,
          alertId: alerts[3].id,
        },
      }),
      db.notification.create({
        data: {
          userId: responderUser.id,
          type: 'incident',
          title: 'Incident Assigned: Malware Infection',
          message: 'You have been assigned as lead responder for incident: Malware Infection on HR Workstation',
          priority: 'high',
          read: false,
        },
      }),
      db.notification.create({
        data: {
          userId: adminUser.id,
          type: 'system',
          title: 'System Update: Integration Test',
          message: 'OpenSearch cluster integration test passed successfully',
          priority: 'low',
          read: true,
        },
      }),
      db.notification.create({
        data: {
          userId: adminUser.id,
          type: 'compliance',
          title: 'Compliance Review Due',
          message: 'PCI-DSS quarterly compliance review is due in 7 days',
          priority: 'medium',
          read: false,
        },
      }),
    ]);

    // ===== Create Audit Logs =====
    const auditLogs = [
      { userId: adminUser.id, action: 'system.initialize', resource: 'system', details: JSON.stringify({ message: 'SIEM system initialized' }) },
      { userId: adminUser.id, action: 'rule.create', resource: 'rule', resourceId: rules[0].id, details: JSON.stringify({ name: 'SSH Brute Force Detection' }) },
      { userId: analystUser.id, action: 'alert.acknowledge', resource: 'alert', resourceId: alerts[0].id, details: JSON.stringify({ previousStatus: 'new', newStatus: 'acknowledged' }) },
      { userId: analystUser.id, action: 'alert.assign', resource: 'alert', resourceId: alerts[0].id, details: JSON.stringify({ assignedTo: analystUser.id }) },
      { userId: responderUser.id, action: 'alert.escalate', resource: 'alert', resourceId: alerts[9].id, details: JSON.stringify({ reason: 'Confirmed active compromise' }) },
      { userId: adminUser.id, action: 'incident.create', resource: 'incident', resourceId: incident1.id, details: JSON.stringify({ title: 'Active Brute Force Campaign' }) },
      { userId: adminUser.id, action: 'integration.test', resource: 'integration', details: JSON.stringify({ type: 'opensearch', result: 'success' }) },
      { userId: analystUser.id, action: 'compliance.control_update', resource: 'compliance', details: JSON.stringify({ framework: 'PCI-DSS', control: '1.1', status: 'compliant' }) },
    ];

    for (const log of auditLogs) {
      await db.auditLog.create({ data: log });
    }

    // Clear all caches
    cache.clear();

    // Count all records
    const counts = {
      users: await db.user.count(),
      alerts: await db.alert.count(),
      incidents: await db.incident.count(),
      rules: await db.detectionRule.count(),
      assets: await db.asset.count(),
      complianceFrameworks: await db.complianceFramework.count(),
      complianceControls: await db.complianceControl.count(),
      integrations: await db.integration.count(),
      notifications: await db.notification.count(),
      auditLogs: await db.auditLog.count(),
      settings: await db.systemSetting.count(),
    };

    return NextResponse.json({
      message: 'Demo data seeded successfully',
      counts,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { error: 'Failed to seed data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
