import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { db } from '../firebase/firebase';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = useDispatch.withTypes();
export const useAppSelector = useSelector.withTypes();
export const useAppStore = useStore.withTypes();

// Subscribe to the user's unreadNotifications counter in real-time.
// Returns [count, loading]. If uid is falsy, returns [0, false].
export function useUnreadNotificationsCount(uid) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    if (!uid) {
      setCount(0);
      setLoading(false);
      return;
    }
    const ref = doc(db, 'users', uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setCount(
          snap.exists() && typeof snap.data().unreadNotifications === 'number'
            ? snap.data().unreadNotifications
            : 0,
        );
        setLoading(false);
      },
      (err) => {
        console.error('Unread notifications listener error', err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  return [count, loading];
}
