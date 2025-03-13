export function handleAuthError(error) {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'Email already exists. Please log in or use a different email.';
    case 'auth/invalid-email':
      return 'Invalid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak.';
    default:
      return error.message || 'An error occurred during sign up.';
  }
}
