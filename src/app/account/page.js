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

export default function Account() {
  const router = useRouter();
  const [userId, setUserId] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("");
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUserId = localStorage.getItem("userId");
      const storedProfilePicture = localStorage.getItem("profilePicture");
      const storedUserName = localStorage.getItem("userName");
      const storedUserEmail = localStorage.getItem("userEmail");

      setUserId(storedUserId || "");
      setProfilePicture(storedProfilePicture || "");
      setUserName(storedUserName || "User");
      setUserEmail(storedUserEmail || "");
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
        className="h-8 w-8 rounded-md"
        height={50}
        width={50}
      />
    ),
    [profilePicture]
  );

  // Define tab components
  const tabComponents = {
    profile: (
      <div className="bg-zinc-800/50 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-white mb-6">
          Profile Information
        </h2>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex flex-col items-center mb-4 md:mb-0">
            <div className="relative group">
              <Image
                src={profilePicture || "/assets/user.png"}
                alt="Profile"
                width={120}
                height={120}
                className="rounded-md border-2 border-gray-300"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-sm">Change Photo</span>
              </div>
            </div>
            <button className="mt-2 text-sm text-red-500 hover:text-red-400">
              Upload Image
            </button>
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-300"
              >
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-red-700 focus:border-red-700"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-300"
              >
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md shadow-sm text-white focus:outline-none focus:ring-red-700 focus:border-red-700"
              />
            </div>
            <div className="pt-4">
              <button
                className="bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
                onClick={() => alert("Profile updated!")}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    ),
    orders: <OrderHistory />,
    qrcode: (
      <div className="flex flex-col items-center bg-zinc-800/50 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Your QR Code</h2>
        <div className="p-4 bg-white rounded-lg shadow">
          <QRCode value={userId} size={250} />
        </div>
        <p className="mt-4 text-gray-300 max-w-md text-center">
          Use this QR code at events for quick check-ins and exclusive offers.
          Your personal identifier is securely encoded.
        </p>
        {/* <button
          className="mt-6 bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
          onClick={() => {
            // In a real app, you would implement a download function
            alert("QR Code download feature would be implemented here");
          }}
        >
          Download QR Code
        </button> */}
      </div>
    ),
    settings: (
      <div className="bg-zinc-800/50 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-white mb-6">Account Settings</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-medium text-white mb-3">Password</h3>
            <div className="space-y-3">
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
                  className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-red-700 focus:border-red-700"
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
                  className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-red-700 focus:border-red-700"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm-password"
                  className="block text-sm font-medium text-gray-300"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirm-password"
                  className="mt-1 block w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-red-700 focus:border-red-700"
                />
              </div>
              <div className="pt-2">
                <button className="bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-md transition-colors">
                  Change Password
                </button>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-zinc-600">
            <h3 className="text-xl font-medium text-white mb-3">
              Notifications
            </h3>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="email-promo"
                  type="checkbox"
                  className="h-4 w-4 text-red-700 focus:ring-red-700 border-zinc-600 rounded bg-zinc-700"
                  defaultChecked
                />
                <label
                  htmlFor="email-promo"
                  className="ml-3 text-sm text-gray-300"
                >
                  Email promotions and sales
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="email-updates"
                  type="checkbox"
                  className="h-4 w-4 text-red-700 focus:ring-red-700 border-zinc-600 rounded bg-zinc-700"
                  defaultChecked
                />
                <label
                  htmlFor="email-updates"
                  className="ml-3 text-sm text-gray-300"
                >
                  Email product updates
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="email-orders"
                  type="checkbox"
                  className="h-4 w-4 text-red-700 focus:ring-red-700 border-zinc-600 rounded bg-zinc-700"
                  defaultChecked
                />
                <label
                  htmlFor="email-orders"
                  className="ml-3 text-sm text-gray-300"
                >
                  Email order updates
                </label>
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-zinc-600">
            <button
              onClick={handleLogout}
              className="w-full flex justify-center items-center bg-red-700 hover:bg-red-800 text-white font-medium py-2 px-4 rounded-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />

      <main className="flex-grow pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
          <div className="border-b border-zinc-700 pb-5">
            <h1 className="text-3xl font-bold leading-tight text-white">
              Account Dashboard
            </h1>
            <p className="mt-2 text-gray-400">
              Welcome back, {userName}! Manage your account details and orders.
            </p>
          </div>

          {/* Account Navigation Tabs */}
          <div className="mt-6 mb-8">
            <div className="border-b border-zinc-700">
              <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("profile")}
                  className={`${
                    activeTab === "profile"
                      ? "border-red-700 text-red-500"
                      : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
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
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
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
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
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
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Cog6ToothIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                  Settings
                </button>
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <div className="mb-16">{tabComponents[activeTab]}</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
