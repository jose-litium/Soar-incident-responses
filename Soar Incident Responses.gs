// === Global configuration for the SOAR workflow ===
const CONFIG = {
  TEMPLATE_DOC_ID: 'TEMPLATE-ID',                 // Google Docs template ID for incident report generation
  STAKEHOLDER_EMAILS: ['youremail@company.com'],  // List of stakeholders to receive notifications
  INCIDENT_PREFIX: 'INC',                         // Prefix for generated incident IDs
  DOC_PREFIX: 'Incident Report - ',               // Prefix for incident report document names
  LOG_SPREADSHEET_ID: 'SPREADSHEET-ID',           // Google Sheets ID for incident logging
  REPLY_TO_EMAIL: 'soar-bot@company.com',         // Reply-to address for email notifications
  SLACK_WEBHOOK_URL: 'https://hooks.slack.com/services/XXX',  // Slack webhook for notifications
  SLACK_GROUP_LINK: 'https://join.slack.com/...', // (Optional) Slack group invite for users
  FROM_EMAIL: 'sender@company.com',               // The validated sender email in Mailjet
  FROM_NAME: 'Security Incident Bot',             // Display name for sent emails
  USE_MAILJET: true                               // Set false to fallback to GmailApp instead of Mailjet
};

/**
 * MAIN (manual test): Simulate an incident end-to-end.
 * Use this to test all integrations without a real webhook.
 */
function main() {
  const incident = {
    incident_id: generateIncidentId(),                 // Generate a unique incident ID
    timestamp: new Date().toISOString(),               // When incident was detected/created
    user: 'criminals@company.com',                     // User or account involved
    login_ip: '101.206.168.120',                       // Source IP address of suspicious activity
    location: 'India',                                 // Where the incident originated (geoip, etc.)
    mfa_used: true,                                    // Whether MFA was used in the session
    ioc_matched: true,                                 // Did the activity match an IOC (Indicator of Compromise)?
    sensitive_data_accessed: true,                     // Was sensitive data accessed?
    severity: 'High',                                  // Severity (e.g. High, Medium, Low)
    status: 'Open',                                    // Current status (Open, Closed, etc.)
    timeline: [                                        // Chronological events for incident timeline
      { time: new Date().toISOString(), event: 'Initial login detected' },
      { time: new Date().toISOString(), event: 'IOC match confirmed' }
    ],
    actions_taken: [
      'User account temporarily suspended',            // Action #1
      'Endpoint isolation initiated'                   // Action #2
    ]
  };
  processIncident(incident); // Process the simulated incident
}

/**
 * HTTP POST handler (for webhook integration).
 * Triggered by external POST (e.g. cURL, SIEM, Chronicle, etc.).
 * Expects JSON in body; returns status message.
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);      // Parse incoming JSON data from POST
    const incident = createIncidentFromData(data);     // Map raw data to internal incident object
    processIncident(incident);                         // Main workflow
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      incident_id: incident.incident_id
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    // Error-handling: log & return error message
    logActivity(`Webhook error: ${error.message}`, 'ERROR');
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Send an HTML email (uses Mailjet by default, fallback to GmailApp if Mailjet fails).
 */
function sendEmail(to, subject, html) {
  if (CONFIG.USE_MAILJET) {
    try {
      sendViaMailjet(to, subject, html);
      return; // success!
    } catch (err) {
      logActivity('Mailjet failed: ' + err.message, 'WARN');
    }
  }
  // Fallback: GmailApp (subject to Google daily quota)
  GmailApp.sendEmail(to, subject, '', {
    htmlBody: html,
    replyTo: CONFIG.REPLY_TO_EMAIL,
    name: CONFIG.FROM_NAME
  });
}

/**
 * Low-level Mailjet API call.
 * Requires Mailjet API keys set in Apps Script project properties.
 */
function sendViaMailjet(to, subject, html) {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('MAILJET_API_KEY');
  const apiSec = props.getProperty('MAILJET_API_SECRET');
  if (!apiKey || !apiSec) {
    throw new Error('Missing MAILJET_API_KEY / MAILJET_API_SECRET');
  }

  // Format the API payload for Mailjet
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
    throw new Error(resp.getContentText()); // Triggers fallback if Mailjet call fails
  }
}

