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
    Webhook["Webhook (HTTP POST)"] -->|Incident Data| AppsScript
    Manual["Main() Manual"] --> AppsScript
    AppsScript -->|Create Report| GoogleDocs["Google Docs (Report)"]
    AppsScript -->|Log Entry| GoogleSheets["Google Sheets (Log)"]
    AppsScript -->|Email| Mailjet["Mailjet / GmailApp"]
    AppsScript -->|Alert| Slack["Slack (Webhook)"]
    AppsScript -->|Stackdriver Logging| Logger
