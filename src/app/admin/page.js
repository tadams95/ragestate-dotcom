"use client";

import { useState, useEffect } from "react";
import {
  ClipboardDocumentListIcon,
  UsersIcon,
  ShoppingBagIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  useFirebase,
  useAuth,
} from "../../../firebase/context/FirebaseContext";
import { format } from "date-fns";
import AdminProtected from "../components/AdminProtected";
import DashboardTab from "../components/admin/DashboardTab";
import OrdersTab from "../components/admin/OrdersTab";
import UsersTab from "../components/admin/UsersTab";
import SettingsTab from "../components/admin/SettingsTab";
import OrderDetailsModal from "../components/admin/OrderDetailsModal";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState({});
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailsOpen, setOrderDetailsOpen] = useState(false);
  const [userCount, setUserCount] = useState(0);
  const [currentUserPage, setCurrentUserPage] = useState(1);
  const usersPerPage = 10;

  const firebase = useFirebase();
  const { currentUser, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!currentUser) {
      console.log("No authenticated user found, cannot load admin data");
      return;
    }

    async function loadData() {
      setLoading(true);
      setError({});

      try {
        const results = await Promise.allSettled([
          firebase.fetchAllPurchases(100),
          firebase.fetchUsers(1000),
          firebase.fetchEvents(50),
          firebase.getUserCount(),
        ]);

        if (results[0].status === "fulfilled") {
          setOrders(results[0].value);
        } else {
          console.error("Error loading orders:", results[0].reason);
          setError((prev) => ({ ...prev, orders: results[0].reason.message }));
        }

        if (results[1].status === "fulfilled") {
          setUsers(results[1].value);
        } else {
          console.error("Error loading users:", results[1].reason);
          setError((prev) => ({ ...prev, users: results[1].reason.message }));
        }

        if (results[2].status === "fulfilled") {
          setEvents(results[2].value);
        } else {
          console.error("Error loading events:", results[2].reason);
          setError((prev) => ({ ...prev, events: results[2].reason.message }));
        }

        if (results[3].status === "fulfilled") {
          setUserCount(results[3].value);
        }
      } catch (err) {
        console.error("General error loading admin data:", err);
        setError({ general: err.message });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [firebase, currentUser, authLoading]);

  const formatDate = (date) => {
    if (!date) return "N/A";
    try {
      return format(new Date(date), "MMM d, yyyy h:mm a");
    } catch (err) {
      return "Invalid Date";
    }
  };

  const formatCurrency = (amount) => {
    if (typeof amount === "string") {
      amount = parseFloat(amount);
    }
    if (typeof amount !== "number" || isNaN(amount)) return "$0.00";
    return `$${amount.toFixed(2)}`;
  };

  const viewOrderDetails = (orderId) => {
    const orderToView = orders.find((order) => order.id === orderId);
    if (orderToView) {
      setSelectedOrder(orderToView);
      setOrderDetailsOpen(true);
    } else {
      console.error("Could not find order with ID:", orderId);
    }
  };

  const loadingState = (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
    </div>
  );

  const errorState = (
    <div className="bg-red-500/20 border border-red-500 p-4 rounded-md text-white">
      <h3 className="text-lg font-medium">Error loading data</h3>
      <p>{error?.general || "An unknown error occurred"}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
      >
        Retry
      </button>
    </div>
  );

  const handleUserPageChange = (direction) => {
    if (direction === "next" && currentUserPage * usersPerPage < userCount) {
      setCurrentUserPage(currentUserPage + 1);
    } else if (direction === "prev" && currentUserPage > 1) {
      setCurrentUserPage(currentUserPage - 1);
    }
  };

  const buttonStyling =
    "flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border-2 border-gray-100 transition-all duration-200";
  const inputStyling =
    "block w-full bg-black pl-2 rounded-md border-2 py-1.5 px-1 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6";

  const tabComponents = {
    dashboard: (
      <DashboardTab
        loading={loading}
        error={error}
        orders={orders}
        userCount={userCount}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        getStatusColor={getStatusColor}
        setActiveTab={setActiveTab}
        loadingState={loadingState}
        errorState={errorState}
      />
    ),
    orders: (
      <OrdersTab
        loading={loading}
        error={error}
        orders={orders}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        getStatusColor={getStatusColor}
        viewOrderDetails={viewOrderDetails}
        inputStyling={inputStyling}
        buttonStyling={buttonStyling}
        loadingState={loadingState}
        errorState={errorState}
      />
    ),
    users: (
      <UsersTab
        loading={loading}
        error={error}
        users={users}
        userCount={userCount}
        currentUserPage={currentUserPage}
        usersPerPage={usersPerPage}
        handleUserPageChange={handleUserPageChange}
        inputStyling={inputStyling}
        buttonStyling={buttonStyling}
        loadingState={loadingState}
        errorState={errorState}
      />
    ),
    settings: (
      <SettingsTab inputStyling={inputStyling} buttonStyling={buttonStyling} />
    ),
  };

  return (
    <AdminProtected>
      <div className="bg-black min-h-screen">
        <Header />
        <main className="flex-grow">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 pb-24">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col items-center mb-8">
                <div className="flex justify-center mt-6 mb-4">
                  <img
                    src="/assets/RSLogo2.png"
                    alt="RAGESTATE"
                    className="h-14 w-auto"
                  />
                </div>
                <h1 className="text-3xl font-bold leading-tight text-white text-center">
                  Admin Dashboard
                </h1>
                <p className="mt-2 text-gray-400 text-center max-w-2xl">
                  Manage orders, users, and site settings in one place.
                </p>
              </div>
              <div className="mt-6 mb-8">
                <div className="border-b border-zinc-700">
                  <nav
                    className="-mb-px flex space-x-8 overflow-x-auto px-1 justify-center"
                    aria-label="Tabs"
                  >
                    <button
                      onClick={() => setActiveTab("dashboard")}
                      className={`${
                        activeTab === "dashboard"
                          ? "border-red-700 text-red-500"
                          : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                      } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                    >
                      <ClipboardDocumentListIcon
                        className="h-5 w-5 mr-2"
                        aria-hidden="true"
                      />
                      Dashboard
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
                      Orders
                    </button>
                    <button
                      onClick={() => setActiveTab("users")}
                      className={`${
                        activeTab === "users"
                          ? "border-red-700 text-red-500"
                          : "border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300"
                      } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm flex items-center flex-shrink-0`}
                    >
                      <UsersIcon className="h-5 w-5 mr-2" aria-hidden="true" />
                      Users
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
              <div className="mb-16">{tabComponents[activeTab]}</div>
            </div>
          </div>
        </main>
        <Footer />
        <OrderDetailsModal
          selectedOrder={selectedOrder}
          isOpen={orderDetailsOpen}
          onClose={() => setOrderDetailsOpen(false)}
          formatDate={formatDate}
          formatCurrency={formatCurrency}
          getStatusColor={getStatusColor}
        />
      </div>
    </AdminProtected>
  );
}

function getStatusColor(status) {
  if (!status) return "bg-gray-500/20 text-gray-500";
  const statusLower = status.toLowerCase();
  if (statusLower.includes("completed")) {
    return "bg-green-500/20 text-green-500";
  } else if (statusLower.includes("processing")) {
    return "bg-blue-500/20 text-blue-500";
  } else if (statusLower.includes("pending")) {
    return "bg-yellow-500/20 text-yellow-500";
  } else if (statusLower.includes("shipped")) {
    return "bg-indigo-500/20 text-indigo-500";
  } else if (statusLower.includes("cancel")) {
    return "bg-red-500/20 text-red-500";
  } else if (statusLower.includes("partial")) {
    return "bg-orange-500/20 text-orange-500";
  } else {
    return "bg-gray-500/20 text-gray-500";
  }
}
