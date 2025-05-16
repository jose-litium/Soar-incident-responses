| Date       | Feature / Improvement            | Description                                                                                 |
|------------|----------------------------------|---------------------------------------------------------------------------------------------|
| 2024-05-16 | Full CIDR IOC Support            | IP matching supports entire FireHOL CIDR ranges, not just individual addresses.              |
| 2024-05-16 | Actionable/Escalation Logic      | Incidents are escalated only for IOC matches or if MFA was not used; others are informational and auto-closed. |
| 2024-05-16 | Contextual Notifications         | Email/Slack alerts show severity and banners only for actionable incidents; info-only events are marked "Closed". |
| 2024-05-16 | Link-First Email Alerts          | No attachments; every email includes direct Google Doc and Sheet links for instant review.   |
| 2024-05-16 | Enhanced Slack Alerts            | Color-coded Slack messages with Doc links; info-only incidents are clearly marked as "Closed". |
| 2024-05-16 | Comprehensive Logging            | All incidents (including informational) are logged in Google Sheets, with direct Doc URLs.   |
| 2024-05-16 | Chronicle API Integration (Opt.) | Optional: Auto-kickoff of Chronicle investigation for actionable incidents (default: off).   |
| 2024-05-16 | Automated IOC Feed Update        | Automatically fetches and updates IOC (malicious IP) lists from FireHOL for current threat data. |
