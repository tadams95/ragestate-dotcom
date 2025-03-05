"use client";

import { useState, useEffect, useMemo } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import Image from "next/image";

const fetchUserPurchases = async (firestore, userId) => {
  try {
    const purchasesRef = collection(firestore, `customers/${userId}/purchases`);
    const querySnapshot = await getDocs(purchasesRef);
    return querySnapshot.docs.map((doc) => doc.data());
  } catch (error) {
    console.error("Error fetching user purchases: ", error);
    return [];
  }
};

export default function OrderHistory() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [orders, setOrders] = useState([]);
  
  const firestore = useMemo(() => getFirestore(), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userIdFromLocalStorage = localStorage.getItem("userId");
      if (userIdFromLocalStorage) {
        setUserId(userIdFromLocalStorage);
      }
    }
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserPurchases(firestore, userId)
        .then((purchases) => {
          // Ensure we can extract proper dates for sorting
          const validPurchases = purchases.filter(purchase => purchase.dateTime);
          
          // Transform purchase data to match our component's expected format
          const formattedOrders = validPurchases.map((purchase, index) => {
            // Make sure we're getting a valid date
            let dateObj;
            try {
              dateObj = purchase.dateTime.toDate();
              // Verify it's a valid date object
              if (isNaN(dateObj.getTime())) {
                console.warn("Invalid date from purchase:", purchase);
                dateObj = new Date(0);
              }
            } catch (e) {
              console.error("Error converting dateTime to Date:", e);
              dateObj = new Date(0);
            }
            
            return {
              id: `ORDER-${index + 1}`,
              date: dateObj.toLocaleDateString(),
              dateObj: dateObj,
              timestamp: dateObj.getTime(), // Explicit timestamp for sorting
              total: purchase.total ? `$${purchase.total}` : 'N/A',
              status: purchase.status || 'Completed',
              items: purchase.cartItems.map((item, itemIdx) => ({
                id: `ITEM-${index}-${itemIdx}`,
                name: item.title,
                price: `$${item.price}`,
                quantity: item.quantity,
                image: item.productImageSrc,
                color: item.color,
                size: item.size
              }))
            };
          });
          
          // Debug output to check sorting
          console.log("Before sorting:", formattedOrders.map(o => ({ date: o.date, timestamp: o.timestamp })));

          // Explicitly sort by timestamp (most recent first)
          const sortedOrders = [...formattedOrders].sort((a, b) => b.timestamp - a.timestamp);
          
          // Verify the sort worked
          console.log("After sorting:", sortedOrders.map(o => ({ date: o.date, timestamp: o.timestamp })));
          
          setOrders(sortedOrders);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching orders:", error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userId, firestore]);

  if (loading) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-6 min-h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-700 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading your order history...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-zinc-800/50 rounded-lg p-8 min-h-[500px] flex flex-col items-center justify-center">
        <div className="h-24 w-24 text-gray-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-white">No orders yet</h3>
        <p className="mt-2 text-gray-400 text-center max-w-md">
          Once you make a purchase, your order history will appear here.
        </p>
        <p className="mt-2 text-xs text-gray-400 text-center max-w-md">
          If you have any questions or concerns, email contact@ragestate.com or DM @ragestate on Instagram
        </p>
        <a 
          href="/shop" 
          className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-700 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700"
        >
          Start Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="bg-zinc-800/50 rounded-lg p-6 min-h-[500px]">
      <h2 className="text-2xl font-bold text-white mb-6">Order History</h2>
      <p className="mt-2 mb-6 text-sm text-gray-300">
        View your order history below, with most recent orders shown first. If you have any questions or concerns, email 
        contact@ragestate.com or DM @ragestate on Instagram.
      </p>
      
      {/* Grid layout for orders */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {orders.map((order) => (
          <div key={order.id} className="border border-zinc-700 rounded-lg overflow-hidden bg-black/30 shadow-lg hover:shadow-xl transition-shadow">
            {/* Order header */}
            <div className="bg-zinc-800 px-4 py-3 border-b border-zinc-700">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-white">
                    Order Date: <span className="text-gray-300">{order.date}</span>
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 
                  order.status === 'Processing' ? 'bg-gray-100 text-gray-800' : 
                  order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {order.status}
                </span>
              </div>
            </div>

            {/* Order items */}
            <div className="p-4">
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center bg-zinc-800/30 p-3 rounded-lg">
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-700">
                      <Image
                        src={item.image || "/assets/placeholder-product.jpg"}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-white line-clamp-1">{item.name}</h3>
                      <div className="mt-1 flex items-center text-xs text-gray-400 space-x-2">
                        <span>Qty: {item.quantity}</span>
                        {item.size && <span>• Size: {item.size}</span>}
                        {item.color && <span>• Color: {item.color}</span>}
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-semibold text-white">{item.price}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Order footer */}
              {/* <div className="mt-4 pt-3 border-t border-zinc-700 flex justify-between items-center">
                <p className="text-lg font-bold text-white">Total: {order.total}</p>
                <button className="text-xs bg-red-700 hover:bg-red-800 text-white font-medium px-3 py-1.5 rounded">
                  Order Details
                </button>
              </div> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
