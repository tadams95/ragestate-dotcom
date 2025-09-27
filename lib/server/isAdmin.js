import { authAdmin, firestoreAdmin } from './firebaseAdmin';

// Checks if a uid corresponds to an admin (custom claim OR adminUsers/{uid} doc)
export async function userIsAdmin(uid) {
  if (!uid) return false;
  try {
    const user = await authAdmin.getUser(uid);
    if (user.customClaims && user.customClaims.admin) return true;
  } catch (e) {
    // ignore not found
  }
  try {
    const doc = await firestoreAdmin.collection('adminUsers').doc(uid).get();
    if (doc.exists) return true;
  } catch (e) {
    // ignore
  }
  return false;
}
