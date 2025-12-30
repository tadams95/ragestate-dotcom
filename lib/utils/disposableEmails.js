/**
 * Disposable/temporary email domain blocklist
 * These domains are commonly used for spam account creation
 */

const DISPOSABLE_DOMAINS = new Set([
  // Popular disposable email services
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'guerrillamail.com',
  'guerrillamail.org',
  'guerrillamail.net',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  '10minutemail.com',
  '10minutemail.net',
  'minutemail.com',
  'tempail.com',
  'throwaway.email',
  'throwawaymail.com',
  'fakeinbox.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.org',
  'mailnesia.com',
  'maildrop.cc',
  'dispostable.com',
  'getnada.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'emailondeck.com',
  'mohmal.com',
  'tempinbox.com',
  'discard.email',
  'discardmail.com',
  'spamgourmet.com',
  'mytemp.email',
  'mailcatch.com',
  'mailsac.com',
  'inboxalias.com',
  'spamex.com',
  'spam4.me',
  'getairmail.com',
  'fakemailgenerator.com',
  'emailfake.com',
  'crazymailing.com',
  'tempmailo.com',
  'tempmailaddress.com',
  'burnermail.io',
  'mailnator.com',
  'tmails.net',
  'moakt.com',
  'tempsky.com',
]);

/**
 * Check if an email uses a disposable/temporary domain
 * @param {string} email - Email address to check
 * @returns {{ isDisposable: boolean, domain: string | null }}
 */
export function isDisposableEmail(email) {
  if (!email || typeof email !== 'string') {
    return { isDisposable: false, domain: null };
  }

  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) {
    return { isDisposable: false, domain: null };
  }

  const domain = parts[1];
  return {
    isDisposable: DISPOSABLE_DOMAINS.has(domain),
    domain: DISPOSABLE_DOMAINS.has(domain) ? domain : null,
  };
}

/**
 * Validate email is not from a disposable domain
 * @param {string} email - Email address to validate
 * @returns {string | null} - Error message if invalid, null if valid
 */
export function validateEmailDomain(email) {
  const { isDisposable } = isDisposableEmail(email);
  if (isDisposable) {
    return 'Please use a permanent email address. Temporary/disposable emails are not allowed.';
  }
  return null;
}
