// Global configuration containing necessary values for incident processing
const CONFIG = {
  TEMPLATE_DOC_ID: 'TEMPLATE-ID', // Google Docs template ID
  STAKEHOLDER_EMAILS: ['youremail@company.com'], // List of emails to notify
  INCIDENT_PREFIX: 'INC', // Prefix for incident IDs
  DOC_PREFIX: 'Incident Report - ', // Prefix for document names
  LOG_SPREADSHEET_ID: 'SPREADSHEET-ID', // Google Sheets ID for logs
  REPLY_TO_EMAIL: 'soar-bot@company.com',
  SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/XXX', // Slack webhook
  SLACK_GROUP_LINK: 'https://join.slack.com/...', // Slack group invite
  FROM_EMAIL: 'sender@company.com', // Sender validated in Mailjet
  FROM_NAME: 'Security Incident Bot',
  USE_MAILJET: true
};

/**
 * Main function to simulate manual incident processing (testing only)
 */
function main() {
  const incident = {
    incident_id: generateIncidentId(),  // Generate a unique ID for the incident
    timestamp: new Date().toISOString(),  // Timestamp of the incident
    user: 'criminals@company.com',  // User involved in the incident
    login_ip: '101.206.168.120',  // IP address from where the login was made
    location: 'India',  // Location of the incident
    mfa_used: true,  // Whether multi-factor authentication (MFA) was used
    ioc_matched: true,  // Whether an indicator of compromise (IOC) was matched
    sensitive_data_accessed: true,  // Whether sensitive data was accessed
    severity: 'High',  // Severity level of the incident
    status: 'Open',  // Status of the incident
    timeline: [
      { time: new Date().toISOString(), event: 'Initial login detected' },  // Event of initial login detection
      { time: new Date().toISOString(), event: 'IOC match confirmed' }  // IOC match confirmed event
    ],
    actions_taken: [
      'User account temporarily suspended',  // Action taken: suspend user account temporarily
      'Endpoint isolation initiated'  // Action taken: initiate endpoint isolation
    ]
  };
    processIncident(incident);  // Process the incident
}

/**
 * Function for automated incident intake via HTTP POST (e.g., from curl or webhook)
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);  // Retrieve the data from the webhook
    const incident = createIncidentFromData(data);  // Create an incident from the received data
    processIncident(incident);  // Process the incident
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',  // Success response
      incident_id: incident.incident_id  // Return the ID of the processed incident
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    logActivity(`Webhook error: ${error.message}`, 'ERROR');  // Log the error
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',  // Error response
      message: error.message  // Error message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
/**
 * Envía un correo HTML.  
 * Usa Mailjet si está activado; si falla, recurre a GmailApp.
 */
function sendEmail(to, subject, html) {
  if (CONFIG.USE_MAILJET) {
    try {
      sendViaMailjet(to, subject, html);
      return;                               // salió bien → terminamos
    } catch (err) {
      logActivity('Mailjet falló: ' + err.message, 'WARN');
    }
  }
  // Fallback a GmailApp (sigue sujeto al cupo de 100/día)
  GmailApp.sendEmail(to, subject, '', {
    htmlBody: html,
    replyTo: CONFIG.REPLY_TO_EMAIL,
    name: CONFIG.FROM_NAME
  });
}

/** Llamada de bajo nivel a la API de Mailjet */
function sendViaMailjet(to, subject, html) {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('MAILJET_API_KEY');
  const apiSec = props.getProperty('MAILJET_API_SECRET');
  if (!apiKey || !apiSec) {
    throw new Error('Faltan MAILJET_API_KEY / MAILJET_API_SECRET');
  }

  const payload = {
    Messages: [{
      From:    { Email: CONFIG.FROM_EMAIL, Name: CONFIG.FROM_NAME },
      To:      [{ Email: to }],
      Subject: subject,
      HTMLPart: html
    }]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(apiKey + ':' + apiSec) },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  const resp = UrlFetchApp.fetch('https://api.mailjet.com/v3.1/send', options);
  if (resp.getResponseCode() >= 400) {
    throw new Error(resp.getContentText()); // hará que salte el fallback
  }
}

/**
 * Central function to process and handle a security incident
 */
function processIncident(incident) {
  const docId = createIncidentReport(incident);  // Create the incident report
  const summary = generateExecutiveSummary(incident);  // Generate an executive summary of the incident
  insertSummaryToDoc(docId, summary, incident);  // Insert the summary into the report
  sendIncidentNotification(incident, docId, summary);  // Send email notifications
  sendSlackNotification(incident, docId);  // Send a Slack notification
  logIncidentToSheet(incident, docId);  // Log the incident to the spreadsheet
  logActivity(`Processed incident ${incident.incident_id}`);  // Log the activity of processing
}

