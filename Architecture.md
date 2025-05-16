# Architecture

## Overview

The SOAR Incident Response Automation is designed to orchestrate and document the handling of security incidents across Google Workspace environments. It leverages Google Apps Script and integrates with Google Docs, Sheets, Mailjet, and Slack for a seamless, auditable workflow.

---

## Data Flow & Automation Process

**1. Incident Intake**
- Receives incidents via HTTP POST webhook, cURL command, or manual test trigger.
- Example sources: SIEM, EDR, firewalls, cloud rules, or user-reported events.

**2. Normalization & Parsing**
- Extracts core fields: user, IP address, timestamp, severity, MFA usage, geo-location, indicators, etc.
- Ensures consistency for downstream processing.

**3. IOC (Indicator of Compromise) IP Check**
- Compares incident IP to a regularly updated IOC/blocklist (such as FireHOL).
- If the IP matches: the incident is flagged as "actionable".

**4. Escalation Rules (Non-IOC Events)**
- If there is no IOC match, checks for escalation triggers (such as: privileged user, sensitive resource access, Chronicle/EDR/Firewall detection).
- If an escalation rule matches: the incident is treated as actionable.

**5. Actionable Incident Workflow**
- Creates a Google Docs report from a customizable template, filled with all incident details, actions, timeline, and compliance sections.
- Sends notifications to stakeholders via Mailjet (or Gmail fallback) and Slack, including direct links.
- Appends a log entry in a central Google Sheet.
- Optionally, triggers a Chronicle or EDR investigation or response via API.

**6. Informational Events**
- If not actionable, incident is still logged in Docs and Sheets for traceability, but notifications indicate "no action required".

**7. Audit Logging**
- All steps are logged for audit and troubleshooting.

---

## Flow Diagram (ASCII)

Below is an ASCII-style flow diagram representing the automation logic:

