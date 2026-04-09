'use strict';

const { add, subtract, multiply, divide } = require('./lib/calculator');
const { validateEmail, validatePassword } = require('./lib/validator');
const { formatDate, formatCurrency } = require('./lib/formatter');
const { log, error, warn } = require('./utils/logger');
const { loadConfig, getEnv } = require('./utils/config');

/**
 * Initializes the application, loads config, and runs a self-test.
 */
function init() {
  const config = loadConfig({
    appName: getEnv('APP_NAME', 'wiki-js-sample'),
  });

  log('Application starting', { config });

  runSelfTest();
}

/**
 * Runs basic sanity checks across all library modules.
 */
function runSelfTest() {
  log('Running self-test...');

  // Calculator checks
  const sum = add(1, 2);
  if (sum !== 3) error('Calculator.add failed', { expected: 3, got: sum });

  const diff = subtract(10, 4);
  if (diff !== 6) error('Calculator.subtract failed', { expected: 6, got: diff });

  const product = multiply(3, 7);
  if (product !== 21) error('Calculator.multiply failed', { expected: 21, got: product });

  const quotient = divide(10, 2);
  if (quotient !== 5) error('Calculator.divide failed', { expected: 5, got: quotient });

  // Validator checks
  const emailResult = validateEmail('test@example.com');
  if (!emailResult.valid) warn('validateEmail false negative', emailResult);

  const passResult = validatePassword('SecurePass1');
  if (!passResult.valid) warn('validatePassword false negative', passResult);

  // Formatter checks
  const dateStr = formatDate(new Date('2024-01-15'));
  log('formatDate sample', { dateStr });

  const currencyStr = formatCurrency(1234.56);
  log('formatCurrency sample', { currencyStr });

  log('Self-test complete');
}

module.exports = { init, runSelfTest };

if (require.main === module) {
  init();
}
