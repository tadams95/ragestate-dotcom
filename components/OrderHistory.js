'use client';

import storage from '@/utils/storage';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import OrderDetailModal from './OrderDetailModal';

// Simple SVG placeholder for missing product images
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect fill='%23374151' width='64' height='64'/%3E%3Cpath fill='%236B7280' d='M20 42l8-10 6 8 10-14 10 16H10z'/%3E%3Ccircle fill='%236B7280' cx='22' cy='24' r='6'/%3E%3C/svg%3E";

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
  const [selectedOrder, setSelectedOrder] = useState(null);

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
              status: purchase.status || 'Completed', // Shipping fields from Printify webhooks
              shippingStatus: purchase.shippingStatus || null,
              trackingNumber: purchase.trackingNumber || null,
              carrier: purchase.carrier || null,
              trackingUrl: purchase.trackingUrl || null,
              items: itemsArray.map((item, itemIdx) => ({
                id: `ITEM-${orderId}-${itemIdx}`,
                name: item.title,
                price: `$${parseFloat(item.price || 0).toFixed(2)}`,
                quantity: item.quantity || 1,
                image: item.productImageSrc || item.image || PLACEHOLDER_IMAGE,
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
      <div className="flex min-h-[500px] items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-700"></div>
          <p className="mt-4 text-[var(--text-secondary)]">Loading your order history...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-8">
        <div className="mb-4 h-24 w-24 text-[var(--text-tertiary)]">
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
        <h3 className="text-xl font-medium text-[var(--text-primary)]">No orders yet</h3>
        <p className="mt-2 max-w-md text-center text-[var(--text-secondary)]">
          Once you make a purchase, your order history will appear here.
        </p>
        <p className="mt-2 max-w-md text-center text-xs text-[var(--text-tertiary)]">
          If you have any questions or concerns, email contact@ragestate.com or DM @ragestate on
          Instagram
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center rounded-md border border-transparent bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-700 focus:ring-offset-2"
        >
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[500px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl transition-all duration-300 hover:border-red-500/30">
      <h2 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Order History</h2>
      <p className="mb-6 mt-2 text-sm text-[var(--text-secondary)]">
        View your order history below, with most recent orders shown first. If you have any
        questions or concerns, email contact@ragestate.com or DM @ragestate on Instagram.
      </p>

      {/* Grid layout for orders */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {orders.map((order) => (
          <div
            key={order.id}
            className="group relative overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-md transition-all duration-300 hover:border-red-500/30 hover:shadow-lg"
          >
            {/* Order header */}
            <div className="relative border-b border-[var(--border-subtle)] bg-[var(--bg-elev-3)] px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    Order Date: <span className="text-[var(--text-secondary)]">{order.date}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Order items */}
            <div className="relative p-4">
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-3"
                  >
                    <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border-subtle)]">
                      <Image
                        src={item.image || PLACEHOLDER_IMAGE}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover object-center"
                      />
                    </div>
                    <div className="ml-3 flex-1 pl-2">
                      <h3 className="line-clamp-1 text-sm font-medium text-[var(--text-primary)]">
                        {item.name}
                      </h3>
                      <div className="mt-1 flex items-center space-x-2 text-xs text-[var(--text-tertiary)]">
                        <span>Qty: {item.quantity}</span>
                        {item.size && <span>• Size: {item.size}</span>}
                        {item.color && <span>• Color: {item.color}</span>}
                      </div>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">
                        {item.price}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Shipping Status */}
              {order.shippingStatus && (
                <div className="mt-3 flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-3 py-2">
                  <div className="flex items-center gap-2">
                    {order.shippingStatus === 'delivered' ? (
                      <>
                        <svg
                          className="h-4 w-4 text-green-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-sm text-green-500">Delivered</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-4 w-4 text-yellow-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                        <span className="text-sm text-yellow-500">
                          Shipped{order.carrier ? ` via ${order.carrier}` : ''}
                        </span>
                      </>
                    )}
                  </div>
                  {order.trackingUrl && order.shippingStatus !== 'delivered' && (
                    <a
                      href={order.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-red-500 hover:text-red-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Track →
                    </a>
                  )}
                </div>
              )}

              {/* View Details Button */}
              <button
                onClick={() => setSelectedOrder(order)}
                className="mt-4 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-red-500/50 hover:bg-red-500/10"
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Order Detail Modal */}
      <OrderDetailModal
        order={selectedOrder}
        isOpen={!!selectedOrder}
        onClose={() => setSelectedOrder(null)}
      />
    </div>
  );
}
