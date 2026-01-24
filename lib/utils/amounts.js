/**
 * Amount Utilities
 * Functions for handling monetary amounts consistently
 *
 * CONVENTION: All monetary amounts should be stored as integers in cents
 * Example: $10.99 = 1099 cents
 */

// ============================================
// CONVERSION FUNCTIONS
// ============================================

/**
 * Convert dollars to cents (integer)
 * Handles floating point precision issues
 * @param {number} dollars - Amount in dollars
 * @returns {import('../types/common').AmountCents} Amount in cents
 * @example
 * dollarsToCents(10.99) // returns 1099
 * dollarsToCents(10) // returns 1000
 */
export function dollarsToCents(dollars) {
  if (typeof dollars !== 'number' || isNaN(dollars)) {
    return 0;
  }
  // Use Math.round to handle floating point precision issues
  return Math.round(dollars * 100);
}

/**
 * Convert cents to dollars
 * @param {import('../types/common').AmountCents} cents - Amount in cents
 * @returns {number} Amount in dollars
 * @example
 * centsToDollars(1099) // returns 10.99
 * centsToDollars(1000) // returns 10
 */
export function centsToDollars(cents) {
  if (typeof cents !== 'number' || isNaN(cents)) {
    return 0;
  }
  return cents / 100;
}

// ============================================
// FORMATTING FUNCTIONS
// ============================================

/**
 * Format cents as a currency string
 * @param {import('../types/common').AmountCents} cents - Amount in cents
 * @param {string} [currency='USD'] - Currency code
 * @param {string} [locale='en-US'] - Locale for formatting
 * @returns {string} Formatted currency string
 * @example
 * formatCents(1099) // returns "$10.99"
 * formatCents(1000) // returns "$10.00"
 * formatCents(0) // returns "$0.00"
 */
export function formatCents(cents, currency = 'USD', locale = 'en-US') {
  if (typeof cents !== 'number' || isNaN(cents)) {
    cents = 0;
  }

  const dollars = cents / 100;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

/**
 * Format cents as a compact currency string (no decimal for whole dollars)
 * @param {import('../types/common').AmountCents} cents - Amount in cents
 * @param {string} [currency='USD'] - Currency code
 * @param {string} [locale='en-US'] - Locale for formatting
 * @returns {string} Formatted currency string
 * @example
 * formatCentsCompact(1099) // returns "$10.99"
 * formatCentsCompact(1000) // returns "$10"
 */
export function formatCentsCompact(cents, currency = 'USD', locale = 'en-US') {
  if (typeof cents !== 'number' || isNaN(cents)) {
    cents = 0;
  }

  const dollars = cents / 100;
  const isWholeNumber = cents % 100 === 0;

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: isWholeNumber ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}

// ============================================
// PARSING FUNCTIONS
// ============================================

/**
 * Parse a string or number to cents
 * Handles various input formats safely
 * @param {string|number} value - Value to parse (can be dollars or a string like "$10.99")
 * @returns {import('../types/common').AmountCents} Amount in cents, or 0 if invalid
 * @example
 * parseToCents(10.99) // returns 1099
 * parseToCents("10.99") // returns 1099
 * parseToCents("$10.99") // returns 1099
 * parseToCents("invalid") // returns 0
 */
export function parseToCents(value) {
  if (value === null || value === undefined) {
    return 0;
  }

  // If already a number, treat as dollars and convert
  if (typeof value === 'number') {
    if (isNaN(value)) return 0;
    return Math.round(value * 100);
  }

  // If string, clean and parse
  if (typeof value === 'string') {
    // Remove currency symbols, commas, and whitespace
    const cleaned = value.replace(/[$,\s]/g, '').trim();

    if (cleaned === '') return 0;

    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;

    return Math.round(parsed * 100);
  }

  return 0;
}

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Check if a value is a valid amount in cents (non-negative integer)
 * @param {any} value - Value to validate
 * @returns {boolean} True if valid cents amount
 * @example
 * isValidCents(1099) // returns true
 * isValidCents(-100) // returns false
 * isValidCents(10.5) // returns false (not integer)
 * isValidCents("100") // returns false (not number)
 */
export function isValidCents(value) {
  return (
    typeof value === 'number' &&
    !isNaN(value) &&
    value >= 0 &&
    Number.isInteger(value)
  );
}

// ============================================
// CALCULATION HELPERS
// ============================================

/**
 * Add multiple cent amounts safely
 * @param {...import('../types/common').AmountCents} amounts - Amounts to add
 * @returns {import('../types/common').AmountCents} Sum in cents
 * @example
 * addCents(100, 200, 300) // returns 600
 */
export function addCents(...amounts) {
  return amounts.reduce((sum, amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return sum;
    return sum + Math.round(amount);
  }, 0);
}

/**
 * Calculate percentage of an amount in cents
 * @param {import('../types/common').AmountCents} cents - Base amount in cents
 * @param {number} percentage - Percentage (e.g., 10 for 10%)
 * @returns {import('../types/common').AmountCents} Calculated amount in cents
 * @example
 * percentageOfCents(1000, 10) // returns 100 (10% of $10)
 */
export function percentageOfCents(cents, percentage) {
  if (typeof cents !== 'number' || typeof percentage !== 'number') {
    return 0;
  }
  return Math.round((cents * percentage) / 100);
}
