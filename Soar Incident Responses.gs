/**
 * Incident Response Automation System
 * Version 2.0
 * 
 * This system automates the creation, documentation, and notification of security incidents.
 * It supports both manual execution via the main() function and automated processing via webhooks.
 * 
 * Key Features:
 * - Creates detailed incident reports from templates
 * - Generates executive summaries
 * - Sends notifications to stakeholders
 * - Maintains activity logs
 * - Supports both manual and automated incident creation
 */

const CONFIG = {
  TEMPLATE_DOC_ID: '1T9EaaTVb3kQKV2BCq3-LSu5ARk4SNPQKg9glCz17f18',
  STAKEHOLDER_EMAILS: ['merlindo2002@gmail.com'],
  INCIDENT_PREFIX: 'INC',
  DOC_PREFIX: 'Incident Report - ',
  LOG_SPREADSHEET_ID: '', // Optional for logging
  REPLY_TO_EMAIL: 'soar-bot@company.com'
};

/**
 * Main function for manual execution
 * @returns {string} Processing status message
 * 
 * This is the entry point for manual execution. It creates a sample incident,
 * processes it through the full workflow, and returns a status message.
 * Used for testing and manual incident creation.
 */
function main() {
  const incident = {
    incident_id: generateIncidentId(),
    timestamp: new Date().toISOString(),
    user: 'john.error404@Yougothack.com',
    login_ip: '196.251.72.142',
    location: 'Ghana',
    mfa_used: true,
    ioc_matched: true,
    sensitive_data_accessed: true,
    severity: 'High',
    status: 'Open',
    timeline: [
      {time: new Date().toISOString(), event: 'Initial login detected'},
      {time: new Date().toISOString(), event: 'IOC match confirmed'}
    ],
    actions_taken: [
      'User account temporarily suspended',
      'Endpoint isolation initiated'
    ]
  };

  try {
    const docId = createIncidentReport(incident);
    const summary = generateExecutiveSummary(incident);
    insertSummaryToDoc(docId, summary, incident);
    sendIncidentNotification(incident, docId, summary);
    logActivity(`Incident ${incident.incident_id} processed successfully`);
    return `Incident ${incident.incident_id} processed. Document ID: ${docId}`;
  } catch (error) {
    logActivity(`Error processing incident: ${error.message}`, 'ERROR');
    throw error;
  }
}

/**
 * Webhook endpoint for automated incident processing
 * @param {Object} e The event object from the POST request
 * @returns {TextOutput} JSON response with processing results
 * 
 * This function handles incoming webhook requests, processes the incident data,
 * and returns a JSON response. It's the entry point for automated integrations.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    const incident = createIncidentFromData(data);
    const docId = createIncidentReport(incident);
    const summary = generateExecutiveSummary(incident);
    insertSummaryToDoc(docId, summary, incident);
    sendIncidentNotification(incident, docId, summary);

    logActivity(`Webhook: Incident ${incident.incident_id} processed`);

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      incident_id: incident.incident_id,
      doc_url: `https://docs.google.com/document/d/${docId}/edit`,
      summary: summary
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logActivity(`Webhook error: ${error.message}`, 'ERROR');
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ====================
// HELPER FUNCTIONS
// ====================

/**
 * Creates an incident object from input data
 * @param {Object} data Raw incident data
 * @returns {Object} Standardized incident object
 * 
 * This function normalizes incoming data into a standardized incident structure,
 * filling in default values for any missing fields.
 */
function createIncidentFromData(data) {
  return {
    incident_id: data.incident_id || generateIncidentId(),
    timestamp: data.timestamp || new Date().toISOString(),
    user: data.user || 'unknown@company.com',
    login_ip: data.login_ip || '0.0.0.0',
    location: data.location || 'Unknown',
    mfa_used: data.mfa_used || false,
    ioc_matched: data.ioc_matched || false,
    sensitive_data_accessed: data.sensitive_data_accessed || false,
    severity: data.severity || 'Medium',
    status: data.status || 'Open',
    timeline: data.timeline || [],
    actions_taken: data.actions_taken || []
  };
}

/**
 * Generates a unique incident ID
 * @returns {string} Formatted incident ID (e.g., INC-20230515-093045)
 * 
 * Creates a timestamp-based unique identifier for incidents using the format:
 * PREFIX-YYYYMMDD-HHMMSS
 */