/**
 * Converts raw data into a structured incident object
 */
function createIncidentFromData(data) {
  return {
    incident_id: data.incident_id || generateIncidentId(),  // Incident ID
    timestamp: data.timestamp || new Date().toISOString(),  // Timestamp of the incident
    user: data.user || 'unknown@company.com',  // User involved
    login_ip: data.login_ip || '0.0.0.0',  // Login IP address
    location: data.location || 'Unknown',  // Location of the incident
    mfa_used: data.mfa_used || false,  // Whether MFA was used
    ioc_matched: data.ioc_matched || false,  // Whether IOC was matched
    sensitive_data_accessed: data.sensitive_data_accessed || false,  // Whether sensitive data was accessed
    severity: data.severity || 'Medium',  // Severity of the incident
    status: data.status || 'Open',  // Status of the incident
    timeline: data.timeline || [],  // Event timeline
    actions_taken: data.actions_taken || []  // Actions taken during the incident
  };
}

/**
 * Generates a unique incident ID based on the timestamp
 */
function generateIncidentId() {
  const d = new Date();
  return `${CONFIG.INCIDENT_PREFIX}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Helper function to add leading zeros to single-digit numbers
 */
function pad(n) {
  return n.toString().padStart(2, '0');
}

/**
 * Creates a new document from a template and replaces placeholders
 */
function createIncidentReport(incident) {
  const copy = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID).makeCopy(`${CONFIG.DOC_PREFIX}${incident.incident_id}`);  // Create a copy of the template document
  const docId = copy.getId();  // Get the ID of the new document
  const doc = DocumentApp.openById(docId);  // Open the document
  const body = doc.getBody();  // Get the body of the document

  // Replace placeholders in the template with actual values
  const map = {
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

  // Perform the replacement of placeholders with actual data
  Object.entries(map).forEach(([key, value]) => body.replaceText(key, value));
  doc.saveAndClose();  // Save and close the document
  return docId;  // Return the document ID
}

// Updated insertSummaryToDoc with clickable links and severity‑specific action lists
function insertSummaryToDoc(docId, summary, incident) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  body.clear();

  // Title
  body.insertParagraph(0, 'INCIDENT REPORT')
      .setHeading(DocumentApp.ParagraphHeading.TITLE)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  // Executive summary
  body.appendParagraph('Executive Summary').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(summary);

  // Incident details table
  body.appendParagraph('Incident Details').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const table = body.appendTable([
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
  for (let r = 0; r < table.getNumRows(); r++) {
    table.getRow(r).getCell(0).setBold(true);
  }

  // Timeline
  body.appendParagraph('Timeline').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (incident.timeline || []).forEach(e =>
    body.appendListItem(`${formatDateTime(e.time)}: ${e.event}`));

  // Actions taken
  body.appendParagraph('Actions Taken').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (incident.actions_taken || []).forEach(a => body.appendListItem(a));

  // Recommended actions based on severity
  const actions = getSeverityActionsArray(incident.severity);
  body.appendParagraph('Recommended SecOps Actions (EU)')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(actions.title)
      .setHeading(DocumentApp.ParagraphHeading.HEADING3);
  actions.items.forEach(i => body.appendListItem(i));

  // Investigation links (clickable)
  body.appendParagraph('Investigation Links').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  const links = [
    ['VirusTotal', `https://www.virustotal.com/gui/ip-address/${incident.login_ip}`],
    ['IP Info', `https://ipinfo.io/${incident.login_ip}`],
    ['AbuseIPDB', `https://www.abuseipdb.com/check/${incident.login_ip}`]
  ];
  links.forEach(([label, url]) => {
    const li = body.appendListItem(label);
    li.setLinkUrl(url);
  });

  // EU compliance checklist
  body.appendParagraph('EU Compliance Checklist').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendTable([
    ['Requirement', 'Completed (Y/N)', 'Notes'],
    ['GDPR Art. 33 – Supervisory‑authority notification within 72h', '', ''],
    ['GDPR Art. 34 – Data‑subject notification (if high risk)', '', ''],
    ['NIS2 – National CSIRT notification (if applicable)', '', ''],
    ['Records updated in Register of Processing Activities (RoPA)', '', ''],
    ['DPO sign‑off obtained', '', '']
  ]);

  // Follow‑up tasks
  body.appendParagraph('Follow‑Up Tasks & Deadlines').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendListItem('DD‑MMM‑YYYY – Complete endpoint forensic report');
  body.appendListItem('DD‑MMM‑YYYY – Review IAM policies for affected user');
  body.appendListItem('DD‑MMM‑YYYY – Conduct post‑incident lessons‑learned session');
  body.appendListItem('DD‑MMM‑YYYY – Close incident after post‑mortem');

  doc.saveAndClose();
}

