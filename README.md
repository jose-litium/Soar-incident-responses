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

flowchart TD
    A[Incident Intake (Webhook/cURL/Manual)] --> B{Is IP in IOC list?}
    B -- Yes --> C{Was MFA used?}
    B -- No --> D{Was MFA used?}

    %% --- IOC Branch ---
    C -- No --> E[Actionable Incident]
    C -- Yes --> F[Actionable Incident]
    E --> G[Generate Doc Report]
    E --> H[Send Email/Slack (Severity: Open)]
    E --> I[Log as Open]
    F --> G
    F --> H
    F --> I
    %% --- Non-IOC Branch ---
    D -- No --> J[Actionable Incident]
    D -- Yes --> K[Informational Only]
    J --> G
    J --> H
    J --> I
    K --> L[Generate Doc Report]
    K --> M[Send Email/Slack (Banner: Informational, Status: Closed)]
    K --> N[Log as Closed]

    %% Merge points for documentation
    G --> O[Google Doc Link]
    I --> O
    L --> O
    N --> O
    H --> O
    M --> O

    style K fill:#fafbfc,stroke:#777,stroke-width:1.5px
    style M fill:#f1f2f6,stroke:#888,stroke-dasharray: 5 5
    style N fill:#f1f2f6,stroke:#888,stroke-dasharray: 5 5

    %% Labels
    classDef info fill:#f1f2f6,stroke:#888;
    class K,M,N info
