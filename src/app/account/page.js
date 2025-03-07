"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircleIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
  QrCodeIcon,
} from "@heroicons/react/24/outline";

import QRCode from "qrcode.react";
import Link from "next/link";
import OrderHistory from "../../../components/OrderHistory";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import styles from './account.module.css';

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

  const inputStyling = "block w-full bg-black pl-2 rounded-md border-2 py-1.5 px-1 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6";
  const buttonStyling = "flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border-2 border-gray-100 transition-all duration-200";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedProfilePicture = localStorage.getItem("profilePicture");
      const storedUserName = localStorage.getItem("userName") || localStorage.getItem("name");
      const storedUserEmail = localStorage.getItem("userEmail") || localStorage.getItem("email");
      
      // Split name into first and last if available
      if (storedUserName) {
        const nameParts = storedUserName.split(' ');
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.length > 1 ? nameParts.slice(1).join(' ') : "");
      }

      setUserId(storedUserId || "");
      setProfilePicture(storedProfilePicture || "");
      setUserName(storedUserName || "User");
      setUserEmail(storedUserEmail || "");
      setPhoneNumber(localStorage.getItem("phoneNumber") || "");
    }
  }, []);

  const handleLogout = (event) => {
    event.preventDefault();
    localStorage.clear();
    router.push("/login");
  };

  const profileImage = useMemo(
    () => (
      <Image
        priority
        alt="ProfilePicture"
        src={profilePicture || "/assets/user.png"}
        className="h-8 w-8 rounded-md object-cover"
        width={32}
        height={32}
      />
    ),
    [profilePicture]
  );

  // Define tab components
  const tabComponents = {
    profile: (
      <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6">
          Profile Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          {/* Profile Info Form */}
          <div className="md:col-span-3">
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  onChange={(e) => setUserEmail(e.target.value)}
                  className={`${inputStyling} mt-1`}
                />
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  className={buttonStyling}
                  onClick={() => alert("Profile updated!")}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
          
          {/* Profile Picture and Account Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <div className="flex flex-col items-center mb-4">
                <div className="relative group">
                  <Image
                    src={profilePicture || "/assets/user.png"}
                    alt="Profile"
                    width={120}
                    height={120}
                    className="rounded-md border-2 border-gray-300 object-cover w-[120px] h-[120px]"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm">Change Photo</span>
                  </div>
                </div>
                <button className="mt-3 text-sm text-red-500 hover:text-red-400 font-medium">
                  Upload Image
                </button>
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
    qrcode: (
      <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6">Your QR Code</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
          <div className="md:col-span-3 flex flex-col items-center">
            <div className="p-4 bg-white rounded-lg shadow-xl">
              <QRCode value={userId || "ragestate-user"} size={260} />
            </div>
            <button
              className={`${buttonStyling} mt-6 px-8`}
              onClick={() => {
                // In a real app, you would implement a download function
                alert("QR Code download feature would be implemented here");
              }}
            >
              Download QR Code
            </button>
          </div>
          
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-lg font-medium text-gray-100 mb-4">How To Use Your QR Code</h3>
              <ul className="space-y-3">
                {[
                  "Present this QR code at RAGESTATE events for quick check-in",
                  "Access exclusive areas and VIP experiences",
                  "Redeem special offers and promotions",
                  "Link your digital ticket purchases to your account",
                  "Share your attendance with friends"
                ].map((item, i) => (
                  <li key={i} className="flex items-center">
                    <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-lg font-medium text-gray-100 mb-3">Security Notice</h3>
              <p className="text-sm text-gray-300">
                Your QR code contains a unique identifier linked to your account. Don't share 
                screenshots of your code with others to prevent unauthorized access to your account benefits.
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
    settings: (
      <div className="bg-gray-900/30 p-6 rounded-lg border border-gray-800 shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          {/* Password Change Form */}
          <div className="md:col-span-3">
            <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md mb-6">
              <h3 className="text-xl font-medium text-white mb-4">Change Password</h3>
              <form className="space-y-4">
                <div>
                  <label htmlFor="current-password" className="block text-sm font-medium text-gray-300">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="current-password"
                    className={inputStyling}
                  />
                </div>
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="new-password"
                    className={inputStyling}
                  />
                </div>
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300">
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
            
            {/* To implement this in the future */}
            {/* <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-xl font-medium text-white mb-4">Notification Preferences</h3>
              <div className="space-y-4">
                {[
                  { id: "email-promo", label: "Email promotions and upcoming events" },
                  { id: "email-updates", label: "Product updates and announcements" },
                  { id: "email-orders", label: "Order confirmations and shipping updates" },
                  { id: "sms-alerts", label: "SMS notifications for urgent alerts" },
                  { id: "push-notif", label: "Mobile push notifications" }
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-700">
                    <label htmlFor={item.id} className="text-sm text-gray-300">
                      {item.label}
                    </label>
                    <div className="relative flex items-center">
                      <input
                        id={item.id}
                        type="checkbox"
                        className="h-4 w-4 text-red-700 focus:ring-red-700 border-zinc-600 rounded bg-zinc-700"
                        defaultChecked
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div> */}
          </div>
          
          {/* Account Management and Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-lg font-medium text-gray-100 mb-4">Account Management</h3>
              <div className="space-y-4">
                <button
                  onClick={handleLogout}
                  className="w-full flex justify-center items-center bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Sign Out
                </button>
                
                {/* <button className="w-full flex justify-center items-center text-yellow-500 border border-yellow-500 hover:bg-yellow-500/10 font-medium py-2 px-4 rounded-md transition-colors">
                  Export Account Data
                </button> */}
                
                <button className="w-full flex justify-center items-center text-red-500 border border-red-500 hover:bg-red-500/10 font-medium py-2 px-4 rounded-md transition-colors">
                  Delete Account
                </button>
              </div>
            </div>
            
            {/* <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-lg font-medium text-gray-100 mb-3">Connected Services</h3>
              <div className="space-y-3">
                {[
                  { name: "Spotify", connected: true },
                  { name: "Instagram", connected: false },
                  { name: "Twitter", connected: true }
                ].map((service, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm text-gray-300">{service.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      service.connected 
                        ? "text-green-500 bg-green-500/10" 
                        : "text-gray-400 bg-gray-500/10"
                    }`}>
                      {service.connected ? "Connected" : "Disconnected"}
                    </span>
                  </div>
                ))}
              </div>
              <button className="mt-4 w-full flex justify-center items-center bg-transparent text-gray-300 border border-gray-700 hover:border-gray-500 font-medium py-1.5 px-4 rounded-md text-sm transition-colors">
                Manage Connections
              </button>
            </div> */}
            
            {/* Privacy Settings */}
            {/* <div className="bg-gray-900/50 p-5 rounded-lg border border-gray-800 shadow-md">
              <h3 className="text-lg font-medium text-gray-100 mb-3">Privacy Settings</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-300">Public Profile</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-700 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-300">Show Activity Status</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-red-700 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                  </label>
                </div>
              </div>
            </div> */}
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="bg-black min-h-screen">
      <Header />

      <main className="flex-grow ">
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
                Manage your profile, view your QR code, and update your account settings.
              </p>
            </div>

            {/* Account Navigation Tabs */}
            <div className="mt-6 mb-8">
              <div className="border-b border-zinc-700">
                <div className={styles.tabScroll}>
                  <nav className="-mb-px flex space-x-8 min-w-max px-1 justify-center" aria-label="Tabs">
                    <button
                      onClick={() => setActiveTab("profile")}
                      className={`${
                        activeTab === "profile"
                          ? "border-red-700 text-red-500"
                          : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                      } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                    >
                      <UserCircleIcon className="h-5 w-5 mr-2" aria-hidden="true" />
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
                      onClick={() => setActiveTab("qrcode")}
                      className={`${
                        activeTab === "qrcode"
                          ? "border-red-700 text-red-500"
                          : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                      } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                    >
                      <QrCodeIcon className="h-5 w-5 mr-2" aria-hidden="true" />
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
                      <Cog6ToothIcon className="h-5 w-5 mr-2" aria-hidden="true" />
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
      </main>

      <Footer />
    </div>
  );
}
