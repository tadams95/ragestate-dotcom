"use client";

import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { getDatabase, ref as dbRef, get as dbGet } from "firebase/database";

// Create context
const FirebaseContext = createContext();

// Context provider component
export function FirebaseProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        setUser(authUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    }, (error) => {
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
      if (!user) {
        throw new Error("Authentication required to fetch users");
      }
      
      // Check admin status before proceeding
      const isAdmin = await checkIsAdmin(user.uid);
      if (!isAdmin) {
        console.warn("Non-admin user attempting to access all users");
        return [];
      }
      
      // Due to RTDB rules, we can't query the whole users collection directly
      // Instead, we'll use the Firestore 'customers' collection which has better rules for admins
      // If that fails, we'll fall back to just getting the current user's data from RTDB
      
      try {
        console.log("Attempting to fetch users from Firestore customers collection");
        const customersQuery = query(
          collection(db, "customers"),
          limit(limitCount)
        );
        
        const snapshot = await getDocs(customersQuery);
        console.log(`Found ${snapshot.docs.length} users in Firestore customers collection`);
        
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            email: data.email || "No email",
            name: data.name || data.displayName || "Unknown",
            joinDate: data.createdAt?.toDate() || new Date()
          };
        });
      } catch (firestoreError) {
        console.error("Error fetching users from Firestore:", firestoreError);
        
        // Fallback: If we can't read from Firestore, just get the current admin's user data
        console.log("Falling back to fetching only current user's data from RTDB");
        const database = getDatabase();
        const currentUserRef = dbRef(database, `users/${user.uid}`);
        const snapshot = await dbGet(currentUserRef);
        
        if (snapshot.exists()) {
          const userData = snapshot.val();
          return [{
            id: user.uid,
            ...userData,
            joinDate: new Date()
          }];
        }
        
        return [];
      }
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

  // Improved admin check function
  const checkIsAdmin = async (userId) => {
    try {
      if (!userId) return false;
      
      // First check RTDB for isAdmin flag
      const database = getDatabase();
      const rtdbAdminRef = dbRef(database, `users/${userId}`);
      const rtdbSnapshot = await dbGet(rtdbAdminRef);
      
      if (rtdbSnapshot.exists() && rtdbSnapshot.val().isAdmin === true) {
        console.log("Admin confirmed via RTDB");
        return true;
      }
      
      // Then check Firestore adminUsers collection
      try {
        const adminDocRef = doc(db, 'adminUsers', userId);
        const adminDocSnap = await getDoc(adminDocRef);
        
        if (adminDocSnap.exists()) {
          console.log("Admin confirmed via Firestore");
          return true;
        }
      } catch (firestoreError) {
        console.warn("Error checking admin status in Firestore:", firestoreError);
      }
      
      return false;
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
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
    fetchPurchaseDetails
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