function generateIncidentId() {
  const date = new Date();
  return `${CONFIG.INCIDENT_PREFIX}-${date.getFullYear()}${pad(date.getMonth()+1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
}

/**
 * Pads numbers with leading zeros
 * @param {number} num Number to pad
 * @returns {string} Zero-padded string (2 digits)
 * 
 * Utility function for formatting date/time components in IDs.
 */
function pad(num) {
  return num.toString().padStart(2, '0');
}

/**
 * Creates an incident report document from a template
 * @param {Object} incident Incident data
 * @returns {string} ID of the created Google Doc
 * @throws {Error} If document creation fails
 * 
 * This function:
 * 1. Copies a template document
 * 2. Replaces placeholder text with incident data
 * 3. Saves and returns the new document ID
 */
function createIncidentReport(incident) {
  try {
    const templateFile = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID);
    const newFileName = `${CONFIG.DOC_PREFIX}${incident.incident_id}`;
    const newFile = templateFile.makeCopy(newFileName);
    const docId = newFile.getId();
    const document = DocumentApp.openById(docId);
    const body = document.getBody();

    // Replace template placeholders
    const replacements = {
      '{{INCIDENT_ID}}': incident.incident_id,
      '{{TIMESTAMP}}': incident.timestamp,
      '{{USER}}': incident.user,
      '{{LOGIN_IP}}': incident.login_ip,
      '{{LOCATION}}': incident.location,
      '{{MFA_USED}}': incident.mfa_used ? 'Yes' : 'No',
      '{{IOC_MATCHED}}': incident.ioc_matched ? 'Yes' : 'No',
      '{{SENSITIVE_DATA}}': incident.sensitive_data_accessed ? 'Yes' : 'No',
      '{{SEVERITY}}': incident.severity,
      '{{STATUS}}': incident.status
    };

    Object.entries(replacements).forEach(([key, value]) => {
      body.replaceText(key, value);
    });

    document.saveAndClose();
    logActivity(`Created incident report: ${docId}`);
    return docId;
  } catch (error) {
    logActivity(`Error creating report: ${error.message}`, 'ERROR');
    throw new Error(`Failed to create incident report: ${error.message}`);
  }
}

/**
 * Generates an executive summary from incident data
 * @param {Object} incident Incident data
 * @returns {string} Formatted summary paragraph
 * 
 * Creates a human-readable summary of the incident suitable for leadership communication.
 */
function generateExecutiveSummary(incident) {
  return `A security alert was triggered for user ${incident.user} due to a login from ${incident.location}. ` +
    `Although MFA was ${incident.mfa_used ? 'used' : 'not used'}, the login IP (${incident.login_ip}) ` +
    `${incident.ioc_matched ? 'matched a known IOC' : 'did not match known IOCs'}. ` +
    `The user was ${incident.sensitive_data_accessed ? 'accessing' : 'not accessing'} sensitive data. ` +
    `Incident severity is ${incident.severity}. A formal incident response has been initiated.`;
}

/**
 * Inserts detailed incident information into a document
 * @param {string} docId Google Doc ID
 * @param {string} summary Executive summary text
 * @param {Object} incident Incident data
 * @throws {Error} If document update fails
 * 
 * This function completely formats the incident document with:
 * - Title and summary
 * - Detailed incident information in a table
 * - Timeline of events
 * - Actions taken
 */
function insertSummaryToDoc(docId, summary, incident) {
  try {
    const document = DocumentApp.openById(docId);
    const body = document.getBody();

    // Clear any existing placeholder text
    body.clear();

    // Insert formatted content
    body.insertParagraph(0, 'INCIDENT REPORT')
      .setHeading(DocumentApp.ParagraphHeading.TITLE)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

    body.insertParagraph(1, 'Executive Summary')
      .setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.insertParagraph(2, summary);

    // Incident Details
    body.insertParagraph(3, 'Incident Details')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    const detailsTable = body.appendTable([
      ['Incident ID:', incident.incident_id],
      ['Timestamp:', incident.timestamp],
      ['User:', incident.user],
      ['Login IP:', incident.login_ip],
      ['Location:', incident.location],
      ['MFA Used:', incident.mfa_used ? 'Yes' : 'No'],
      ['IOC Matched:', incident.ioc_matched ? 'Yes' : 'No'],
      ['Sensitive Data:', incident.sensitive_data_accessed ? 'Yes' : 'No'],
      ['Severity:', incident.severity],
      ['Status:', incident.status]
    ]);
    
    // Format table
    const style = {};
    style[DocumentApp.Attribute.BOLD] = true;
    style[DocumentApp.Attribute.FOREGROUND_COLOR] = '#3366CC';
    
    for (let row = 0; row < detailsTable.getNumRows(); row++) {
      detailsTable.getRow(row).getCell(0).setAttributes(style);
    }

    // Timeline
    body.appendParagraph('Timeline')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    if (incident.timeline && incident.timeline.length > 0) {
      incident.timeline.forEach(event => {
        body.appendListItem(`${formatDateTime(event.time)}: ${event.event}`);
      });
    } else {
      body.appendParagraph('No timeline events recorded yet.');
    }

    // Actions Taken
    body.appendParagraph('Actions Taken')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
    
    if (incident.actions_taken && incident.actions_taken.length > 0) {
      incident.actions_taken.forEach(action => {
        body.appendListItem(action);
      });
    } else {
      body.appendParagraph('No actions recorded yet.');
    }

    document.saveAndClose();
    logActivity(`Updated document ${docId} with incident details`);
  } catch (error) {
    logActivity(`Error updating document: ${error.message}`, 'ERROR');
    throw new Error(`Failed to update incident document: ${error.message}`);
  }
}

/**
 * Sends email notifications to stakeholders
 * @param {Object} incident Incident data
 * @param {string} docId Google Doc ID
 * @param {string} summary Executive summary
 * @throws {Error} If email sending fails
 * 
 * Sends formatted HTML emails to all configured stakeholders with:
 * - Incident overview
 * - Key details table
 * - Link to full report
 */
function sendIncidentNotification(incident, docId, summary) {
  try {
    const url = `https://docs.google.com/document/d/${docId}/edit`;
    const subject = `${CONFIG.INCIDENT_PREFIX} Notification: ${incident.incident_id} (${incident.severity})`;
    
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d32f2f;">Security Incident Notification</h2>
        
        <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
          <h3 style="margin-top: 0;">${incident.incident_id}</h3>
          <p><strong>Severity:</strong> <span style="color: ${getSeverityColor(incident.severity)}">${incident.severity}</span></p>
          <p><strong>Status:</strong> ${incident.status}</p>
        </div>
        
        <h3>Executive Summary</h3>
        <p>${summary}</p>
        
        <h3>Key Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #e0e0e0;">
            <th style="text-align: left; padding: 8px;">Field</th>
            <th style="text-align: left; padding: 8px;">Value</th>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>User</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${incident.user}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Login IP</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${incident.login_ip}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Location</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${incident.location}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>MFA Used</strong></td>
            <td style="padding: 8px; border-bottom: 1px solid #ddd;">${incident.mfa_used ? 'Yes' : 'No'}</td>
          </tr>
        </table>
        
        <div style="margin-top: 20px; text-align: center;">
          <a href="${url}" style="background: #4285f4; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">
            View Full Incident Report
          </a>
        </div>
        
        <p style="margin-top: 30px; font-size: 0.9em; color: #666;">
          This is an automated notification. Please do not reply directly to this email.
        </p>
      </div>
    `;

    CONFIG.STAKEHOLDER_EMAILS.forEach(email => {
      GmailApp.sendEmail(email, subject, '', {
        htmlBody: htmlBody,
        replyTo: CONFIG.REPLY_TO_EMAIL,
        name: 'Security Incident Bot'
      });
      logActivity(`Sent notification to ${email}`);
    });
  } catch (error) {
    logActivity(`Error sending notification: ${error.message}`, 'ERROR');
    throw new Error(`Failed to send notifications: ${error.message}`);
  }
}

/**
 * Gets color code for severity level
 * @param {string} severity Severity level (Critical/High/Medium/Low)
 * @returns {string} Hex color code
 * 
 * Used for visual indicators in notifications and reports.
 */
function getSeverityColor(severity) {
  const colors = {
    'Critical': '#d32f2f',
    'High': '#ff5722',
    'Medium': '#ff9800',
    'Low': '#4caf50'
  };
  return colors[severity] || '#607d8b';
}

/**
 * Formats ISO date string to local format
 * @param {string} isoString ISO date string
 * @returns {string} Formatted local date/time string
 * 
 * Utility function for displaying dates in a human-readable format.
 */
function formatDateTime(isoString) {
  const date = new Date(isoString);
  return date.toLocaleString();
}

/**
 * Logs system activity
 * @param {string} message Log message
 * @param {string} level Log level (INFO/ERROR)
 * 
 * Writes log entries to both the Logger and optionally to a spreadsheet.
 * Helps with debugging and auditing system activity.
 */
function logActivity(message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] [${level}] ${message}`;
  
  Logger.log(logEntry);
  
  if (CONFIG.LOG_SPREADSHEET_ID) {
    try {
      const sheet = SpreadsheetApp.openById(CONFIG.LOG_SPREADSHEET_ID)
        .getSheets()[0];
      sheet.appendRow([timestamp, level, message]);
    } catch (e) {
      Logger.log('Failed to write to log spreadsheet: ' + e.message);
    }
  }
}
