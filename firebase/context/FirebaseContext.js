"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getDatabase, ref as dbRef, get as dbGet } from "firebase/database";

// Create context
const FirebaseContext = createContext();

// Context provider component
export function FirebaseProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Set persistence to LOCAL when the component mounts
  useEffect(() => {
    // Set persistence once on initialization
    setPersistence(auth, browserLocalPersistence)
      .catch((error) => {
        console.error("Error setting auth persistence:", error);
      });
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    console.log("Setting up auth state listener");
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      console.log("Auth state changed:", authUser ? "User logged in" : "No user");
      setUser(authUser);
      setLoading(false);
    }, (error) => {
      console.error("Auth state error:", error);
      setError(error.message);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, []);
  
  // Firebase data fetching functions
  const fetchOrders = async (limitCount = 100) => {
    try {
      if (!user) {
        throw new Error("Authentication required to fetch orders");
      }
      
      // Let's make sure we're checking for admin status first
      // This is important because regular users can't access all orders
      const isAdmin = await checkIsAdmin(user.uid);
      if (!isAdmin) {
        console.warn("Non-admin user attempting to access all orders");
        // For non-admins, we should only fetch their orders
        // But for simplicity in this admin panel, we'll just return an empty array
        return [];
      }
      
      console.log("Admin user fetching orders");
      const ordersQuery = query(
        collection(db, "purchases"), 
        orderBy("orderDate", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(ordersQuery);
      
      // Handle potential timestamp issues more gracefully
      return snapshot.docs.map(doc => {
        const data = doc.data();
        let orderDate = null;
        
        try {
          orderDate = data.orderDate?.toDate();
        } catch (err) {
          orderDate = new Date();
        }
        
        return {
          id: doc.id,
          ...data,
          orderDate
        };
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
      throw error;
    }
  };
  
  const fetchUsers = async (limitCount = 100) => {
    try {
      // Add debugging logs
      console.log("Fetching users, auth state:", { user, loading });
      
      if (!user) {
        throw new Error("Authentication required to fetch users");
      }
      
      // Check admin status before proceeding
      const isAdmin = await checkIsAdmin(user.uid);
      console.log("Admin status check result:", isAdmin);
      
      if (!isAdmin) {
        console.warn("Non-admin user attempting to access all users");
        return [];
      }
      
      // Use RTDB for user data since that's where the actual data is stored
      console.log("Fetching users from Realtime Database");
      const database = getDatabase();
      const usersRef = dbRef(database, 'users');
      const snapshot = await dbGet(usersRef);
      
      if (!snapshot.exists()) {
        console.warn("No users found in RTDB");
        return [];
      }
      
      // Convert the object to an array of users with IDs
      const userData = snapshot.val();
      const userArray = Object.entries(userData).map(([id, data]) => ({
        id,
        ...data,
        email: data.email || "No email",
        name: data.name || data.displayName || "Unknown",
        joinDate: data.createdAt || new Date().toISOString() // Use ISO string for consistency
      }));
      
      console.log(`Found ${userArray.length} users`);
      
      // Limit the results if needed
      return userArray.slice(0, limitCount);
    } catch (error) {
      console.error("Error fetching users:", error);
      throw error;
    }
  };

  const fetchEvents = async (limitCount = 100) => {
    try {
      // Events have public read access according to your rules
      const eventsQuery = query(
        collection(db, "events"),
        orderBy("date", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(eventsQuery);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        let eventDate = null;
        
        try {
          eventDate = data.date?.toDate();
        } catch (err) {
          console.warn(`Error converting date for event ${doc.id}:`, err);
          eventDate = new Date();
        }
        
        return {
          id: doc.id,
          ...data,
          eventDate
        };
      });
    } catch (error) {
      console.error("Error fetching events:", error);
      throw error;
    }
  };
  
  const fetchPromoterCodes = async () => {
    try {
      // According to your rules, this requires authentication
      if (!user) {
        throw new Error("User must be authenticated to fetch promoter codes");
      }
      
      const codesQuery = query(collection(db, "promoterCodes"));
      const snapshot = await getDocs(codesQuery);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Error fetching promoter codes:", error);
      throw error;
    }
  };

  // New function to fetch all purchases across users
  const fetchAllPurchases = async (limitCount = 100) => {
    try {
      if (!user) {
        throw new Error("Authentication required to fetch purchases");
      }
      
      const isAdmin = await checkIsAdmin(user.uid);
      if (!isAdmin) {
        console.warn("Non-admin user attempting to access all purchases");
        return [];
      }

      // For an admin, fetch from the global purchases collection
      console.log("Fetching purchases from global purchases collection");
      const purchasesQuery = query(
        collection(db, "purchases"),
        orderBy("orderDate", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(purchasesQuery);
      return snapshot.docs.map(doc => {
        const data = doc.data();
        let orderDate = null;
        
        try {
          orderDate = data.orderDate?.toDate() || data.dateTime?.toDate();
        } catch (err) {
          orderDate = new Date();
        }
        
        return {
          id: doc.id,
          ...data,
          orderDate,
          // Format customer info
          customerName: data.customerName || data.name || "Anonymous",
          customerEmail: data.customerEmail || data.email || "Unknown",
          // Calculate total from cart items if needed
          totalAmount: data.totalAmount || data.cartItems?.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0) || 0,
          // Extract shipping info for display
          shippingAddress: data.addressDetails?.address ? 
            `${data.addressDetails.address.line1}, ${data.addressDetails.address.city}, ${data.addressDetails.address.state} ${data.addressDetails.address.postalCode}` : 
            "No shipping info"
        };
      });
    } catch (error) {
      console.error("Error fetching all purchases:", error);
      throw error;
    }
  };

  // Function to fetch user purchases from their individual collection
  const fetchUserPurchases = async (userId, limitCount = 20) => {
    try {
      if (!user) {
        throw new Error("Authentication required to fetch user purchases");
      }
      
      // Only allow for current user or admin
      const isAdmin = await checkIsAdmin(user.uid);
      if (!isAdmin && user.uid !== userId) {
        throw new Error("Unauthorized to view other users' purchases");
      }
      
      const userPurchasesQuery = query(
        collection(db, `customers/${userId}/purchases`),
        orderBy("orderDate", "desc"),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(userPurchasesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        orderDate: doc.data().orderDate?.toDate() || doc.data().dateTime?.toDate() || new Date()
      }));
    } catch (error) {
      console.error(`Error fetching purchases for user ${userId}:`, error);
      throw error;
    }
  };

  // Fetch detailed information about a specific purchase
  const fetchPurchaseDetails = async (purchaseId) => {
    try {
      if (!user) {
        throw new Error("Authentication required to fetch purchase details");
      }
      
      const isAdmin = await checkIsAdmin(user.uid);
      if (!isAdmin) {
        // For non-admins, verify this purchase belongs to them
        // You'd need to implement this check
      }
      
      const purchaseDocRef = doc(db, "purchases", purchaseId);
      const purchaseDoc = await getDoc(purchaseDocRef);
      
      if (!purchaseDoc.exists()) {
        throw new Error(`Purchase ${purchaseId} not found`);
      }
      
      const purchaseData = purchaseDoc.data();
      
      // Get any ticket subcollections
      const ticketsQuery = query(collection(purchaseDocRef, "tickets"));
      const ticketsSnapshot = await getDocs(ticketsQuery);
      const tickets = ticketsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get any physical items subcollections
      const physicalItemsQuery = query(collection(purchaseDocRef, "physicalItems"));
      const physicalItemsSnapshot = await getDocs(physicalItemsQuery);
      const physicalItems = physicalItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Get any digital items subcollections
      const digitalItemsQuery = query(collection(purchaseDocRef, "digitalItems"));
      const digitalItemsSnapshot = await getDocs(digitalItemsQuery);
      const digitalItems = digitalItemsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return {
        ...purchaseData,
        id: purchaseId,
        orderDate: purchaseData.orderDate?.toDate() || purchaseData.dateTime?.toDate() || new Date(),
        tickets,
        physicalItems,
        digitalItems,
        // Include raw data for debugging
        raw: purchaseData
      };
    } catch (error) {
      console.error(`Error fetching details for purchase ${purchaseId}:`, error);
      throw error;
    }
  };

  // Improved admin check function with more debugging
  const checkIsAdmin = async (userId) => {
    try {
      if (!userId) {
        console.log("No userId provided for admin check");
        return false;
      }
      
      console.log(`Checking admin status for user: ${userId}`);
      
      // First check RTDB for isAdmin flag
      const database = getDatabase();
      const rtdbAdminRef = dbRef(database, `users/${userId}`);
      const rtdbSnapshot = await dbGet(rtdbAdminRef);
      
      if (rtdbSnapshot.exists()) {
        const userData = rtdbSnapshot.val();
        console.log("User data from RTDB:", userData);
        
        if (userData.isAdmin === true) {
          console.log("Admin confirmed via RTDB isAdmin flag");
          return true;
        }
        
        // Additional checks for admin role or permission
        if (userData.role === 'admin' || userData.permissions?.admin === true) {
          console.log("Admin confirmed via RTDB role/permissions");
          return true;
        }
      } else {
        console.log("User not found in RTDB");
      }
      
      // Then check Firestore adminUsers collection
      try {
        const adminDocRef = doc(db, 'adminUsers', userId);
        const adminDocSnap = await getDoc(adminDocRef);
        
        if (adminDocSnap.exists()) {
          console.log("Admin confirmed via Firestore adminUsers collection");
          return true;
        } else {
          console.log("User not found in Firestore adminUsers collection");
        }
        
        // Try alternative admin collections
        const altCollections = ['admins', 'administrators', 'admin'];
        for (const collection of altCollections) {
          const altAdminDocRef = doc(db, collection, userId);
          const altAdminDocSnap = await getDoc(altAdminDocRef);
          
          if (altAdminDocSnap.exists()) {
            console.log(`Admin confirmed via Firestore ${collection} collection`);
            return true;
          }
        }
      } catch (firestoreError) {
        console.warn("Error checking admin status in Firestore:", firestoreError);
      }
      
      console.log("User is not an admin");
      return false;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  };

  const saveUserPurchase = async (purchaseData) => {
    try {
      if (!user) {
        throw new Error("User must be authenticated to save purchase");
      }

      // Verify the purchase belongs to the current user
      if (purchaseData.customerId !== user.uid) {
        throw new Error("Cannot save purchase for another user");
      }

      const purchaseRef = doc(collection(db, "purchases"));
      await setDoc(purchaseRef, {
        ...purchaseData,
        createdAt: serverTimestamp(),
      });

      return { success: true, id: purchaseRef.id };
    } catch (error) {
      console.error("Error saving purchase:", error);
      throw error;
    }
  };

  // New function to get the total user count
  const getUserCount = async () => {
    try {
      if (!user) {
        throw new Error("Authentication required to get user count");
      }
      
      // Check admin status before proceeding
      const isAdmin = await checkIsAdmin(user.uid);
      if (!isAdmin) {
        console.warn("Non-admin user attempting to access user count");
        return 0;
      }
      
      // Use RTDB to get the total count
      const database = getDatabase();
      const usersRef = dbRef(database, 'users');
      const snapshot = await dbGet(usersRef);
      
      if (!snapshot.exists()) {
        return 0;
      }
      
      // Count the number of user objects
      return Object.keys(snapshot.val()).length;
    } catch (error) {
      console.error("Error getting user count:", error);
      return 0; // Return 0 instead of throwing to avoid breaking the UI
    }
  };
  
  // Value to be provided by the context
  const value = {
    user,
    loading,
    error,
    fetchOrders,
    fetchUsers,
    fetchEvents,
    fetchPromoterCodes,
    checkIsAdmin,
    fetchAllPurchases, // Add new functions
    fetchUserPurchases,
    fetchPurchaseDetails,
    saveUserPurchase,
    getUserCount // Add the new function
  };
  
  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  );
}

// Custom hook to use the Firebase context
export function useFirebase() {
  return useContext(FirebaseContext);
}

// Add a new useAuth hook to easily access authentication state
export function useAuth() {
  const context = useContext(FirebaseContext);
  if (!context) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  return {
    currentUser: context.user,
    loading: context.loading
  };
}
