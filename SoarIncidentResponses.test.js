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

describe('pad utility function', () => {
  const testPad = (input) => runWithMocks(code, {}, 'pad', input);

  it('should pad single-digit positive numbers with a leading zero', () => {
    expect(testPad(0)).toBe('00');
    expect(testPad(5)).toBe('05');
    expect(testPad(9)).toBe('09');
  });

  it('should not pad double-digit positive numbers', () => {
    expect(testPad(10)).toBe('10');
    expect(testPad(42)).toBe('42');
    expect(testPad(99)).toBe('99');
  });

  it('should handle string number inputs correctly', () => {
    expect(testPad('7')).toBe('07');
    expect(testPad('12')).toBe('12');
    expect(testPad('0')).toBe('00');
  });

  it('should return "00" for negative numbers', () => {
    expect(testPad(-1)).toBe('00');
    expect(testPad(-5)).toBe('00');
    expect(testPad(-10)).toBe('00');
    expect(testPad('-7')).toBe('00');
  });

  it('should return "00" for invalid/NaN inputs', () => {
    expect(testPad('abc')).toBe('00');
    expect(testPad(undefined)).toBe('00');
    expect(testPad(null)).toBe('00');
    expect(testPad(NaN)).toBe('00');
    expect(testPad({})).toBe('00');
    expect(testPad([])).toBe('00');
  });
});
