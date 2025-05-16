graph TD
  Intake[Incident Intake: Webhook/cURL/Manual] --> Normalize[Parse & Normalize Data]
  Normalize --> IOCCheck[IOC IP Check]
  IOCCheck -->|IOC Match| Actionable[Actionable Incident Flow]
  IOCCheck -->|No IOC| Escalation[Escalation Logic]
  Escalation -->|Escalate| Actionable
  Escalation -->|No Escalation| Informational[Log as Informational Only]
  Actionable --> Docs[Generate Google Doc Report]
  Actionable --> Email[Send Email Notification]
  Actionable --> Slack[Send Slack Notification]
  Actionable --> Sheet[Log to Google Sheet]
  Actionable -->|optional| Chronicle[Trigger Chronicle/EDR]
  Informational --> Docs
  Informational --> Sheet
  Informational --> Email
  Informational --> Slack
