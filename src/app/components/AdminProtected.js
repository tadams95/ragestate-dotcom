"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebase, useAuth } from "../../../firebase/context/FirebaseContext";

const AdminProtected = ({ children }) => {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const firebase = useFirebase();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (loading) {
        console.log("Auth state is still loading");
        return;
      }
      
      console.log("Current user in AdminProtected:", currentUser);
      
      if (!currentUser) {
        console.log("No user found, redirecting to login");
        router.push('/login?redirect=admin');
        return;
      }

      try {
        console.log("Checking if user is admin:", currentUser.uid);
        // Use the checkIsAdmin function from firebase context
        const isUserAdmin = await firebase.checkIsAdmin(currentUser.uid);
        console.log("Admin check result:", isUserAdmin);
        
        if (!isUserAdmin) {
          console.log("User is not an admin, redirecting to home");
          router.push('/');
        } else {
          console.log("User confirmed as admin");
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push('/');
      } finally {
        setChecking(false);
      }
    }

    checkAdminStatus();
  }, [currentUser, loading, router, firebase]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-black flex justify-center items-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-500"></div>
      </div>
    );
  }

  return isAdmin ? children : null;
};

export default AdminProtected;
