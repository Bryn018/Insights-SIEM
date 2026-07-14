// MITRE ATT&CK enterprise taxonomy — reference knowledge (publicly published).
// This is a LOOKUP TABLE (tactic/technique IDs, names, descriptions), NOT
// demo/sample security data. Live coverage + recent alerts are computed at
// runtime from real DetectionRule + Alert rows via /api/mitre.

export interface MitreTechniqueRef {
  id: string // e.g. T1059
  name: string
  description: string
  platforms: string[]
  tacticId: string
  subTechniques: { id: string; name: string }[]
  mitigations: string[]
}

export interface MitreTacticRef {
  id: string // e.g. TA0001
  name: string
  shortName: string
}

export const MITRE_TACTICS: MitreTacticRef[] = [
  { id: 'TA0043', name: 'Reconnaissance', shortName: 'Recon' },
  { id: 'TA0042', name: 'Resource Development', shortName: 'Resource Dev' },
  { id: 'TA0001', name: 'Initial Access', shortName: 'Initial Access' },
  { id: 'TA0002', name: 'Execution', shortName: 'Execution' },
  { id: 'TA0003', name: 'Persistence', shortName: 'Persistence' },
  { id: 'TA0004', name: 'Privilege Escalation', shortName: 'Priv Esc' },
  { id: 'TA0005', name: 'Defense Evasion', shortName: 'Def Evasion' },
  { id: 'TA0006', name: 'Credential Access', shortName: 'Cred Access' },
  { id: 'TA0007', name: 'Discovery', shortName: 'Discovery' },
  { id: 'TA0008', name: 'Lateral Movement', shortName: 'Lateral' },
  { id: 'TA0009', name: 'Collection', shortName: 'Collection' },
  { id: 'TA0011', name: 'Command and Control', shortName: 'C2' },
  { id: 'TA0010', name: 'Exfiltration', shortName: 'Exfil' },
  { id: 'TA0040', name: 'Impact', shortName: 'Impact' },
]

