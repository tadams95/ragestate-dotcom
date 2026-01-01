'use client';

import Image from 'next/image';

// Simple SVG placeholder for missing product images
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'%3E%3Crect fill='%23374151' width='64' height='64'/%3E%3Cpath fill='%236B7280' d='M20 42l8-10 6 8 10-14 10 16H10z'/%3E%3Ccircle fill='%236B7280' cx='22' cy='24' r='6'/%3E%3C/svg%3E";

export default function OrderDetailModal({ order, isOpen, onClose }) {
  if (!isOpen || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[95vh] w-full overflow-y-auto rounded-t-xl border border-[var(--border-subtle)] bg-[var(--bg-elev-1)] shadow-xl sm:max-h-[90vh] sm:max-w-lg sm:rounded-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Order Details</h2>
            <p className="text-sm text-[var(--text-secondary)]">{order.id}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-secondary)] transition hover:bg-[var(--bg-elev-2)] hover:text-[var(--text-primary)]"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Order Info */}
          <div className="mb-6 flex items-center justify-between rounded-lg bg-[var(--bg-elev-2)] p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">
                Order Date
              </p>
              <p className="mt-1 font-medium text-[var(--text-primary)]">{order.date}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-[var(--text-tertiary)]">Status</p>
              <span className="mt-1 inline-block rounded-full bg-green-500/20 px-3 py-1 text-xs font-medium text-green-600">
                {order.status}
              </span>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Items ({order.items.length})
            </h3>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-3"
                >
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-[var(--border-subtle)]">
                    <Image
                      src={item.image || PLACEHOLDER_IMAGE}
                      alt={item.name || 'Product'}
                      width={64}
                      height={64}
                      className="h-full w-full object-cover object-center"
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">{item.name}</h4>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--text-tertiary)]">
                      <span>Qty: {item.quantity}</span>
                      {item.size && <span>• Size: {item.size}</span>}
                      {item.color && <span>• Color: {item.color}</span>}
                    </div>
                  </div>
                  <div className="ml-4 text-right">
                    <p className="font-semibold text-[var(--text-primary)]">{item.price}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Order Total */}
          <div className="mb-6 rounded-lg bg-[var(--bg-elev-2)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Order Total</span>
              <span className="text-lg font-bold text-[var(--text-primary)]">{order.total}</span>
            </div>
          </div>

          {/* Help Section */}
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] p-4 text-center">
            <p className="text-sm text-[var(--text-secondary)]">Need help with this order?</p>
            <a
              href="mailto:contact@ragestate.com"
              className="mt-2 inline-block text-sm font-medium text-red-500 hover:text-red-400"
            >
              contact@ragestate.com
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border-subtle)] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-[var(--bg-elev-2)] px-4 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-3)]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
