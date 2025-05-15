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
    CurlTest["curl Randomizer (simulate POSTs with random IPs)"]
    Chronicle["Google Chronicle (SIEM/SOAR)"]
    Manual["Manual Run (main function)"]
    AppsScript["Google Apps Script (SOAR Logic)"]
    GoogleDocs["Google Docs (Incident Report)"]
    GoogleSheets["Google Sheets (Incident Log)"]
    Mailjet["Mailjet (HTML Email)"]
    Slack["Slack (Webhook)"]
    Logger["Stackdriver Logging"]

    CurlTest -->|POST Incident Data| AppsScript
    Chronicle -->|Webhook Incident| AppsScript
    Manual --> AppsScript

    AppsScript -->|Create Report| GoogleDocs
    AppsScript -->|Log Entry| GoogleSheets
    AppsScript -->|Send Email| Mailjet
    AppsScript -->|Alert| Slack
    AppsScript -->|Log| Logger
