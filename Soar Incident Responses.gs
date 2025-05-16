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
 * Fetches the latest list of known malicious IP addresses (IOCs) from FireHOL.
 * Stores them in a script property for quick access during incident processing.
 */
function updateIocIpList() {
  const url = 'https://iplists.firehol.org/files/firehol_level1.netset'; // FireHOL Level 1 list
  try {
    const response = UrlFetchApp.fetch(url);
    const iocList = response.getContentText().split('\n').filter(line => line && !line.startsWith('#'));
    const props = PropertiesService.getScriptProperties();
    props.setProperty('IOC_IP_LIST', JSON.stringify(iocList));
    logActivity('IOC IP list updated successfully.');
  } catch (error) {
    logActivity(`Failed to update IOC IP list: ${error.message}`, 'ERROR');
  }
}
/**
 * (DISABLED BY DEFAULT) Kicks off an automated investigation in Google Chronicle.
 * Sends the incident details via HTTP POST to Chronicle's API endpoint.
 * This function will NOT be triggered unless you set CONFIG.CHRONICLE_KICKOFF_ENABLED = true.
 * 
 * How to use:
 * - Place this function in your script (recommended: after processIncident).
 * - To enable, set CONFIG.CHRONICLE_KICKOFF_ENABLED = true in your config.
 * - Call this function from processIncident ONLY for actionable incidents if enabled.
 * - Chronicle setup and API permissions must be preconfigured.
 * 
 * @param {Object} incident - The incident object to send.
 */
function kickoffChronicle(incident) {
  // Only proceed if explicitly enabled in CONFIG
  if (!CONFIG.CHRONICLE_KICKOFF_ENABLED) {
    logActivity('Chronicle kickoff skipped (feature disabled)', 'INFO');
    return;
  }

  // Prepare the request
  const url = CONFIG.CHRONICLE_API_URL;
  const payload = {
    incident_id: incident.incident_id,
    user: incident.user,
    login_ip: incident.login_ip,
    location: incident.location,
    timestamp: incident.timestamp,
    severity: incident.severity,
    status: incident.status,
    mfa_used: incident.mfa_used,
    ioc_matched: incident.ioc_matched,
    sensitive_data_accessed: incident.sensitive_data_accessed,
    actions_taken: incident.actions_taken,
    timeline: incident.timeline
    // Add or remove fields as needed for your Chronicle API spec
  };

  // Construct request options
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.CHRONICLE_API_KEY
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    // Send POST request to Chronicle
    const response = UrlFetchApp.fetch(url, options);
    logActivity('Chronicle kickoff sent: ' + response.getContentText(), 'INFO');
  } catch (err) {
    logActivity('Chronicle kickoff failed: ' + err.message, 'ERROR');
  }
}

/**
 * Checks if a given IP address is present in the IOC CIDR list.
 * @param {string} ip - The IP address to check.
 * @returns {boolean} - True if the IP is in any IOC CIDR range, false otherwise.
 */
function isIocIp(ip) {
  const props = PropertiesService.getScriptProperties();
  const iocCidrs = JSON.parse(props.getProperty('IOC_IP_LIST') || '[]');
  for (let i = 0; i < iocCidrs.length; i++) {
    if (cidrContainsIp(iocCidrs[i], ip)) {
      return true;
    }
  }
  return false;
}

/**
 * Checks if a given IP is in a CIDR block.
 * @param {string} cidr - The CIDR block (e.g., "45.139.104.0/23").
 * @param {string} ip - The IP address (e.g., "45.139.105.12").
 * @returns {boolean}
 */
