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
    Start([Incident Intake<br/>(Webhook / cURL / Manual)])
    Start --> CheckIOC{Is IP in IOC List?}
    
    %% IOC in list
    CheckIOC -- "Yes" --> IOC_MFA{Was MFA used?}
    IOC_MFA -- "No" --> Actionable1[Actionable Incident<br/>(IOC, no MFA)]
    IOC_MFA -- "Yes" --> Actionable2[Actionable Incident<br/>(IOC, MFA used)]
    
    %% IOC not in list
    CheckIOC -- "No" --> NonIOC_MFA{Was MFA used?}
    NonIOC_MFA -- "No" --> Actionable3[Actionable Incident<br/>(No IOC, no MFA)]
    NonIOC_MFA -- "Yes" --> InfoOnly[Informational Event<br/>(No IOC, MFA used)]

    %% Actionable path
    Actionable1 & Actionable2 & Actionable3 --> GenDocA[Generate Google Doc Report]
    GenDocA --> EmailSlackA[Send Email & Slack<br/>(Severity color/status Open)]
    EmailSlackA --> LogOpen[Log in Google Sheet<br/>(Status: Open)]
    LogOpen --> EndA([End])

    %% Informational path
    InfoOnly --> GenDocI[Generate Google Doc Report]
    GenDocI --> EmailSlackI[Send Email & Slack<br/>(Informational banner, Status: Closed)]
    EmailSlackI --> LogClosed[Log in Google Sheet<br/>(Status: Closed)]
    LogClosed --> EndI([End])

    %% Styling
    classDef info fill:#eef6fa,stroke:#68a0c5,stroke-width:2px;
    class InfoOnly,EmailSlackI,LogClosed info
    classDef action fill:#f3f8ea,stroke:#92c47a,stroke-width:2px;
    class Actionable1,Actionable2,Actionable3,EmailSlackA,LogOpen action
    classDef doc fill:#fff,stroke:#aaa,stroke-dasharray: 3 3;
    class GenDocA,GenDocI doc
