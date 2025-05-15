¡Ahora sí! Aquí tienes **TODO el contenido** en un **solo bloque Markdown**, sin repeticiones, bien formateado, limpio y autoexplicativo.
Puedes copiar y pegar directamente este bloque en un solo archivo `.md` (por ejemplo, `CHRONICLE_RULES.md`).
Incluye portada, explicación, reglas, instrucciones de uso y referencias.

---

````markdown
# Chronicle SIEM – Example YARA-L Rules for SOAR Integration

**Author:** Jose Moreno  
**Date:** May 2025

This document contains a curated list of useful Chronicle YARA-L detection rules for Google Chronicle SIEM.  
Each rule can be connected to your SOAR webhook (Google Apps Script, etc.) to automate response, documentation, and notification processes.

---

## 1. Suspicious Login from High-Risk Country

Triggers on any login event from a country considered high-risk for your organization.

```yaral
rule Login_from_High_Risk_Country
{
    meta:
        description = "Detects user login from high-risk countries"
        severity = "MEDIUM"
        author = "Jose Moreno"
        created = "2025-05-14"
    condition:
        event.metadata.product_event_type == "USER_LOGIN" and
        event.target.location_country_code in ("RU", "CN", "GH", "NG", "KP")
}
````

---

## 2. Impossible Travel (Concurrent Logins from Distant Locations)

Triggers when a user logs in from two countries too far apart within a short timeframe (e.g., less than 1 hour).

```yaral
rule Impossible_Travel_Login
{
    meta:
        description = "Detects impossible travel logins"
        severity = "HIGH"
        author = "Jose Moreno"
        created = "2025-05-14"
    condition:
        any l1 in event.related_events[] :
            (l1.metadata.product_event_type == "USER_LOGIN" and
             abs(event.start_time.seconds - l1.start_time.seconds) < 3600 and
             distance(event.target.location_country_code, l1.target.location_country_code) > 4000)
}
```

*Note: The `distance()` function is pseudocode; Chronicle may require custom enrichment for this.*

---

## 3. IOC Match: Known Malicious IP

Triggers if a login or network connection is made from an IP matching a known threat intelligence IOC.

```yaral
rule IOC_Match_Malicious_IP
{
    meta:
        description = "Detects logins or connections from known malicious IPs"
        severity = "HIGH"
        author = "Jose Moreno"
        created = "2025-05-14"
    condition:
        any i in event.security_result.indicator[] :
            (i.category == "malicious_ip" and i.confidence_level >= 80)
}
```

---

## 4. Sensitive Data Exfiltration Attempt

Triggers if a user downloads or exports a large number of sensitive documents.

```yaral
rule Sensitive_Data_Exfiltration
{
    meta:
        description = "Detects possible mass download of sensitive data"
        severity = "CRITICAL"
        author = "Jose Moreno"
        created = "2025-05-14"
    condition:
        event.metadata.product_event_type == "FILE_DOWNLOAD" and
        event.target.resource.name matches /drive\/.+\/(confidential|sensitive)/i and
        event.principal.user != null and
        event.metadata.bytes_transferred > 104857600 // >100MB in one event
}
```

---

## 5. Privilege Escalation Attempt

Triggers if a user gains admin privileges or is added to sensitive groups outside normal change windows.

```yaral
rule Privilege_Escalation_Attempt
{
    meta:
        description = "Detects admin privilege escalation"
        severity = "HIGH"
        author = "Jose Moreno"
        created = "2025-05-14"
    condition:
        event.metadata.product_event_type in ("ADMIN_ROLE_ASSIGNMENT", "GROUP_MEMBERSHIP_CHANGE") and
        event.target.resource.name matches /(admin|superuser|security)/i and
        not (event.metadata.timestamp.hours in (8,9,10,11,12,13,14,15,16,17)) // Not during work hours
}
```

---

## 6. Combination: Suspicious Login + IOC + Data Access

Triggers if a suspicious login (location), IOC match, and sensitive data access all happen together.

```yaral
rule Suspicious_Login_with_IOC_and_Data_Access
{
    meta:
        description = "Suspicious login, IOC match, and sensitive data accessed"
        severity = "HIGH"
        author = "Jose Moreno"
        created = "2025-05-14"
    condition:
        // Detect login
        $login = event.principal.ip != null and
                 event.metadata.product_event_type == "USER_LOGIN" and
                 event.target.location_country_code in ("GH", "NG", "RU", "CN")

        // Match IOC
        $ioc = any i in event.security_result.indicator[] : (
            i.category == "malicious_ip" and i.confidence_level >= 80
        )

        // Sensitive data access
        $sensitive = event.metadata.labels contains "SENSITIVE_DATA_ACCESS" or
                     event.target.resource.name matches /drive\/.+\/confidential/i

        $login and $ioc and $sensitive
}
```

---

## How to Use These Rules

1. **Copy** the rules you want into Chronicle’s detection rule editor.
2. **For each rule**, set an HTTP Webhook action to your SOAR endpoint, e.g.:

   ```
   https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
   ```
3. **Chronicle will POST** a JSON payload describing the event—your SOAR automation will process, notify, and document.

### Example Payload

```json
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
```

---

## References

* [Chronicle YARA-L Documentation](https://cloud.google.com/chronicle/docs/detections/yara-l)
* [Google Chronicle Detection Rule Actions](https://cloud.google.com/chronicle/docs/detections/response-actions)
* [Google Apps Script Web Apps](https://developers.google.com/apps-script/guides/web)

---

*Prepared by Jose Moreno, May 2025*

```

---

¿Así está perfecto? Si necesitas una sección extra (pruebas, troubleshooting, traducción) solo dime.  
¡Este es el bloque único y estructurado que pediste!
```
