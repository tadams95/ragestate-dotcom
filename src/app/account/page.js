"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircleIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
  QrCodeIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";

import QRCode from "qrcode.react";
import Link from "next/link";
import OrderHistory from "../../../components/OrderHistory";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import styles from "./account.module.css";
import uploadImage from "../../../firebase/util/uploadImage";
import { getUserFromFirestore } from "../../../firebase/util/getUserData";
import { logoutUser, updateUserData } from "../../../lib/utils/auth";
import {
  collection,
  getDocs,
  getFirestore,
  query,
  where,
} from "firebase/firestore";

export default function Account() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isQrBlurred, setIsQrBlurred] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  const inputStyling =
    "block w-full bg-black pl-2 rounded-md border py-1.5 px-1 text-gray-100 shadow-sm placeholder:text-gray-500 appearance-none focus:outline-none focus:ring-2 focus:ring-red-700 sm:text-sm sm:leading-6";

  const buttonStyling =
    "flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border border-gray-700 transition-all duration-300";

  // Common card styling with hover effects matching about page and event details
  const cardStyling =
    "bg-tranparent p-5 rounded-lg border border-gray-800 shadow-md hover:border-red-500/30 transition-all duration-300";

  // Main container styling with hover effects
  const containerStyling =
    "bg-gray-900/30 p-6 rounded-lg border border-gray-800 hover:border-red-500/30 transition-all duration-300 shadow-xl";

  const eventCardStyling =
    "bg-transparent p-2  rounded-lg  shadow-md hover:border-red-500/30 transition-all duration-300";

  useEffect(() => {
    async function fetchUserData() {
      if (typeof window !== "undefined") {
        const storedUserId = localStorage.getItem("userId");

        if (storedUserId) {
          setUserId(storedUserId);

          // Try to get user data from Firestore first
          try {
            setIsLoading(true);
            const userData = await getUserFromFirestore(storedUserId);

            if (userData) {
              console.log("Fetched user data from Firestore:", userData);

              // Update state with Firestore data
              if (userData.profilePicture) {
                setProfilePicture(userData.profilePicture);
                localStorage.setItem("profilePicture", userData.profilePicture);
              }

              const fullName = [
                userData.firstName || "",
                userData.lastName || "",
              ]
                .filter(Boolean)
                .join(" ");
              if (fullName) {
                setUserName(fullName);
                localStorage.setItem("userName", fullName);
              }

              if (userData.firstName) setFirstName(userData.firstName);
              if (userData.lastName) setLastName(userData.lastName);

              if (userData.email) {
                setUserEmail(userData.email);
                localStorage.setItem("userEmail", userData.email);
              }

              if (userData.phoneNumber) {
                setPhoneNumber(userData.phoneNumber);
                localStorage.setItem("phoneNumber", userData.phoneNumber);
              }
            } else {
              // Fall back to localStorage if no Firestore data
              fallbackToLocalStorage();
            }
          } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
            // Fall back to localStorage on error
            fallbackToLocalStorage();
          } finally {
            setIsLoading(false);
          }
        } else {
          fallbackToLocalStorage();
          setIsLoading(false);
        }
      }
    }

    function fallbackToLocalStorage() {
      console.log("Using localStorage data as fallback");
      const storedProfilePicture = localStorage.getItem("profilePicture");
      const storedUserName =
        localStorage.getItem("userName") || localStorage.getItem("name");
      const storedUserEmail =
        localStorage.getItem("userEmail") || localStorage.getItem("email");
      const storedPhoneNumber = localStorage.getItem("phoneNumber");

      setProfilePicture(storedProfilePicture || "");
      setUserName(storedUserName || "User");
      setUserEmail(storedUserEmail || "");
      setPhoneNumber(storedPhoneNumber || "");

      // Split name into first and last if available
      if (storedUserName) {
        const nameParts = storedUserName.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");
      }
    }

    fetchUserData();
  }, []);

  const handleLogout = async (event) => {
    event.preventDefault();
    const result = await logoutUser();
    if (result.success) {
      router.push("/login");
    } else {
      console.error("Logout failed:", result.message);
    }
  };

  const handleProfileUpdate = async (event) => {
    event.preventDefault();
    const updatedData = {
      firstName,
      lastName,
      phoneNumber,
      email: userEmail,
    };

    const result = await updateUserData(userId, updatedData);
    if (result.success) {
      // Show success message
      alert("Profile updated successfully!");
    } else {
      // Show error message
      alert(result.message || "Failed to update profile");
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

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

      // Update local state with the new profile picture URL
      setProfilePicture(imageUrl);

      // Success message/toast could be added here
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

  // Fetch user tickets function
  const fetchUserTickets = useCallback(async () => {
    if (!userId) return;

    setLoadingTickets(true);
    try {
      const firestore = getFirestore();

      // First, get all events
      const eventsCollectionRef = collection(firestore, "events");
      const eventsSnapshot = await getDocs(eventsCollectionRef);

      const ticketsPromises = eventsSnapshot.docs.map(async (doc) => {
        const eventData = doc.data();
        const ragersCollectionRef = collection(
          firestore,
          "events",
          doc.id,
          "ragers"
        );

        // Query tickets where the user is the owner and ticket is active
        const ragersQuerySnapshot = await getDocs(
          query(
            ragersCollectionRef,
            where("firebaseId", "==", userId),
            where("active", "==", true)
          )
        );

        // Map through ragers (tickets) and include event data
        return ragersQuerySnapshot.docs.map((ragerDoc) => {
          const ticketData = ragerDoc.data();
          return {
            id: ragerDoc.id,
            eventId: doc.id,
            eventName: eventData.name || "Unnamed Event",
            eventDate: eventData.date || new Date().toISOString(),
            eventTime: eventData.time || "TBA",
            location: eventData.location || "TBA",
            ticketType: ticketData.ticketType || "General Admission",
            status: ticketData.active ? "active" : "inactive",
            imageUrl: eventData.imgURL || null,
            purchaseDate: ticketData.purchaseTimestamp
              ? new Date(ticketData.purchaseTimestamp).toISOString()
              : new Date().toISOString(),
            price: ticketData.price ? `$${ticketData.price.toFixed(2)}` : "N/A",
            ...ticketData,
          };
        });
      });

      // Flatten the array of arrays into a single array of tickets
      const allTicketsArrays = await Promise.all(ticketsPromises);
      const allTickets = allTicketsArrays.flat();

      console.log("Fetched user tickets:", allTickets);
      setTickets(allTickets);
    } catch (error) {
      console.error("Error fetching user tickets:", error);
    } finally {
      setLoadingTickets(false);
    }
  }, [userId]);

  useEffect(() => {
    async function fetchUserData() {
      if (typeof window !== "undefined") {
        const storedUserId = localStorage.getItem("userId");

        if (storedUserId) {
          setUserId(storedUserId);

          // Try to get user data from Firestore first
          try {
            setIsLoading(true);
            const userData = await getUserFromFirestore(storedUserId);

            if (userData) {
              console.log("Fetched user data from Firestore:", userData);

              // Update state with Firestore data
              if (userData.profilePicture) {
                setProfilePicture(userData.profilePicture);
                localStorage.setItem("profilePicture", userData.profilePicture);
              }

              const fullName = [
                userData.firstName || "",
                userData.lastName || "",
              ]
                .filter(Boolean)
                .join(" ");
              if (fullName) {
                setUserName(fullName);
                localStorage.setItem("userName", fullName);
              }

              if (userData.firstName) setFirstName(userData.firstName);
              if (userData.lastName) setLastName(userData.lastName);

              if (userData.email) {
                setUserEmail(userData.email);
                localStorage.setItem("userEmail", userData.email);
              }

              if (userData.phoneNumber) {
                setPhoneNumber(userData.phoneNumber);
                localStorage.setItem("phoneNumber", userData.phoneNumber);
              }
            } else {
              // Fall back to localStorage if no Firestore data
              fallbackToLocalStorage();
            }
          } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
            // Fall back to localStorage on error
            fallbackToLocalStorage();
          } finally {
            setIsLoading(false);
          }
        } else {
          fallbackToLocalStorage();
          setIsLoading(false);
        }
      }
    }

    function fallbackToLocalStorage() {
      console.log("Using localStorage data as fallback");
      const storedProfilePicture = localStorage.getItem("profilePicture");
      const storedUserName =
        localStorage.getItem("userName") || localStorage.getItem("name");
      const storedUserEmail =
        localStorage.getItem("userEmail") || localStorage.getItem("email");
      const storedPhoneNumber = localStorage.getItem("phoneNumber");

      setProfilePicture(storedProfilePicture || "");
      setUserName(storedUserName || "User");
      setUserEmail(storedUserEmail || "");
      setPhoneNumber(storedPhoneNumber || "");

      // Split name into first and last if available
      if (storedUserName) {
        const nameParts = storedUserName.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");
      }
    }

    fetchUserData();
  }, []);

  // New useEffect to fetch tickets when userId is available
  useEffect(() => {
    if (userId) {
      fetchUserTickets();
    }
  }, [userId, fetchUserTickets]);

  // Define tab components
  const tabComponents = {
    profile: (
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
                  onChange={(e) => setUserEmail(e.target.value)}
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
                    src={profilePicture || "/assets/user.png"}
                    alt="Profile"
                    width={120}
                    height={120}
                    className="rounded-md border-2 border-gray-300 hover:border-red-500 transition-all duration-300 object-cover w-[120px] h-[120px]"
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

            {/* <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-lg font-medium text-gray-100 mb-3">Account Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Member Since</span>
                  <span className="text-sm text-gray-400">January 2023</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Account Type</span>
                  <span className="text-white bg-red-600 px-2 py-0.5 rounded-full text-sm">Premium</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Last Login</span>
                  <span className="text-sm text-gray-400">Today</span>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    ),
    orders: <OrderHistory />,
    tickets: (
      <div className={containerStyling}>
        <h2 className="text-2xl font-bold text-white mb-6">My Tickets</h2>

        {loadingTickets ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-10">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <TicketIcon className="h-full w-full" aria-hidden="true" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-200">
              No tickets yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by purchasing tickets to an upcoming event.
            </p>
            <div className="mt-6">
              <Link
                href="/events"
                className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
              >
                Browse Events
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tickets.map((ticket) => (
              <div key={ticket.id} className={`${cardStyling} overflow-hidden`}>
                <div
                  key={ticket.id}
                  className={`${eventCardStyling} overflow-hidden`}
                >
                  {/* Two-column grid: left for the image, right for event details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 h-full">
                    {/* Left Column: Image */}
                    <div className="relative">
                      {ticket.imageUrl ? (
                        <Image
                          src={ticket.imageUrl}
                          alt={ticket.eventName}
                          fill
                          style={{ objectFit: "cover" }}
                          className="object-cover rounded-md"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <TicketIcon className="h-16 w-16 text-gray-500" />
                        </div>
                      )}
                      <div className="absolute top-0 right-0 mt-2 mr-2">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          {ticket.status}
                        </span>
                      </div>
                    </div>

                    {/* Right Column: Event Details */}
                    <div className="p-4 flex flex-col gap-4 ml-6">
                      <h3 className="text-lg font-medium text-white">
                        {ticket.eventName}
                      </h3>

                      <div className="grid grid-cols-2 gap-2">
                        <p className="text-sm text-gray-400 col-span-2">
                          {new Date(ticket.eventDate).toLocaleDateString(
                            "en-US",
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            }
                          )}
                          {ticket.eventTime && ticket.eventTime !== "TBA"
                            ? ` at ${ticket.eventTime}`
                            : ""}
                        </p>
                        <p className="text-sm text-gray-400 col-span-2">
                          {ticket.location}
                        </p>
                      </div>

                      <div className="mt-auto border-t border-gray-700 pt-3">
                        <div>
                          <span className="block text-xs text-gray-500">
                            Ticket Type
                          </span>
                          <span className="text-sm text-white">
                            {ticket.ticketType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    qrcode: (
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
                Your QR code contains a unique identifier linked to your
                account. Keep it hidden when not in use and don't share
                screenshots of your code with others to prevent unauthorized
                access to your account benefits.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    settings: (
      <div className={containerStyling}>
        <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          {/* Password Change Form */}
          <div className="md:col-span-3">
            <div className={`${cardStyling} mb-6`}>
              <h3 className="text-xl font-medium text-white mb-4">
                Change Password
              </h3>
              <form className="space-y-4">
                <div>
                  <label
                    htmlFor="current-password"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    className={inputStyling}
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-password"
                    className="block text-sm font-medium text-gray-300"
                  >
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    className={inputStyling}
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirm-password"
                    className={inputStyling}
                  />
                </div>
                <div className="pt-2">
                  <button type="button" className={buttonStyling}>
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Account Management and Details */}
          <div className="md:col-span-2 space-y-6">
            <div className={cardStyling}>
              <h3 className="text-lg font-medium text-gray-100 mb-4">
                Account Management
              </h3>
              <div className="space-y-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center items-center bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Sign Out
                </button>

                <button className="w-full flex justify-center items-center text-red-500 border border-red-500 hover:bg-red-500/10 font-medium py-2 px-4 rounded-md transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="bg-black min-h-screen">
      <Header />

      <main className="flex-grow">
        {isLoading ? (
          <div className="flex justify-center items-center h-[70vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
            <div className="max-w-4xl mx-auto">
              {/* Profile Header with User Info */}
              <div className="flex flex-col items-center mb-8">
                <div className="flex justify-center mt-6 mb-4">
                  <img
                    src="/assets/RSLogo2.png"
                    alt="RAGESTATE"
                    className="h-14 w-auto"
                  />
                </div>
                <h1 className="text-3xl font-bold leading-tight text-white text-center">
                  {userName}'s Account
                </h1>
                <p className="mt-2 text-gray-400 text-center max-w-2xl">
                  Manage your profile, view your QR code, and update your
                  account settings.
                </p>
              </div>

              {/* Account Navigation Tabs */}
              <div className="mt-6 mb-8">
                <div className="border-b border-zinc-700">
                  <div className={styles.tabScroll}>
                    <nav
                      className="-mb-px flex space-x-8 min-w-max px-1 justify-center"
                      aria-label="Tabs"
                    >
                      <button
                        onClick={() => setActiveTab("profile")}
                        className={`${
                          activeTab === "profile"
                            ? "border-red-700 text-red-500"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                      >
                        <UserCircleIcon
                          className="h-5 w-5 mr-2"
                          aria-hidden="true"
                        />
                        Profile
                      </button>
                      <button
                        onClick={() => setActiveTab("orders")}
                        className={`${
                          activeTab === "orders"
                            ? "border-red-700 text-red-500"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                      >
                        <ShoppingBagIcon
                          className="h-5 w-5 mr-2"
                          aria-hidden="true"
                        />
                        Order History
                      </button>
                      <button
                        onClick={() => setActiveTab("tickets")}
                        className={`${
                          activeTab === "tickets"
                            ? "border-red-700 text-red-500"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                      >
                        <TicketIcon
                          className="h-5 w-5 mr-2"
                          aria-hidden="true"
                        />
                        My Tickets
                      </button>
                      <button
                        onClick={() => setActiveTab("qrcode")}
                        className={`${
                          activeTab === "qrcode"
                            ? "border-red-700 text-red-500"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                      >
                        <QrCodeIcon
                          className="h-5 w-5 mr-2"
                          aria-hidden="true"
                        />
                        QR Code
                      </button>
                      <button
                        onClick={() => setActiveTab("settings")}
                        className={`${
                          activeTab === "settings"
                            ? "border-red-700 text-red-500"
                            : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                        } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                      >
                        <Cog6ToothIcon
                          className="h-5 w-5 mr-2"
                          aria-hidden="true"
                        />
                        Settings
                      </button>
                    </nav>
                  </div>
                </div>
              </div>

              {/* Tab Content */}
              <div className="mb-16">{tabComponents[activeTab]}</div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
