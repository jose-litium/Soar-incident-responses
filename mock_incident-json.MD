## 📝 Example Incident JSON

Below is a sample JSON payload representing a security incident. This format is used when interacting with the SOAR webhook (for example, using `curl`, Google Chronicle, or other automated sources):

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
