const fs = require('fs');
const vm = require('vm');

// Read the Google Apps Script file
const code = fs.readFileSync('./Soar Incident Responses.gs', 'utf8');

// Set up mock objects for Google Apps Script services
const mockLogger = { log: jest.fn() };
const mockTextOutput = {
  setMimeType: jest.fn().mockReturnThis()
};
const mockContentService = {
  createTextOutput: jest.fn(() => mockTextOutput),
  MimeType: { JSON: 'JSON' }
};

const mockProperties = {
  getProperty: jest.fn(),
  setProperty: jest.fn()
};
const mockPropertiesService = {
  getScriptProperties: jest.fn(() => mockProperties)
};

const mockBody = {
  replaceText: jest.fn(),
  clear: jest.fn(),
  insertParagraph: jest.fn().mockReturnThis(),
  setHeading: jest.fn().mockReturnThis(),
  setAlignment: jest.fn().mockReturnThis(),
  appendParagraph: jest.fn().mockReturnThis(),
  appendTable: jest.fn(() => ({
    getNumRows: jest.fn(() => 0),
    getRow: jest.fn()
  })),
  appendListItem: jest.fn(() => ({
    setLinkUrl: jest.fn()
  }))
};
const mockDoc = {
  getId: jest.fn(() => 'MOCK_DOC_ID'),
  getBody: jest.fn(() => mockBody),
  saveAndClose: jest.fn()
};

const mockFile = {
  makeCopy: jest.fn(() => mockDoc)
};

const mockDriveApp = {
  getFileById: jest.fn(() => mockFile)
};

const mockDocumentApp = {
  openById: jest.fn(() => mockDoc),
  ParagraphHeading: { TITLE: 'TITLE', HEADING1: 'HEADING1', HEADING2: 'HEADING2', HEADING3: 'HEADING3' },
  HorizontalAlignment: { CENTER: 'CENTER' }
};

const mockGmailApp = {
  sendEmail: jest.fn()
};

const mockSheet = {
  appendRow: jest.fn()
};
const mockSpreadsheetApp = {
  openById: jest.fn(() => ({
    getSheets: jest.fn(() => [mockSheet])
  }))
};

const mockUrlFetchApp = {
  fetch: jest.fn(() => ({
    getContentText: jest.fn(() => '')
  }))
};

// Define the global context for the VM
const context = vm.createContext({
  Logger: mockLogger,
  ContentService: mockContentService,
  PropertiesService: mockPropertiesService,
  DriveApp: mockDriveApp,
  DocumentApp: mockDocumentApp,
  GmailApp: mockGmailApp,
  SpreadsheetApp: mockSpreadsheetApp,
  UrlFetchApp: mockUrlFetchApp,
  JSON: JSON,
  Date: Date,
  Number: Number,
  parseInt: parseInt,
  isNaN: isNaN,
  Array: Array,
  Object: Object
});

// Evaluate the script within the context
vm.runInContext(code, context);

describe('Soar Incident Responses Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pure Functions', () => {
    test('ipToInt correctly converts IPv4 to an integer', () => {
      expect(context.ipToInt('0.0.0.0')).toBe(0);
      expect(context.ipToInt('255.255.255.255')).toBe(4294967295);
      expect(context.ipToInt('192.168.1.1')).toBe(3232235777);
    });

    test('cidrContainsIp correctly checks if an IP is within a CIDR', () => {
      expect(context.cidrContainsIp('192.168.1.0/24', '192.168.1.50')).toBe(true);
      expect(context.cidrContainsIp('192.168.1.0/24', '192.168.2.50')).toBe(false);
      expect(context.cidrContainsIp('10.0.0.0/8', '10.5.5.5')).toBe(true);
      expect(context.cidrContainsIp('10.0.0.0/8', '11.5.5.5')).toBe(false);
    });

    test('createIncidentFromData normalizes input data', () => {
      const input = {
        user: 'test@example.com',
        severity: 'high'
      };

      const incident = context.createIncidentFromData(input);
      expect(incident.user).toBe('test@example.com');
      expect(incident.severity).toBe('High');
      expect(incident.mfa_used).toBe(false);
      expect(incident.ioc_matched).toBe(false);
      expect(incident.status).toBe('Open');
      expect(incident.incident_id).toMatch(/^INC-\d{8}-\d{6}$/);
    });

    test('generateExecutiveSummary creates correct summary', () => {
      const incident = {
        user: 'test@example.com',
        location: 'US',
        mfa_used: false,
        login_ip: '1.2.3.4',
        ioc_matched: true,
        sensitive_data_accessed: false,
        severity: 'High'
      };

      const summaryActionable = context.generateExecutiveSummary(incident, true);
      expect(summaryActionable).toContain('A security alert was triggered for user test@example.com');
      expect(summaryActionable).toContain('MFA was not used');
      expect(summaryActionable).toContain('matched a known IOC');

      const summaryNonActionable = context.generateExecutiveSummary(incident, false);
      expect(summaryNonActionable).toContain('An event was logged for user test@example.com');
      expect(summaryNonActionable).toContain('No security action required');
    });

    test('getSeverityActionsArray returns appropriate actions', () => {
      const highActions = context.getSeverityActionsArray('High');
      expect(highActions.title).toBe('High Severity (Critical)');
      expect(highActions.items.length).toBeGreaterThan(0);

      const mediumActions = context.getSeverityActionsArray('Medium');
      expect(mediumActions.title).toBe('Medium Severity');

      const lowActions = context.getSeverityActionsArray('Low');
      expect(lowActions.title).toBe('Low Severity');
    });
  });

  describe('Mocked GAS Functions', () => {
    test('isIocIp returns true if IP is in properties CIDR list', () => {
      mockProperties.getProperty.mockReturnValue(JSON.stringify(['192.168.1.0/24', '10.0.0.0/8']));

      expect(context.isIocIp('192.168.1.100')).toBe(true);
      expect(context.isIocIp('10.5.5.5')).toBe(true);
      expect(context.isIocIp('172.16.0.1')).toBe(false);

      expect(mockPropertiesService.getScriptProperties).toHaveBeenCalled();
      expect(mockProperties.getProperty).toHaveBeenCalledWith('IOC_IP_LIST');
    });

    test('doPost handles incoming JSON correctly', () => {
      const mockEvent = {
        postData: {
          contents: JSON.stringify({
            user: 'hacker@example.com',
            severity: 'Critical'
          })
        }
      };

      // Mock processIncident to not actually execute everything
      const originalProcessIncident = context.processIncident;
      context.processIncident = jest.fn();

      const response = context.doPost(mockEvent);

      expect(mockContentService.createTextOutput).toHaveBeenCalled();
      expect(mockTextOutput.setMimeType).toHaveBeenCalledWith('JSON');

      // Look at what was passed to createTextOutput
      const responseData = JSON.parse(mockContentService.createTextOutput.mock.calls[0][0]);
      expect(responseData.status).toBe('success');
      expect(responseData.incident_id).toBeDefined();

      expect(context.processIncident).toHaveBeenCalled();

      // Restore original
      context.processIncident = originalProcessIncident;
    });

    test('doPost handles errors gracefully', () => {
      const mockEvent = {
        postData: {
          contents: 'invalid json'
        }
      };

      const response = context.doPost(mockEvent);

      expect(mockContentService.createTextOutput).toHaveBeenCalled();
      const responseData = JSON.parse(mockContentService.createTextOutput.mock.calls[0][0]);
      expect(responseData.status).toBe('error');
      expect(responseData.message).toBeDefined();
    });
  });
});
