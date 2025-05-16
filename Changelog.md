| Date       | Feature / Improvement                | Details                                                                                     |
|------------|-------------------------------------|---------------------------------------------------------------------------------------------|
| 2024-05-16 | IOC CIDR Support                    | IP matching now works with FireHOL CIDR ranges (not just single IPs)                        |
| 2024-05-16 | Actionable vs Informational Logic   | Only escalates if IOC match or no MFA; else, status is “Closed” and notification is muted   |
| 2024-05-16 | Contextual Notifications            | Emails/Slack alerts display banners and severity only if actionable; “Closed” for info only |
| 2024-05-16 | Links-Only Email                    | No attachments; always includes Google Doc and Sheet links                                  |
| 2024-05-16 | Slack Improvements                  | Color-coded, with direct Doc links and “Closed” state for info-only events                  |
| 2024-05-16 | Google Sheets Log                   | All events (including info-only) are logged, with Doc URL                                   |
| 2024-05-16 | Chronicle API Kickoff (Disabled)    | Optional API call to Chronicle for actionable incidents (default: disabled)                 |
| 2024-05-16 | IOC Feed Updater                    | Automated IOC (malicious IP) fetch from FireHOL                                             |
