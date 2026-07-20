const fs = require('fs');
const path = require('path');

// We need to load the functions from "Soar Incident Responses.gs"
const code = fs.readFileSync(path.join(__dirname, 'Soar Incident Responses.gs'), 'utf8');

// We create a function to evaluate the code in an isolated environment with mocks
function runWithMocks(codeStr, mocks, funcName, ...args) {
  // Set up globals
  const globalObj = { ...mocks };

  // This is a basic way to execute the code with our mocks
  const wrappedCode =
    Object.keys(mocks).map(key => `const ${key} = globalObj['${key}'];`).join('\n') +
    '\n' + codeStr + '\n' +
    `return ${funcName}(${args.map(a => JSON.stringify(a)).join(',')});`;

  const func = new Function('globalObj', wrappedCode);
  return func(globalObj);
}

describe('doPost error handling', () => {
  it('should handle invalid JSON and return error response', () => {
    const logs = [];

    // Mocks
    const mocks = {
      Logger: {
        log: (msg) => logs.push(msg)
      },
      ContentService: {
        MimeType: { JSON: 'application/json' },
        createTextOutput: function(text) {
          return {
            text: text,
            mimeType: null,
            setMimeType: function(mimeType) {
              this.mimeType = mimeType;
              return this;
            },
            getContent: function() { return this.text; }
          };
        }
      }
    };

    // Event with invalid JSON
    const event = {
      parameter: { token: 'CHANGE_ME_SECURE_TOKEN' },
      postData: {
        contents: 'invalid json data'
      }
    };

    // Run the function
    const result = runWithMocks(code, mocks, 'doPost', event);

    // Verify response
    expect(result.mimeType).toBe('application/json');

    const responseJson = JSON.parse(result.getContent());
    expect(responseJson.status).toBe('error');
    expect(responseJson.message).toBeDefined();

    // Verify logs
    expect(logs.some(log => log.includes('[ERROR]') && log.includes('Webhook error:'))).toBe(true);
  });
});

describe('createIncidentFromData', () => {
  const mocks = {
    Logger: { log: () => {} }
  };

  it('should map a complete incident data object correctly (happy path)', () => {
    const data = {
      incident_id: 'INC-12345',
      timestamp: '2023-01-01T00:00:00.000Z',
      user: 'alice@company.com',
      login_ip: '1.2.3.4',
      location: 'New York',
      mfa_used: true,
      ioc_matched: true,
      sensitive_data_accessed: false,
      severity: 'Critical',
      status: 'Investigating',
      timeline: [{ time: '2023-01-01T00:00:00.000Z', event: 'Login' }],
      actions_taken: ['Blocked IP']
    };

    const result = runWithMocks(code, mocks, 'createIncidentFromData', data);

    expect(result).toEqual({
      incident_id: 'INC-12345',
      timestamp: '2023-01-01T00:00:00.000Z',
      user: 'alice@company.com',
      login_ip: '1.2.3.4',
      location: 'New York',
      mfa_used: true,
      ioc_matched: true,
      sensitive_data_accessed: false,
      severity: 'Critical',
      status: 'Investigating',
      timeline: [{ time: '2023-01-01T00:00:00.000Z', event: 'Login' }],
      actions_taken: ['Blocked IP']
    });
  });

  it('should assign correct default values for an empty object', () => {
    const result = runWithMocks(code, mocks, 'createIncidentFromData', {});

    // incident_id should be generated
    expect(result.incident_id).toMatch(/^INC-\d{8}-\d{6}$/);

    // timestamp should be a valid ISO string
    expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);

    expect(result.user).toBe('unknown@company.com');
    expect(result.login_ip).toBe('0.0.0.0');
    expect(result.location).toBe('Unknown');
    expect(result.mfa_used).toBe(false);
    expect(result.ioc_matched).toBe(false);
    expect(result.sensitive_data_accessed).toBe(false);
    expect(result.severity).toBe('Medium');
    expect(result.status).toBe('Open');
    expect(result.timeline).toEqual([]);
    expect(result.actions_taken).toEqual([]);
  });

  it('should properly format severity casing', () => {
    expect(runWithMocks(code, mocks, 'createIncidentFromData', { severity: 'HIGH' }).severity).toBe('High');
    expect(runWithMocks(code, mocks, 'createIncidentFromData', { severity: 'low' }).severity).toBe('Low');
    expect(runWithMocks(code, mocks, 'createIncidentFromData', { severity: 'cRiTiCaL' }).severity).toBe('Critical');
  });

  it('should strictly cast boolean fields', () => {
    const result = runWithMocks(code, mocks, 'createIncidentFromData', {
      mfa_used: 'yes', // truthy
      ioc_matched: 1, // truthy
      sensitive_data_accessed: null // falsy
    });

    expect(result.mfa_used).toBe(true);
    expect(result.ioc_matched).toBe(true);
    expect(result.sensitive_data_accessed).toBe(false);
  });

  it('should fallback to empty arrays when timeline or actions_taken are not arrays', () => {
    const result = runWithMocks(code, mocks, 'createIncidentFromData', {
      timeline: 'Not an array',
      actions_taken: { action: 'blocked' }
    });

    expect(result.timeline).toEqual([]);
    expect(result.actions_taken).toEqual([]);
  });
});