/**
 * Returns the heading title and bullet list of recommended actions
 * matching the severity level.
 * @param {string} sev Incident severity
 * @return {{title:string, items:string[]}}
 */
function getSeverityActionsArray(sev) {
  switch (sev.toLowerCase()) {
    case 'high':
    case 'hight': // accommodate common typo
    case 'critical':
      return {
        title: 'High Severity (Critical)',
        items: [
          'Immediately block the offending IP address at all ingress points.',
          'Disable or suspend the user account/device involved.',
          'Launch a full forensic acquisition of endpoint(s) and cloud logs.',
          'Assess the likelihood of personal-data exfiltration under GDPR Art. 34.',
          'Notify the organisation’s Data Protection Officer (DPO).',
          'If personal data are at risk, prepare a 72‑hour breach notification draft for the competent EU supervisory authority (GDPR Art. 33) and affected data subjects.',
          'Escalate to law‑enforcement or CERT‑EU if criminal activity is suspected.'
        ]
      };
    case 'medium':
      return {
        title: 'Medium Severity',
        items: [
          'Perform a targeted log review (identity, network, SaaS).',
          'Correlate IOC hits with threat‑intel feeds; decide if containment is required.',
          'Engage the Incident Response (IR) team for a scoping call.',
          'If any personal data may be involved, alert the DPO for GDPR impact assessment.',
          'Document all findings in the incident tracker.'
        ]
      };
    default:
      return {
        title: 'Low Severity',
        items: [
          'Validate for false positives; tune detection rules if needed.',
          'Keep the user/session under heightened monitoring for 14 days.',
          'Record outcome and close or re‑classify if risk increases.'
        ]
      };
  }
}

/**
 * Generates an executive summary for emails or reports
 */
function generateExecutiveSummary(incident) {
  return `A security alert was triggered for user ${incident.user} from ${incident.location}. ` +
    `MFA was ${incident.mfa_used ? 'used' : 'not used'}, and the IP (${incident.login_ip}) ` +
    `${incident.ioc_matched ? 'matched a known IOC' : 'did not match known IOCs'}. ` +
    `Sensitive data was ${incident.sensitive_data_accessed ? '' : 'not '}accessed. ` +
    `Severity level is ${incident.severity}.`;  // Return the executive summary string
}

/**
 * Logs incident details to a Google Sheets spreadsheet
 */
function logIncidentToSheet(incident, docId) {
  const sheet = SpreadsheetApp.openById(CONFIG.LOG_SPREADSHEET_ID).getSheets()[0];  // Open the spreadsheet
  sheet.appendRow([
    incident.incident_id,
    incident.timestamp,
    incident.user,
    incident.login_ip,
    incident.location,
    incident.mfa_used ? 'Yes' : 'No',
    incident.ioc_matched ? 'Yes' : 'No',
    incident.sensitive_data_accessed ? 'Yes' : 'No',
    incident.severity,
    incident.status,
    `https://docs.google.com/document/d/${docId}/edit`,  // Link to the generated report
    new Date().toISOString()  // Timestamp of the log
  ]);
}

/**
 * Sends a notification to a configured Slack channel
 */
function sendSlackNotification(incident, docId) {
  // Define the colors for different severity levels
  const severityColors = {
    high: '#f8d7da',   // Red background for High severity
    medium: '#fff3cd', // Yellow background for Medium severity
    low: '#d1ecf1'     // Blue background for Low severity
  };

  // Define the icons for each severity level
  const severityIcons = {
    high: ':fire:',
    medium: ':warning:',
    low: ':information_source:'
  };

  // Set the background color based on the severity
  const severity = incident.severity.toLowerCase();
  const backgroundColor = severityColors[severity] || '#d1ecf1';  // Default to blue if severity is not recognized
  const icon = severityIcons[severity] || ':information_source:';  // Default to info icon

  const payload = {
    text: `${icon} *${incident.severity}* Security Incident Detected`,
    attachments: [
      {
        color: backgroundColor, // Set the color for the message
        text: `*Incident ID:* ${incident.incident_id}\n` +
              `*User:* ${incident.user}\n` +
              `*Location:* ${incident.location}\n` +
              `*Login IP:* ${incident.login_ip}\n` +
              `<https://docs.google.com/document/d/${docId}/edit|View Incident Report>\n\n` +
              `For detailed logs, join our Slack group: <${CONFIG.SLACK_GROUP_LINK}|Slack Group>`
      }
    ]
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)  // Send the payload as JSON to the Slack webhook
  };

  UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);  // Call the Slack webhook
}
/**
 * Sends the email notification to stakeholders with incident details
 */
