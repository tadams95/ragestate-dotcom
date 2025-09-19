'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import removeProfileImage from '../../../../firebase/util/removeProfileImage';
import uploadImage from '../../../../firebase/util/uploadImage';
import { updateUserData } from '../../../../lib/utils/auth';
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
      <h2 className="mb-6 text-2xl font-bold text-white">Profile Information</h2>
      <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-5">
        {/* Profile Info Form */}
        <div className="md:col-span-3">
          <form className="space-y-6" onSubmit={handleProfileUpdate}>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={`${inputStyling} mt-1`}
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={`${inputStyling} mt-1`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-300">
                Phone Number
              </label>
              <input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className={`${inputStyling} mt-1`}
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)} // Allow editing if needed
                // readOnly // Or make it read-only if email shouldn't be changed here
                className={`${inputStyling} mt-1`}
              />
            </div>

            <div className="pt-4">
              <button type="submit" className={buttonStyling}>
                Save Changes
              </button>
            </div>
          </form>

          {/* Username/Bio and Profile Song */}
          <div className="mt-6">
            <EditProfileForm
              inputStyling={inputStyling}
              buttonStyling={buttonStyling}
              cardStyling={cardStyling}
            />
          </div>
          <div className="mt-6">
            <ProfileSongForm
              inputStyling={inputStyling}
              buttonStyling={buttonStyling}
              cardStyling={cardStyling}
            />
          </div>
        </div>

        {/* Profile Picture and Account Details */}
        <div className="space-y-6 md:col-span-2">
          <div className={cardStyling}>
            <div className="mb-4 flex flex-col items-center">
              <div className="group relative">
                <Image
                  // Use local state for immediate UI update
                  src={currentProfilePicture || '/assets/user.png'}
                  alt="Profile"
                  width={120}
                  height={120}
                  className="h-[120px] w-[120px] rounded-md border-2 border-gray-300 object-cover transition-all duration-300 hover:border-red-500"
                  key={currentProfilePicture} // Add key to force re-render on src change
                />
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-md bg-black bg-opacity-70">
                    <div className="relative mb-2 h-16 w-16">
                      <svg
                        className="h-full w-full animate-spin text-red-500"
                        xmlns="http://www.w3.org/2000/svg"
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
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                )}
                {!isUploading && (
                  <div
                    className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-md bg-black bg-opacity-50 opacity-0 transition-opacity group-hover:opacity-100"
                    onClick={triggerFileInput}
                  >
                    <span className="text-sm text-white">Change Photo</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <div className="mt-2 flex gap-3">
                <button
                  onClick={triggerFileInput}
                  disabled={isUploading}
                  className={`mt-3 text-sm ${
                    isUploading ? 'text-gray-500' : 'text-red-500 hover:text-red-400'
                  } font-medium`}
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </button>
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="mt-3 text-sm font-medium text-gray-400 hover:text-gray-200"
                >
                  Remove Image
                </button>
              </div>
              {uploadError && <p className="mt-1 text-sm text-red-500">{uploadError}</p>}
            </div>
          </div>
          {/* Removed Account Status section as per original code */}
        </div>
      </div>
      <Toaster position="bottom-center" />
    </div>
  );
}
