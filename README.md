SOAR Incident Response Automation
Automated incident response and documentation using Google Apps Script, Google Workspace (Docs, Sheets), Mailjet, and Slack.

<div align="center"> <img src="https://img.shields.io/badge/Automation-Google%20Apps%20Script-blue" alt="Google Apps Script"/> <img src="https://img.shields.io/badge/Email-Mailjet-green" alt="Mailjet"/> <img src="https://img.shields.io/badge/Chat-Slack-%234A154B" alt="Slack"/> </div>
Table of Contents
Description

Architecture

Configuration

Code Structure

Automation and Workflow

Notifications

Customization

Installation and Usage

License

Useful Links

Credits

Description
This project implements an automated workflow for managing and documenting security incidents ("SOAR": Security Orchestration, Automation, and Response) using Google's suite (Docs and Sheets), professional email delivery via Mailjet, and notifications in Slack channels.

Key Features:

Automatic incident ingestion (webhook, HTTP POST, or manual).

Generation of document reports from Google Docs templates.

Automatic email notifications to stakeholders (HTML, with Gmail fallback).

Slack channel/group notifications with report links.

Centralized incident logging in Google Sheets.

Actions and recommendations tailored to severity levels.

Architecture
mermaid
Copy
Edit
flowchart TD
    Webhook["Webhook (HTTP POST)"] -->|Incident Data| AppsScript
    Manual["Main() Manual"] --> AppsScript
    AppsScript -->|Create Report| GoogleDocs["Google Docs (Report)"]
    AppsScript -->|Log Entry| GoogleSheets["Google Sheets (Log)"]
    AppsScript -->|Email| Mailjet["Mailjet / GmailApp"]
    AppsScript -->|Alert| Slack["Slack (Webhook)"]
    AppsScript -->|Stackdriver Logging| Logger
Configuration
1. Configuration Variables (CONFIG)
Edit the variables according to your environment at the top of the script:

js
Copy
Edit
const CONFIG = {
  TEMPLATE_DOC_ID: 'TEMPLATE-ID',     // Google Docs template ID
  STAKEHOLDER_EMAILS: ['youremail@company.com'], // List of emails to notify
  INCIDENT_PREFIX: 'INC',              // Prefix for incident IDs
  DOC_PREFIX: 'Incident Report - ',    // Prefix for document names
  LOG_SPREADSHEET_ID: 'SPREADSHEET-ID',// Google Sheets ID for logs
  REPLY_TO_EMAIL: 'soar-bot@company.com',
  SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/XXX', // Slack webhook
  SLACK_GROUP_LINK: 'https://join.slack.com/...',            // Slack group invite
  FROM_EMAIL: 'sender@company.com',   // Sender validated in Mailjet
  FROM_NAME: 'Security Incident Bot',
  USE_MAILJET: true
};
Important:

Register the MAILJET_API_KEY and MAILJET_API_SECRET in the script's properties (ScriptProperties).

Code Structure
main(): Manual simulation of an incident (testing).

doPost(e): HTTP POST webhook for automated ingestion.

processIncident(incident): Orchestrates the entire workflow (report, email, Slack, log).

createIncidentFromData(data): Structures input data into a standard incident.

createIncidentReport(incident): Generates a document from a template with incident data.

insertSummaryToDoc(docId, summary, incident): Inserts executive summary and details into the report.

sendIncidentNotification(...): Sends HTML email notifications to stakeholders.

sendSlackNotification(...): Sends the incident to the Slack channel.

logIncidentToSheet(...): Logs the incident in Google Sheets.

sendEmail(...), sendViaMailjet(...): Sends email via Mailjet or GmailApp.

getSeverityActionsArray(...): Recommends actions based on severity.

generateExecutiveSummary(...): Executive summary for report/email.

formatDateTime(...): Formats dates into readable strings.

logActivity(...): Basic logging.

Automation and Workflow
1. Incident Reception
Via Webhook (POST) or manual (main() function).

2. Processing
Structuring and validating the data.

Generating a unique ID for the incident.

3. Documentation
Copies a Google Docs from a template.

Inserts all data, executive summary, compliance checklist (GDPR, NIS2), investigation links, and follow-up tasks.

4. Notification
Sends HTML emails to stakeholders (Mailjet or GmailApp).

Alerts in Slack channel (webhook), adapting color/icon to severity.

Logs details in a spreadsheet (Google Sheets).

Notifications
Email:

HTML style, main details, direct links to investigation (VirusTotal, IPinfo, AbuseIPDB), and access to report and log.

Slack:

Message with icon and color based on severity, executive summary, and direct links.

Google Sheets:

Incident logged with link to the document report and timestamp.

Customization
Docs Template:
You can customize the Google Docs document (using placeholders like {{INCIDENT_ID}}).

HTML Emails:
Edit the style, branding, or add more buttons/links in sendIncidentNotification().

Severity Recommendations:
Modify the lists in getSeverityActionsArray() and the HTML advice in sendIncidentNotification().

Installation and Usage
Copy the script to your Google Apps Script or Google Workspace environment.

Configure the necessary IDs and properties.

Set up triggers if you want automatic ingestion (doPost).

Test the workflow by running main() or sending a POST webhook.

License
MIT.
You can use, modify, and adapt this workflow in your company or organization.

Useful Links
Google Apps Script Docs

Mailjet Docs

Slack Incoming Webhooks

Credits
Developed by @jose-litium
Enhanced with the help of ChatGPT.

