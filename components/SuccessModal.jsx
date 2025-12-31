'use client';

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export default function SuccessModal({ orderNumber, items = [], userEmail, onClose }) {
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    if (onClose) onClose();
  };

  const displayItems = useMemo(() => {
    if (!Array.isArray(items)) return [];
    return items
      .map((i, idx) => ({
        id: `${i.productId || i.id || 'item'}-${idx}`,
        title: i.title || i.name || i.productId || 'Item',
        quantity:
          parseInt(i.quantity ?? i.qty ?? i.selectedQuantity ?? i.ticketQuantity ?? 1, 10) || 1,
        image: i.productImageSrc || i.imageSrc || null,
      }))
      .filter((i) => i.quantity > 0);
  }, [items]);

  return (
    <Dialog open={open} onClose={handleClose} className="relative z-10">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 transition-opacity data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in"
      />

      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <DialogPanel
            transition
            className="relative transform overflow-hidden rounded-lg bg-gray-900 px-4 pb-4 pt-5 text-left shadow-xl ring-1 ring-gray-800 transition-all data-[closed]:translate-y-4 data-[closed]:opacity-0 data-[enter]:duration-300 data-[leave]:duration-200 data-[enter]:ease-out data-[leave]:ease-in sm:my-8 sm:w-full sm:max-w-xl sm:p-6 data-[closed]:sm:translate-y-0 data-[closed]:sm:scale-95"
          >
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <CheckCircleIcon aria-hidden="true" className="h-6 w-6 text-green-600" />
              </div>
              <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <DialogTitle as="h3" className="text-base font-semibold leading-6 text-white">
                  Payment successful
                </DialogTitle>
                <div className="mt-2">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Thanks! Your order has been saved{orderNumber ? ` — #${orderNumber}` : ''}.
                  </p>
                  {userEmail ? (
                    <p className="mt-1 text-xs text-gray-400">
                      You’ll receive a confirmation email at{' '}
                      <span className="text-gray-200">{userEmail}</span> shortly.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {displayItems.length > 0 ? (
              <div className="mt-4">
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">
                  Purchased items ({displayItems.reduce((a, b) => a + (b.quantity || 0), 0)})
                </div>
                <ul className="max-h-56 divide-y divide-gray-800 overflow-auto rounded-md border border-gray-800 bg-gray-900/60">
                  {displayItems.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 p-3">
                      <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-gray-800 ring-1 ring-gray-700">
                        {it.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={it.image} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{it.title}</p>
                        <p className="text-xs text-gray-400">Quantity: {it.quantity}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <Link
                href="/account"
                onClick={handleClose}
                className="inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto"
              >
                View my tickets
              </Link>
              <Link
                href="/"
                onClick={handleClose}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 hover:bg-gray-700 sm:mt-0 sm:w-auto"
              >
                Continue shopping
              </Link>
              <button type="button" onClick={handleClose} className="sr-only">
                Close
              </button>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}
