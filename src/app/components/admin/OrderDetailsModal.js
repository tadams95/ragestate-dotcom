// Import helper functions if they are directly used here (already passed as props, so not strictly needed unless called directly)
// import { formatDate, formatCurrency, getStatusColor } from "../../../utils/formatters";
import Image from 'next/image';

const OrderDetailsModal = ({
  selectedOrder,
  isOpen,
  onClose,
  formatDate, // Prop received from AdminPage
  formatCurrency, // Prop received from AdminPage
  getStatusColor, // Prop received from AdminPage
}) => {
  if (!isOpen || !selectedOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="animate-modal-enter max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-xl">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Order Details: {selectedOrder.orderNumber || selectedOrder.id}
            </h2>
            <button
              onClick={onClose}
              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">Customer</p>
              <p className="font-medium text-[var(--text-primary)]">
                {selectedOrder.customerName || selectedOrder.name}
              </p>
              <p className="text-[var(--text-tertiary)]">
                {selectedOrder.customerEmail || selectedOrder.email}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-[var(--text-secondary)]">Order Date</p>
              <p className="text-[var(--text-primary)]">{formatDate(selectedOrder.orderDate)}</p>
              <p className="text-[var(--text-tertiary)]">
                Status:{' '}
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(
                    selectedOrder.status,
                  )}`}
                >
                  {selectedOrder.status || 'N/A'}
                </span>
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-3 text-lg font-medium text-[var(--text-primary)]">Items</h3>
            <div className="overflow-hidden rounded-lg bg-[var(--bg-elev-2)]">
              <table className="min-w-full divide-y divide-[var(--border-subtle)]">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-secondary)]">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {selectedOrder.items?.map((item, index) => {
                    const itemPrice = parseFloat(item.price) || 0;
                    return (
                      <tr key={index}>
                        <td className="whitespace-nowrap px-4 py-3 text-sm">
                          <div className="flex items-center">
                            {item.productImageSrc && (
                              <div className="relative mr-3 h-10 w-10">
                                <Image
                                  src={item.productImageSrc}
                                  alt={item.title}
                                  fill
                                  sizes="40px"
                                  className="rounded object-cover"
                                />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-[var(--text-primary)]">{item.title}</p>
                              <p className="text-xs text-[var(--text-secondary)]">
                                {item.selectedColor} - {item.selectedSize}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-tertiary)]">
                          {item.quantity || 1}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-tertiary)]">
                          ${itemPrice.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 text-lg font-medium text-[var(--text-primary)]">
                Shipping Address
              </h3>
              {selectedOrder.addressDetails?.address ? (
                <div className="rounded-lg bg-[var(--bg-elev-2)] p-4">
                  <p className="text-[var(--text-primary)]">{selectedOrder.addressDetails.name}</p>
                  <p className="text-[var(--text-tertiary)]">
                    {selectedOrder.addressDetails.address.line1}
                  </p>
                  {selectedOrder.addressDetails.address.line2 && (
                    <p className="text-[var(--text-tertiary)]">
                      {selectedOrder.addressDetails.address.line2}
                    </p>
                  )}
                  <p className="text-[var(--text-tertiary)]">
                    {selectedOrder.addressDetails.address.city},{' '}
                    {selectedOrder.addressDetails.address.state}{' '}
                    {selectedOrder.addressDetails.address.postalCode}
                  </p>
                  <p className="text-[var(--text-tertiary)]">
                    {selectedOrder.addressDetails.address.country}
                  </p>
                  {selectedOrder.addressDetails.phone && (
                    <p className="mt-2 text-[var(--text-tertiary)]">
                      Phone: {selectedOrder.addressDetails.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-[var(--text-secondary)]">No shipping information available</p>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-lg font-medium text-[var(--text-primary)]">Order Summary</h3>
              <div className="rounded-lg bg-[var(--bg-elev-2)] p-4">
                <div className="flex justify-between py-1">
                  <span className="text-[var(--text-tertiary)]">Subtotal</span>
                  <span className="text-[var(--text-primary)]">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--text-tertiary)]">Shipping</span>
                  <span className="text-[var(--text-primary)]">$0.00</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[var(--text-tertiary)]">Taxes</span>
                  <span className="text-[var(--text-primary)]">Included</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-[var(--border-subtle)] pt-2">
                  <span className="font-medium text-[var(--text-primary)]">Total</span>
                  <span className="font-medium text-[var(--text-primary)]">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="rounded-md border border-[var(--border-subtle)] px-4 py-2 text-[var(--text-secondary)] hover:bg-[var(--bg-elev-2)]"
            >
              Close
            </button>
            <button className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-500">
              Update Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
