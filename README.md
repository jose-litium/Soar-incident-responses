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

**SOAR Incident Response Automation** is an open-source workflow for orchestrating security incident response within Google Workspace (GWS/GCP) organizations.

This system automates:
- **Incident intake** (webhook/HTTP, cURL, or manual trigger)
- **IOC (indicator of compromise) matching**
- **Documented reporting (Google Docs)**
- **Stakeholder notification (Mailjet/Gmail, Slack)**
- **Centralized logging (Google Sheets)**
- **Optional response triggers (EDR, Chronicle, firewall integration)**

Ideal for security teams, IT admins, and GCP-native organizations seeking fast, auditable, zero-infrastructure automation.

---

## Features

- **Multi-channel intake:** Webhook/HTTP POST from SIEM/EDR, cURL simulation, or manual test trigger.
- **IOC matching:** Automated comparison against the latest FireHOL/blocklist data.
- **Automatic reporting:** Generates structured Google Docs from a customizable template.
- **Stakeholder notifications:** Notifies via Mailjet or Gmail fallback, and Slack (with severity color and live links).
- **Centralized logging:** Every incident, actionable or informational, is logged in a Google Sheet.
- **Easy to extend:** Modular config for Slack, Mailjet, or other integrations.
- **Auditable:** Full workflow logs for compliance and monitoring.
- **Supports Chronicle/EDR/firewall response triggers** (via API integration or playbook expansion).

---

## Architecture

The SOAR Incident Response Automation workflow consists of the following steps:

1. **Incident Intake**
    - The system receives incident data via webhook (HTTP POST), cURL command, or manual test trigger.
    - All relevant attributes are extracted: user, IP address, location, alert source, severity, MFA status, etc.

2. **IOC (Indicator of Compromise) Check**
    - The source IP is compared against the latest IOC blocklist (such as FireHOL).
    - If the IP is present, the incident is considered *actionable*.

3. **Escalation Rules (if not IOC)**
    - If no IOC is matched, the system evaluates escalation logic: for example, privileged user actions, sensitive data access, suspicious geolocation, or EDR/Chronicle/Firewall detections.
    - If an escalation rule is met, the incident is handled as actionable.

4. **Actionable Incidents**
    - A new Google Docs report is generated from a template and populated with all incident details.
    - Stakeholders are notified via Mailjet (or Gmail fallback) and Slack, with direct links to the report and log.
    - The incident is appended to the Google Sheet for centralized logging.
    - (Optional) An automated investigation or response is triggered in Chronicle or an EDR.

5. **Informational-Only Events**
    - If the incident is neither an IOC nor meets escalation criteria, it is logged as "Informational Only".
    - A Google Doc and sheet log entry are still created for audit and traceability.
    - Notifications clearly state that no immediate security action is required.

6. **Audit Logging**
    - Every step, action, and potential error is logged for compliance and troubleshooting, using the system’s centralized logging utility.

**Summary:**  
This workflow ensures that every potential incident is logged, documented, and escalated based on clear rules, while keeping stakeholders informed and maintaining full auditability.

---

## Function Reference

**Key Functions:**

- `doPost(e)`: **Webhook entrypoint** – receives incident as JSON, normalizes, triggers the full flow.
- `main()`: **Manual trigger/test** – processes a mock incident for testing and initial setup.
- `updateIocIpList()`: **IOC blocklist updater** – downloads and stores latest FireHOL blocklist to script properties.
- `isIocIp(ip)`: Checks if an IP is in the current IOC blocklist.
- `processIncident(incident)`: Core engine – decides if incident is actionable, then runs reporting, notifications, and logging.
- `createIncidentReport(incident)`: Makes a new Google Doc from the template, replacing all placeholders.
- `insertSummaryToDoc(docId, summary, incident)`: Writes executive summary, timeline, and all details to the Doc.
- `sendIncidentNotification(incident, docId, summary, isActionable)`: Sends styled email (Mailjet/Gmail).
- `sendSlackNotification(incident, docId, isActionable)`: Sends formatted Slack alert.
- `logIncidentToSheet(incident, docId)`: Appends the incident to the Google Sheet.
- `kickoffChronicle(incident)`: (Optional) Triggers a Chronicle/EDR/API playbook for deeper investigation.
- `logActivity(msg, level)`: Centralized logging for troubleshooting and audit.

---

## Configuration

All configuration (Doc/Sheet IDs, email addresses, Slack webhook, etc.) is in a single `CONFIG` object at the top of the main script file.

See [Configuration.md](Configuration.md) for:
- How to obtain Google Doc/Sheet IDs
- How to share resources with the Apps Script project
- Setting up Mailjet (API keys) or Slack (webhook)
- Enabling/disabling Chronicle or other integrations

---

## Installation & Usage

A step-by-step installation, deployment, and usage guide is provided in [Installation and Usage.md](Installation%20and%20Usage.md).

In brief:

1. **Copy the Apps Script project** into your Google Workspace.
2. **Update `CONFIG`** with your template, sheet, Slack, and email settings.
3. **Authorize** (run `main()` in editor to prompt permissions).
4. **Deploy as a Web App** (set access as "Anyone" for initial testing).
5. **Test via `main()` or cURL/webhook** – see [Mock Incident JSON Example](mock_incident-json.MD).
6. **Monitor logs and outputs** (Google Sheet, Docs, Slack, email).

---

## Templates & Examples

- [Sample Google Docs Template (Recommended Structure)](Sample%20Google%20Docs%20Template%20(Recommended%20Structure).md)
- [Mock Incident JSON Example](mock_incident-json.MD)

---

## Extending & Integrating

- Supports easy integration with **EDR**, **SIEM**, **firewalls**, or any system capable of sending HTTP POSTs.
- To add more notification channels, see `sendIncidentNotification` and `sendSlackNotification`.
- Add logic to `processIncident` for new escalation rules, enrichment, or auto-remediation.
- Use the provided logging functions to maintain a full audit trail.

See [Improvements.md](improvements.md) for roadmap and ideas.

---

## Improvements & Roadmap

- Additional SIEM/EDR enrichment (reverse DNS, geo-IP, user context)
- Slack interactive actions (acknowledge/close incident)
- Automated PDF report export
- DLP/data access playbook templates
- More robust error handling and monitoring

Contributions welcome! See [improvements.md](improvements.md).

---

## License & Credits

- [License.md](License.md)
- [Credits.md](Credits.md)

---

**Get Started:**  
Start with the [Configuration](Configuration.md) and [Installation and Usage](Installation%20and%20Usage.md) guides.  
Test with [mock incident JSON](mock_incident-json.MD) to verify your deployment.

---

**Core Logic:**  
All main logic lives in [`Soar Incident Responses.gs`](Soar%20Incident%20Responses.gs).

---

> For questions, improvements, or bug reports, open an issue or pull request.  
> Happy automating!

---
## Architecture

See [Architecture.md](Architecture.md) for full diagrams and an in-depth explanation.

Below is a simplified flowchart showing the automation logic (works in Mermaid-enabled markdown viewers):

> **Note:** If this diagram does not render, view it on a [Mermaid live editor](https://mermaid-js.github.io/mermaid-live-editor/) or see the exported PNG in the repository.


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
