## Chronicle Integration Example

This project supports full integration with **Google Chronicle SIEM**, enabling automated incident response and documentation as soon as a relevant alert is detected.

### Overview

With Chronicle, you can define custom detection rules to identify suspicious events such as:
- Logins from high-risk countries
- Known IOC (indicator of compromise) matches
- Access to sensitive data

When a rule is triggered, Chronicle sends an HTTP webhook directly to your SOAR Apps Script endpoint. This automates the creation of Google Docs reports, stakeholder notifications, and logging.

---
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
                 event.target.location_country_code in ("GH", "NG", "RU", "CN") // Example: Ghana, Nigeria, Russia, China

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

### Integration Flow Diagram

```plaintext
+------------+      [1] Alert Match     +------------------+
| Chronicle  |------------------------>|  SOAR Apps Script |
| Detection  | (Rule + Webhook)        |   (Webhook Intake)|
+------------+                         +-------------------+
                                              |
                                +-------------+-------------+
                                |             |             |
                       [2] Google Doc   [3] Email/Chat   [4] Google Sheets
                        (Report)        (Notification)    (Incident Log)
