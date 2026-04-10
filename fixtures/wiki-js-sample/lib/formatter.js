'use strict';

const DEFAULT_LOCALE = 'en-US';
const DEFAULT_CURRENCY = 'USD';

/**
 * Formats a Date object or timestamp into a human-readable string.
 * @param {Date|number|string} date
 * @param {{ locale?: string, format?: 'short'|'medium'|'long' }} [options]
 * @returns {string}
 */
function formatDate(date, options = {}) {
  const { locale = DEFAULT_LOCALE, format = 'medium' } = options;
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const dateStyles = { short: 'short', medium: 'medium', long: 'long' };
  return d.toLocaleDateString(locale, { dateStyle: dateStyles[format] });
}

/**
 * Formats a numeric amount as currency.
 * @param {number} amount
 * @param {{ currency?: string, locale?: string }} [options]
 * @returns {string}
 */
function formatCurrency(amount, options = {}) {
  const { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE } = options;
  if (typeof amount !== 'number' || isNaN(amount)) return 'Invalid amount';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Truncates a string to a given length, appending an ellipsis if needed.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
function truncate(text, maxLength = 80) {
  if (typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Converts a string to title case.
 * @param {string} text
 * @returns {string}
 */
function toTitleCase(text) {
  if (!text) return '';
  return text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
}

module.exports = { formatDate, formatCurrency, truncate, toTitleCase };
