# Installation and Usage

This document provides step-by-step instructions to install, configure, and start using the **SOAR Incident Response Automation** project.

---

## Prerequisites

- A Google Workspace account with access to Google Drive, Docs, and Sheets.
- Access to [Google Apps Script](https://script.google.com/).
- A [Mailjet](https://www.mailjet.com/) account with a validated sender address.
- Slack workspace and permissions to create incoming webhooks.

---

## Installation Steps

### 1. Clone or Download the Repository

Clone this repository, or download the files directly from GitHub.

### 2. Set Up Google Apps Script

- Go to [Google Apps Script](https://script.google.com/).
- Create a new project.
- Replace the contents of the default script file with the code from `Soar Incident Responses.gs`.

### 3. Prepare Your Google Docs Template

- Review [Sample Google Docs Template (Recommended Structure).md](Sample%20Google%20Docs%20Template%20(Recommended%20Structure).md).
- Create a new Google Doc using this recommended structure.
- Share the Doc with the Apps Script service account if required.
- Copy the Document ID from the URL (e.g., `https://docs.google.com/document/d/<DOC_ID>/edit`).

### 4. Prepare Your Google Sheets Log

- Create a new Google Sheet for incident logging.
- Copy the Sheet ID from the URL.

### 5. Configure Script Properties for Mailjet

- In the Apps Script editor, go to **Project Settings > Script Properties**.
- Add the following:
  - `MAILJET_API_KEY`
  - `MAILJET_API_SECRET`

### 6. Update the Configuration

- Open `Soar Incident Responses.gs`.
- Update the `CONFIG` object with:
  - Your Google Docs template ID (`TEMPLATE_DOC_ID`)
  - Your stakeholder email(s) (`STAKEHOLDER_EMAILS`)
  - The incident log Sheet ID (`LOG_SPREADSHEET_ID`)
  - Your validated sender address for Mailjet (`FROM_EMAIL`)
  - Slack webhook URL (`SLACK_WEBHOOK_URL`)
  - Slack group link (`SLACK_GROUP_LINK`)
- See [Configuration.md](Configuration.md) for more details.

### 7. Deploy as a Web App (Optional)

- In the Apps Script editor, click **Deploy > New deployment**.
- Select **Web app**.
- Set "Who has access" to "Anyone" (or restrict as needed).
- Copy the deployment URL for use with webhooks or cURL.

---

## Usage

### Manual Trigger

- In the Apps Script editor, select the `main` function and click "Run" to simulate an incident (for testing purposes).

### Automated Trigger via Webhook

- Send a POST request to the Apps Script Web App endpoint using the format from [mock_incident-json.MD](mock_incident-json.MD).
- Example using cURL:
  ```sh
  curl -X POST -H "Content-Type: application/json" -d @mock_incident-json.MD "https://script.google.com/macros/s/your-deployment-id/exec"
