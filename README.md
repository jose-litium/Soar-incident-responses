# SOAR Incident Response Automation

Automated incident response and documentation for Google Workspace environments using Google Apps Script, Docs, Sheets, Mailjet, and Slack.

<div align="center">
<img src="https://img.shields.io/badge/Automation-Google%20Apps%20Script-blue" alt="Google Apps Script"/>
<img src="https://img.shields.io/badge/Email-Mailjet-green" alt="Mailjet"/>
<img src="https://img.shields.io/badge/Chat-Slack-%234A154B" alt="Slack"/>
</div>

---

## Table of Contents

- [Description](#description)
- [Architecture](Architecture.md)
- [Code Structure](Code%20Structure.md)
- [Configuration](Configuration.md)
- [Installation and Usage](Installation%20and%20Usage.md)
- [Sample Google Docs Template](Sample%20Google%20Docs%20Template%20(Recommended%20Structure).md)
- [Mock Incident JSON Example](mock_incident-json.MD)
- [Improvements and Ideas](improvements.md)
- [License](License.md)
- [Credits](Credits.md)
- [Chronicle Integration](CHRONICLE_RULES.md)
---

## Description

**SOAR Incident Response Automation** is a workflow for orchestrating security incident response: it automates incident intake, reporting, notifications, and logging via Google Apps Script, Google Docs, Sheets, Mailjet, and Slack.

**Key features:**

- Intake via webhook/HTTP POST (SIEM), cURL (simulation), or manual trigger.
- Automated Google Docs report creation (using your own template).
- Email notifications to stakeholders via Mailjet (with Gmail fallback).
- Slack notifications with direct report/log links and severity color-coding.
- Logging in a centralized Google Sheet.
- Easily extensible and configurable for your needs.

---

## Architecture

See [Architecture.md](Architecture.md) for a diagram and system explanation.

---

## Code Structure

See [Code Structure.md](Code%20Structure.md) for a description of every file and its purpose.

---

## Configuration

See [Configuration.md](Configuration.md) for how to set up API keys, edit the configuration object, and connect Google Docs/Sheets/Mailjet/Slack.

---

## Installation and Usage

Step-by-step installation, deployment, and usage instructions are in [Installation and Usage.md](Installation%20and%20Usage.md).

---

## Sample Google Docs Template

A recommended structure for your incident report template is provided in [Sample Google Docs Template (Recommended Structure).md](Sample%20Google%20Docs%20Template%20(Recommended%20Structure).md).

---

## Mock Incident JSON Example

Use [mock_incident-json.MD](mock_incident-json.MD) for example incident data and for testing your webhooks or cURL scripts.

---

## Improvements and Ideas

Planned features, known issues, and suggestions can be found in [improvements.md](improvements.md).

---

## License

See [License.md](License.md).

---

## Credits

See [Credits.md](Credits.md).

---

**Main Script:**  
All core logic is in [`Soar Incident Responses.gs`](Soar%20Incident%20Responses.gs).

---

**Tip:**  
Start by reading the [Configuration](Configuration.md) and [Installation and Usage](Installation%20and%20Usage.md) guides, then review the Docs Template and mock JSON files to quickly set up and test your automation.

# SOAR Incident Response Automation

Automated incident response and documentation for Google Workspace environments using Google Apps Script, Docs, Sheets, Mailjet, and Slack.

<div align="center">
<img src="https://img.shields.io/badge/Automation-Google%20Apps%20Script-blue" alt="Google Apps Script"/>
<img src="https://img.shields.io/badge/Email-Mailjet-green" alt="Mailjet"/>
<img src="https://img.shields.io/badge/Chat-Slack-%234A154B" alt="Slack"/>
</div>

---

## Table of Contents

- [Description](#description)
- [Incident Intake and Kickoff Logic](#incident-intake-and-kickoff-logic)
- [Architecture Diagram](#architecture-diagram)
- [Code Structure](#code-structure)
- [Configuration](#configuration)
- [Installation and Usage](#installation-and-usage)
- [Sample Google Docs Template](#sample-google-docs-template)
- [Mock Incident JSON Example](#mock-incident-json-example)
- [Improvements and Ideas](#improvements-and-ideas)
- [License](#license)
- [Credits](#credits)
- [Chronicle/EDR/Firewall Integration](#chronicleedrfirewall-integration)

---

## Description

**SOAR Incident Response Automation** orchestrates and automates security incident response in Google Workspace environments. It automates incident intake, reporting, notifications, and centralized logging via Google Apps Script, Google Docs, Google Sheets, Mailjet, and Slack.

### Key features

- **Flexible intake:** Webhook/HTTP POST (SIEM), cURL (simulation), or manual trigger.
- **Automatic documentation:** Generates incident reports in Google Docs (using a customizable template).
- **Automated notifications:** Notifies stakeholders via Mailjet (email) and Slack (chat), with direct report/log links and severity color-coding.
- **Centralized logging:** All incidents are logged in a Google Sheet.
- **Chronicle/EDR/firewall integration:** Supports automatic response kickoff via Google Chronicle rules, any EDR, or firewall alerts.
- **Covers both IOC and non-IOC events:** Handles known bad indicators and any suspicious patterns matched by detection rules.
- **Easily extensible:** Configuration and code are modular for custom logic and integration.

---

## Incident Intake and Kickoff Logic

This automation accepts incident alerts from any system capable of sending HTTP requests, and applies the following decision logic:

1. **Incident Intake**
    - Receives incident via webhook, cURL, or manual entry.
    - Extracts all relevant attributes (e.g., source IP, username, alert source, severity).

2. **IOC (Indicator of Compromise) Check**
    - **If the incident IP is in the IOC list:**
        - The system treats this as an actionable incident.
        - Response playbook is triggered.
        - Full workflow: Documentation, notifications, logging.
    - **If the IP is NOT in the IOC list:**
        - The system checks if the incident matches escalation rules (such as:
            - Suspicious logins (unusual location),
            - Privileged user actions,
            - Sensitive resource access,
            - Any Chronicle, EDR, or firewall rule hit).
        - **If escalation rule is matched:**
            - The incident response is automatically triggered:
                - Generates Google Doc report
                - Sends notifications
                - Logs incident
        - **If NOT matched:**
            - Logs incident for future triage as informational (no immediate action).

3. **Notifications & Documentation**
    - Every actionable incident generates:
        - A Google Doc report from template
        - Slack and Mailjet notifications, with report links and severity color
        - Logging in Google Sheet (including non-actionable events for auditability)

---

## Architecture Diagram

Below is a unified flowchart showing all logic paths:

```mermaid
flowchart TD
    Start([Incident Intake (Webhook / cURL / Manual)])
    Start --> Parse[Extract Incident Attributes]
    Parse --> CheckIOC{Is IP in IOC List?}

    CheckIOC -- "Yes" --> Actionable[Actionable Incident (IOC matched)]
    Actionable --> CreateDoc[Generate Google Doc Report]
    CreateDoc --> Notify[Notify via Mailjet & Slack]
    Notify --> Log[Log to Google Sheet]

    CheckIOC -- "No" --> CheckRule{Escalation Rule (Chronicle / EDR / Firewall)?}
    CheckRule -- "Yes" --> Kickoff[Auto-Kickoff Incident Response]
    Kickoff --> CreateDoc
    CheckRule -- "No" --> NonActionable[Log as Informational / Triage]
    NonActionable --> Log
