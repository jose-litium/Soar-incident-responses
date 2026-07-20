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
      parameter: {
        token: 'CHANGE_ME_SECURE_TOKEN'
      },
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

describe('isIncidentActionable tests', () => {
  const mocks = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => {
          if (key === 'IOC_IP_LIST') return JSON.stringify(['192.168.1.0/24']);
          return null;
        }
      })
    }
  };

  it('should return true if MFA is not used', () => {
    const incident = {
      login_ip: '10.0.0.1', // Not in IOC list
      mfa_used: false
    };
    const result = runWithMocks(code, mocks, 'isIncidentActionable', incident);
    expect(result).toBe(true);
  });

  it('should return true if IP matches IOC, even if MFA is used', () => {
    const incident = {
      login_ip: '192.168.1.100', // In IOC list
      mfa_used: true
    };
    const result = runWithMocks(code, mocks, 'isIncidentActionable', incident);
    expect(result).toBe(true);
  });

  it('should return false if MFA is used and IP does not match IOC', () => {
    const incident = {
      login_ip: '10.0.0.1', // Not in IOC list
      mfa_used: true
    };
    const result = runWithMocks(code, mocks, 'isIncidentActionable', incident);
    expect(result).toBe(false);
  });
});
