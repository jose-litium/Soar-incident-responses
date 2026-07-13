const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Read the Google Apps Script file
const scriptPath = path.join(__dirname, 'Soar Incident Responses.gs');
const scriptContent = fs.readFileSync(scriptPath, 'utf8');

// Create a mock execution context
const context = vm.createContext({
  Logger: {
    log: jest.fn()
  }
});

// Execute the script within the context
vm.runInContext(scriptContent, context);

// Extract the function to test
const { getSeverityActionsArray } = context;

describe('getSeverityActionsArray', () => {
  it('should return High Severity actions for "high"', () => {
    const result = getSeverityActionsArray('high');
    expect(result.title).toBe('High Severity (Critical)');
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toMatch(/block the offending IP/i);
  });

  it('should return High Severity actions for "critical"', () => {
    const result = getSeverityActionsArray('critical');
    expect(result.title).toBe('High Severity (Critical)');
    expect(result.items.length).toBeGreaterThan(0);
  });

  it('should return High Severity actions for case-insensitive "HiGh" or "CRITICAL"', () => {
    const result1 = getSeverityActionsArray('HiGh');
    expect(result1.title).toBe('High Severity (Critical)');

    const result2 = getSeverityActionsArray('CRITICAL');
    expect(result2.title).toBe('High Severity (Critical)');
  });

  it('should return Medium Severity actions for "medium"', () => {
    const result = getSeverityActionsArray('medium');
    expect(result.title).toBe('Medium Severity');
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toMatch(/targeted log review/i);
  });

  it('should return Medium Severity actions for case-insensitive "mEdIuM"', () => {
    const result = getSeverityActionsArray('mEdIuM');
    expect(result.title).toBe('Medium Severity');
  });

  it('should return Low Severity actions for "low"', () => {
    const result = getSeverityActionsArray('low');
    expect(result.title).toBe('Low Severity');
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toMatch(/false positives/i);
  });

  it('should return Low Severity actions for unknown severities like "unknown" or empty string', () => {
    const result1 = getSeverityActionsArray('unknown');
    expect(result1.title).toBe('Low Severity');

    const result2 = getSeverityActionsArray('');
    expect(result2.title).toBe('Low Severity');
  });

  it('should throw an error for null or undefined input', () => {
    // The function calls `.toLowerCase()` without checking for null/undefined.
    // Because it runs in a vm context, we just check that it throws.
    expect(() => getSeverityActionsArray(null)).toThrow();
    expect(() => getSeverityActionsArray(undefined)).toThrow();
  });
});
