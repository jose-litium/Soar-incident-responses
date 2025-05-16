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

+----------------------+
| Incident Intake | <-- (Webhook, cURL, or manual)
+----------+-----------+
|
v
+----------------------+
| Normalize & Parse |
+----------+-----------+
|
v
+-------------------------------+
| IOC IP Check (blocklist) |
+-----+-------------------+-----+
| |
[Match] [No Match]
| |
v v
+-----------+ +----------------------+
|Actionable | | Escalation Rule Check|
+-----+-----+ +-----+----------------+
| |
v v
+----------------+ [Match] [No Match]
| Generate Report|----+ +------------+
| (Google Docs) | | |Informational|
+-------+--------+ v | Only: |
| +-----------------+ | Log & |
v | | Notify |
+---------------+ +----------+| +-------------+
| Notify by | | Log in |
| Email (Mailjet| | Sheet |
| & Slack) | +-----------+
+---------------+

yaml
Copiar
Editar

---

## Component Overview

- **Google Apps Script:** Orchestrates the automation, integrates all services, and provides endpoints.
- **Google Docs:** Templates and stores detailed incident reports.
- **Google Sheets:** Central log/audit trail of all incidents.
- **Mailjet (or Gmail):** Sends email notifications to all stakeholders.
- **Slack:** Posts formatted messages/alerts in real time, with report links and severity color-coding.
- **(Optional) Chronicle/EDR API:** For auto-response or deeper investigation triggers.

---

## Extending the Architecture

- Add new escalation rules in the `processIncident` function or its helpers.
- Integrate with additional notification channels (Teams, SMS, ticketing) by extending notification functions.
- Enrich incident context (geo-IP, user info, device, etc.) before documentation and notification.
- Schedule regular updates of the IOC/blocklist with a timed Apps Script trigger.
- Use Apps Script triggers to automate health checks, IOC updates, or regular reporting.

---

## Diagram Legend

- **Actionable:** Triggers report creation, notifications, and full logging.
- **Informational Only:** Logged for traceability but requires no immediate action.
- **All incidents** are auditable, with documentation and log retention by design.

---

For further technical details, see the main script or each helper module’s documentation.
Tip:
You can put a PNG or mermaid version as an additional section later, but this ASCII will always render in Markdown, PDFs, code viewers, and documentation generators.

Let me know if you want a Spanish version, or want this extended for compliance mapping or cloud security reviews!
