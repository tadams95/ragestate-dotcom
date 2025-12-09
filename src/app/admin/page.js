'use client';

import ClipboardDocumentListIcon from '@heroicons/react/24/outline/ClipboardDocumentListIcon';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import ShoppingBagIcon from '@heroicons/react/24/outline/ShoppingBagIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useAuth, useFirebase } from '../../../firebase/context/FirebaseContext';
import { formatCurrency, formatDate, getStatusColor } from '../../utils/formatters';
import AdminProtected from '../components/AdminProtected';
// Lazy-load admin tabs and modal to keep them out of initial/shared chunks
const DashboardTab = dynamic(() => import('../components/admin/DashboardTab'), {
  loading: () => (
    <div className="flex h-32 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
    </div>
  ),
});
const OrdersTab = dynamic(() => import('../components/admin/OrdersTab'), {
  loading: () => (
    <div className="flex h-32 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
    </div>
  ),
});
const UsersTab = dynamic(() => import('../components/admin/UsersTab'), {
  loading: () => (
    <div className="flex h-32 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
    </div>
  ),
});
const SettingsTab = dynamic(() => import('../components/admin/SettingsTab'), {
  loading: () => (
    <div className="flex h-32 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
    </div>
  ),
});
const OrderDetailsModal = dynamic(() => import('../components/admin/OrderDetailsModal'), {
  loading: () => null, // avoid layout shift; modal will pop in when ready
});

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
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
      console.log('No authenticated user found, cannot load admin data');
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

        if (results[0].status === 'fulfilled') {
          setOrders(results[0].value);
        } else {
          console.error('Error loading orders:', results[0].reason);
          setError((prev) => ({ ...prev, orders: results[0].reason.message }));
        }

        if (results[1].status === 'fulfilled') {
          setUsers(results[1].value);
        } else {
          console.error('Error loading users:', results[1].reason);
          setError((prev) => ({ ...prev, users: results[1].reason.message }));
        }

        if (results[2].status === 'fulfilled') {
          setEvents(results[2].value);
        } else {
          console.error('Error loading events:', results[2].reason);
          setError((prev) => ({ ...prev, events: results[2].reason.message }));
        }

        if (results[3].status === 'fulfilled') {
          setUserCount(results[3].value);
        }
      } catch (err) {
        console.error('General error loading admin data:', err);
        setError({ general: err.message });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [firebase, currentUser, authLoading]);

  const viewOrderDetails = (orderId) => {
    const orderToView = orders.find((order) => order.id === orderId);
    if (orderToView) {
      setSelectedOrder(orderToView);
      setOrderDetailsOpen(true);
    } else {
      console.error('Could not find order with ID:', orderId);
    }
  };

  const loadingState = (
    <div className="flex h-64 items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
    </div>
  );

  const errorState = (
    <div className="rounded-md border border-red-500 bg-red-500/20 p-4 text-white">
      <h3 className="text-lg font-medium">Error loading data</h3>
      <p>{error?.general || 'An unknown error occurred'}</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
      >
        Retry
      </button>
    </div>
  );

  const handleUserPageChange = (direction) => {
    if (direction === 'next' && currentUserPage * usersPerPage < userCount) {
      setCurrentUserPage(currentUserPage + 1);
    } else if (direction === 'prev' && currentUserPage > 1) {
      setCurrentUserPage(currentUserPage - 1);
    }
  };

  const buttonStyling =
    'flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border-2 border-gray-100 transition-all duration-200';
  const inputStyling =
    'block w-full bg-black pl-2 rounded-md border-2 py-1.5 px-1 text-gray-100 shadow-sm ring-1 ring-inset ring-gray-700 placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6';

  // Render only the active tab to avoid evaluating all tabs on first paint
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
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
        );
      case 'orders':
        return (
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
        );
      case 'users':
        return (
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
        );
      case 'settings':
        return <SettingsTab inputStyling={inputStyling} buttonStyling={buttonStyling} />;
      default:
        return null;
    }
  };

  return (
    <AdminProtected>
      <div className="min-h-screen bg-black">
        {/* Header is rendered by layout.js */}
        <main className="flex-grow">
          <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 flex flex-col items-center">
                <div className="mb-4 mt-6 flex justify-center">
                  <img src="/assets/RSLogo2.png" alt="RAGESTATE" className="h-14 w-auto" />
                </div>
                <h1 className="text-center text-3xl font-bold leading-tight text-white">
                  Admin Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-center text-gray-400">
                  Manage orders, users, and site settings in one place.
                </p>
              </div>
              <div className="mb-8 mt-6">
                <div className="border-b border-zinc-700">
                  <nav
                    className="-mb-px flex justify-center space-x-8 overflow-x-auto px-1"
                    aria-label="Tabs"
                  >
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`${
                        activeTab === 'dashboard'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <ClipboardDocumentListIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Dashboard
                    </button>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className={`${
                        activeTab === 'orders'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <ShoppingBagIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Orders
                    </button>
                    <button
                      onClick={() => setActiveTab('users')}
                      className={`${
                        activeTab === 'users'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <UsersIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Users
                    </button>
                    <button
                      onClick={() => setActiveTab('settings')}
                      className={`${
                        activeTab === 'settings'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <Cog6ToothIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Settings
                    </button>
                  </nav>
                </div>
              </div>
              <div className="mb-16">{renderActiveTab()}</div>
            </div>
          </div>
        </main>
        {/* Footer is rendered globally in RootLayout */}
        {orderDetailsOpen && (
          <OrderDetailsModal
            selectedOrder={selectedOrder}
            isOpen={orderDetailsOpen}
            onClose={() => setOrderDetailsOpen(false)}
            formatDate={formatDate}
            formatCurrency={formatCurrency}
            getStatusColor={getStatusColor}
          />
        )}
      </div>
    </AdminProtected>
  );
}
