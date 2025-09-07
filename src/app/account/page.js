"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UserCircleIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
  QrCodeIcon,
  TicketIcon,
} from "@heroicons/react/24/outline";

import Link from "next/link";
import OrderHistory from "../../../components/OrderHistory";
import Footer from "../components/Footer";
import Header from "../components/Header";
import styles from "./account.module.css";
import { getUserFromFirestore } from "../../../firebase/util/getUserData";
import { logoutUser } from "../../../lib/utils/auth";

import ProfileTab from "./components/ProfileTab";
import TicketsTab from "./components/TicketsTab";
import QrCodeTab from "./components/QrCodeTab";
import SettingsTab from "./components/SettingsTab";
import storage from "@/utils/storage";

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
  const [isLoading, setIsLoading] = useState(true);

  const inputStyling =
    "block w-full bg-black pl-2 rounded-md border py-1.5 px-1 text-gray-100 shadow-sm placeholder:text-gray-500 appearance-none focus:outline-none focus:ring-2 focus:ring-red-700 sm:text-sm sm:leading-6";

  const buttonStyling =
    "flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border border-gray-700 transition-all duration-300";

  const cardStyling =
    "bg-tranparent p-5 rounded-lg border border-gray-800 shadow-md hover:border-red-500/30 transition-all duration-300";

  const containerStyling =
    "bg-gray-900/30 p-6 rounded-lg border border-gray-800 hover:border-red-500/30 transition-all duration-300 shadow-xl";

  const eventCardStyling =
    "bg-transparent p-2  rounded-lg  shadow-md hover:border-red-500/30 transition-all duration-300";

  useEffect(() => {
    async function fetchUserData() {
      if (typeof window !== "undefined") {
        const storedUserId = storage.get("userId");

        if (storedUserId) {
          setUserId(storedUserId);

          try {
            setIsLoading(true);
            const userData = await getUserFromFirestore(storedUserId);

            if (userData) {
              console.log("Fetched user data from Firestore:", userData);

              if (userData.profilePicture) {
                setProfilePicture(userData.profilePicture);
                storage.set("profilePicture", userData.profilePicture);
              } else {
                const storedPic = storage.get("profilePicture");
                setProfilePicture(storedPic || "");
              }

              const fullName = [
                userData.firstName || "",
                userData.lastName || "",
              ]
                .filter(Boolean)
                .join(" ");
              if (fullName) {
                setUserName(fullName);
                storage.set("userName", fullName);
              } else {
                const { userName: un, name: nm } = storage.readKeys([
                  "userName",
                  "name",
                ]);
                const storedName = un || nm;
                setUserName(storedName || "User");
              }

              if (userData.firstName) setFirstName(userData.firstName);
              if (userData.lastName) setLastName(userData.lastName);

              if (userData.email) {
                setUserEmail(userData.email);
                storage.set("userEmail", userData.email);
              } else {
                const { userEmail: ue, email: em } = storage.readKeys([
                  "userEmail",
                  "email",
                ]);
                const storedEmail = ue || em;
                setUserEmail(storedEmail || "");
              }

              if (userData.phoneNumber) {
                setPhoneNumber(userData.phoneNumber);
                storage.set("phoneNumber", userData.phoneNumber);
              } else {
                const storedPhone = storage.get("phoneNumber");
                setPhoneNumber(storedPhone || "");
              }
            } else {
              fallbackToLocalStorage();
            }
          } catch (error) {
            console.error("Error fetching user data from Firestore:", error);
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
      const {
        userId: uid,
        profilePicture: pic,
        userName: un,
        name: nm,
        userEmail: ue,
        email: em,
        phoneNumber: ph,
      } = storage.readKeys([
        "userId",
        "profilePicture",
        "userName",
        "name",
        "userEmail",
        "email",
        "phoneNumber",
      ]);
      const storedUserId = uid;
      const storedProfilePicture = pic;
      const storedUserName = un || nm;
      const storedUserEmail = ue || em;
      const storedPhoneNumber = ph;

      setUserId(storedUserId || "");
      setProfilePicture(storedProfilePicture || "");
      setUserName(storedUserName || "User");
      setUserEmail(storedUserEmail || "");
      setPhoneNumber(storedPhoneNumber || "");

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

  const tabComponents = useMemo(
    () => ({
      profile: (
        <ProfileTab
          userId={userId}
          initialFirstName={firstName}
          initialLastName={lastName}
          initialPhoneNumber={phoneNumber}
          initialUserEmail={userEmail}
          initialProfilePicture={profilePicture}
          setProfilePicture={setProfilePicture}
          inputStyling={inputStyling}
          buttonStyling={buttonStyling}
          cardStyling={cardStyling}
          containerStyling={containerStyling}
        />
      ),
      orders: <OrderHistory />,
      tickets: (
        <TicketsTab
          userId={userId}
          cardStyling={cardStyling}
          eventCardStyling={eventCardStyling}
          containerStyling={containerStyling}
        />
      ),
      qrcode: (
        <QrCodeTab
          userId={userId}
          buttonStyling={buttonStyling}
          cardStyling={cardStyling}
          containerStyling={containerStyling}
        />
      ),
      settings: (
        <SettingsTab
          inputStyling={inputStyling}
          buttonStyling={buttonStyling}
          cardStyling={cardStyling}
          containerStyling={containerStyling}
          onLogout={handleLogout}
        />
      ),
    }),
    [
      userId,
      firstName,
      lastName,
      phoneNumber,
      userEmail,
      profilePicture,
      activeTab,
    ]
  );

  return (
    <div className="bg-black min-h-screen">
      <Header profilePicture={profilePicture} userName={userName} />

      <main className="flex-grow">
        {isLoading ? (
          <div className="flex justify-center items-center h-[70vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col items-center mb-8">
                <div className="flex justify-center mt-6 mb-4">
                  <img
                    src="/assets/RSLogo2.png"
                    alt="RAGESTATE"
                    className="h-14 w-auto"
                  />
                </div>
                <h1 className="text-3xl font-bold leading-tight text-white text-center">
                  {userName ? `${userName}'s Account` : "Your Account"}
                </h1>
                <p className="mt-2 text-gray-400 text-center max-w-2xl">
                  Manage your profile, view your QR code, and update your
                  account settings.
                </p>
              </div>

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

              <div className="mb-16">{tabComponents[activeTab]}</div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
