'use client';

/**
 * User-friendly error state component for admin sections
 * @param {string} title - Error title
 * @param {string} message - User-friendly error message
 * @param {function} onRetry - Callback when retry button is clicked
 * @param {string} variant - 'inline' (default) or 'fullPage'
 */
export default function AdminErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  variant = 'inline',
}) {
  // Map technical errors to user-friendly messages
  const friendlyMessage = getFriendlyMessage(message);

  if (variant === 'fullPage') {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="animate-error-shake mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
            <svg
              className="h-8 w-8 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">{title}</h3>
          <p className="mb-6 text-[var(--text-secondary)]">{friendlyMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-red-500"
            >
              <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-error-shake rounded-lg border border-red-500/30 bg-red-500/10 p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-500">{title}</h3>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">{friendlyMessage}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-3 text-sm font-medium text-red-500 transition-colors hover:text-red-400"
            >
              Try again →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Convert technical error messages to user-friendly text
 */
function getFriendlyMessage(technicalMessage) {
  if (!technicalMessage) {
    return 'An unexpected error occurred. Please try again.';
  }

  const lowered = technicalMessage.toLowerCase();

  // Network/connectivity errors
  if (lowered.includes('network') || lowered.includes('fetch') || lowered.includes('connection')) {
    return 'Unable to connect. Please check your internet connection and try again.';
  }

  // Permission/auth errors
  if (
    lowered.includes('permission') ||
    lowered.includes('unauthorized') ||
    lowered.includes('forbidden')
  ) {
    return "You don't have permission to access this data. Please contact an administrator.";
  }

  // Not found errors
  if (lowered.includes('not found') || lowered.includes('404')) {
    return 'The requested data could not be found.';
  }

  // Timeout errors
  if (lowered.includes('timeout') || lowered.includes('timed out')) {
    return 'The request took too long to complete. Please try again.';
  }

  // Firebase/Firestore specific
  if (lowered.includes('firestore') || lowered.includes('firebase')) {
    return 'Unable to load data from the database. Please try again.';
  }

  // Rate limiting
  if (lowered.includes('rate') || lowered.includes('too many')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Default: return original if it looks user-friendly (no stack trace, short)
  if (technicalMessage.length < 100 && !technicalMessage.includes('\n')) {
    return technicalMessage;
  }

  return 'An unexpected error occurred. Please try again.';
}
