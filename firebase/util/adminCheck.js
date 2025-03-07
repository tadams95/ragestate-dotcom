import { getDatabase, ref, get } from 'firebase/database';
import { auth } from '../firebase';

// This is a client-side admin check function
// In production, you should implement admin verification through Firebase Functions
export async function isUserAdmin() {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return false;
    }
    
    const db = getDatabase();
    const adminRef = ref(db, `users/${currentUser.uid}`);
    const snapshot = await get(adminRef);
    
    if (snapshot.exists() && snapshot.val().isAdmin === true) {
      console.log('User is confirmed as admin');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

// Admin emails array for quick checks during development
export const ADMIN_EMAILS = [
  'tyrelle@ragestate.com',
  'admin@ragestate.com',
  // Add other admin emails as needed
];

// Helper function to check if an email is in the admin list
export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email?.toLowerCase());
}
