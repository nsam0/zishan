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
 * Returns YYYY-MM-DD in local device timezone (prevents UTC day shifts)
 */
export function getLocalDateString(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

