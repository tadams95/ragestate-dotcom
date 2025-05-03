import React from "react";

const OrderDetailsModal = ({
  selectedOrder,
  isOpen,
  onClose,
  formatDate,
  formatCurrency,
  getStatusColor,
}) => {
  if (!isOpen || !selectedOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              Order Details: {selectedOrder.orderNumber || selectedOrder.id}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Customer</p>
              <p className="text-white font-medium">
                {selectedOrder.customerName || selectedOrder.name}
              </p>
              <p className="text-gray-300">
                {selectedOrder.customerEmail || selectedOrder.email}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Order Date</p>
              <p className="text-white">
                {formatDate(selectedOrder.orderDate)}
              </p>
              <p className="text-gray-300">
                Status:{" "}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status || "N/A"}
                </span>
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-3">Items</h3>
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {selectedOrder.items?.map((item, index) => {
                    const itemPrice = parseFloat(item.price) || 0;
                    return (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            {item.productImageSrc && (
                              <img
                                src={item.productImageSrc}
                                alt={item.title}
                                className="h-10 w-10 object-cover rounded mr-3"
                              />
                            )}
                            <div>
                              <p className="text-white font-medium">
                                {item.title}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {item.selectedColor} - {item.selectedSize}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {item.quantity || 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          ${itemPrice.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">
                Shipping Address
              </h3>
              {selectedOrder.addressDetails?.address ? (
                <div className="bg-gray-800/30 p-4 rounded-lg">
                  <p className="text-white">
                    {selectedOrder.addressDetails.name}
                  </p>
                  <p className="text-gray-300">
                    {selectedOrder.addressDetails.address.line1}
                  </p>
                  {selectedOrder.addressDetails.address.line2 && (
                    <p className="text-gray-300">
                      {selectedOrder.addressDetails.address.line2}
                    </p>
                  )}
                  <p className="text-gray-300">
                    {selectedOrder.addressDetails.address.city},{" "}
                    {selectedOrder.addressDetails.address.state}{" "}
                    {selectedOrder.addressDetails.address.postalCode}
                  </p>
                  <p className="text-gray-300">
                    {selectedOrder.addressDetails.address.country}
                  </p>
                  {selectedOrder.addressDetails.phone && (
                    <p className="text-gray-300 mt-2">
                      Phone: {selectedOrder.addressDetails.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">
                  No shipping information available
                </p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-3">
                Order Summary
              </h3>
              <div className="bg-gray-800/30 p-4 rounded-lg">
                <div className="flex justify-between py-1">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="text-white">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-300">Shipping</span>
                  <span className="text-white">$0.00</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-300">Taxes</span>
                  <span className="text-white">Included</span>
                </div>
                <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-white font-medium">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500">
              Update Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
