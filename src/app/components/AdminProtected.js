"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '../../../firebase/context/FirebaseContext';
import { getDatabase, ref, get } from "firebase/database";
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase/firebase';

export default function AdminProtected({ children }) {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Checking authentication...');
  const { user } = useFirebase();
  const router = useRouter();

  useEffect(() => {
    async function checkAdminStatus() {
      try {
        // If not logged in, redirect
        if (!user) {
          console.log('No authenticated user found');
          setStatusMessage('Please log in to continue');
          router.push('/login?redirect=admin');
          return;
        }
        
        console.log('Checking admin status for user:', user.uid);
        setStatusMessage('Verifying admin permissions...');
        
        // First check RTDB
        const rtdb = getDatabase();
        const userRef = ref(rtdb, `users/${user.uid}`);
        let rtdbSnapshot;
        
        try {
          rtdbSnapshot = await get(userRef);
          console.log('RTDB snapshot exists:', rtdbSnapshot.exists());
          if (rtdbSnapshot.exists()) {
            console.log('RTDB user data:', rtdbSnapshot.val());
          }
        } catch (rtdbError) {
          console.error('Error fetching from RTDB:', rtdbError);
          setStatusMessage('Error accessing user data');
        }
        
        // Then check Firestore adminUsers collection
        let firestoreSnapshot;
        try {
          const firestoreAdminRef = doc(db, 'adminUsers', user.uid);
          firestoreSnapshot = await getDoc(firestoreAdminRef);
          console.log('Firestore admin document exists:', firestoreSnapshot.exists());
        } catch (firestoreError) {
          console.error('Error fetching from Firestore:', firestoreError);
          setStatusMessage('Error accessing admin data');
        }
        
        // User is admin if either check passes
        if (
          (rtdbSnapshot?.exists() && rtdbSnapshot.val().isAdmin === true) ||
          firestoreSnapshot?.exists()
        ) {
          console.log("User is confirmed admin");
          setStatusMessage('Admin access granted');
          setIsAdmin(true);
        } else {
          console.log('User is not an admin');
          setStatusMessage('Not authorized as admin');
          router.push('/');
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
        setStatusMessage('Error: ' + err.message);
        router.push('/');
      } finally {
        setLoading(false);
      }
    }
    
    checkAdminStatus();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500 mb-4"></div>
        <p className="text-white">{statusMessage}</p>
      </div>
    );
  }

  return isAdmin ? children : null;
}
