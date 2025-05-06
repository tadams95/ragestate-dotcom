"use client";

import { useState } from "react";
import QRCode from "qrcode.react";

export default function QrCodeTab({
  userId,
  buttonStyling,
  cardStyling,
  containerStyling,
}) {
  const [isQrBlurred, setIsQrBlurred] = useState(true);

  return (
    <div className={containerStyling}>
      <h2 className="text-2xl font-bold text-white mb-6">Your QR Code</h2>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
        <div className="md:col-span-3 flex flex-col items-center">
          <div className="p-4 bg-white rounded-lg shadow-xl relative hover:shadow-red-500/10 transition-all duration-300">
            <div
              className={`transition-all duration-300 ${
                isQrBlurred ? "blur-md" : ""
              }`}
            >
              <QRCode value={userId || "ragestate-user"} size={260} />
            </div>
            {isQrBlurred && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-gray-800 font-medium bg-white/40 px-3 py-1 rounded">
                  Tap to reveal
                </span>
              </div>
            )}
          </div>
          <button
            className={`${buttonStyling} mt-6 px-8`}
            onClick={() => setIsQrBlurred(!isQrBlurred)}
          >
            {isQrBlurred ? "Reveal QR Code" : "Hide QR Code"}
          </button>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className={cardStyling}>
            <h3 className="text-lg font-medium text-gray-100 mb-4">
              How To Use Your QR Code
            </h3>
            <ul className="space-y-3">
              {[
                "Present this QR code at RAGESTATE events for quick check-in",
                "Access exclusive areas and VIP experiences",
                "Redeem special offers and promotions",
                "Link your digital ticket purchases to your account",
                "Share your attendance with friends",
              ].map((item, i) => (
                <li key={i} className="flex items-center">
                  <svg
                    className="h-5 w-5 text-red-500 mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-sm text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={cardStyling}>
            <h3 className="text-lg font-medium text-gray-100 mb-3">
              Security Notice
            </h3>
            <p className="text-sm text-gray-300">
              Your QR code contains a unique identifier linked to your account.
              Keep it hidden when not in use and don't share screenshots of your
              code with others to prevent unauthorized access to your account
              benefits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
