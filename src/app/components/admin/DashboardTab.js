'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { getProfileCount } from '../../../../lib/firebase/adminService';
import { getAllPurchases } from '../../../../lib/firebase/purchaseService';
import { formatCurrency, formatDate, getStatusColor } from '../../../utils/formatters';
import { AdminErrorState, DashboardSkeleton } from './shared';

const toAmount = (value) => {
  if (typeof value === 'number') {
    return value === value && value !== Infinity && value !== -Infinity ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return parsed === parsed && parsed !== Infinity && parsed !== -Infinity ? parsed : 0;
  }

  return 0;
};

const normalizeOrder = (order = {}, index = 0) => {
  return {
    ...order,
    id: order.id || `order-${index}`,
    status: typeof order.status === 'string' ? order.status.toLowerCase() : 'unknown',
    totalAmount: toAmount(order.totalAmount),
    orderDate: order.orderDate || order.dateTime || null,
  };
};

const DashboardTab = ({ setActiveTab }) => {
  const [orders, setOrders] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([getAllPurchases(null, 10), getProfileCount()]);

    if (results[0].status === 'fulfilled') {
      const normalizedOrders = (results[0].value.purchases || []).map((order, index) =>
        normalizeOrder(order, index),
      );
      setOrders(normalizedOrders);
    } else {
      throw results[0].reason || new Error('Failed to load orders');
    }

    if (results[1].status === 'fulfilled') {
      setUserCount(results[1].value);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadDataWithGuard() {
      try {
        await loadData();
      } catch (err) {
        if (!cancelled) {
          console.error('Error loading dashboard data:', err);
          setError(err.message || 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadDataWithGuard();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const totalRevenue = useMemo(() => {
    return orders.reduce((sum, order) => sum + toAmount(order.totalAmount), 0);
  }, [orders]);

  const pendingOrders = useMemo(() => {
    return orders.filter((order) => order.status === 'pending' || order.status === 'processing')
      .length;
  }, [orders]);

  const handleRetry = useCallback(async () => {
    try {
      await loadData();
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [loadData]);

  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      <h2 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Dashboard Overview</h2>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <AdminErrorState
          title="Error loading dashboard"
          message={error}
          onRetry={handleRetry}
          variant="fullPage"
        />
      ) : (
        <>
          <div className="wave-in-stagger mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            {[
              {
                title: 'Total Orders',
                value: orders.length,
                icon: '📦',
              },
              {
                title: 'Total Revenue',
                value: `$${totalRevenue.toFixed(2)}`,
                icon: '💰',
              },
              {
                title: 'Total Users',
                value: userCount,
                icon: '👥',
              },
              {
                title: 'Pending Orders',
                value: pendingOrders,
                icon: '⏱️',
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="animate-wave-in flex items-center justify-between rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-md"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-secondary)]">{stat.title}</p>
                  <h3 className="mt-1 text-2xl font-bold text-[var(--text-primary)]">
                    {stat.value}
                  </h3>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <Link
              href="/admin/event-day"
              className="flex items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-5 shadow-md transition-colors hover:bg-[var(--bg-elev-1)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)]">Event Day Command Center</p>
                <p className="text-sm text-[var(--text-secondary)]">Guest list, manual check-in, and real-time stats</p>
              </div>
              <svg className="ml-auto h-5 w-5 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="mb-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-5 shadow-md">
            <h3 className="mb-4 text-xl font-medium text-[var(--text-primary)]">Recent Orders</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                <thead>
                  <tr>
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {orders.slice(0, 3).map((order) => (
                    <tr key={order.id}>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {order.orderNumber || order.id}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                        {order.customerName || 'Anonymous'}
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => setActiveTab('orders')}
                className="text-sm font-medium text-red-500 hover:text-red-400"
              >
                View all orders →
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardTab;
