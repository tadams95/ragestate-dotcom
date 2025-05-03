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

  const orderDetailsModal = selectedOrder && (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-800 shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white">
              Order Details: {selectedOrder.orderNumber || selectedOrder.id}
            </h2>
            <button
              onClick={() => setOrderDetailsOpen(false)}
              className="text-gray-400 hover:text-white"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Customer</p>
              <p className="text-white font-medium">
                {selectedOrder.customerName || selectedOrder.name}
              </p>
              <p className="text-gray-300">
                {selectedOrder.customerEmail || selectedOrder.email}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">Order Date</p>
              <p className="text-white">
                {formatDate(selectedOrder.orderDate)}
              </p>
              <p className="text-gray-300">
                Status:{" "}
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                    selectedOrder.status
                  )}`}
                >
                  {selectedOrder.status || "N/A"}
                </span>
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-3">Items</h3>
            <div className="bg-gray-800/50 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Quantity
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">
                      Price
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {selectedOrder.items?.map((item, index) => {
                    const itemPrice = parseFloat(item.price) || 0;
                    return (
                      <tr key={index}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          <div className="flex items-center">
                            {item.productImageSrc && (
                              <img
                                src={item.productImageSrc}
                                alt={item.title}
                                className="h-10 w-10 object-cover rounded mr-3"
                              />
                            )}
                            <div>
                              <p className="text-white font-medium">
                                {item.title}
                              </p>
                              <p className="text-gray-400 text-xs">
                                {item.selectedColor} - {item.selectedSize}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          {item.quantity || 1}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                          ${itemPrice.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-3">
                Shipping Address
              </h3>
              {selectedOrder.addressDetails?.address ? (
                <div className="bg-gray-800/30 p-4 rounded-lg">
                  <p className="text-white">
                    {selectedOrder.addressDetails.name}
                  </p>
                  <p className="text-gray-300">
                    {selectedOrder.addressDetails.address.line1}
                  </p>
                  {selectedOrder.addressDetails.address.line2 && (
                    <p className="text-gray-300">
                      {selectedOrder.addressDetails.address.line2}
                    </p>
                  )}
                  <p className="text-gray-300">
                    {selectedOrder.addressDetails.address.city},{" "}
                    {selectedOrder.addressDetails.address.state}{" "}
                    {selectedOrder.addressDetails.address.postalCode}
                  </p>
                  <p className="text-gray-300">
                    {selectedOrder.addressDetails.address.country}
                  </p>
                  {selectedOrder.addressDetails.phone && (
                    <p className="text-gray-300 mt-2">
                      Phone: {selectedOrder.addressDetails.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400">
                  No shipping information available
                </p>
              )}
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-3">
                Order Summary
              </h3>
              <div className="bg-gray-800/30 p-4 rounded-lg">
                <div className="flex justify-between py-1">
                  <span className="text-gray-300">Subtotal</span>
                  <span className="text-white">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-300">Shipping</span>
                  <span className="text-white">$0.00</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-gray-300">Taxes</span>
                  <span className="text-white">Included</span>
                </div>
                <div className="border-t border-gray-700 mt-2 pt-2 flex justify-between">
                  <span className="text-white font-medium">Total</span>
                  <span className="text-white font-medium">
                    {formatCurrency(selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setOrderDetailsOpen(false)}
              className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
            >
              Close
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500">
              Update Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );

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
        {orderDetailsOpen && orderDetailsModal}
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
