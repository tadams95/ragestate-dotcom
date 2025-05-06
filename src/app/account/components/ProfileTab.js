"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import uploadImage from "../../../../firebase/util/uploadImage";
import { updateUserData } from "../../../../lib/utils/auth";

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
  const [firstName, setFirstName] = useState(initialFirstName || "");
  const [lastName, setLastName] = useState(initialLastName || "");
  const [phoneNumber, setPhoneNumber] = useState(initialPhoneNumber || "");
  const [userEmail, setUserEmail] = useState(initialUserEmail || ""); // Assuming email might be editable or needed
  const [currentProfilePicture, setCurrentProfilePicture] = useState(
    initialProfilePicture || ""
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    if (!userId) {
      alert("User ID not found. Cannot update profile.");
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
      alert("Profile updated successfully!");
      // Optionally update parent state if needed, e.g., for username display
      // onUpdateSuccess({ firstName, lastName });
    } else {
      alert(result.message || "Failed to update profile");
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !userId) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadError("");

    try {
      const imageUrl = await uploadImage(
        file,
        userId,
        (progress) => setUploadProgress(progress),
        (error) => setUploadError(error.message)
      );

      setCurrentProfilePicture(imageUrl); // Update local state for immediate feedback
      setProfilePicture(imageUrl); // Update parent state (e.g., for Header)
      localStorage.setItem("profilePicture", imageUrl); // Update localStorage

      console.log("Profile picture updated successfully");
      setIsUploading(false);
      setUploadProgress(0);
    } catch (error) {
      console.error("Image upload failed:", error);
      setUploadError(error.message || "Upload failed. Please try again.");
      setIsUploading(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={containerStyling}>
      <h2 className="text-2xl font-bold text-white mb-6">
        Profile Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Profile Info Form */}
        <div className="md:col-span-3">
          <form className="space-y-6" onSubmit={handleProfileUpdate}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-300"
                >
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
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-300"
                >
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
              <label
                htmlFor="phoneNumber"
                className="block text-sm font-medium text-gray-300"
              >
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
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
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
        </div>

        {/* Profile Picture and Account Details */}
        <div className="md:col-span-2 space-y-6">
          <div className={cardStyling}>
            <div className="flex flex-col items-center mb-4">
              <div className="relative group">
                <Image
                  // Use local state for immediate UI update
                  src={currentProfilePicture || "/assets/user.png"}
                  alt="Profile"
                  width={120}
                  height={120}
                  className="rounded-md border-2 border-gray-300 hover:border-red-500 transition-all duration-300 object-cover w-[120px] h-[120px]"
                  key={currentProfilePicture} // Add key to force re-render on src change
                />
                {isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 rounded-md">
                    <div className="w-16 h-16 relative mb-2">
                      <svg
                        className="animate-spin h-full w-full text-red-500"
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
                      <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                        {uploadProgress}%
                      </span>
                    </div>
                  </div>
                )}
                {!isUploading && (
                  <div
                    className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={triggerFileInput}
                  >
                    <span className="text-white text-sm">Change Photo</span>
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
              <button
                onClick={triggerFileInput}
                disabled={isUploading}
                className={`mt-3 text-sm ${
                  isUploading
                    ? "text-gray-500"
                    : "text-red-500 hover:text-red-400"
                } font-medium`}
              >
                {isUploading ? "Uploading..." : "Upload Image"}
              </button>
              {uploadError && (
                <p className="text-sm text-red-500 mt-1">{uploadError}</p>
              )}
            </div>
          </div>
          {/* Removed Account Status section as per original code */}
        </div>
      </div>
    </div>
  );
}
