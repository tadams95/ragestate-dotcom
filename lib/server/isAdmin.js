import { getDatabase } from 'firebase-admin/database';
import { authAdmin, firestoreAdmin } from './firebaseAdmin';

// Checks if a uid corresponds to an admin (custom claim OR adminUsers/{uid} doc)
export async function userIsAdmin(uid) {
  const info = await userAdminInfo(uid);
  return info.isAdmin;
}

export async function userAdminInfo(uid) {
  const result = {
    uid: uid || null,
    isAdmin: false,
    sources: {
      customClaim: false,
      adminUsersDoc: false,
      altCollection: null,
      rtdbFlag: false,
    },
    errors: {
      customClaim: null,
      adminUsersDoc: null,
      altCollections: {},
      rtdb: null,
    },
    adminUsersDocData: null,
  };

  if (!uid) return result;

  // 1. Custom claims
  try {
    const user = await authAdmin.getUser(uid);
    if (user.customClaims?.admin === true) {
      result.sources.customClaim = true;
      result.isAdmin = true;
    }
  } catch (e) {
    result.errors.customClaim = e.message || String(e);
  }

  // 2. Primary collection adminUsers
  try {
    const doc = await firestoreAdmin.collection('adminUsers').doc(uid).get();
    if (doc.exists) {
      result.sources.adminUsersDoc = true;
      result.adminUsersDocData = doc.data() || {};
      result.isAdmin = true;
    }
  } catch (e) {
    result.errors.adminUsersDoc = e.message || String(e);
  }

  // 3. Alternate collections
  if (!result.isAdmin) {
    const altCollections = ['admins', 'administrators', 'admin'];
    for (const col of altCollections) {
      try {
        const d = await firestoreAdmin.collection(col).doc(uid).get();
        if (d.exists) {
          result.sources.altCollection = col;
          result.isAdmin = true;
          break;
        }
      } catch (e) {
        result.errors.altCollections[col] = e.message || String(e);
      }
    }
  }

  // 4. RTDB fallback
  if (!result.isAdmin) {
    try {
      const db = getDatabase();
      const snap = await db.ref(`users/${uid}`).get();
      if (snap.exists()) {
        const val = snap.val();
        if (val?.isAdmin === true || val?.role === 'admin' || val?.permissions?.admin === true) {
          result.sources.rtdbFlag = true;
          result.isAdmin = true;
        }
      }
    } catch (e) {
      result.errors.rtdb = e.message || String(e);
    }
  }

  return result;
}
