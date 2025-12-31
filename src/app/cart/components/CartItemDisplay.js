'use client';

import DevicePhoneMobileIcon from '@heroicons/react/20/solid/DevicePhoneMobileIcon';
import TruckIcon from '@heroicons/react/20/solid/TruckIcon';
import XMarkIcon from '@heroicons/react/20/solid/XMarkIcon';

export default function CartItemDisplay({
  item,
  handleIncrement,
  handleDecrement,
  handleRemoveFromCart,
  // promo code UI removed
}) {
  const quantity = typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1;
  const lineItemTotal = (parseFloat(item.price) * quantity).toFixed(2);

  return (
    <li className="flex py-6 sm:py-10">
      <div className="flex-shrink-0">
        <img
          src={item.productImageSrc[0]?.src || item.productImageSrc}
          alt={item.title}
          className="h-32 w-32 rounded-md object-cover object-center sm:h-48 sm:w-48"
        />
      </div>

      <div className="ml-4 flex flex-1 flex-col justify-between sm:ml-6">
        <div>
          <div className="flex items-start justify-between">
            <h3 className="text-base font-medium text-[var(--text-primary)]">{item.title}</h3>
            <button
              type="button"
              className="-m-2 inline-flex p-2 text-[var(--text-secondary)] hover:text-red-500"
              onClick={() =>
                handleRemoveFromCart(item.productId, item.selectedColor, item.selectedSize)
              }
            >
              <span className="sr-only">Remove</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1 flex text-sm text-[var(--text-secondary)]">
            <p>{item.selectedColor}</p>
            {item.selectedSize ? (
              <p className="ml-4 border-l border-[var(--border-subtle)] pl-4">
                {item.selectedSize}
              </p>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">${item.price} each</p>
        </div>

        <div className="mt-4 flex flex-1 items-end justify-between text-sm">
          <div className="flex items-center space-x-2 text-[var(--text-primary)]">
            <button
              onClick={() => handleDecrement(item.productId, item.selectedColor, item.selectedSize)}
              className="rounded border border-[var(--border-subtle)] px-2 py-1 text-sm hover:bg-[var(--bg-elev-1)] disabled:opacity-50"
              disabled={quantity <= 1}
            >
              -
            </button>
            <span className="w-8 text-center">{quantity}</span>
            <button
              onClick={() => handleIncrement(item.productId, item.selectedColor, item.selectedSize)}
              className="rounded border border-[var(--border-subtle)] px-2 py-1 text-sm hover:bg-[var(--bg-elev-1)]"
            >
              +
            </button>
          </div>

          <div className="flex flex-col items-end">
            <p className="font-medium text-[var(--text-primary)]">Total: ${lineItemTotal}</p>
            <div className="mt-2 flex items-center space-x-2 text-xs text-[var(--text-secondary)]">
              {item.isDigital ? (
                <>
                  <DevicePhoneMobileIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Delivered digitally</span>
                </>
              ) : (
                <>
                  <TruckIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>Ships in 1-2 weeks</span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* promo code UI removed */}
      </div>
    </li>
  );
}
