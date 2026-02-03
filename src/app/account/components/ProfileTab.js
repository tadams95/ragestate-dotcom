'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import removeProfileImage from '../../../../firebase/util/removeProfileImage';
import uploadImage from '../../../../firebase/util/uploadImage';
import { updateUserData } from '../../../../lib/utils/auth';
import ZoomableImageViewer from '../../components/ZoomableImageViewer';
import EditProfileForm from './EditProfileForm';
import ProfileSongForm from './ProfileSongForm';
// removed completeness meter Firestore reads

export default function ProfileTab({
  userId,
  initialFirstName,
  initialLastName,
  initialPhoneNumber,
  initialUserEmail,
  initialProfilePicture,
  setProfilePicture, // Function to update profile picture in parent state
  inputStyling,
  buttonStyling,
  cardStyling,
  containerStyling,
}) {
  const [firstName, setFirstName] = useState(initialFirstName || '');
  const [lastName, setLastName] = useState(initialLastName || '');
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || '');
  const [userEmail, setUserEmail] = useState(initialUserEmail || ''); // Assuming email might be editable or needed
  const [currentProfilePicture, setCurrentProfilePicture] = useState(initialProfilePicture || '');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    if (!userId) {
      alert('User ID not found. Cannot update profile.');
      return;
    }
    const updatedData = {
      firstName,
      lastName,
      phoneNumber,
      email: userEmail, // Include email if it's intended to be updatable
    };

    const result = await updateUserData(userId, updatedData);
    if (result.success) {
      toast.success('Profile updated');
      // Optionally update parent state if needed, e.g., for username display
      // onUpdateSuccess({ firstName, lastName });
    } else {
      toast.error(result.message || 'Failed to update profile');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !userId) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError('');

    try {
      const imageUrl = await uploadImage(
        file,
        userId,
        (progress) => setUploadProgress(progress),
        (error) => setUploadError(error.message),
      );

      setCurrentProfilePicture(imageUrl); // Update local state for immediate feedback
      setProfilePicture(imageUrl); // Update parent state (e.g., for Header)
      localStorage.setItem('profilePicture', imageUrl); // Update localStorage

      toast.success('Profile picture updated');
      setIsUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error('Image upload failed:', error);
      const msg = error.message || 'Upload failed. Please try again.';
      setUploadError(msg);
      toast.error(msg);
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!userId) return;
    const ok = window.confirm('Remove your profile image?');
    if (!ok) return;
    try {
      await removeProfileImage(userId);
      setCurrentProfilePicture('');
      setProfilePicture('');
      toast.success('Profile image removed');
    } catch (err) {
      toast.error(err?.message || 'Failed to remove profile image');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={containerStyling}>
      <div className="mb-8 border-b border-[var(--border-subtle)] pb-6">
        <h2 className="text-2xl font-bold text-[var(--text-primary)]">Profile Settings</h2>
        <p className="mt-1 text-sm text-[var(--text-tertiary)]">
          Manage your personal details and public profile appearance.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        {/* Left Column: Forms (7 cols) */}
        <div className="space-y-8 lg:col-span-7">
          <section>
            <h3 className="mb-4 text-lg font-medium text-[var(--text-primary)]">
              Personal Information
            </h3>
            <form className="space-y-5" onSubmit={handleProfileUpdate}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="firstName"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]"
                  >
                    First Name
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className={inputStyling}
                    placeholder=""
                  />
                </div>
                <div>
                  <label
                    htmlFor="lastName"
                    className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]"
                  >
                    Last Name
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className={inputStyling}
                    placeholder=""
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="phoneNumber"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]"
                >
                  Phone Number
                </label>
                <input
                  id="phoneNumber"
                  name="phoneNumber"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={inputStyling}
                  placeholder="+1 (555) 000-0000"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={`${inputStyling} opacity-75`}
                />
              </div>

              <div className="pt-2">
                <button type="submit" className={buttonStyling}>
                  Save Personal Info
                </button>
              </div>
            </form>
          </section>

          <div className="border-t border-[var(--border-subtle)] pt-8">
            <EditProfileForm
              inputStyling={inputStyling}
              buttonStyling={buttonStyling}
              cardStyling={cardStyling}
            />
          </div>

          <div className="border-t border-[var(--border-subtle)] pt-8">
            <ProfileSongForm
              inputStyling={inputStyling}
              buttonStyling={buttonStyling}
              cardStyling={cardStyling}
            />
          </div>
        </div>

        {/* Right Column: Profile Picture (5 cols) */}
        <div className="lg:col-span-5">
          <div className={`${cardStyling} sticky top-8`}>
            <div className="flex flex-col items-center text-center">
              <h3 className="mb-6 text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                Profile Picture
              </h3>

              <div className="group relative mb-6">
                <div className="relative h-40 w-40 overflow-hidden rounded-md border-4 border-[var(--border-subtle)] shadow-2xl transition-all duration-300 group-hover:border-red-600/50">
                  <button
                    type="button"
                    onClick={() => currentProfilePicture && setIsImageViewerOpen(true)}
                    className={`relative h-full w-full ${currentProfilePicture ? 'cursor-pointer' : ''}`}
                    disabled={!currentProfilePicture}
                    aria-label={currentProfilePicture ? 'View profile photo' : undefined}
                  >
                    <Image
                      src={currentProfilePicture || '/assets/user.png'}
                      alt="Profile"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority
                    />
                  </button>

                  {/* Upload Overlay */}
                  <div
                    className={`absolute inset-0 flex flex-col items-center justify-center bg-black/60 transition-opacity duration-200 ${
                      isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center">
                        <svg
                          className="mb-2 h-8 w-8 animate-spin text-red-500"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        <span className="text-xs font-bold text-white">{uploadProgress}%</span>
                      </div>
                    ) : (
                      <button
                        onClick={triggerFileInput}
                        className="cursor-pointer p-2 text-white hover:text-red-400"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={1.5}
                          stroke="currentColor"
                          className="h-8 w-8"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <div className="flex w-full max-w-[200px] flex-col gap-3">
                <button
                  onClick={triggerFileInput}
                  disabled={isUploading}
                  className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elev-2)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-elev-1)] hover:text-red-400 disabled:opacity-50"
                >
                  {isUploading ? 'Uploading...' : 'Change Photo'}
                </button>

                {currentProfilePicture && (
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="w-full text-xs text-[var(--text-tertiary)] transition-colors hover:text-red-500"
                  >
                    Remove current photo
                  </button>
                )}
              </div>

              {uploadError && <p className="mt-3 text-xs text-red-500">{uploadError}</p>}

              <p className="mt-6 text-xs leading-relaxed text-[var(--text-tertiary)]">
                Recommended: Square JPG or PNG, at least 400x400px.
              </p>
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-center" />

      {/* Profile Image Zoom Viewer */}
      <ZoomableImageViewer
        isOpen={isImageViewerOpen}
        onClose={() => setIsImageViewerOpen(false)}
        imageUrl={currentProfilePicture}
        alt="Profile photo"
      />
    </div>
  );
}
