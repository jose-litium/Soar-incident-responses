/**
 * Security Incident Automation Script
 * Integrates Gmail, Google Sheets, Google Docs, and Slack.
 * Features IOC IP matching, reporting, notifications, and audit logging.
 * 
 * To use:
 * - Set CONFIG below with your own Doc/Sheet IDs, emails, and Slack details.
 * - Deploy as a Web App (for curl/webhooks/etc) or run 'main' in Apps Script editor.
 * - Use updateIocIpList as a time-based trigger to update IOCs regularly if needed.
 */

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


/* ================================
 * HEALTH & WEBHOOK HANDLERS
 * ================================ */

// Health check for GET requests (returns text if the app is deployed and running)
function doGet(e) {
  logActivity('Health check endpoint hit.', 'INFO');
  return ContentService.createTextOutput("App is running.");
}

/**
 * POST handler for webhooks. 
 * Receives JSON incident data, processes, and returns JSON response.
 * Logs every step and any error.
 */
function doPost(e) {
  logActivity('doPost called. Incoming data: ' + e.postData.contents, 'INFO');
  try {
    const data = JSON.parse(e.postData.contents);
    logActivity('Parsed incoming incident JSON.', 'DEBUG');
    const incident = createIncidentFromData(data);
    logActivity('Normalized incident data: ' + JSON.stringify(incident), 'DEBUG');
    processIncident(incident);
    logActivity('Incident processed successfully: ' + incident.incident_id, 'INFO');
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      incident_id: incident.incident_id
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    logActivity(`Webhook error: ${error.stack || error.message}`, 'ERROR');
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.message
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Manual trigger for testing: runs full incident workflow with sample data.
 * Use this for authorizing permissions and debugging.
 */
function main() {
  logActivity('Manual main() test started.', 'INFO');
  const incident = {
    incident_id: generateIncidentId(),
    timestamp: new Date().toISOString(),
    user: 'testuser@company.com',
    login_ip: '8.8.8.8',
    location: 'TestLand',
    mfa_used: false,
    ioc_matched: false,
    sensitive_data_accessed: false,
    severity: 'High',
    status: 'Open',
    timeline: [
      { time: new Date().toISOString(), event: 'Login detected' }
    ],
    actions_taken: [
      'Account locked'
    ]
  };
  processIncident(incident);
}

/* ================================
 * IOC MANAGEMENT (for IP matching)
 * ================================ */

/**
 * Download and store the latest malicious IPs (IOCs) from FireHOL as script property.
 * Run this on a time-based trigger to keep up to date.
 */
function updateIocIpList() {
  const url = 'https://iplists.firehol.org/files/firehol_level1.netset';
  try {
    logActivity('Updating IOC IP list from FireHOL...', 'INFO');
    const response = UrlFetchApp.fetch(url);
    const iocList = response.getContentText().split('\n').filter(line => line && !line.startsWith('#'));
    PropertiesService.getScriptProperties().setProperty('IOC_IP_LIST', JSON.stringify(iocList));
    logActivity('IOC IP list updated successfully.', 'SUCCESS');
  } catch (error) {
    logActivity(`Failed to update IOC IP list: ${error.message}`, 'ERROR');
  }
}

/**
 * Checks if an IP matches any known malicious IOC (from CIDR blocks).
 */
function isIocIp(ip) {
  const props = PropertiesService.getScriptProperties();
  const iocCidrs = JSON.parse(props.getProperty('IOC_IP_LIST') || '[]');
  for (let cidr of iocCidrs) {
    if (cidrContainsIp(cidr, ip)) return true;
  }
  return false;
}

// Returns true if IP is within CIDR (IPv4 only)
function cidrContainsIp(cidr, ip) {
  const [range, bits] = cidr.split('/');
  const ipNum = ipToInt(ip);
  const rangeNum = ipToInt(range);
  const mask = -1 << (32 - parseInt(bits, 10));
  return (ipNum & mask) === (rangeNum & mask);
}

// IP to 32-bit int
function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

/* ================================
 * INCIDENT WORKFLOW
 * ================================ */

/**
 * Normalizes and sanitizes incident data from webhook or test input.
 */
function createIncidentFromData(data) {
  logActivity('createIncidentFromData called.', 'DEBUG');
  return {
    incident_id: data.incident_id || generateIncidentId(),
    timestamp: data.timestamp || new Date().toISOString(),
    user: data.user || 'unknown@company.com',
    login_ip: data.login_ip || '0.0.0.0',
    location: data.location || 'Unknown',
    mfa_used: !!data.mfa_used,
    ioc_matched: !!data.ioc_matched,
    sensitive_data_accessed: !!data.sensitive_data_accessed,
    severity: (data.severity || 'Medium').charAt(0).toUpperCase() + (data.severity || 'Medium').slice(1).toLowerCase(),
    status: data.status || 'Open',
    timeline: Array.isArray(data.timeline) ? data.timeline : [],
    actions_taken: Array.isArray(data.actions_taken) ? data.actions_taken : []
  };
}

/**
 * Main incident workflow: reporting, notifications, logging, and (optional) Chronicle.
 */
function processIncident(incident) {
  logActivity(`processIncident() started for ${incident.incident_id}`, 'INFO');
  try {
    // Decide if incident is actionable (triggers full workflow)
    const isActionable = isIocIp(incident.login_ip) || !incident.mfa_used;
    logActivity(`Incident actionable? ${isActionable}`, 'DEBUG');

    // Make sure required fields exist
    incident.incident_id = incident.incident_id || generateIncidentId();
    incident.timestamp = incident.timestamp || new Date().toISOString();

    // Executive summary for reports/notifications
    const summary = generateExecutiveSummary(incident, isActionable);

    // Google Doc report (template copy)
    const docId = createIncidentReport(incident);
    logActivity('Google Doc report created: ' + docId, 'SUCCESS');

    // Write summary/details into Doc
    insertSummaryToDoc(docId, summary, incident);
    logActivity('Report content written to Doc.', 'SUCCESS');

    // Email notification to stakeholders
    sendIncidentNotification(incident, docId, summary, isActionable);
    logActivity('Email notification sent.', 'SUCCESS');

    // Slack notification
    sendSlackNotification(incident, docId, isActionable);
    logActivity('Slack notification sent.', 'SUCCESS');

    // Log incident to Google Sheet
    logIncidentToSheet(incident, docId);
    logActivity('Incident logged in Sheet.', 'SUCCESS');

    // Optionally kick off Chronicle investigation
    if (isActionable && CONFIG.CHRONICLE_KICKOFF_ENABLED) {
      kickoffChronicle(incident);
      logActivity('Chronicle investigation triggered.', 'INFO');
    }
  } catch (err) {
    logActivity('Error in processIncident: ' + err.stack || err.message, 'ERROR');
    throw err; // rethrow for debugging
  }
}

/* ================================
 * GOOGLE DOCS REPORTS
 * ================================ */

// Generate unique incident IDs (e.g., INC-20240614-142010)
function generateIncidentId() {
  const d = new Date();
  return `${CONFIG.INCIDENT_PREFIX}-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function pad(n) {
  var num = Number(n);
  if (isNaN(num) || num < 0) return '00';
  return num < 10 ? '0' + num : num.toString();
}

/**
 * Make a new Doc from the template and replace placeholders.
 * Returns new Doc ID.
 */
function createIncidentReport(incident) {
  logActivity('Creating incident report from template...', 'DEBUG');
  const copy = DriveApp.getFileById(CONFIG.TEMPLATE_DOC_ID)
    .makeCopy(`${CONFIG.DOC_PREFIX}${incident.incident_id}`);
  const docId = copy.getId();
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();

  const placeholders = {
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
  Object.entries(placeholders).forEach(([key, value]) => body.replaceText(key, value));
  doc.saveAndClose();
  logActivity('Incident report Doc created and placeholders replaced.', 'DEBUG');
  return docId;
}

/**
 * Overwrites Doc with full incident details, summary, investigation links, actions, and compliance checklist.
 */
function insertSummaryToDoc(docId, summary, incident) {
  logActivity('Inserting summary/details into Doc: ' + docId, 'DEBUG');
  const doc = DocumentApp.openById(docId);
  const body = doc.getBody();
  body.clear();

  // Add all sections, with structure and clickable links
  body.insertParagraph(0, 'INCIDENT REPORT')
    .setHeading(DocumentApp.ParagraphHeading.TITLE)
    .setAlignment(DocumentApp.HorizontalAlignment.CENTER);

  body.appendParagraph('Executive Summary').setHeading(DocumentApp.ParagraphHeading.HEADING1);
  body.appendParagraph(summary);

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
  for (let r = 0; r < table.getNumRows(); r++) table.getRow(r).getCell(0).setBold(true);

  body.appendParagraph('Timeline').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (incident.timeline || []).forEach(e =>
    body.appendListItem(`${formatDateTime(e.time)}: ${e.event}`));

  body.appendParagraph('Actions Taken').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  (incident.actions_taken || []).forEach(a => body.appendListItem(a));

  const actions = getSeverityActionsArray(incident.severity);
  body.appendParagraph('Recommended SecOps Actions (EU)').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendParagraph(actions.title).setHeading(DocumentApp.ParagraphHeading.HEADING3);
  actions.items.forEach(i => body.appendListItem(i));

  body.appendParagraph('Investigation Links').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  [
    ['VirusTotal', `https://www.virustotal.com/gui/ip-address/${incident.login_ip}`],
    ['IP Info', `https://ipinfo.io/${incident.login_ip}`],
    ['AbuseIPDB', `https://www.abuseipdb.com/check/${incident.login_ip}`]
  ].forEach(([label, url]) => {
    const li = body.appendListItem(label);
    li.setLinkUrl(url);
  });

  body.appendParagraph('EU Compliance Checklist').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendTable([
    ['Requirement', 'Completed (Y/N)', 'Notes'],
    ['GDPR Art. 33 – Supervisory authority notification within 72h', '', ''],
    ['GDPR Art. 34 – Data subject notification (if high risk)', '', ''],
    ['NIS2 – National CSIRT notification (if applicable)', '', ''],
    ['Records updated in Register of Processing Activities (RoPA)', '', ''],
    ['DPO sign-off obtained', '', '']
  ]);

  body.appendParagraph('Follow-Up Tasks & Deadlines').setHeading(DocumentApp.ParagraphHeading.HEADING2);
  body.appendListItem('DD‑MMM‑YYYY – Complete endpoint forensic report');
  body.appendListItem('DD‑MMM‑YYYY – Review IAM policies for affected user');
  body.appendListItem('DD‑MMM‑YYYY – Conduct post‑incident lessons-learned session');
  body.appendListItem('DD‑MMM‑YYYY – Close incident after post-mortem');

  doc.saveAndClose();
  logActivity('Doc summary/details inserted.', 'DEBUG');
}

// Generate a clear, brief summary for notifications
function generateExecutiveSummary(incident, isActionable) {
  if (!isActionable) {
    return `An event was logged for user ${incident.user} from ${incident.location}. MFA was ${incident.mfa_used ? 'used' : 'not used'}. Status is Closed. No security action required.`;
  }
  return `A security alert was triggered for user ${incident.user} from ${incident.location}. MFA was ${incident.mfa_used ? 'used' : 'not used'}, and the IP (${incident.login_ip}) ${incident.ioc_matched ? 'matched a known IOC' : 'did not match known IOCs'}. Sensitive data was ${incident.sensitive_data_accessed ? '' : 'not '}accessed. Severity level is ${incident.severity}.`;
}

/**
 * Returns appropriate SecOps action list by severity.
 */
function getSeverityActionsArray(sev) {
  switch (sev.toLowerCase()) {
    case 'high':
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
          'Escalate to law enforcement or CERT‑EU if criminal activity is suspected.'
        ]
      };
    case 'medium':
      return {
        title: 'Medium Severity',
        items: [
          'Perform a targeted log review (identity, network, SaaS).',
          'Correlate IOC hits with threat-intel feeds; decide if containment is required.',
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
          'Record outcome and close or re-classify if risk increases.'
        ]
      };
  }
}

