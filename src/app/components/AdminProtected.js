"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../firebase/context/FirebaseContext";
import { checkIsAdmin } from "../../../lib/firebase/adminService";

const AdminProtected = ({ children }) => {
  const router = useRouter();
  const { currentUser, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdminStatusFn() {
      if (loading) {
        return;
      }

      if (!currentUser) {
        router.push('/login?redirect=admin');
        return;
      }

      try {
        const isUserAdmin = await checkIsAdmin(currentUser.uid);

        if (!isUserAdmin) {
          router.push('/');
        } else {
          setIsAdmin(true);
        }
      } catch (error) {
        console.error("Error checking admin status:", error);
        router.push('/');
      } finally {
        setChecking(false);
      }
    }

    checkAdminStatusFn();
  }, [currentUser, loading, router]);

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
