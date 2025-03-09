import { getFirestore, doc, getDoc } from "firebase/firestore";

/**
 * Fetches user data from Firestore
 * 
 * @param {string} userId - The user's Firebase ID
 * @returns {Promise<object|null>} - The user data object or null if not found
 */
export async function getUserFromFirestore(userId) {
  if (!userId) {
    console.warn("getUserFromFirestore called without a userId");
    return null;
  }

  try {
    const firestore = getFirestore();
    const userRef = doc(firestore, "customers", userId);
    const userSnapshot = await getDoc(userRef);

    if (userSnapshot.exists()) {
      return { id: userSnapshot.id, ...userSnapshot.data() };
    } else {
      console.log(`No user found in Firestore with ID: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error("Error fetching user from Firestore:", error);
    return null;
  }
}
