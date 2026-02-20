'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { getAllPurchases, getPurchaseCount } from '../../../../lib/firebase/purchaseService';
import { formatCurrency, formatDate, getStatusColor } from '../../../utils/formatters';
import { adminButtonOutline, adminInput } from './shared/adminStyles';
import { AdminErrorState, OrdersTabSkeleton } from './shared';
import OrderDetailsModal from './OrderDetailsModal';

const PAGE_SIZE = 20;

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageCache, setPageCache] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    let cancelled = false;
    async function loadInitial() {
      setLoading(true);
      setError(null);
      try {
        const [countResult, ordersResult] = await Promise.allSettled([
          getPurchaseCount(),
          getAllPurchases(null, PAGE_SIZE),
        ]);

        if (cancelled) return;

        if (countResult.status === 'fulfilled') {
          setTotalCount(countResult.value);
        }

        if (ordersResult.status === 'fulfilled') {
          const { purchases, lastDoc } = ordersResult.value;
          setOrders(purchases);
          setPageCache({ 1: { orders: purchases, lastDoc } });
          setCurrentPage(1);
        } else {
          throw ordersResult.reason || new Error('Failed to load orders');
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading orders:', err);
          setError(err.message || 'Failed to load orders');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadInitial();
    return () => { cancelled = true; };
  }, []);

  const handleNextPage = useCallback(async () => {
    const nextPage = currentPage + 1;
    if (pageCache[nextPage]) {
      setOrders(pageCache[nextPage].orders);
      setCurrentPage(nextPage);
      return;
    }

    const currentCached = pageCache[currentPage];
    if (!currentCached?.lastDoc) return;

    setLoading(true);
    try {
      const { purchases, lastDoc } = await getAllPurchases(currentCached.lastDoc, PAGE_SIZE);
      setPageCache((prev) => ({ ...prev, [nextPage]: { orders: purchases, lastDoc } }));
      setOrders(purchases);
      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading next page:', err);
      toast.error('Failed to load next page');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageCache]);

  const handlePrevPage = useCallback(() => {
    const prevPage = currentPage - 1;
    if (prevPage < 1 || !pageCache[prevPage]) return;
    setOrders(pageCache[prevPage].orders);
    setCurrentPage(prevPage);
  }, [currentPage, pageCache]);

  // Client-side filter on current page
  const displayedOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        (order.orderNumber || order.id || '').toLowerCase().includes(q) ||
        (order.customerName || order.name || '').toLowerCase().includes(q) ||
        (order.email || '').toLowerCase().includes(q);

      const matchesStatus =
        statusFilter === 'all' || (order.status || '').toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasNextPage = currentPage < totalPages && pageCache[currentPage]?.lastDoc;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Order Management</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            placeholder="Search by ID, name, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`${adminInput} sm:w-64`}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={`${adminInput} sm:w-36`}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <OrdersTabSkeleton />
      ) : error ? (
        <AdminErrorState
          title="Error loading orders"
          message={error}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-md">
          {displayedOrders.length === 0 ? (
            <div className="p-8 text-center text-[var(--text-tertiary)]">
              {searchQuery || statusFilter !== 'all'
                ? 'No orders match your search criteria.'
                : "No orders found. Your customers haven't placed any orders yet."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                  <thead>
                    <tr className="bg-[var(--bg-elev-2)]">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Order ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)]">
                    {displayedOrders.map((order) => (
                      <tr key={order.id} className="border-l-2 border-l-transparent transition-colors hover:border-l-[var(--accent)] hover:bg-[var(--bg-elev-1)]">
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {order.orderNumber || order.id.substring(0, 8)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {order.customerName || order.name || 'Anonymous'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {formatDate(order.orderDate)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {formatCurrency(order.totalAmount)}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold leading-5 ${getStatusColor(
                              order.status,
                            )}`}
                          >
                            {order.status || 'N/A'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          <button
                            onClick={() => {
                              setSelectedOrder(order);
                              setOrderDetailsOpen(true);
                            }}
                            className="text-red-500 hover:text-red-400"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-3">
                <div className="text-sm text-[var(--text-tertiary)]">
                  Showing{' '}
                  <span className="font-medium">
                    {displayedOrders.length > 0 ? (currentPage - 1) * PAGE_SIZE + 1 : 0}
                  </span>{' '}
                  to{' '}
                  <span className="font-medium">
                    {(currentPage - 1) * PAGE_SIZE + displayedOrders.length}
                  </span>{' '}
                  of <span className="font-medium">{totalCount}</span> orders
                  {(searchQuery || statusFilter !== 'all') && ' (filter applies to current page)'}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage}
                    className={`${adminButtonOutline} ${!hasPrevPage ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage}
                    className={`${adminButtonOutline} ${!hasNextPage ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {orderDetailsOpen && (
        <OrderDetailsModal
          selectedOrder={selectedOrder}
          isOpen={orderDetailsOpen}
          onClose={() => {
            setOrderDetailsOpen(false);
            setSelectedOrder(null);
          }}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
        />
      )}
    </div>
  );
}
