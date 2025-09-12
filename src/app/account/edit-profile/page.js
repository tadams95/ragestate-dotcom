'use client';

import EditProfileForm from '../../components/EditProfileForm';

export default function EditProfilePage() {
  const inputStyling =
    'w-full rounded border border-white/10 bg-[#16171a] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600/40';
  const buttonStyling = 'rounded-lg bg-[#ff1f42] px-4 py-2 text-white disabled:opacity-50';
  const cardStyling = 'rounded-xl border border-white/10 bg-[#0d0d0f] p-4';
  return (
    <div className="mx-auto max-w-xl py-8 text-white">
      <h1 className="mb-4 text-xl font-semibold">Edit Profile</h1>
      <EditProfileForm
        inputStyling={inputStyling}
        buttonStyling={buttonStyling}
        cardStyling={cardStyling}
      />
    </div>
  );
}
