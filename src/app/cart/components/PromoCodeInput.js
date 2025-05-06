"use client";

import React from "react";

export default function PromoCodeInput({
  code,
  setCode,
  handleApplyPromoCode,
  promoApplied,
  isLoading,
  codeError,
  setValidCode, // Pass setValidCode to reset validation status on type
  setCodeError, // Pass setCodeError to clear error on type
}) {
  return (
    <div className="flex flex-col space-y-2">
      <div className="flex flex-wrap items-center space-x-2">
        <input
          type="text"
          placeholder="Enter promo code"
          value={code}
          onChange={(e) => {
            const newCode = e.target.value.toUpperCase();
            setCode(newCode);
            if (setCodeError) setCodeError(""); // Clear error on type
            if (setValidCode) setValidCode(false); // Reset validation status on type
          }}
          className="mt-2 sm:mt-0 ml-0 sm:ml-2 px-3 py-2 h-10 border border-gray-300 rounded text-black w-40 disabled:bg-gray-200 disabled:cursor-not-allowed"
          disabled={promoApplied || isLoading}
        />
        <button
          className={`mt-2 sm:mt-0 ml-0 sm:ml-2 px-3 py-2 h-10 rounded text-sm font-medium transition-colors ${
            code && !promoApplied && !isLoading
              ? "bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              : "bg-gray-300 text-gray-900 cursor-not-allowed"
          }`}
          onClick={handleApplyPromoCode}
          disabled={!code || promoApplied || isLoading}
        >
          {isLoading
            ? "Applying..."
            : promoApplied
            ? "Applied"
            : "Apply Discount"}
        </button>
      </div>
      {codeError && (
        <p className="text-red-500 text-sm mt-1 ml-2">{codeError}</p>
      )}
      {promoApplied &&
        !codeError && ( // Ensure no error when showing success
          <p className="text-green-500 text-sm mt-1 ml-2">Discount applied!</p>
        )}
    </div>
  );
}
