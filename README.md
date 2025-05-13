# SOAR-Inspired Google Workspace Incident Automation

## 📌 Overview

This project simulates the kickoff of a security incident response process, automated through Google Workspace tools. It mimics how a Chronicle SOAR block could trigger workflows upon detecting an incident via API or webhook.

The solution includes:
- 📄 Google Docs: auto-generated incident report based on a template.
- 📬 Gmail/Chat: automatic incident kickoff communication with stakeholders.
- 🧠 Executive summary creation.
- ⏰ Scheduled reminders (optional).
- 📈 Extensible SOAR-style logic for future enhancements.

---

## 🎯 Use Case Scenario

An alert was raised after a user logged into Google Workspace from Ghana. The login matched a known IOC and MFA was used. The user was accessing sensitive data, and an incident was triggered for formal IR process.

---

## 🔩 Components & Workflow

1. **Trigger**:
   - Via Webhook (`doPost`) or Manual execution (`main()`).

2. **Incident Object Construction**:
   - Parses input JSON (see [`mock_incident.json`](./mock_incident.json)).

3. **Document Creation**:
   - Uses `createIncidentReport()` to clone a Google Docs template and populate placeholders.

4. **Executive Summary**:
   - Created by `generateExecutiveSummary()` and inserted at the top of the document.

5. **Kickoff Communication**:
   - `sendIncidentNotification()` sends a Gmail message with summary and doc link to stakeholders.

6. **Logging**:
   - Activities logged (can be expanded to Google Sheets or Stackdriver).

---

## 👥 Stakeholders & Roles

| Role            | Responsibility                      |
|-----------------|--------------------------------------|
| SecOps Lead     | Coordinates IR, triage, follow-up    |
| On-Call Engineer| Takes initial actions, updates report|
| Product Owner   | Provides system context              |
| Management      | Receives high-level status           |

---

## ⚙️ Tech Stack

- Google Apps Script
- Google Docs (template-based)
- Gmail / Google Chat APIs *(Chat optional)*
- JSON-based incident input

---

## 🔐 Security Process Design

- Enforces structured data input.
- Centralized documentation.
- Minimal manual steps.
- Support for human review + automated alerts.

---

## 📎 Input Example

```json
{
  "incident_id": "INC-20250513-114200",
  "timestamp": "2025-05-13T11:42:00Z",
  "user": "john.error404@yougothack.com",
  "login_ip": "196.251.72.142",
  "location": "Ghana",
  "mfa_used": true,
  "ioc_matched": true,
  "sensitive_data_accessed": true,
  "severity": "High",
  "status": "Open",
  "timeline": [
    { "time": "2025-05-13T11:40:00Z", "event": "Login detected" },
    { "time": "2025-05-13T11:41:00Z", "event": "IOC match confirmed" }
  ],
  "actions_taken": [
    "User account temporarily suspended",
    "Endpoint isolation initiated"
  ]
}
