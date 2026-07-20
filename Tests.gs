/**
 * Test function for ipToInt.
 * Runs assertions and logs passes/failures.
 * This is meant to be run manually from the Google Apps Script editor.
 */
function testIpToInt() {
  var passed = 0;
  var failed = 0;

  function assertEqual(actual, expected, testName) {
    if (actual === expected) {
      console.log('✅ PASS: ' + testName);
      passed++;
    } else {
      console.error('❌ FAIL: ' + testName + ' | Expected: ' + expected + ', Actual: ' + actual);
      failed++;
    }
  }

  console.log('--- Running Tests for ipToInt ---');

  // Happy paths
  assertEqual(ipToInt('192.168.1.1'), 3232235777, 'Valid IP 192.168.1.1');
  assertEqual(ipToInt('255.255.255.255'), 4294967295, 'Max IP 255.255.255.255');
  assertEqual(ipToInt('0.0.0.0'), 0, 'Min IP 0.0.0.0');

  // Edge cases
  assertEqual(ipToInt(''), 0, 'Empty string returns 0');
  assertEqual(ipToInt('   '), 0, 'Whitespace string returns 0');
  assertEqual(ipToInt(undefined), 0, 'Undefined returns 0');
  assertEqual(ipToInt(null), 0, 'Null returns 0');
  assertEqual(ipToInt(123), 0, 'Number returns 0');

  // Malformed IPs
  assertEqual(ipToInt('a.b.c.d'), 0, 'Non-numeric octets return 0');
  assertEqual(ipToInt('192.168.a.1'), 3232235521, 'Partial non-numeric octets'); // 192=C0, 168=A8, a=00, 1=01 -> C0A80001
  assertEqual(ipToInt('1.1'), 257, 'Incomplete IP 1.1');

  console.log('--- Test Summary ---');
  console.log('Total: ' + (passed + failed) + ', Passed: ' + passed + ', Failed: ' + failed);
}

/**
 * Tests for the cidrContainsIp function.
 */
function testCidrContainsIp() {
  logActivity('Running testCidrContainsIp...', 'INFO');
  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (!condition) {
      logActivity(`TEST FAILED: ${message}`, 'ERROR');
      testsFailed++;
    } else {
      testsPassed++;
    }
  }

  // Normal /24 subnet tests
  assert(cidrContainsIp('192.168.1.0/24', '192.168.1.100') === true, "192.168.1.100 should be in 192.168.1.0/24");
  assert(cidrContainsIp('192.168.1.0/24', '192.168.2.100') === false, "192.168.2.100 should NOT be in 192.168.1.0/24");

  // Exact match /32
  assert(cidrContainsIp('10.0.0.1/32', '10.0.0.1') === true, "10.0.0.1 should be in 10.0.0.1/32");
  assert(cidrContainsIp('10.0.0.1/32', '10.0.0.2') === false, "10.0.0.2 should NOT be in 10.0.0.1/32");

  // Broad /8 subnet
  assert(cidrContainsIp('10.0.0.0/8', '10.255.255.255') === true, "10.255.255.255 should be in 10.0.0.0/8");
  assert(cidrContainsIp('10.0.0.0/8', '11.0.0.0') === false, "11.0.0.0 should NOT be in 10.0.0.0/8");

  // Edge case: /0 subnet (should contain everything)
  assert(cidrContainsIp('0.0.0.0/0', '8.8.8.8') === true, "8.8.8.8 should be in 0.0.0.0/0");
  assert(cidrContainsIp('0.0.0.0/0', '255.255.255.255') === true, "255.255.255.255 should be in 0.0.0.0/0");

  logActivity(`Tests completed. Passed: ${testsPassed}, Failed: ${testsFailed}`, testsFailed === 0 ? 'INFO' : 'ERROR');

  if (testsFailed > 0) {
    throw new Error(`${testsFailed} tests failed in testCidrContainsIp`);
  }
}
