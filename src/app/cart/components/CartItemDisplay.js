"use client";

import React from "react";
import {
  XMarkIcon,
  TruckIcon,
  DevicePhoneMobileIcon,
} from "@heroicons/react/20/solid";

export default function CartItemDisplay({
  item,
  handleIncrement,
  handleDecrement,
  handleRemoveFromCart,
  renderPromoComponent, // Function to render promo input or login message
}) {
  const quantity =
    typeof item.quantity === "number" && item.quantity > 0 ? item.quantity : 1;
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
          <div className="flex justify-between items-start">
            <h3 className="text-base font-medium text-gray-100">
              {item.title}
            </h3>
            <button
              type="button"
              className="-m-2 inline-flex p-2 text-gray-400 hover:text-red-500"
              onClick={() =>
                handleRemoveFromCart(
                  item.productId,
                  item.selectedColor,
                  item.selectedSize
                )
              }
            >
              <span className="sr-only">Remove</span>
              <XMarkIcon className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-1 flex text-sm text-gray-400">
            <p>{item.selectedColor}</p>
            {item.selectedSize ? (
              <p className="ml-4 border-l border-gray-500 pl-4">
                {item.selectedSize}
              </p>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-gray-300">${item.price} each</p>
        </div>

        <div className="mt-4 flex flex-1 items-end justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-100">
            <button
              onClick={() =>
                handleDecrement(
                  item.productId,
                  item.selectedColor,
                  item.selectedSize
                )
              }
              className="px-2 py-1 border border-gray-500 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
              disabled={quantity <= 1}
            >
              -
            </button>
            <span className="w-8 text-center">{quantity}</span>
            <button
              onClick={() =>
                handleIncrement(
                  item.productId,
                  item.selectedColor,
                  item.selectedSize
                )
              }
              className="px-2 py-1 border border-gray-500 rounded text-sm hover:bg-gray-700"
            >
              +
            </button>
          </div>

          <div className="flex flex-col items-end">
            <p className="font-medium text-gray-100">Total: ${lineItemTotal}</p>
            <div className="mt-2 flex items-center space-x-2 text-xs text-gray-400">
              {item.isDigital ? (
                <>
                  <DevicePhoneMobileIcon
                    className="h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>Delivered digitally</span>
                </>
              ) : (
                <>
                  <TruckIcon
                    className="h-4 w-4 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span>Ships in 1-2 weeks</span>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Render promo input or login message if renderPromoComponent is provided */}
        {renderPromoComponent && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            {renderPromoComponent()}
          </div>
        )}
      </div>
    </li>
  );
}
