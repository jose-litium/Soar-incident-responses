# How Security Incident Automation Works

This section explains, step by step, how the app processes incidents, which main function is called, and what happens next.

---

## Process Overview Table

| Step                           | What happens?                     | Main Function(s)                                   | Output/Next Step                        |
|---------------------------------|-----------------------------------|----------------------------------------------------|-----------------------------------------|
| 1. Receive Incident Data        | Webhook/API/manual triggers       | `doPost` / `main`                                  | Raw incident data received              |
| 2. Normalize Data               | Fill defaults, add timestamp      | `createIncidentFromData`                           | Normalized incident object              |
| 3. Classify Incident            | Check IOC list & MFA              | `classifyIncident` & `isIocIp`                     | Sets severity (High/Medium/Low)         |
| 4. Decide Actionability         | Is action required?               | `processIncident`                                  | Status: Open (needs action) or Closed   |
| 5. Generate Report              | Create Google Doc from template   | `createIncidentReport`                             | New incident report Doc                 |
| 6. Write Report Details         | Fill Doc with summary & details   | `insertSummaryToDoc`                               | Full incident report                    |
| 7. Notify Stakeholders          | Email & Slack alerts              | `sendIncidentNotification` & `sendSlackNotification` | Notifies team, includes links           |
| 8. Log to Spreadsheet           | Register for audit & compliance   | `logIncidentToSheet`                               | Entry added to Google Sheet             |
| 9. Optional: Kickoff Chronicle  | API call for advanced analysis    | `kickoffChronicle`                                 | External investigation (if enabled)     |

---

## Visual Flow (Mermaid Diagram)

```mermaid
flowchart TD
    A([Start]) --> B[doPost / main: Receive Data]
    B --> C[createIncident: Normalize Data]
    C --> D[classifyIncident: Check IOC & MFA]
    D --> E[processIncident: Decide Actionability]
    E --> F{Severity?}
    F -- High/Medium --> G[createIncidentReport: Make Doc]
    G --> H[insertSummaryToDoc: Fill Doc]
    H --> I[sendIncidentNotification/sendSlackNotification: Notify Team]
    I --> J[logIncidentToSheet: Log in Spreadsheet]
    J --> K{Chronicle Enabled?}
    K -- Yes --> L[kickoffChronicle: Advanced Analysis]
    K -- No --> M([End])
    F -- Low --> N[logIncidentToSheet: Log Event, Mark Closed]
    N --> M
    L --> M
