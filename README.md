# SOAR Incident Response Automation

Automated incident intake, response, documentation, and notification for Google Workspace environments using Google Apps Script, Google Docs, Google Sheets, Mailjet, and Slack.

<div align="center">
<img src="https://img.shields.io/badge/Automation-Google%20Apps%20Script-blue" alt="Google Apps Script"/>
<img src="https://img.shields.io/badge/Email-Mailjet-green" alt="Mailjet"/>
<img src="https://img.shields.io/badge/Chat-Slack-%234A154B" alt="Slack"/>
</div>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [How It Works: Data & Automation Flow](#how-it-works-data--automation-flow)
- [Architecture](#architecture)
- [Function Reference](#function-reference)
- [Configuration](#configuration)
- [Installation & Usage](#installation--usage)
- [Templates & Examples](#templates--examples)
- [Extending & Integrating](#extending--integrating)
- [Improvements & Roadmap](#improvements--roadmap)
- [License & Credits](#license--credits)

---

## Overview

**SOAR Incident Response Automation** is an open-source automation workflow for orchestrating security incident response within Google Workspace (GWS/GCP) organizations.

This system automates:
- **Incident intake** (webhook/HTTP, cURL, or manual trigger)
- **IOC (indicator) matching**
- **Documented reporting (Google Docs)**
- **Stakeholder notification (Mailjet/Gmail, Slack)**
- **Centralized logging (Google Sheets)**
- **Optional response triggers (EDR, Chronicle, firewall integration)**

Ideal for SOC teams, IT admins, and GCP-native organizations seeking fast, auditable, no-infrastructure automation.

---

## Features

- **Multi-channel intake:** Webhook/HTTP POST from SIEM/EDR, cURL simulation, or manual test trigger.
- **IOC matching:** Automated comparison against latest FireHOL/blocklist data.
- **Automatic reporting:** Generates structured Google Docs from a customizable template.
- **Stakeholder notifications:** Notifies via Mailjet or Gmail fallback, and Slack (with severity color, live links).
- **Centralized logging:** Every incident, actionable or informational, is logged in a Google Sheet.
- **Easy to extend:** Modular config for Slack, Mailjet, or other integrations.
- **Auditable:** Full workflow logs for compliance and monitoring.
- **Supports Chronicle/EDR/firewall response triggers** (via API integration or playbook expansion).

---

## How It Works: Data & Automation Flow

1. **Intake (Webhook / cURL / Manual)**
    - Incident is submitted via HTTP POST, cURL, or the built-in `main()` Apps Script function (for tests).
    - All incident attributes (user, IP, source, severity, etc.) are parsed and normalized.

2. **IOC (Indicator of Compromise) Check**
    - The source IP is checked against the latest IOC (blocklist) data (e.g., FireHOL Level 1).
    - If a match or if escalation logic applies (suspicious login, sensitive access, etc.), the system triggers the *actionable incident* workflow.

3. **Incident Documentation & Logging**
    - A new Google Doc is created from the incident template, populated with all details, timeline, actions, and compliance checklist.
    - A new log entry is appended to a centralized Google Sheet (including all key fields and links to the Doc).

4. **Notifications**
    - Email (Mailjet or Gmail fallback) is sent to all stakeholders, with a summary and direct links.
    - Slack notification is posted (with severity color and all report links), using rich formatting for context and urgency.
    - (Optionally) Additional triggers (Google Chronicle, EDR, or firewall via API) can be called for automatic response or enrichment.

5. **Informational Only?**
    - If an event is *not* actionable (no IOC match, MFA present, no sensitive access), it is still logged and documented for future audit, but notification makes clear that no action is required.

---

## Architecture

See [Architecture.md](Architecture.md) for diagrams and an in-depth explanation.

**Core automation workflow:**

```mermaid
graph TD
  Intake[Incident Intake: Webhook/cURL/Manual] --> Normalize[Parse & Normalize Data]
  Normalize --> IOCCheck[IOC IP Check]
  IOCCheck -->|IOC Match| Actionable[Actionable Incident Flow]
  IOCCheck -->|No IOC| Escalation[Escalation Logic]
  Escalation -->|Escalate| Actionable
  Escalation -->|No Escalation| Informational[Log as Informational Only]
  Actionable --> Docs[Generate Google Doc Report]
  Actionable --> Email[Send Email Notification]
  Actionable --> Slack[Send Slack Notification]
  Actionable --> Sheet[Log to Google Sheet]
  Actionable -->|optional| Chronicle[Trigger Chronicle/EDR]
  Informational --> Docs
  Informational --> Sheet
  Informational --> Email
  Informational --> Slack
Function Reference
Key Functions
doPost(e): Webhook entrypoint – receives incident as JSON, normalizes, triggers the full flow.

main(): Manual trigger/test – processes a mock incident for testing and initial setup.

updateIocIpList(): IOC blocklist updater – downloads and stores latest FireHOL blocklist to script properties.

isIocIp(ip): Checks if an IP is in the current IOC blocklist.

processIncident(incident): Core engine – decides if incident is actionable, then runs reporting, notifications, and logging.

createIncidentReport(incident): Makes a new Google Doc from the template, replacing all placeholders.

insertSummaryToDoc(docId, summary, incident): Writes executive summary, timeline, and all details to the Doc.

sendIncidentNotification(incident, docId, summary, isActionable): Sends styled email (Mailjet/Gmail).

sendSlackNotification(incident, docId, isActionable): Sends formatted Slack alert.

logIncidentToSheet(incident, docId): Appends the incident to the Google Sheet.

kickoffChronicle(incident): (Optional) Triggers a Chronicle/EDR/API playbook for deeper investigation.

logActivity(msg, level): Centralized logging for troubleshooting and audit.

Configuration
All configuration (Doc/Sheet IDs, email addresses, Slack webhook, etc.) is in a single CONFIG object at the top of the main script file.

See Configuration.md for:

How to obtain Google Doc/Sheet IDs

How to share resources with the Apps Script project

Setting up Mailjet (API keys) or Slack (webhook)

Enabling/disabling Chronicle or other integrations

Installation & Usage
Step-by-step install, deploy, and usage guide is provided in Installation and Usage.md.

In brief:

Copy the Apps Script project into your Google Workspace.

Update CONFIG with your own template, sheet, Slack, and emails.

Authorize (run main() in editor to prompt permissions).

Deploy as Web App (set access as "Anyone" for initial testing).

Test via main() or cURL/webhook – see Mock Incident JSON Example.

Monitor logs and outputs (Google Sheet, Docs, Slack, email).

Templates & Examples
Sample Google Docs Template (Recommended Structure)

Mock Incident JSON Example

Extending & Integrating
Supports easy integration with EDR, SIEM, firewalls, or any system capable of sending HTTP POSTs.

To add more notification channels, see sendIncidentNotification and sendSlackNotification.

Add logic to processIncident for new escalation rules, enrichment, or auto-remediation.

Use the provided logging functions to maintain a full audit trail.

See Improvements.md for roadmap and ideas.

Improvements & Roadmap
Additional SIEM/EDR enrichment (reverse DNS, geo-IP, user context)

Slack interactive actions (acknowledge/close incident)

Automated PDF report export

DLP/data access playbook templates

More robust error handling and monitoring

Contributions welcome! See improvements.md.

License & Credits
License.md

Credits.md

Get Started:
Start with the Configuration and Installation and Usage guides.
Test with mock incident JSON to verify your deployment.

Core Logic:
All main logic lives in Soar Incident Responses.gs.

## Architecture Diagram

Below is a unified flowchart showing all logic paths:

```mermaid


flowchart TD
    Start([Incident Intake: Webhook, cURL, Manual])
    Start --> Parse[Extract Incident Attributes]
    Parse --> CheckIOC{Is IP in IOC List?}

    CheckIOC -- Yes --> Actionable[Actionable Incident: IOC Matched]
    Actionable --> CreateDoc[Generate Google Doc Report]
    CreateDoc --> Notify[Notify via Mailjet and Slack]
    Notify --> Log[Log to Google Sheet]

    CheckIOC -- No --> CheckRule{Escalation Rule: Chronicle, EDR, Firewall}
    CheckRule -- Yes --> Kickoff[Auto-Kickoff Incident Response]
    Kickoff --> CreateDoc
    CheckRule -- No --> NonActionable[Log as Informational or Triage]
    NonActionable --> Log
