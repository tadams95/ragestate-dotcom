'use client';

import storage from '@/utils/storage';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';

const fetchUserPurchases = async (firestore, userId) => {
  try {
    const purchasesRef = collection(firestore, `customers/${userId}/purchases`);
    const querySnapshot = await getDocs(purchasesRef);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error fetching user purchases: ', error);
    return [];
  }
};

export default function OrderHistory() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [orders, setOrders] = useState([]);

  const firestore = useMemo(() => getFirestore(), []);

  useEffect(() => {
    const { userId: uid } = storage.readKeys(['userId']);
    if (uid) setUserId(uid);
  }, []);

  useEffect(() => {
    if (userId) {
      fetchUserPurchases(firestore, userId)
        .then((purchases) => {
          // Process purchases into a consistent format
          const formattedOrders = purchases.map((purchase, index) => {
            // Handle both date formats (dateTime and orderDate/createdAt)
            let dateObj;
            try {
              // Try to use dateTime (legacy) or orderDate/createdAt (new format)
              const dateField = purchase.dateTime || purchase.orderDate || purchase.createdAt;

              // Handle Firestore timestamp objects
              if (dateField && typeof dateField.toDate === 'function') {
                dateObj = dateField.toDate();
              } else if (dateField) {
                // Handle if it's already a Date or can be parsed as one
                dateObj = new Date(dateField);
              } else {
                console.warn('No valid date found for purchase:', purchase);
                dateObj = new Date(); // Use current date as fallback
              }

              // Verify it's a valid date object
              if (isNaN(dateObj.getTime())) {
                console.warn('Invalid date from purchase:', purchase);
                dateObj = new Date();
              }
            } catch (e) {
              console.error('Error converting date field to Date:', e);
              dateObj = new Date();
            }

            // Handle both cartItems (legacy) and items (new format)
            const itemsArray = purchase.cartItems || purchase.items || [];

            // Use order number if available, otherwise fallback to legacy ID format
            const orderId = purchase.orderNumber || purchase.id || `ORDER-${index + 1}`;

            return {
              id: orderId,
              date: dateObj.toLocaleDateString(),
              dateObj: dateObj,
              timestamp: dateObj.getTime(),
              total:
                purchase.total || purchase.totalAmount
                  ? `$${
                      typeof purchase.total === 'string'
                        ? purchase.total
                        : typeof purchase.totalAmount === 'string'
                          ? purchase.totalAmount
                          : parseFloat(purchase.total || purchase.totalAmount || 0).toFixed(2)
                    }`
                  : 'N/A',
              status: purchase.status || 'Completed',
              items: itemsArray.map((item, itemIdx) => ({
                id: `ITEM-${orderId}-${itemIdx}`,
                name: item.title,
                price: `$${parseFloat(item.price || 0).toFixed(2)}`,
                quantity: item.quantity || 1,
                image: item.productImageSrc || item.image || '/assets/placeholder-product.jpg',
                color: item.color,
                size: item.size,
              })),
            };
          });

          // Sort by timestamp (most recent first)
          const sortedOrders = [...formattedOrders].sort((a, b) => b.timestamp - a.timestamp);

          setOrders(sortedOrders);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching orders:', error);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [userId, firestore]);

  if (loading) {
    return (
      <div className="flex min-h-[500px] items-center justify-center rounded-lg border border-gray-800 bg-gray-900/30 p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-700"></div>
          <p className="mt-4 text-gray-300">Loading your order history...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center rounded-lg border border-gray-800 bg-gray-900/30 p-8">
        <div className="mb-4 h-24 w-24 text-gray-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-white">No orders yet</h3>
        <p className="mt-2 max-w-md text-center text-gray-400">
          Once you make a purchase, your order history will appear here.
        </p>
        <p className="mt-2 max-w-md text-center text-xs text-gray-400">
          If you have any questions or concerns, email contact@ragestate.com or DM @ragestate on
          Instagram
        </p>
        <a
          href="/shop"
          className="mt-6 inline-flex items-center rounded-md border border-transparent bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
        >
          Start Shopping
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-[500px] rounded-lg bg-gray-900/30 p-6 ring-1 ring-white/10 transition-all duration-300 hover:ring-red-500/30">
      <h2 className="mb-6 text-2xl font-bold text-white">Order History</h2>
      <p className="mb-6 mt-2 text-sm text-gray-300">
        View your order history below, with most recent orders shown first. If you have any
        questions or concerns, email contact@ragestate.com or DM @ragestate on Instagram.
      </p>

      {/* Grid layout for orders */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {orders.map((order) => (
          <div
            key={order.id}
            className="relative overflow-hidden rounded-xl bg-gray-900/20 shadow-lg ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:ring-red-500/30"
          >
            {/* Add gradient effect from About page */}
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-red-500/0 to-purple-500/0 [mask-image:linear-gradient(black,transparent)] group-hover:from-red-500/10 group-hover:to-purple-500/10" />

            {/* Order header */}
            <div className="relative border-b border-gray-700 bg-gray-900/20 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">
                    Order Date: <span className="text-gray-300">{order.date}</span>
                  </p>
                </div>
                {/* <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium `}
                >
                  {order.status}
                </span> */}
              </div>
            </div>

            {/* Order items */}
            <div className="relative p-4">
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center rounded-lg bg-gray-900/20 p-3 ring-1 ring-white/10"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-700">
                      <Image
                        src={item.image || '/assets/placeholder-product.jpg'}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <div className="ml-3 flex-1 pl-2">
                      <h3 className="line-clamp-1 text-sm font-medium text-white">{item.name}</h3>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-gray-400">
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
