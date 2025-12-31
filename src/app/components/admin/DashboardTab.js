import { AdminErrorState, DashboardSkeleton } from './shared';

const DashboardTab = ({
  loading,
  error,
  orders,
  userCount,
  formatDate, // Prop received from AdminPage
  formatCurrency, // Prop received from AdminPage
  getStatusColor, // Prop received from AdminPage
  setActiveTab,
}) => {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] p-6 shadow-xl">
      <h2 className="mb-6 text-2xl font-bold text-[var(--text-primary)]">Dashboard Overview</h2>

      {loading ? (
        <DashboardSkeleton />
      ) : error.general ? (
        <AdminErrorState
          title="Error loading dashboard"
          message={error.general}
          onRetry={() => window.location.reload()}
          variant="fullPage"
        />
      ) : (
        <>
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
            {[
              {
                title: 'Total Orders',
                value: orders.length,
                icon: '📦',
                color:
                  'bg-[var(--bg-accent-blue-subtle)] border-[var(--border-accent-blue-subtle)]',
              },
              {
                title: 'Total Revenue',
                value: `$${orders
                  .reduce((sum, order) => {
                    const amount =
                      typeof order.totalAmount === 'number'
                        ? order.totalAmount
                        : typeof order.totalAmount === 'string'
                          ? parseFloat(order.totalAmount) || 0
                          : 0;
                    return sum + amount;
                  }, 0)
                  .toFixed(2)}`,
                icon: '💰',
                color:
                  'bg-[var(--bg-accent-green-subtle)] border-[var(--border-accent-green-subtle)]',
              },
              {
                title: 'Total Users',
                value: userCount,
                icon: '👥',
                color:
                  'bg-[var(--bg-accent-purple-subtle)] border-[var(--border-accent-purple-subtle)]',
              },
              {
                title: 'Pending Orders',
                value: orders.filter(
                  (order) => order.status === 'pending' || order.status === 'processing',
                ).length,
                icon: '⏱️',
                color:
                  'bg-[var(--bg-accent-yellow-subtle)] border-[var(--border-accent-yellow-subtle)]',
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`${stat.color} flex items-center justify-between rounded-lg border p-6 shadow-md`}
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
