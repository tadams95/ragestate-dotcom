# /firebase-service - Create Firebase Service Functions

Create Firestore service functions following RAGESTATE codebase patterns.

## Usage
```
/firebase-service serviceName
```

## Instructions

When creating a Firebase service:

1. **File Location**: `lib/firebase/serviceName.js`

2. **Service Template**:
```javascript
// lib/firebase/serviceName.js

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/firebase';

const COLLECTION_NAME = 'collectionName';
const PAGE_SIZE = 20;

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get a single document by ID
 * @param {string} id - Document ID
 * @returns {Promise<Object|null>}
 */
export async function getItemById(id) {
  const docRef = doc(db, COLLECTION_NAME, id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  return {
    id: docSnap.id,
    ...docSnap.data(),
  };
}

/**
 * Get items with pagination
 * @param {Object} options
 * @param {string} options.userId - Filter by user
 * @param {any} [options.lastDoc] - Last document for pagination
 * @param {number} [options.pageSize] - Items per page
 * @returns {Promise<{items: Object[], lastDoc: any, hasMore: boolean}>}
 */
export async function getItems({ userId, lastDoc, pageSize = PAGE_SIZE }) {
  const constraints = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(collection(db, COLLECTION_NAME), ...constraints);
  const snapshot = await getDocs(q);

  const items = snapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
    createdAt: docSnap.data().createdAt?.toDate() || new Date(),
  }));

  return {
    items,
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
    hasMore: snapshot.size === pageSize,
  };
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

/**
 * Subscribe to items in real-time
 * @param {string} userId - User ID to filter by
 * @param {(items: Object[]) => void} onUpdate - Callback on updates
 * @param {(error: Error) => void} onError - Callback on error
 * @returns {() => void} Unsubscribe function
 */
export function subscribeToItems(userId, onUpdate, onError) {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      }));
      onUpdate(items);
    },
    (error) => {
      console.error('subscribeToItems error:', error);
      onError(error);
    }
  );
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new item
 * @param {Object} data - Item data
 * @returns {Promise<string>} Created document ID
 */
export async function createItem(data) {
  const docRef = await addDoc(collection(db, COLLECTION_NAME), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing item
 * @param {string} id - Document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateItem(id, updates) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

// ============================================
// FILE UPLOADS
// ============================================

/**
 * Upload a file to Firebase Storage
 * @param {string} path - Storage path (e.g., 'images/user123/photo.jpg')
 * @param {File} file - File to upload
 * @param {(progress: number) => void} [onProgress] - Progress callback (0-100)
 * @returns {Promise<string>} Download URL
 */
export async function uploadFile(path, file, onProgress) {
  const storageRef = ref(storage, path);

  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress?.(progress);
      },
      (error) => {
        console.error('Upload error:', error);
        reject(error);
      },
      async () => {
        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadUrl);
      }
    );
  });
}
```

3. **Key Patterns**:
   - Use JSDoc for all function documentation
   - Always handle Timestamp conversion (`.toDate()`)
   - Use `serverTimestamp()` for createdAt/updatedAt
   - Return unsubscribe functions from listeners
   - Use pagination with `startAfter` for large collections
   - Handle errors and log them

4. **Firestore Security**: Remember that security rules on the backend control access. Service functions should assume the user is authenticated.

Ask the user for:
- Service name
- What collection(s) it operates on
- What operations are needed (CRUD, subscriptions, etc.)
- Any special query requirements
