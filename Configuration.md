## Configuration

1. **Mailjet API Keys**  
   - In Google Apps Script, go to *Project Settings > Script Properties* and add:
     - `MAILJET_API_KEY`
     - `MAILJET_API_SECRET`

2. **Edit the `CONFIG` object** in `Soar Incident Responses.gs`:
   - Set your template doc ID (`TEMPLATE_DOC_ID`)
   - Add your stakeholder emails (`STAKEHOLDER_EMAILS`)
   - Set your Mailjet-validated sender email (`FROM_EMAIL`)
   - Paste your Slack webhook and group link

3. **Google Sheets Logging**
   - Create a spreadsheet, copy its ID, and set as `LOG_SPREADSHEET_ID`
