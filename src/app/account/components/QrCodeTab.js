'use client';

import QRCode from 'qrcode.react';
import { useState } from 'react';

export default function QrCodeTab({ userId, cardStyling, containerStyling }) {
  const [isQrBlurred, setIsQrBlurred] = useState(true);

  return (
    <div className={containerStyling}>
      <h2 className="mb-6 text-2xl font-bold text-white">Your QR Code</h2>

      <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-5">
        <div className="flex flex-col items-center md:col-span-3">
          <div
            className="relative cursor-pointer rounded-lg bg-white p-4 shadow-xl transition-all duration-300 hover:shadow-red-500/10"
            role="button"
            tabIndex={0}
            aria-pressed={!isQrBlurred}
            onClick={() => setIsQrBlurred((v) => !v)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsQrBlurred((v) => !v);
              }
            }}
          >
            <div className={`transition-all duration-300 ${isQrBlurred ? 'blur-md' : ''}`}>
              <QRCode value={userId || 'ragestate-user'} size={260} />
            </div>
            {isQrBlurred && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded bg-white/40 px-3 py-1 font-medium text-gray-800">
                  Tap to reveal
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6 md:col-span-2">
          <div className={cardStyling}>
            <h3 className="mb-4 text-lg font-medium text-gray-100">How To Use Your QR Code</h3>
            <ul className="space-y-3">
              {[
                'Present this QR code at RAGESTATE events for quick check-in',
                'Access exclusive areas and VIP experiences',
                'Redeem special offers and promotions',
                'Link your digital ticket purchases to your account',
                'Share your attendance with friends',
              ].map((item, i) => (
                <li key={i} className="flex items-center">
                  <svg
                    className="mr-2 h-5 w-5 text-red-500"
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
            <h3 className="mb-3 text-lg font-medium text-gray-100">Security Notice</h3>
            <p className="text-sm text-gray-300">
              Your QR code contains a unique identifier linked to your account. Keep it hidden when
              not in use and don't share screenshots of your code with others to prevent
              unauthorized access to your account benefits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