/**
 * Main workflow: document, email, Slack, logging.
 * Orchestrates all incident actions end-to-end.
 */
function processIncident(incident) {
  const docId = createIncidentReport(incident);              // 1. Create the report doc from template
  const summary = generateExecutiveSummary(incident);        // 2. Make a short summary (used in email/slack)
  insertSummaryToDoc(docId, summary, incident);              // 3. Fill in the report with all details
  sendIncidentNotification(incident, docId, summary);        // 4. Send HTML email(s)
  sendSlackNotification(incident, docId);                    // 5. Slack webhook notification
  logIncidentToSheet(incident, docId);                       // 6. Record in Google Sheet log
  logActivity(`Processed incident ${incident.incident_id}`); // 7. Local log (Stackdriver)
}

/**
 * Normalize and validate external data into a standard incident object.
 */
function createIncidentFromData(data) {
  return {
    incident_id: data.incident_id || generateIncidentId(),        // Use given or generate unique ID
    timestamp: data.timestamp || new Date().toISOString(),        // Use provided or now
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
 * Generate a unique incident ID using date/time.
 * Format: INC-YYYYMMDD-HHMMSS
 */
function generateIncidentId() {
  const d = new Date();
  return `${CONFIG.INCIDENT_PREFIX}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

/**
 * Pad single-digit numbers with a leading zero (for timestamps, IDs).
 */
function pad(n) {
  return n.toString().padStart(2, '0');
}

/**
 * Copies the Google Docs template and fills in placeholders with incident data.
 * Returns the ID of the new document.
 */
function createIncidentReport(incident) {
  // Copy the template and name it using the incident ID
  const copy = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID)
    .makeCopy(`${CONFIG.DOC_PREFIX}${incident.incident_id}`);
  const docId = copy.getId();
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();

  // Replace placeholders (must match the template placeholders)
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

  Object.entries(map).forEach(([key, value]) => body.replaceText(key, value));
  doc.saveAndClose();
  return docId;
}

/**
 * Fully overwrite the doc with all sections: title, summary, table, timeline, actions, links, compliance, etc.
 * Includes links and custom actions by severity.
 */
function insertSummaryToDoc(docId, summary, incident) {
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  body.clear();

  // Report title (centered)
  body.insertParagraph(0, 'INCIDENT REPORT')
      .setHeading(DocumentApp.ParagraphHeading.TITLE)
      .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  // Executive summary section
  body.appendParagraph('Executive Summary').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(summary);

  // Incident details as a table
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
    table.getRow(r).getCell(0).setBold(true); // Bold the labels
  }

  // Timeline as a bulleted list
  body.appendParagraph('Timeline').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (incident.timeline || []).forEach(e =>
    body.appendListItem(`${formatDateTime(e.time)}: ${e.event}`));

  // Actions taken
  body.appendParagraph('Actions Taken').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (incident.actions_taken || []).forEach(a => body.appendListItem(a));

  // Severity-based recommended actions
  const actions = getSeverityActionsArray(incident.severity);
  body.appendParagraph('Recommended SecOps Actions (EU)')
      .setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(actions.title)
      .setHeading(DocumentApp.ParagraphHeading.HEADING3);
  actions.items.forEach(i => body.appendListItem(i));

  // Quick links for investigation
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

  // Compliance checklist (EU, GDPR, etc.)
  body.appendParagraph('EU Compliance Checklist').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendTable([
    ['Requirement', 'Completed (Y/N)', 'Notes'],
    ['GDPR Art. 33 – Supervisory‑authority notification within 72h', '', ''],
    ['GDPR Art. 34 – Data‑subject notification (if high risk)', '', ''],
    ['NIS2 – National CSIRT notification (if applicable)', '', ''],
    ['Records updated in Register of Processing Activities (RoPA)', '', ''],
    ['DPO sign‑off obtained', '', '']
  ]);

  // Follow-up actions
  body.appendParagraph('Follow‑Up Tasks & Deadlines').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendListItem('DD‑MMM‑YYYY – Complete endpoint forensic report');
  body.appendListItem('DD‑MMM‑YYYY – Review IAM policies for affected user');
  body.appendListItem('DD‑MMM‑YYYY – Conduct post‑incident lessons‑learned session');
  body.appendListItem('DD‑MMM‑YYYY – Close incident after post‑mortem');

  doc.saveAndClose();
}

/**
 * Returns the title and recommended actions based on severity level.
 * Used for both doc and email.
 */
function getSeverityActionsArray(sev) {
  switch (sev.toLowerCase()) {
    case 'high':
    case 'hight': // handle typo
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
 * Generates an executive summary (for email and doc).
 * Provides quick human-readable context.
 */
function generateExecutiveSummary(incident) {
  return `A security alert was triggered for user ${incident.user} from ${incident.location}. ` +
    `MFA was ${incident.mfa_used ? 'used' : 'not used'}, and the IP (${incident.login_ip}) ` +
    `${incident.ioc_matched ? 'matched a known IOC' : 'did not match known IOCs'}. ` +
    `Sensitive data was ${incident.sensitive_data_accessed ? '' : 'not '}accessed. ` +
    `Severity level is ${incident.severity}.`;
}

/**
 * Log incident details as a row in Google Sheets for easy audit & filtering.
 */
function logIncidentToSheet(incident, docId) {
  const sheet = SpreadsheetApp.openById(CONFIG.LOG_SPREADSHEET_ID).getSheets()[0];
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
    `https://docs.google.com/document/d/${docId}/edit`,
    new Date().toISOString()
  ]);
}

