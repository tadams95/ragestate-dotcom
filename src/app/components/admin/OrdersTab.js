'use client';

import { useMemo, useState } from 'react';
import { AdminErrorState, OrdersTabSkeleton } from './shared';

const OrdersTab = ({
  loading,
  error,
  orders,
  formatDate,
  formatCurrency,
  getStatusColor,
  viewOrderDetails,
  inputStyling,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filter orders based on search query and status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        !query ||
        (order.orderNumber || order.id || '').toLowerCase().includes(query) ||
        (order.customerName || order.name || '').toLowerCase().includes(query) ||
        (order.email || '').toLowerCase().includes(query);

      // Status filter
      const matchesStatus =
        statusFilter === 'all' || (order.status || '').toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

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
            className={inputStyling + ' sm:w-64'}
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputStyling + ' sm:w-36'}
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
      ) : error.orders ? (
        <AdminErrorState
          title="Error loading orders"
          message={error.orders}
          onRetry={() => window.location.reload()}
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] shadow-md">
          {filteredOrders.length === 0 ? (
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
                    {filteredOrders.map((order) => (
                      <tr key={order.id} className="transition-colors hover:bg-[var(--bg-elev-1)]">
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
                            onClick={() => viewOrderDetails(order.id)}
                            className="mr-3 text-red-500 hover:text-red-400"
                          >
                            View
                          </button>
                          <button
                            onClick={() => alert(`Edit order ${order.id}`)}
                            className="text-blue-500 hover:text-blue-400"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-3">
                <div className="text-sm text-[var(--text-tertiary)]">
                  Showing <span className="font-medium">{filteredOrders.length}</span> of{' '}
                  <span className="font-medium">{orders.length}</span> total orders
                  {(searchQuery || statusFilter !== 'all') && ' (filtered)'}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