export const MITRE_TECHNIQUES: MitreTechniqueRef[] = [
  // Reconnaissance (TA0043)
  {
    id: 'T1595', name: 'Active Scanning', tacticId: 'TA0043', platforms: ['Network'],
    description: 'Adversaries scan victim IP addresses to gather information for follow-on behaviors.',
    subTechniques: [{ id: 'T1595.001', name: 'Scanning IP Blocks' }, { id: 'T1595.002', name: 'Vulnerability Scanning' }],
    mitigations: ['Network segmentation', 'IDS/IPS at perimeter'],
  },
  {
    id: 'T1592', name: 'Gather Victim Host Information', tacticId: 'TA0043', platforms: ['Network', 'Windows', 'Linux'],
    description: 'Adversaries gather information about the victim host that can be used during targeting.',
    subTechniques: [{ id: 'T1592.001', name: 'Hardware' }, { id: 'T1592.002', name: 'Software' }, { id: 'T1592.004', name: 'Client Configurations' }],
    mitigations: ['Monitor DNS query patterns', 'Egress filtering'],
  },
  {
    id: 'T1589', name: 'Gather Victim Identity Information', tacticId: 'TA0043', platforms: ['Windows', 'Office 365', 'Azure AD'],
    description: 'Adversaries gather identity information about the victim that can be used during targeting.',
    subTechniques: [{ id: 'T1589.001', name: 'Credentials' }, { id: 'T1589.002', name: 'Email Addresses' }, { id: 'T1589.003', name: 'Employee Names' }],
    mitigations: ['Audit public-facing information', 'Employee security awareness training'],
  },
  {
    id: 'T1590', name: 'Gather Victim Network Information', tacticId: 'TA0043', platforms: ['Network'],
    description: 'Adversaries gather network information about the victim that can be used during targeting.',
    subTechniques: [{ id: 'T1590.001', name: 'Domain Properties' }, { id: 'T1590.002', name: 'DNS' }, { id: 'T1590.005', name: 'IP Addresses' }],
    mitigations: ['DNS logging and analysis'],
  },
  // Resource Development (TA0042)
  {
    id: 'T1588', name: 'Obtain Capabilities', tacticId: 'TA0042', platforms: ['Network'],
    description: 'Adversaries buy, steal, or download malware, exploits, and tools for use during targeting.',
    subTechniques: [{ id: 'T1588.001', name: 'Malware' }, { id: 'T1588.002', name: 'Tool' }, { id: 'T1588.006', name: 'Vulnerabilities' }],
    mitigations: ['Egress URL filtering', 'Threat intel feeds'],
  },
  {
    id: 'T1505', name: 'Server Software Component', tacticId: 'TA0042', platforms: ['Windows', 'Linux'],
    description: 'Adversaries may abuse legitimate server software components for malicious purposes.',
    subTechniques: [{ id: 'T1505.003', name: 'Web Shell' }],
    mitigations: ['File integrity monitoring on web roots', 'Web application firewall'],
  },
  // Initial Access (TA0001)
  {
    id: 'T1078', name: 'Valid Accounts', tacticId: 'TA0001', platforms: ['Windows', 'Linux', 'Office 365', 'Azure AD'],
    description: 'Adversaries use credentials of existing accounts to gain initial access.',
    subTechniques: [{ id: 'T1078.001', name: 'Default Accounts' }, { id: 'T1078.002', name: 'Domain Accounts' }, { id: 'T1078.004', name: 'Cloud Accounts' }],
    mitigations: ['MFA enforcement', 'Privileged access management', 'Account monitoring'],
  },
  {
    id: 'T1190', name: 'Exploit Public-Facing Application', tacticId: 'TA0001', platforms: ['Network', 'Windows', 'Linux', 'Container'],
    description: 'Adversaries attempt to exploit a weakness in an internet-facing host or system.',
    subTechniques: [],
    mitigations: ['WAF deployment', 'Patching/updates', 'Vulnerability scanning'],
  },
  {
    id: 'T1566', name: 'Phishing', tacticId: 'TA0001', platforms: ['Windows', 'macOS', 'Office 365', 'Azure AD'],
    description: 'Adversaries send phishing messages to gain access to victim systems.',
    subTechniques: [{ id: 'T1566.001', name: 'Spearphishing Attachment' }, { id: 'T1566.002', name: 'Spearphishing Link' }, { id: 'T1566.003', name: 'Spearphishing via Service' }],
    mitigations: ['Email filtering (anti-spam/anti-phish)', 'User training', 'URL detonation sandbox'],
  },
  {
    id: 'T1133', name: 'External Remote Services', tacticId: 'TA0001', platforms: ['Windows', 'Network'],
    description: 'Adversaries leverage external remote services to gain initial access.',
    subTechniques: [],
    mitigations: ['MFA for VPN', 'Geo-blocking', 'Rate limiting'],
  },
  {
    id: 'T1195', name: 'Supply Chain Compromise', tacticId: 'TA0001', platforms: ['Windows', 'Linux', 'Container'],
    description: 'Adversaries manipulate products or delivery mechanisms prior to receipt by the final consumer.',
    subTechniques: [{ id: 'T1195.001', name: 'Compromise Software Dependencies and Development Tools' }, { id: 'T1195.002', name: 'Compromise Software Supply Chain' }],
    mitigations: ['SBOM verification', 'Code signing validation', 'Vendor risk assessment'],
  },
  // Execution (TA0002)
  {
    id: 'T1059', name: 'Command and Scripting Interpreter', tacticId: 'TA0002', platforms: ['Windows', 'Linux', 'macOS'],
    description: 'Adversaries may abuse command and script interpreters to execute commands, scripts, or binaries.',
    subTechniques: [{ id: 'T1059.001', name: 'PowerShell' }, { id: 'T1059.003', name: 'Windows Command Shell' }, { id: 'T1059.006', name: 'Python' }],
    mitigations: ['Script block logging', 'Constrained language mode', 'Application allowlisting'],
  },
  {
    id: 'T1204', name: 'User Execution', tacticId: 'TA0002', platforms: ['Windows', 'macOS', 'Linux'],
    description: 'Adversaries may rely on a user to execute malicious code.',
    subTechniques: [{ id: 'T1204.002', name: 'Malicious File' }],
    mitigations: ['User training', 'Application allowlisting', 'Mark-of-the-web handling'],
  },
  // Persistence (TA0003)
  {
    id: 'T1053', name: 'Scheduled Task/Job', tacticId: 'TA0003', platforms: ['Windows', 'Linux', 'macOS'],
    description: 'Adversaries may abuse task scheduling functionality to facilitate malware execution.',
    subTechniques: [{ id: 'T1053.005', name: 'Scheduled Task' }, { id: 'T1053.003', name: 'Cron' }],
    mitigations: ['Audit scheduled tasks/cron', 'Least privilege'],
  },
  // Privilege Escalation (TA0004)
  {
    id: 'T1068', name: 'Exploitation for Privilege Escalation', tacticId: 'TA0004', platforms: ['Windows', 'Linux', 'macOS'],
    description: 'Adversaries may exploit software vulnerabilities to elevate privileges.',
    subTechniques: [],
    mitigations: ['Prompt patching', 'Vulnerability management'],
  },
  // Defense Evasion (TA0005)
  {
    id: 'T1059b', name: 'Indicator Removal', tacticId: 'TA0005', platforms: ['Windows', 'Linux', 'macOS'],
    description: 'Adversaries may delete or alter generated event artifacts to evade detection.',
    subTechniques: [{ id: 'T1070.001', name: 'Clear Windows Event Logs' }],
    mitigations: ['Centralized log forwarding (WORM/immutable)', 'Audit log integrity'],
  },
  // Credential Access (TA0006)
  {
    id: 'T1110', name: 'Brute Force', tacticId: 'TA0006', platforms: ['Windows', 'Linux', 'Office 365', 'Azure AD'],
    description: 'Adversaries may use brute force to gain access to accounts.',
    subTechniques: [{ id: 'T1110.001', name: 'Password Guessing' }, { id: 'T1110.003', name: 'Password Spraying' }, { id: 'T1110.004', name: 'Credential Stuffing' }],
    mitigations: ['Lockout policy', 'MFA', 'Rate limiting'],
  },
  // Discovery (TA0007)
  {
    id: 'T1046', name: 'Network Service Discovery', tacticId: 'TA0007', platforms: ['Windows', 'Linux', 'macOS'],
    description: 'Adversaries may attempt to get a listing of services running on remote hosts.',
    subTechniques: [],
    mitigations: ['Network monitoring', 'Segmentation'],
  },
  // Lateral Movement (TA0008)
  {
    id: 'T1021', name: 'Remote Services', tacticId: 'TA0008', platforms: ['Windows', 'Linux', 'Network'],
    description: 'Adversaries may use remote services to move laterally.',
    subTechniques: [{ id: 'T1021.001', name: 'Remote Desktop Protocol' }, { id: 'T1021.004', name: 'SSH' }],
    mitigations: ['Restrict RDP/SSH exposure', 'MFA', 'Network segmentation'],
  },
  {
    id: 'T1570', name: 'Lateral Tool Transfer', tacticId: 'TA0008', platforms: ['Windows', 'Linux', 'macOS'],
    description: 'Adversaries may transfer tools between systems.',
    subTechniques: [],
    mitigations: ['File integrity monitoring', 'Egress filtering'],
  },
  // Collection (TA0009)
  {
    id: 'T1560', name: 'Archive Collected Data', tacticId: 'TA0009', platforms: ['Windows', 'Linux', 'macOS'],
    description: 'Adversaries may compress or encrypt collected data.',
    subTechniques: [{ id: 'T1560.001', name: 'Archive via Utility' }],
    mitigations: ['DLP', 'Monitor archive creation'],
  },
  // Command and Control (TA0011)
  {
    id: 'T1071', name: 'Application Layer Protocol', tacticId: 'TA0011', platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    description: 'Adversaries may communicate using application layer protocols.',
    subTechniques: [{ id: 'T1071.001', name: 'Web Protocols' }, { id: 'T1071.004', name: 'DNS' }],
    mitigations: ['Egress filtering', 'TLS inspection', 'DNS logging'],
  },
  // Exfiltration (TA0010)
  {
    id: 'T1041', name: 'Exfiltration Over C2 Channel', tacticId: 'TA0010', platforms: ['Windows', 'Linux', 'macOS', 'Network'],
    description: 'Adversaries may steal data over an existing command and control channel.',
    subTechniques: [],
    mitigations: ['DLP', 'Egress filtering'],
  },
  // Impact (TA0040)
  {
    id: 'T1486', name: 'Data Encrypted for Impact', tacticId: 'TA0040', platforms: ['Windows', 'Linux', 'macOS'],
    description: 'Adversaries may encrypt data to hold it for ransom.',
    subTechniques: [],
    mitigations: ['Immutable backups', 'Endpoint protection'],
  },
  {
    id: 'T1499', name: 'Endpoint Denial of Service', tacticId: 'TA0040', platforms: ['Windows', 'Linux', 'Network'],
    description: 'Adversaries may perform DoS attacks to degrade availability.',
    subTechniques: [{ id: 'T1499.004', name: 'Application or System Exploitation' }],
    mitigations: ['Rate limiting', 'DDoS protection', 'Redundancy'],
  },
]