function cidrContainsIp(cidr, ip) {
  const [range, bits] = cidr.split('/');
  const ipNum = ipToInt(ip);
  const rangeNum = ipToInt(range);
  const mask = -1 << (32 - parseInt(bits, 10));
  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Converts a dotted-quad IP string to a 32-bit integer.
 * @param {string} ip - The IP address.
 * @returns {number}
 */
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/**
 * Main function to simulate manual incident processing (testing only)
 */
function main() {
  const incident = {
    incident_id: generateIncidentId(),            // Generate a unique ID for the incident
    timestamp: new Date().toISOString(),          // Timestamp of the incident
    user: 'criminals@company.com',                // User involved in the incident
    login_ip: '67.219.208.0',                  // IP address from where the login was made
    location: 'India',                            // Location of the incident
    mfa_used: true,                               // Whether multi-factor authentication (MFA) was used
    ioc_matched: true,                            // Whether an indicator of compromise (IOC) was matched
    sensitive_data_accessed: true,                // Whether sensitive data was accessed
    severity: 'High',                             // Severity level of the incident
    status: 'Open',                               // Status of the incident
    timeline: [
      { time: new Date().toISOString(), event: 'Initial login detected' },
      { time: new Date().toISOString(), event: 'IOC match confirmed' }
    ],
    actions_taken: [
      'User account temporarily suspended',
      'Endpoint isolation initiated'
    ]
  };
  processIncident(incident);                      // Process the incident
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
 * Processes a security incident by generating reports and sending notifications.
 * Differentiates between actionable and informational incidents based on IOC IP and MFA usage.
 * Optionally kicks off a Chronicle investigation (disabled by default).
 * 
 * @param {Object} incident - The incident data.
 */
function processIncident(incident) {
  // Determine if the incident is actionable (real) or informational only
  // Actionable if the login IP matches an IOC, or MFA was NOT used
  const isActionable = isIocIp(incident.login_ip) || !incident.mfa_used;

  // Generate incident ID and timestamp if not present
  incident.incident_id = incident.incident_id || generateIncidentId();
  incident.timestamp = incident.timestamp || new Date().toISOString();

  // Generate executive summary text for the report and notifications
  const summary = generateExecutiveSummary(incident, isActionable);

  // Create incident report Google Doc from template
  const docId = createIncidentReport(incident);

  // Fill in the summary and details in the document
  insertSummaryToDoc(docId, summary, incident);

  // Send email notification (will indicate if informational-only)
  sendIncidentNotification(incident, docId, summary, isActionable);

  // Send Slack notification (will indicate if informational-only)
  sendSlackNotification(incident, docId, isActionable);

 /**
 * Logs incident details to a Google Sheets spreadsheet.
 * Always logs status as "Closed" if the event is informational only.
 * @param {Object} incident - The incident object.
 * @param {string} docId - The Google Doc ID for the incident report.
 */
function logIncidentToSheet(incident, docId) {
  // Determine if the incident was actionable (security) or informational-only
  var isActionable = isIocIp(incident.login_ip) || !incident.mfa_used;

  // Open the Google Sheet (first sheet/tab)
  var sheet = SpreadsheetApp.openById(CONFIG.LOG_SPREADSHEET_ID).getSheets()[0];

  // Append a new row with incident details (always use "Closed" if informational)
  sheet.appendRow([
    incident.incident_id,                                        // Unique Incident ID
    incident.timestamp,                                          // Timestamp
    incident.user,                                               // User involved
    incident.login_ip,                                           // Login IP
    incident.location,                                           // Location
    incident.mfa_used ? 'Yes' : 'No',                            // MFA used
    incident.ioc_matched ? 'Yes' : 'No',                         // IOC matched
    incident.sensitive_data_accessed ? 'Yes' : 'No',             // Sensitive data accessed
    incident.severity,                                           // Severity (only shown if actionable)
    isActionable ? (incident.status || 'Open') : 'Closed',       // Force "Closed" if not actionable
    `https://docs.google.com/document/d/${docId}/edit`,          // Incident report (Google Doc)
    new Date().toISOString()                                     // Log entry timestamp
  ]);
}
  // Log the processing activity
  logActivity(`Processed incident ${incident.incident_id} (${isActionable ? 'Actionable' : 'Informational Only'})`);

  /**
   * Optionally: Kick off an automated investigation in Chronicle (DISABLED by default).
   * To enable, set CONFIG.CHRONICLE_KICKOFF_ENABLED = true in your configuration.
   * 
   * Uncomment the line below when you are ready to enable Chronicle integration.
   * 
   * NOTE: This should only be triggered for actionable incidents.
   */
  // if (isActionable && CONFIG.CHRONICLE_KICKOFF_ENABLED) {
  //   kickoffChronicle(incident);
  // }
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
 * Generates an executive summary for emails or reports.
 * Omits severity and IOC if not actionable.
 */
function generateExecutiveSummary(incident, isActionable) {
  if (!isActionable) {
    return `An event was logged for user ${incident.user} from ${incident.location}. MFA was ${incident.mfa_used ? 'used' : 'not used'}. Status is Closed. No security action required.`;
  }
  return `A security alert was triggered for user ${incident.user} from ${incident.location}. ` +
    `MFA was ${incident.mfa_used ? 'used' : 'not used'}, and the IP (${incident.login_ip}) ` +
    `${incident.ioc_matched ? 'matched a known IOC' : 'did not match known IOCs'}. ` +
    `Sensitive data was ${incident.sensitive_data_accessed ? '' : 'not '}accessed. ` +
    `Severity level is ${incident.severity}.`;
}

/**
 * Sends a Slack notification.
 * If not actionable, shows informational-only message and marks status as Closed.
 */
function sendSlackNotification(incident, docId, isActionable) {
  const severityColors = {
    high:   '#E01E5A',
    medium: '#F2C744',
    low:    '#2EB886',
    info:   '#CCCCCC'
  };
  const severityIcons = {
    high:   ':fire:',
    medium: ':warning:',
    low:    ':information_source:',
    info:   ':information_source:'
  };

  // For informational only: show 'Closed' status, no severity
  const key = isActionable ? (incident.severity || 'low').toLowerCase() : 'info';
  const color = severityColors[key];
  const icon = severityIcons[key];

  let title, details;
  if (isActionable) {
    title = `${icon} ${incident.severity} Security Incident Detected`;
    details =
      `*Incident ID:* ${incident.incident_id}\n` +
      `*User:* ${incident.user}\n` +
      `*Location:* ${incident.location}\n` +
      `*Login IP:* ${incident.login_ip}\n` +
      `*Status:* ${incident.status}\n` +
      `<https://docs.google.com/document/d/${docId}/edit|View Incident Report>\n\n` +
      `For detailed logs, join our Slack workspace: <${CONFIG.SLACK_GROUP_LINK}|Click here>`;
  } else {
    title = `${icon} Informational Event Logged (No Action Required)`;
    details =
      `*Incident ID:* ${incident.incident_id}\n` +
      `*User:* ${incident.user}\n` +
      `*Location:* ${incident.location}\n` +
      `*Login IP:* ${incident.login_ip}\n` +
      `*Status:* Closed\n` +
      `:no_entry: *This event was logged for informational purposes only. No action is required.*\n` +
      `<https://docs.google.com/document/d/${docId}/edit|View Full Event Report>\n\n` +
      `For detailed logs, join our Slack workspace: <${CONFIG.SLACK_GROUP_LINK}|Click here>`;
  }

  const payload = {
    text: title,
    attachments: [
      {
        color: color,
        text: details
      }
    ]
  };

  const options = {
    method: 'POST',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  };

  UrlFetchApp.fetch(CONFIG.SLACK_WEBHOOK_URL, options);
}

/**
 * Sends an email notification about the incident.
 * Shows a strong informational banner if not actionable.
 * No PDF attached; only links included.
 * If informational, the incident status is always "Closed".
 */
function sendIncidentNotification(incident, docId, summary, isActionable) {
  const logUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.LOG_SPREADSHEET_ID}/edit`;
  const docUrl = `https://docs.google.com/document/d/${docId}/edit`;

  // For informational events, force status to Closed
  const status = isActionable ? incident.status : 'Closed';

  // Severity-based styles (only if actionable)
  const severityStyles = {
    high: 'background:#f8d7da;color:#721c24;border-left:8px solid #d32f2f;',
    medium: 'background:#fff3cd;color:#856404;border-left:8px solid #ff9800;',
    low: 'background:#d1ecf1;color:#0c5460;border-left:8px solid #2196f3;'
  };

  // SecOps recommended actions (only if actionable)
  const secOpsAdvice = {
    high: `<ul><li>Immediately isolate the account or device.</li><li>Launch full investigation.</li><li>Notify compliance if data was accessed.</li></ul>`,
    medium: `<ul><li>Review logs and context.</li><li>Determine need for escalation.</li><li>Document findings.</li></ul>`,
    low: `<ul><li>Validate for false positives.</li><li>Continue monitoring.</li></ul>`
  };

  // Informational event banner
  const infoBanner = !isActionable
    ? `<div style="background:linear-gradient(90deg, #dee2e6 0%, #cfd8dc 100%);color:#222;padding:18px 24px;font-size:1.15em;border-left:10px solid #6c757d;margin-bottom:24px;display:flex;align-items:center;">
        <span style="font-size:1.8em; margin-right:16px;">ℹ️</span>
        <span>
          <strong>INFORMATIONAL EVENT ONLY</strong><br>
          This event was automatically logged for record-keeping.<br>
          <b>No security action is required. Status: Closed.</b>
        </span>
      </div>`
    : '';

  // If not actionable, do not show severity box or SecOps actions
  const severityBox = isActionable ? `
    <div style="${severityStyles[incident.severity.toLowerCase()]}; padding: 15px; border-radius: 7px; margin-bottom: 20px;">
      <h3 style="margin-top:0;">Incident ID: ${incident.incident_id}</h3>
      <p><strong>Severity:</strong> ${incident.severity}</p>
      <p><strong>Status:</strong> ${incident.status}</p>
    </div>` : `
    <div style="background:#f3f3f3;color:#666;border-left:8px solid #aaa;padding:15px; border-radius:7px; margin-bottom:20px;">
      <h3 style="margin-top:0;">Incident ID: ${incident.incident_id}</h3>
      <p><strong>Status:</strong> Closed</p>
    </div>`;

  // No SecOps box if not actionable
  const secOpsBox = isActionable ? `
    <h3 style="margin-bottom:7px;">Recommended Actions for SecOps</h3>
    <div style="background: #f4f6f7; padding: 15px; border-left: 5px solid #999; border-radius: 4px; margin-bottom: 20px;">
      ${secOpsAdvice[incident.severity.toLowerCase()]}
    </div>` : '';

  // HTML body for the email notification
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 650px; margin: auto; background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 24px;">
      <h2 style="color: #252525; border-bottom: 1.5px solid #eee; padding-bottom:7px;">Security Incident Notification</h2>
      ${infoBanner}
      ${severityBox}
      <h3 style="margin-bottom:7px;">Executive Summary</h3>
      <p>${summary}</p>
      <h3>Key Details</h3>
      <table style="width:100%; border-collapse: collapse; font-size:1em;">
        <tr style="background:#e0e0e0;"><th style="padding:8px;">Field</th><th style="padding:8px;">Value</th></tr>
        <tr><td style="padding:8px;">User</td><td style="padding:8px;">${incident.user}</td></tr>
        <tr><td style="padding:8px;">Login IP</td><td style="padding:8px;">${incident.login_ip}</td></tr>
        <tr><td style="padding:8px;">Location</td><td style="padding:8px;">${incident.location}</td></tr>
        <tr><td style="padding:8px;">MFA Used</td><td style="padding:8px;">${incident.mfa_used ? 'Yes' : 'No'}</td></tr>
      </table>
      ${secOpsBox}
      <h3 style="margin-bottom:7px;">Investigate IP Address</h3>
      <div style="text-align:center; margin: 15px 0;">
        <a href="https://www.virustotal.com/gui/ip-address/${incident.login_ip}" style="background:#1a73e8;color:#fff;padding:10px 15px;margin-right:10px;border-radius:4px;text-decoration:none;" target="_blank">VirusTotal</a>
        <a href="https://ipinfo.io/${incident.login_ip}" style="background:#34a853;color:#fff;padding:10px 15px;margin-right:10px;border-radius:4px;text-decoration:none;" target="_blank">IP Lookup</a>
        <a href="https://www.abuseipdb.com/check/${incident.login_ip}" style="background:#fbbc05;color:#000;padding:10px 15px;border-radius:4px;text-decoration:none;" target="_blank">Check IOC DB</a>
      </div>
      <div style="text-align:center;margin-top:32px;">
        <a href="${docUrl}" 
           style="display:inline-block;background:#5e35b1;color:#fff;padding:14px 28px;margin:8px 4px 0 4px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.08);" 
           target="_blank">
          View Full Incident Report (Google Doc)
        </a>
        <a href="${logUrl}" 
           style="display:inline-block;background:#388e3c;color:#fff;padding:14px 28px;margin:8px 4px 0 4px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.08);" 
           target="_blank">
          View Incident Log Spreadsheet
        </a>
      </div>
      <p style="margin-top: 36px; text-align: center; font-size: 0.93em; color: #777;">
        This is an automated alert. Do not reply.
      </p>
    </div>`;

  // Send the email notification to all stakeholders (NO attachment)
  CONFIG.STAKEHOLDER_EMAILS.forEach(email =>
    GmailApp.sendEmail(email,
      isActionable
        ? `Incident Alert: ${incident.incident_id} (${incident.severity})`
        : `Informational Event Logged: ${incident.incident_id}`,
      "Please view the incident details in the online report links below.",
      {
        htmlBody: htmlBody,
        name: CONFIG.FROM_NAME,
        replyTo: CONFIG.REPLY_TO_EMAIL
      }
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