/**
 * Send notification to Slack channel via webhook.
 * Uses different colors and icons based on severity.
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

  // Set the background color and icon based on the severity
  const severity = incident.severity.toLowerCase();
  const backgroundColor = severityColors[severity] || '#d1ecf1';  // Default to blue
  const icon = severityIcons[severity] || ':information_source:'; // Default to info

  const payload = {
    text: `${icon} *${incident.severity}* Security Incident Detected`,
    attachments: [
      {
        color: backgroundColor,
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
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options); // Send to Slack
}

/**
 * Send incident notification to all stakeholders as an HTML email.
 * Includes summary, details, recommended actions, and investigation links.
 */
function sendIncidentNotification(incident, docId, summary) {
  const logUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.LOG_SPREADSHEET_ID}/edit`;
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
  const sev = incident.severity.toLowerCase();

  // Styles for severity levels (background and border)
  const severityStyles = {
    high: 'background:#f8d7da;color:#721c24;border-left:5px solid #d32f2f;',
    medium: 'background:#fff3cd;color:#856404;border-left:5px solid #ff9800;',
    low: 'background:#d1ecf1;color:#0c5460;border-left:5px solid #2196f3;'
  };

  // SecOps advice for each severity
  const secOpsAdvice = {
    high: `<ul><li>Immediately isolate the account or device.</li><li>Launch full investigation.</li><li>Notify compliance if data was accessed.</li></ul>`,
    medium: `<ul><li>Review logs and context.</li><li>Determine need for escalation.</li><li>Document findings.</li></ul>`,
    low: `<ul><li>Validate for false positives.</li><li>Continue monitoring.</li></ul>`
  };

  // Main HTML email body (customize as needed)
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

  CONFIG.STAKEHOLDER_EMAILS.forEach(email =>
    sendEmail(
      email,
      `Incident Alert: ${incident.incident_id} (${incident.severity})`,
      htmlBody
    )
  );
}

/**
 * Format ISO8601 date string to a user-friendly format.
 */
function formatDateTime(iso) {
  return new Date(iso).toLocaleString();
}

/**
 * Log activity (to Stackdriver Logger and optionally elsewhere).
 * Use for debug, error, and audit messages.
 */
function logActivity(msg, level = 'INFO') {
  const timestamp = new Date().toISOString();
  Logger.log(`[${timestamp}] [${level}] ${msg}`);
}
