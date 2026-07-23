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
      PropertiesService: {
        getScriptProperties: () => ({
          getProperty: (key) => key === 'WEBHOOK_TOKEN' ? 'CHANGE_ME_SECURE_TOKEN' : null
        })
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
      },
      parameter: {
        token: 'CHANGE_ME_SECURE_TOKEN' // match CONFIG.WEBHOOK_TOKEN
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
