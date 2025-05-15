# SOAR Incident Response Automation

Automated incident response and documentation using Google Apps Script, Google Workspace (Docs, Sheets), **Mailjet**, and **Slack**.

<div align="center">
<img src="https://img.shields.io/badge/Automation-Google%20Apps%20Script-blue" alt="Google Apps Script"/>
<img src="https://img.shields.io/badge/Email-Mailjet-green" alt="Mailjet"/>
<img src="https://img.shields.io/badge/Chat-Slack-%234A154B" alt="Slack"/>
</div>

---

## Table of Contents

- [Description](#description)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Code Structure](#code-structure)
- [Automation and Workflow](#automation-and-workflow)
- [Notifications](#notifications)
- [Customization](#customization)
- [Installation and Usage](#installation-and-usage)
- [License](#license)
- [Useful Links](#useful-links)
- [Credits](#credits)

---

## Description

This project implements an **automated workflow** for managing and documenting security incidents ("SOAR": Security Orchestration, Automation, and Response) using Google's suite (Docs and Sheets), professional email delivery via Mailjet, and notifications in Slack channels.

**Key Features:**
- Automatic incident ingestion (webhook, HTTP POST, or manual).
- Generation of document reports from Google Docs templates.
- Automatic email notifications to stakeholders (HTML, with Gmail fallback).
- Slack channel/group notifications with report links.
- Centralized incident logging in Google Sheets.
- Actions and recommendations tailored to severity levels.

---

## Architecture

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

---

## Tips & Troubleshooting

### Tips

- **Start with manual runs** (`main()` function) to validate your configuration before connecting to webhooks.
- **Use a curl script to simulate incidents:**

  Example:
  ```bash
  curl -X POST \
    -H "Content-Type: application/json" \
    -d '{"user":"test@company.com","login_ip":"123.45.67.89","severity":"High"}' \
    https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

