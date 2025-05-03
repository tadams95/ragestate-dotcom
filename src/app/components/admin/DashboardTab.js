import React from "react";

const DashboardTab = ({
  loading,
  error,
  orders,
  userCount,
  formatDate,
  formatCurrency,
  getStatusColor,
  setActiveTab,
  loadingState,
  errorState,
}) => {
  return (
    <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard Overview</h2>

      {loading ? (
        loadingState
      ) : error.general ? (
        errorState
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[
              {
                title: "Total Orders",
                value: orders.length,
                icon: "📦",
                color: "bg-blue-500/20 border-blue-500/40",
              },
              {
                title: "Total Revenue",
                value: `$${orders
                  .reduce((sum, order) => {
                    const amount =
                      typeof order.totalAmount === "number"
                        ? order.totalAmount
                        : typeof order.totalAmount === "string"
                        ? parseFloat(order.totalAmount) || 0
                        : 0;
                    return sum + amount;
                  }, 0)
                  .toFixed(2)}`,
                icon: "💰",
                color: "bg-green-500/20 border-green-500/40",
              },
              {
                title: "Total Users",
                value: userCount,
                icon: "👥",
                color: "bg-purple-500/20 border-purple-500/40",
              },
              {
                title: "Pending Orders",
                value: orders.filter(
                  (order) =>
                    order.status === "pending" || order.status === "processing"
                ).length,
                icon: "⏱️",
                color: "bg-yellow-500/20 border-yellow-500/40",
              },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={`${stat.color} p-6 rounded-lg border shadow-md flex items-center justify-between`}
              >
                <div>
                  <p className="text-gray-400 text-sm font-medium">
                    {stat.title}
                  </p>
                  <h3 className="text-white text-2xl font-bold mt-1">
                    {stat.value}
                  </h3>
                </div>
                <div className="text-3xl">{stat.icon}</div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md mb-8">
            <h3 className="text-xl font-medium text-white mb-4">
              Recent Orders
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {orders.slice(0, 3).map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {order.orderNumber || order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {order.customerName || "Anonymous"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatDate(order.orderDate)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status || "N/A"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right">
              <button
                onClick={() => setActiveTab("orders")}
                className="text-red-500 hover:text-red-400 text-sm font-medium"
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
