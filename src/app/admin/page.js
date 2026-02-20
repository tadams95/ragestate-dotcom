'use client';

import ArrowsRightLeftIcon from '@heroicons/react/24/outline/ArrowsRightLeftIcon';
import ClipboardDocumentListIcon from '@heroicons/react/24/outline/ClipboardDocumentListIcon';
import EnvelopeIcon from '@heroicons/react/24/outline/EnvelopeIcon';
import FlagIcon from '@heroicons/react/24/outline/FlagIcon';
import ShoppingBagIcon from '@heroicons/react/24/outline/ShoppingBagIcon';
import TicketIcon from '@heroicons/react/24/outline/TicketIcon';
import UsersIcon from '@heroicons/react/24/outline/UsersIcon';
import Image from 'next/image';
import { useState } from 'react';
import AdminProtected from '../components/AdminProtected';
import CampaignsTab from '../components/admin/CampaignsTab';
import DashboardTab from '../components/admin/DashboardTab';
import OrdersTab from '../components/admin/OrdersTab';
import PromoCodesTab from '../components/admin/PromoCodesTab';
import ReportsTab from '../components/admin/ReportsTab';
import TransfersTab from '../components/admin/TransfersTab';
import UsersTab from '../components/admin/UsersTab';
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard');

  // Render only the active tab to avoid evaluating all tabs on first paint
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab setActiveTab={setActiveTab} />;
      case 'orders':
        return <OrdersTab />;
      case 'users':
        return <UsersTab />;
      case 'transfers':
        return <TransfersTab />;
      case 'campaigns':
        return <CampaignsTab />;
      case 'promo-codes':
        return <PromoCodesTab />;
      case 'reports':
        return <ReportsTab />;
      default:
        return null;
    }
  };

  return (
    <AdminProtected>
      <div className="min-h-screen bg-[var(--bg-root)] transition-colors duration-200">
        {/* Header is rendered by layout.js */}
        <main className="flex-grow">
          <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <div className="mb-8 flex flex-col items-center">
                <div className="mb-4 mt-6 flex justify-center">
                  <Image
                    src="/assets/RSLogo2.png"
                    alt="RAGESTATE"
                    width={56}
                    height={56}
                    className="h-14 w-auto"
                  />
                </div>
                <h1 className="text-center text-3xl font-bold leading-tight text-[var(--text-primary)]">
                  Admin Dashboard
                </h1>
                <p className="mt-2 max-w-2xl text-center text-[var(--text-secondary)]">
                  Manage orders, users, and site settings in one place.
                </p>
              </div>
              <div className="mb-8 mt-6">
                <div className="border-b border-[var(--border-subtle)]">
                  <nav
                    className="-mb-px flex justify-center space-x-8 overflow-x-auto px-1"
                    aria-label="Tabs"
                  >
                    <button
                      onClick={() => setActiveTab('dashboard')}
                      className={`${
                        activeTab === 'dashboard'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
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
                          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
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
                          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <UsersIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Users
                    </button>
                    <button
                      onClick={() => setActiveTab('transfers')}
                      className={`${
                        activeTab === 'transfers'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <ArrowsRightLeftIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Transfers
                    </button>
                    <button
                      onClick={() => setActiveTab('campaigns')}
                      className={`${
                        activeTab === 'campaigns'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <EnvelopeIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Campaigns
                    </button>
                    <button
                      onClick={() => setActiveTab('promo-codes')}
                      className={`${
                        activeTab === 'promo-codes'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <TicketIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Promo Codes
                    </button>
                    <button
                      onClick={() => setActiveTab('reports')}
                      className={`${
                        activeTab === 'reports'
                          ? 'border-red-700 text-red-500'
                          : 'border-transparent text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]'
                      } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                    >
                      <FlagIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                      Reports
                    </button>
                  </nav>
                </div>
              </div>
              <div className="mb-16">{renderActiveTab()}</div>
            </div>
          </div>
        </main>
        {/* Footer is rendered globally in RootLayout */}
      </div>
    </AdminProtected>
  );
}
