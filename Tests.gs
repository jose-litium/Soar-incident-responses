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
