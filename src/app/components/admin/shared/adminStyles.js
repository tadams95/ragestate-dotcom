/**
 * Standardized admin button and input styles
 * Import and use across all admin components for consistency
 */

export const adminButtonPrimary =
  'inline-flex items-center justify-center rounded-md bg-red-600 hover:bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow transition disabled:opacity-50 disabled:cursor-not-allowed btn-wipe-border';

export const adminButtonSecondary =
  'flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-[var(--text-primary)] shadow-sm hover:bg-red-500 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border-2 border-[var(--border-subtle)] transition-all duration-200 btn-wipe-border';

export const adminButtonOutline =
  'rounded-md border border-[var(--border-subtle)] px-3 py-1 text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)] transition-colors btn-wipe-border';

export const adminInput =
  'block w-full bg-[var(--bg-elev-2)] rounded-md border-0 py-1.5 px-3 text-[var(--text-primary)] shadow-sm ring-1 ring-inset ring-[var(--border-subtle)] placeholder:text-[var(--text-tertiary)] sm:text-sm sm:leading-6 input-focus-animate';

export const adminCard =
  'rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl';

export const adminTableContainer =
  'overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-md';
