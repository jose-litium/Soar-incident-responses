# SOAR-Inspired Google Workspace Incident Automation

## 📌 Overview

This project simulates the kickoff of a security incident response process, automated through Google Workspace tools. It mimics how a Chronicle SOAR block could trigger workflows upon detecting an incident via API or webhook.

The solution includes:
- 📄 **Google Docs**: Auto-generated incident report based on a template.
- 📬 **Gmail/Chat**: Automatic incident kickoff communication with stakeholders.
- 🧠 **Executive Summary Creation**: Generated and added to the report.
- ⏰ **Scheduled Reminders**: Optional feature for follow-up notifications.
- 📈 **Extensible SOAR-Style Logic**: Framework for future enhancements like integration with Google Chronicle.

---

## 🎯 Use Case Scenario

An alert was raised after a user logged into Google Workspace from Ghana. The login matched a known IOC (Indicator of Compromise) and MFA (Multi-Factor Authentication) was used. The user was accessing sensitive data, and an incident was triggered for the formal Incident Response (IR) process.

---

## 🔩 Components & Workflow

1. **Trigger**:
   - Incident detection can be triggered via Webhook (`doPost`) or manually by executing the `main()` function.
   
2. **Incident Object Construction**:
   - The incident data is parsed from input JSON (for testing, see the [`mock_incident.json`](./mock_incident.json) file).

3. **Document Creation**:
   - The function `createIncidentReport()` clones a Google Docs template and populates the document with incident details using placeholders.

4. **Executive Summary**:
   - The function `generateExecutiveSummary()` creates a brief summary of the incident and inserts it at the top of the report.

5. **Kickoff Communication**:
   - The function `sendIncidentNotification()` sends an email via Gmail to relevant stakeholders with a summary and a link to the generated incident report.

6. **Logging**:
   - Actions and key events are logged. This can be extended to log into a Google Sheet or Stackdriver for tracking and monitoring.

---

## 👥 Stakeholders & Roles

| Role            | Responsibility                      |
|-----------------|--------------------------------------|
| SecOps Lead     | Coordinates the IR process, triages the incident, and performs follow-up actions. |
| On-Call Engineer| Takes immediate action on the incident, updates the report with actions taken. |
| Product Owner   | Provides context and prioritization for the impacted systems. |
| Management      | Receives high-level status updates and makes decisions based on the incident severity. |

---

## ⚙️ Tech Stack

- **Google Apps Script**: For automation and workflow orchestration.
- **Google Docs**: Template-based document generation for incident reports.
- **Gmail / Google Chat APIs**: For sending incident notifications to stakeholders (Google Chat integration is optional).
- **JSON-based Input**: Structured format for incident input, ensuring consistency across reports.

---

## 🔐 Security Process Design

- **Structured Data Input**: Ensures all relevant information is collected before processing.
- **Centralized Documentation**: All incident details are stored in a Google Doc, facilitating easy access and management.
- **Minimal Manual Steps**: Automation of report creation, email notifications, and status tracking minimizes human intervention.
- **Human Review + Automated Alerts**: The process allows for human oversight while sending automated alerts to ensure timely responses.

---

## 📎 Input Example

Here is an example of the JSON input that triggers the automation. This JSON is typically sent via API or used for testing:

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
