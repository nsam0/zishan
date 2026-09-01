/**
 * Security utilities for Global Skill Education
 */

/**
 * Neutralizes CSV formula injection according to OWASP guidelines.
 * Prepends a single quote to prevent execution in Excel / Google Sheets
 * if the text begins with =, +, -, @, tab, or carriage return.
 */
export function sanitizeCsvCell(value) {
  if (value === null || value === undefined) return '""';
  let str = String(value);

  // If the cell begins with dangerous spreadsheet formula triggers, prefix with an apostrophe
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = "'" + str;
  }

  // Escape any existing double quotes by doubling them, then wrap in quotes
  return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Validates email format strictly
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

/**
 * Sanitizes generic user input text
 */
export function sanitizeInput(text, maxLength = 255) {
  if (typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
}
