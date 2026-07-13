const fs = require('fs');
const code = fs.readFileSync('Soar Incident Responses.gs', 'utf8');

// Mock external dependencies
global.Logger = { log: jest.fn() };

// Evaluate the script code in the current context
// But first redefine generateIncidentId to actually be mocked since the eval overrides it
let mockGenerateIncidentId = jest.fn(() => 'INC-12345');

eval(code);

// Override the original function after eval
const originalGenerateIncidentId = generateIncidentId;
generateIncidentId = mockGenerateIncidentId;

describe('createIncidentFromData', () => {
    beforeEach(() => {
        global.Logger.log.mockClear();
        mockGenerateIncidentId.mockClear();
    });

    it('should exist', () => {
        expect(typeof createIncidentFromData).toBe('function');
    });

    it('should assign default values when empty object is provided', () => {
        const data = {};
        const beforeDate = new Date();
        const result = createIncidentFromData(data);
        const afterDate = new Date();

        expect(result.incident_id).toBe('INC-12345');
        expect(new Date(result.timestamp).getTime()).toBeGreaterThanOrEqual(beforeDate.getTime());
        expect(new Date(result.timestamp).getTime()).toBeLessThanOrEqual(afterDate.getTime());
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

        expect(global.Logger.log).toHaveBeenCalledWith(expect.stringMatching(/\[.*\] \[DEBUG\] createIncidentFromData called\./));
    });

    it('should correctly map all provided properties', () => {
        const data = {
            incident_id: 'INC-999',
            timestamp: '2023-01-01T00:00:00Z',
            user: 'test@example.com',
            login_ip: '192.168.1.1',
            location: 'New York',
            mfa_used: true,
            ioc_matched: true,
            sensitive_data_accessed: true,
            severity: 'critical',
            status: 'Closed',
            timeline: [{ event: 'login' }],
            actions_taken: ['blocked']
        };

        const result = createIncidentFromData(data);

        expect(result.incident_id).toBe('INC-999');
        expect(result.timestamp).toBe('2023-01-01T00:00:00Z');
        expect(result.user).toBe('test@example.com');
        expect(result.login_ip).toBe('192.168.1.1');
        expect(result.location).toBe('New York');
        expect(result.mfa_used).toBe(true);
        expect(result.ioc_matched).toBe(true);
        expect(result.sensitive_data_accessed).toBe(true);
        expect(result.severity).toBe('Critical');
        expect(result.status).toBe('Closed');
        expect(result.timeline).toEqual([{ event: 'login' }]);
        expect(result.actions_taken).toEqual(['blocked']);
    });

    it('should normalize severity correctly', () => {
        expect(createIncidentFromData({ severity: 'HIGH' }).severity).toBe('High');
        expect(createIncidentFromData({ severity: 'low' }).severity).toBe('Low');
        expect(createIncidentFromData({ severity: 'MeDiUm' }).severity).toBe('Medium');
        expect(createIncidentFromData({ severity: 'c' }).severity).toBe('C');
    });

    it('should coerce boolean fields properly', () => {
        const dataTruthy = {
            mfa_used: 1,
            ioc_matched: 'yes',
            sensitive_data_accessed: {}
        };
        const resTruthy = createIncidentFromData(dataTruthy);
        expect(resTruthy.mfa_used).toBe(true);
        expect(resTruthy.ioc_matched).toBe(true);
        expect(resTruthy.sensitive_data_accessed).toBe(true);

        const dataFalsy = {
            mfa_used: 0,
            ioc_matched: '',
            sensitive_data_accessed: null
        };
        const resFalsy = createIncidentFromData(dataFalsy);
        expect(resFalsy.mfa_used).toBe(false);
        expect(resFalsy.ioc_matched).toBe(false);
        expect(resFalsy.sensitive_data_accessed).toBe(false);
    });

    it('should ignore non-array timeline and actions_taken', () => {
        const data = {
            timeline: 'not an array',
            actions_taken: { not: 'array' }
        };
        const result = createIncidentFromData(data);
        expect(result.timeline).toEqual([]);
        expect(result.actions_taken).toEqual([]);
    });
});
