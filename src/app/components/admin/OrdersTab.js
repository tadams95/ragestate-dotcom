import React from "react";

const OrdersTab = ({
  loading,
  error,
  orders,
  formatDate,
  formatCurrency,
  getStatusColor,
  viewOrderDetails,
  inputStyling,
  buttonStyling,
  loadingState,
  errorState,
}) => {
  return (
    <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Order Management</h2>
        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Search orders..."
            className={inputStyling}
          />
          <button className={buttonStyling}>Search</button>
        </div>
      </div>

      {loading ? (
        loadingState
      ) : error.orders ? (
        <div className="bg-red-500/20 border border-red-500 p-4 rounded-md text-white">
          <h3 className="text-lg font-medium">Error loading orders</h3>
          <p>{error.orders}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded-lg border border-gray-800 shadow-md overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No orders found. Your customers haven't placed any orders yet.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr className="bg-gray-800/50">
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
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {order.orderNumber || order.id.substring(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {order.customerName || order.name || "Anonymous"}
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => viewOrderDetails(order.id)}
                            className="text-red-500 hover:text-red-400 mr-3"
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
              <div className="px-6 py-3 flex items-center justify-between border-t border-gray-700">
                <div className="text-sm text-gray-400">
                  Showing <span className="font-medium">1</span> to{" "}
                  <span className="font-medium">{orders.length}</span> of{" "}
                  <span className="font-medium">{orders.length}</span> results
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700">
                    Previous
                  </button>
                  <button className="px-3 py-1 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700">
                    Next
                  </button>
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