function sendIncidentNotification(incident, docId, summary) {
  const logUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.LOG_SPREADSHEET_ID}/edit`;
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  const sev = incident.severity.toLowerCase();

  // Severity-based styles
  const severityStyles = {
    high: 'background:#f8d7da;color:#721c24;border-left:5px solid #d32f2f;',
    medium: 'background:#fff3cd;color:#856404;border-left:5px solid #ff9800;',
    low: 'background:#d1ecf1;color:#0c5460;border-left:5px solid #2196f3;'
  };

  // Security operations advice based on severity
  const secOpsAdvice = {
    high: `<ul><li>Immediately isolate the account or device.</li><li>Launch full investigation.</li><li>Notify compliance if data was accessed.</li></ul>`,
    medium: `<ul><li>Review logs and context.</li><li>Determine need for escalation.</li><li>Document findings.</li></ul>`,
    low: `<ul><li>Validate for false positives.</li><li>Continue monitoring.</li></ul>`
  };

  // HTML body for the email notification (con dos botones grandes)
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 24px;">
      <h2 style="color: #d32f2f; border-bottom: 1px solid #eee;">Security Incident Notification</h2>
      <div style="${severityStyles[sev]}; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
        <h3>Incident ID: ${incident.incident_id}</h3>
        <p><strong>Severity:</strong> ${incident.severity}</p>
        <p><strong>Status:</strong> ${incident.status}</p>
      </div>
      <h3>Executive Summary</h3>
      <p>${summary}</p>
      <h3>Key Details</h3>
      <table style="width:100%; border-collapse: collapse;">
        <tr style="background:#e0e0e0;"><th style="padding:8px;">Field</th><th style="padding:8px;">Value</th></tr>
        <tr><td style="padding:8px;">User</td><td style="padding:8px;">${incident.user}</td></tr>
        <tr><td style="padding:8px;">Login IP</td><td style="padding:8px;">${incident.login_ip}</td></tr>
        <tr><td style="padding:8px;">Location</td><td style="padding:8px;">${incident.location}</td></tr>
        <tr><td style="padding:8px;">MFA Used</td><td style="padding:8px;">${incident.mfa_used ? 'Yes' : 'No'}</td></tr>
      </table>
      <h3>Recommended Actions for SecOps</h3>
      <div style="background: #f4f6f7; padding: 15px; border-left: 4px solid #999; border-radius: 4px; margin-bottom: 20px;">
        ${secOpsAdvice[sev]}
      </div>
      <h3>Investigate IP Address</h3>
      <div style="text-align:center; margin: 15px 0;">
        <a href="https://www.virustotal.com/gui/ip-address/${incident.login_ip}" style="background:#1a73e8;color:#fff;padding:10px 15px;margin-right:10px;border-radius:4px;text-decoration:none;" target="_blank">VirusTotal</a>
        <a href="https://ipinfo.io/${incident.login_ip}" style="background:#34a853;color:#fff;padding:10px 15px;margin-right:10px;border-radius:4px;text-decoration:none;" target="_blank">IP Lookup</a>
        <a href="https://www.abuseipdb.com/check/${incident.login_ip}" style="background:#fbbc05;color:#000;padding:10px 15px;border-radius:4px;text-decoration:none;" target="_blank">Check IOC DB</a>
      </div>
      <div style="text-align:center;margin-top:30px;">
        <a href="${docUrl}" 
           style="display:inline-block;background:#5e35b1;color:#fff;padding:14px 28px;margin:8px 4px 0 4px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.08);" 
           target="_blank">
          📄 View Full Incident Report
        </a>
        <a href="${logUrl}" 
           style="display:inline-block;background:#388e3c;color:#fff;padding:14px 28px;margin:8px 4px 0 4px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.08);" 
           target="_blank">
          📝 View Incident Log Spreadsheet
        </a>
      </div>
      <p style="margin-top: 36px; text-align: center; font-size: 0.93em; color: #777;">
        This is an automated alert. Do not reply.
      </p>
    </div>`;

  // Send the email notification to all stakeholders
  CONFIG.STAKEHOLDER_EMAILS.forEach(email =>
    sendEmail(
      email,
      `Incident Alert: ${incident.incident_id} (${incident.severity})`,
      htmlBody
    )
  );
}


/**
 * Utility to format ISO string into a readable time
 */
function formatDateTime(iso) {
  return new Date(iso).toLocaleString();  // Converts ISO string to a readable time
}

/**
 * Logs activity to Stackdriver and optionally to a sheet
 */
function logActivity(msg, level = 'INFO') {
  const timestamp = new Date().toISOString();
  Logger.log(`[${timestamp}] [${level}] ${msg}`);  // Log the message with the log level
}
