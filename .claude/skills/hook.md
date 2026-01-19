# /hook - Create a Custom React Hook

Create a custom React hook following RAGESTATE codebase patterns.

## Usage
```
/hook useHookName
```

## Instructions

When creating a hook:

1. **File Location**: `lib/hooks/useHookName.js`

2. **Hook Template**:
```javascript
// lib/hooks/useHookName.js

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * @typedef {Object} UseHookNameResult
 * @property {any} data - The data returned
 * @property {boolean} isLoading - Loading state
 * @property {Error|null} error - Error if any
 * @property {() => void} refetch - Function to refetch
 */

/**
 * Brief description of what this hook does
 * @param {string} param - Parameter description
 * @returns {UseHookNameResult}
 */
export function useHookName(param) {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      if (!param) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch logic here
        const result = await someAsyncOperation(param);

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err);
          console.error('useHookName error:', err);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [param]);

  const refetch = useCallback(() => {
    // Trigger refetch logic
  }, []);

  return { data, isLoading, error, refetch };
}
```

3. **For Firestore Real-time Listeners**:
```javascript
useEffect(() => {
  if (!userId) return;

  const unsubscribe = onSnapshot(
    query(collection(db, 'items'), where('userId', '==', userId)),
    (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setData(items);
      setIsLoading(false);
    },
    (error) => {
      setError(error);
      setIsLoading(false);
    }
  );

  return () => unsubscribe();
}, [userId]);
```

4. **Key Patterns**:
   - Always use `cancelled` flag for cleanup
   - Return unsubscribe functions from listeners
   - Use JSDoc for type annotations
   - Export as named function (not default)
   - Handle loading, error, and success states
   - Use `useCallback` for returned functions
   - Use `useRef` for values that shouldn't trigger re-renders

5. **Firebase Imports**:
```javascript
import { collection, doc, query, where, orderBy, limit, onSnapshot, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
```

Ask the user for:
- Hook name
- What data it should manage
- What parameters it needs
- Whether it uses Firestore (and which collections)
