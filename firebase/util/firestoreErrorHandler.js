/**
 * Utility functions for Firestore error handling and troubleshooting
 */

// Get a human-readable error message for common Firestore errors
export function getFirestoreErrorMessage(error) {
  if (!error) return "Unknown error occurred";
  
  // Parse the error code or use the message if no code
  const errorCode = error.code || '';
  
  switch (errorCode) {
    case 'permission-denied':
      return 'You do not have permission to perform this operation. Please check your authentication and Firestore rules.';
      
    case 'unavailable':
      return 'The service is currently unavailable. Please try again later.';
      
    case 'not-found':
      return 'The requested document or collection does not exist.';
      
    case 'already-exists':
      return 'The document already exists and cannot be overwritten.';
      
    case 'resource-exhausted':
      return 'Too many requests or quota exceeded. Please try again later.';
      
    case 'failed-precondition':
      return 'Operation failed due to a precondition failure. The database may be in an inconsistent state.';
      
    case 'invalid-argument':
      return 'Invalid argument provided to the Firestore operation.';
      
    default:
      // If there's no recognized code, return the message or a generic error
      return error.message || 'An error occurred while accessing Firestore';
  }
}

// Log detailed error information for debugging
export function logFirestoreError(error, operationContext = {}) {
  console.error('Firestore Error:', {
    code: error.code,
    message: error.message,
    stack: error.stack,
    context: operationContext,
    timestamp: new Date().toISOString()
  });
}

// Check if Firestore is accessible
export async function checkFirestoreConnection(firestore) {
  try {
    // Try to access a special diagnostic document
    const testRef = doc(firestore, '_system_/connection_test');
    await setDoc(testRef, { 
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString() 
    }, { merge: true });
    
    return { connected: true };
  } catch (error) {
    logFirestoreError(error, { operation: 'checkFirestoreConnection' });
    return { 
      connected: false, 
      error: getFirestoreErrorMessage(error),
      errorDetails: error 
    };
  }
}

// Verify a user has access to their purchases collection
export async function verifyUserPurchasesAccess(firestore, userId) {
  if (!userId) return { access: false, error: 'No user ID provided' };
  
  try {
    // Try to read from the user's purchases collection
    const purchasesRef = collection(firestore, `customers/${userId}/purchases`);
    const querySnapshot = await getDocs(query(purchasesRef, limit(1)));
    
    return { 
      access: true,
      isEmpty: querySnapshot.empty,
      documentsCount: querySnapshot.size
    };
  } catch (error) {
    logFirestoreError(error, { 
      operation: 'verifyUserPurchasesAccess', 
      userId 
    });
    
    return {
      access: false,
      error: getFirestoreErrorMessage(error),
      errorDetails: error
    };
  }
}