/* ================================
 * LOGGING, EMAIL & SLACK
 * ================================ */

// Append incident to Google Sheet for audit/compliance
function logIncidentToSheet(incident, docId) {
  try {
    const isActionable = isIocIp(incident.login_ip) || !incident.mfa_used;
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
      isActionable ? (incident.status || 'Open') : 'Closed',
      `https://docs.google.com/document/d/${docId}/edit`,
      new Date().toISOString()
    ]);
    logActivity('Incident logged to Sheet successfully.', 'SUCCESS');
  } catch (e) {
    logActivity('Error logging incident to Sheet: ' + e.message, 'ERROR');
  }
}

/**
 * Email notification: HTML summary, status, links, recommended actions.
 */
function sendIncidentNotification(incident, docId, summary, isActionable) {
  try {
    const logUrl = `https://docs.google.com/spreadsheets/d/${CONFIG.LOG_SPREADSHEET_ID}/edit`;
    const docUrl = `https://docs.google.com/document/d/${docId}/edit`;
    const status = isActionable ? incident.status : 'Closed';

    const severityStyles = {
      high: 'background:#f8d7da;color:#721c24;border-left:8px solid #d32f2f;',
      medium: 'background:#fff3cd;color:#856404;border-left:8px solid #ff9800;',
      low: 'background:#d1ecf1;color:#0c5460;border-left:8px solid #2196f3;'
    };

    const secOpsAdvice = {
      high: `<ul><li>Immediately isolate the account or device.</li><li>Launch full investigation.</li><li>Notify compliance if data was accessed.</li></ul>`,
      medium: `<ul><li>Review logs and context.</li><li>Determine need for escalation.</li><li>Document findings.</li></ul>`,
      low: `<ul><li>Validate for false positives.</li><li>Continue monitoring.</li></ul>`
    };

    const infoBanner = !isActionable
      ? `<div style="background:linear-gradient(90deg, #dee2e6 0%, #cfd8dc 100%);color:#222;padding:18px 24px;font-size:1.15em;border-left:10px solid #6c757d;margin-bottom:24px;display:flex;align-items:center;">
          <span style="font-size:1.8em; margin-right:16px;">ℹ️</span>
          <span>
            <strong>INFORMATIONAL EVENT ONLY</strong><br>
            This event was automatically logged for record-keeping.<br>
            <b>No security action is required. Status: Closed.</b>
          </span>
        </div>` : '';

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

    const secOpsBox = isActionable ? `
      <h3 style="margin-bottom:7px;">Recommended Actions for SecOps</h3>
      <div style="background: #f4f6f7; padding: 15px; border-left: 5px solid #999; border-radius: 4px; margin-bottom: 20px;">
        ${secOpsAdvice[incident.severity.toLowerCase()]}
      </div>` : '';

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
          <a href="${docUrl}" style="display:inline-block;background:#5e35b1;color:#fff;padding:14px 28px;margin:8px 4px 0 4px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.08);" target="_blank">
            View Full Incident Report (Google Doc)
          </a>
          <a href="${logUrl}" style="display:inline-block;background:#388e3c;color:#fff;padding:14px 28px;margin:8px 4px 0 4px;border-radius:6px;text-decoration:none;font-size:16px;font-weight:bold;box-shadow:0 2px 6px rgba(0,0,0,0.08);" target="_blank">
            View Incident Log Spreadsheet
          </a>
        </div>
        <p style="margin-top: 36px; text-align: center; font-size: 0.93em; color: #777;">
          This is an automated alert. Do not reply.
        </p>
      </div>`;

    CONFIG.STAKEHOLDER_EMAILS.forEach(email => {
      GmailApp.sendEmail(
        email,
        isActionable
          ? `Incident Alert: ${incident.incident_id} (${incident.severity})`
          : `Informational Event Logged: ${incident.incident_id}`,
        "Please view the incident details in the online report links below.",
        {
          htmlBody: htmlBody,
          name: CONFIG.FROM_NAME,
          replyTo: CONFIG.REPLY_TO_EMAIL
        }
      );
    });
    logActivity('Incident notification email sent.', 'SUCCESS');
  } catch (e) {
    logActivity('Error sending incident email: ' + e.message, 'ERROR');
  }
}

/**
 * Slack notification: rich formatting, color, and clickable links.
 */
function sendSlackNotification(incident, docId, isActionable) {
  try {
    const severityColors = {
      high: '#E01E5A',
      medium: '#F2C744',
      low: '#2EB886',
      info: '#CCCCCC'
    };
    const severityIcons = {
      high: ':fire:',
      medium: ':warning:',
      low: ':information_source:',
      info: ':information_source:'
    };

    const key = isActionable ? (incident.severity || 'low').toLowerCase() : 'info';
    const color = severityColors[key] || '#CCCCCC';
    const icon = severityIcons[key] || ':information_source:';

    let title, details, mention = '';
    if (isActionable) {
      if (key === 'high' || key === 'critical') mention = '<!here> ';
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
      text: mention + title,
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
    logActivity('Slack notification sent successfully.', 'SUCCESS');
  } catch (e) {
    logActivity('Slack notification failed: ' + e.message, 'ERROR');
  }
}

/* ================================
 * OPTIONAL: GOOGLE CHRONICLE API
 * ================================ */

function kickoffChronicle(incident) {
  if (!CONFIG.CHRONICLE_KICKOFF_ENABLED) {
    logActivity('Chronicle kickoff skipped (feature disabled)', 'INFO');
    return;
  }
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
  };
  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + CONFIG.CHRONICLE_API_KEY },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  try {
    const response = UrlFetchApp.fetch(CONFIG.CHRONICLE_API_URL, options);
    logActivity('Chronicle kickoff sent: ' + response.getContentText(), 'INFO');
  } catch (err) {
    logActivity('Chronicle kickoff failed: ' + err.message, 'ERROR');
  }
}

/* ================================
 * UTILITIES & LOGGING
 * ================================ */

// ISO datetime to local readable string
function formatDateTime(iso) {
  return new Date(iso).toLocaleString();
}

// Simple logging for diagnostics and audits
function logActivity(msg, level = 'INFO') {
  const timestamp = new Date().toISOString();
  Logger.log(`[${timestamp}] [${level}] ${msg}`);
}
