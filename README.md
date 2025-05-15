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

---

## High-Level Architecture Diagram

```mermaid
flowchart TD
    CurlTest["curl Randomizer"]
    Chronicle["Chronicle SIEM"]
    Manual["Manual Run"]
    AppsScript["Apps Script"]
    GoogleDocs["Docs (Report)"]
    GoogleSheets["Sheets (Log)"]
    Mailjet["Mailjet"]
    Slack["Slack"]
    Logger["Logger"]

    CurlTest -->|POST| AppsScript
    Chronicle -->|Webhook| AppsScript
    Manual --> AppsScript

    AppsScript -->|Report| GoogleDocs
    AppsScript -->|Log| GoogleSheets
    AppsScript -->|Email| Mailjet
    AppsScript -->|Alert| Slack
    AppsScript -->|Log| Logger
Workflow Diagram
Below is a workflow diagram representing the typical flow of a security incident through the automation:

mermaid
Copiar
Editar
flowchart LR
    A[Detection/Alert<br>Chronicle SIEM,<br>cURL, Manual] --> B(Incident Intake<br>Apps Script Webhook)
    B --> C{Incident Valid?}
    C -- Yes --> D[Create Incident Doc<br>from Template]
    D --> E[Log to Google Sheet]
    D --> F[Send Email Notification<br>Mailjet/Gmail]
    D --> G[Send Slack Alert]
    F & G --> H[Stakeholder Response/Investigation]
    E --> I[Update Sheet/Status]
    H --> I
    I --> J{Incident Closed?}
    J -- No --> H
    J -- Yes --> K[Closure & Review]

    style H fill:#d1ecf1,stroke:#2196f3
    style D fill:#f8d7da,stroke:#d32f2f
    style F fill:#fff3cd,stroke:#ff9800
    style E fill:#e0e0e0,stroke:#2196f3
    style G fill:#d1ecf1,stroke:#2196f3
    style K fill:#c8e6c9,stroke:#388e3c
