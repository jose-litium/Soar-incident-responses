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
