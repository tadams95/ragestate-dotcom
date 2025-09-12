import { ref as dbRef, getDatabase, update } from 'firebase/database';
import { doc, getFirestore, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getStorage, listAll, ref } from 'firebase/storage';

/**
 * Removes a user's profile picture across Storage, Firestore, RTDB, and localStorage.
 * - Deletes all objects in `profilePictures/{uid}/` folder
 * - Clears `profilePicture` in `customers/{uid}` and RTDB root `${uid}`
 * - Mirrors removal to `profiles/{uid}.photoURL`
 * @param {string} uid
 */
export default async function removeProfileImage(uid) {
  if (!uid) throw new Error('uid required');

  const storage = getStorage();
  const firestore = getFirestore();
  const database = getDatabase();

  // 1) Delete all files under profilePictures/{uid}
  try {
    const folderRef = ref(storage, `profilePictures/${uid}`);
    const list = await listAll(folderRef);
    await Promise.all(list.items.map((item) => deleteObject(item)));
  } catch (err) {
    // If folder missing, ignore
    if (err?.code !== 'storage/object-not-found') {
      console.warn('Storage cleanup issue:', err);
    }
  }

  // 2) Clear Firestore customers/{uid}
  try {
    await updateDoc(doc(firestore, 'customers', uid), {
      profilePicture: '',
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to clear customers profilePicture:', err);
  }

  // 2b) Mirror removal to public profiles/{uid}
  try {
    await setDoc(
      doc(firestore, 'profiles', uid),
      { photoURL: '', lastUpdated: new Date().toISOString() },
      { merge: true },
    );
  } catch (err) {
    console.warn('Failed to clear profiles photoURL:', err);
  }

  // 3) Clear RTDB user root
  try {
    await update(dbRef(database, `${uid}`), {
      profilePicture: '',
      lastUpdated: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to clear RTDB profilePicture:', err);
  }

  // 4) Local storage cleanup
  try {
    localStorage.removeItem('profilePicture');
  } catch {}
}
