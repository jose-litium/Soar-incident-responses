# Google Chronicle Integration for SOAR Automation

This section explains how to integrate your Google Apps Script SOAR automation with Google Chronicle, so that incidents detected in Chronicle can trigger your automated workflow in real time.

---

## 1. Chronicle Detection Rule Example (YARA-L)

Below is an example YARA-L rule for Chronicle. This rule triggers when:
- A user logs in from a suspicious country
- The IP address matches a known malicious IOC
- Sensitive data is accessed

```yaral
rule Suspicious_Login_with_IOC_and_Data_Access
{
    meta:
        description = "Detects user login from suspicious country, matching IOC, with sensitive data accessed"
        severity = "HIGH"
        author = "Jose Moreno"
        created = "2025-05-14"
    condition:
        // Detect login event
        $login = event.principal.ip != null and
                 event.metadata.product_event_type == "USER_LOGIN" and
                 event.target.location_country_code in ("GH", "NG", "RU", "CN") // Ghana, Nigeria, Russia, China

        // Match known IOC (indicator of compromise)
        $ioc = any i in event.security_result.indicator[] : (
            i.category == "malicious_ip" and i.confidence_level >= 80
        )

        // Sensitive data accessed
        $sensitive = event.metadata.labels contains "SENSITIVE_DATA_ACCESS" or
                     event.target.resource.name matches /drive\/.+\/confidential/i

        // All three required for alert
        $login and $ioc and $sensitive
}
2. Configure Chronicle Webhook
When this rule is triggered, Chronicle can send a webhook (HTTP POST) to your Google Apps Script endpoint.

Type: HTTP Webhook

Destination URL:

bash
Copiar
Editar
https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
Payload format: JSON (see below)

3. Example Webhook Payload
Chronicle will send a JSON object to your SOAR script.
Here is an example payload:

json
Copiar
Editar
{
  "user": "john.error404@yougothack.com",
  "login_ip": "196.251.72.142",
  "location": "Ghana",
  "ioc_matched": true,
  "sensitive_data_accessed": true,
  "timestamp": "2025-05-13T11:42:00Z",
  "severity": "High",
  "status": "Open",
  "timeline": [
    { "time": "2025-05-13T11:40:00Z", "event": "Login detected" },
    { "time": "2025-05-13T11:41:00Z", "event": "IOC match confirmed" }
  ],
  "actions_taken": ["User account temporarily suspended"]
}
Your Apps Script will receive this data, process the incident, notify stakeholders, and generate documentation automatically.

4. End-to-End Flow
Chronicle detects a suspicious event based on your custom rule.

Webhook sends the alert data to your Apps Script endpoint.

Your SOAR Script:

Parses the payload

Creates a Google Doc incident report

Sends notifications (email, chat, Slack)

Logs the incident in Google Sheets

References
Google Chronicle YARA-L Rule Documentation

Google Chronicle Detection Rule Actions

Google Apps Script Web Apps

Prepared by Jose Moreno, May 2025
