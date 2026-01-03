'use client';

import ArrowsRightLeftIcon from '@heroicons/react/24/outline/ArrowsRightLeftIcon';
import BellIcon from '@heroicons/react/24/outline/BellIcon';
import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import ShoppingBagIcon from '@heroicons/react/24/outline/ShoppingBagIcon';
import TicketIcon from '@heroicons/react/24/outline/TicketIcon';
import UserCircleIcon from '@heroicons/react/24/outline/UserCircleIcon';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useUnreadNotificationsCount } from '../../../lib/hooks';

import Image from 'next/image';
import OrderHistory from '../../../components/OrderHistory';
import { getUserFromFirestore } from '../../../firebase/util/getUserData';
import { logoutUser } from '../../../lib/utils/auth';
import styles from './account.module.css';

import storage from '@/utils/storage';
import NotificationsTab from './components/NotificationsTab';
import ProfileTab from './components/ProfileTab';
import SettingsTab from './components/SettingsTab';
import TicketsTab from './components/TicketsTab';
import TransferHistoryTab from './components/TransferHistoryTab';

export default function Account() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [userName, setUserName] = useState('User');
  const [userEmail, setUserEmail] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount] = useUnreadNotificationsCount(userId);

  const inputStyling =
    'block w-full bg-[var(--bg-elev-2)] rounded-md border-0 py-1.5 px-3 text-[var(--text-primary)] shadow-sm ring-1 ring-inset ring-[var(--border-subtle)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-red-500 sm:text-sm sm:leading-6 transition-shadow duration-200';

  const buttonStyling =
    'flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-[var(--text-primary)] shadow-sm hover:bg-red-700 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border border-[var(--border-subtle)] transition-all duration-300';

  const cardStyling =
    'bg-[var(--bg-elev-2)] p-5 rounded-lg border border-[var(--border-subtle)] shadow-md hover:border-red-500/30 transition-all duration-300';

  const containerStyling =
    'bg-[var(--bg-elev-1)] p-6 rounded-lg border border-[var(--border-subtle)] hover:border-red-500/30 transition-all duration-300 shadow-xl';

  const eventCardStyling =
    'bg-transparent p-2  rounded-lg  shadow-md hover:border-red-500/30 transition-all duration-300';

  useEffect(() => {
    async function fetchUserData() {
      if (typeof window !== 'undefined') {
        const storedUserId = storage.get('userId');

        if (storedUserId) {
          setUserId(storedUserId);

          try {
            setIsLoading(true);
            const userData = await getUserFromFirestore(storedUserId);

            if (userData) {
              console.log('Fetched user data from Firestore:', userData);

              if (userData.profilePicture) {
                setProfilePicture(userData.profilePicture);
                storage.set('profilePicture', userData.profilePicture);
              } else {
                const storedPic = storage.get('profilePicture');
                setProfilePicture(storedPic || '');
              }

              const fullName = [userData.firstName || '', userData.lastName || '']
                .filter(Boolean)
                .join(' ');
              if (fullName) {
                setUserName(fullName);
                storage.set('userName', fullName);
              } else {
                const { userName: un, name: nm } = storage.readKeys(['userName', 'name']);
                const storedName = un || nm;
                setUserName(storedName || 'User');
              }

              if (userData.firstName) setFirstName(userData.firstName);
              if (userData.lastName) setLastName(userData.lastName);

              if (userData.email) {
                setUserEmail(userData.email);
                storage.set('userEmail', userData.email);
              } else {
                const { userEmail: ue, email: em } = storage.readKeys(['userEmail', 'email']);
                const storedEmail = ue || em;
                setUserEmail(storedEmail || '');
              }

              if (userData.phoneNumber) {
                setPhoneNumber(userData.phoneNumber);
                storage.set('phoneNumber', userData.phoneNumber);
              } else {
                const storedPhone = storage.get('phoneNumber');
                setPhoneNumber(storedPhone || '');
              }
            } else {
              fallbackToLocalStorage();
            }
          } catch (error) {
            console.error('Error fetching user data from Firestore:', error);
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
      console.log('Using localStorage data as fallback');
      const {
        userId: uid,
        profilePicture: pic,
        userName: un,
        name: nm,
        userEmail: ue,
        email: em,
        phoneNumber: ph,
      } = storage.readKeys([
        'userId',
        'profilePicture',
        'userName',
        'name',
        'userEmail',
        'email',
        'phoneNumber',
      ]);
      const storedUserId = uid;
      const storedProfilePicture = pic;
      const storedUserName = un || nm;
      const storedUserEmail = ue || em;
      const storedPhoneNumber = ph;

      setUserId(storedUserId || '');
      setProfilePicture(storedProfilePicture || '');
      setUserName(storedUserName || 'User');
      setUserEmail(storedUserEmail || '');
      setPhoneNumber(storedPhoneNumber || '');

      if (storedUserName) {
        const nameParts = storedUserName.split(' ');
        setFirstName(nameParts[0] || '');
        setLastName(nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      }
    }

    fetchUserData();
  }, []);

  const handleLogout = useCallback(
    async (event) => {
      event.preventDefault();
      const result = await logoutUser();
      if (result.success) {
        router.push('/login');
      } else {
        console.error('Logout failed:', result.message);
      }
    },
    [router],
  );

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
      settings: (
        <SettingsTab
          inputStyling={inputStyling}
          buttonStyling={buttonStyling}
          cardStyling={cardStyling}
          containerStyling={containerStyling}
          onLogout={handleLogout}
        />
      ),
      notifications: (
        <NotificationsTab
          userId={userId}
          containerStyling={containerStyling}
          cardStyling={cardStyling}
        />
      ),
      transfers: (
        <TransferHistoryTab
          userId={userId}
          containerStyling={containerStyling}
          cardStyling={cardStyling}
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
      inputStyling,
      buttonStyling,
      cardStyling,
      containerStyling,
      eventCardStyling,
      handleLogout,
    ],
  );

  return (
    <div className="min-h-screen bg-[var(--bg-root)] transition-colors duration-200">
      {/* Header is rendered by layout.js */}

      <main className="flex-grow">
        {isLoading ? (
          <div className="flex h-[70vh] items-center justify-center">
            <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-red-500"></div>
          </div>
        ) : (
          <div className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="mb-8 flex flex-col items-center">
                <div className="mb-4 mt-6 flex justify-center">
                  <Image
                    src="/assets/RSLogo2.png"
                    alt="RAGESTATE"
                    width={112}
                    height={56}
                    className="h-14 w-auto"
                    priority
                  />
                </div>
                <h1 className="text-center text-3xl font-bold leading-tight text-[var(--text-primary)]">
                  {userName ? `${userName}'s Account` : 'Your Account'}
                </h1>
                <p className="mt-2 max-w-2xl text-center text-[var(--text-tertiary)]">
                  Manage your profile, view your QR code, and update your account settings.
                </p>
              </div>

              <div className="mb-8 mt-6">
                <div className="border-b border-[var(--border-subtle)]">
                  <div className={styles.tabScroll}>
                    <nav
                      className="-mb-px flex min-w-max justify-center space-x-8 px-1"
                      aria-label="Tabs"
                    >
                      <button
                        onClick={() => setActiveTab('profile')}
                        className={`${
                          activeTab === 'profile'
                            ? 'border-red-700 text-red-500'
                            : 'border-transparent text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                      >
                        <UserCircleIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        Profile
                      </button>
                      <button
                        onClick={() => setActiveTab('tickets')}
                        className={`${
                          activeTab === 'tickets'
                            ? 'border-red-700 text-red-500'
                            : 'border-transparent text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                      >
                        <TicketIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        My Tickets
                      </button>

                      <button
                        onClick={() => setActiveTab('orders')}
                        className={`${
                          activeTab === 'orders'
                            ? 'border-red-700 text-red-500'
                            : 'border-transparent text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                      >
                        <ShoppingBagIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        Order History
                      </button>
                      <button
                        onClick={() => setActiveTab('notifications')}
                        className={`${
                          activeTab === 'notifications'
                            ? 'border-red-700 text-red-500'
                            : 'border-transparent text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        } relative flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                      >
                        <BellIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        Notifications
                        {unreadCount > 0 && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab('transfers')}
                        className={`${
                          activeTab === 'transfers'
                            ? 'border-red-700 text-red-500'
                            : 'border-transparent text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                      >
                        <ArrowsRightLeftIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        Transfers
                      </button>
                      <button
                        onClick={() => setActiveTab('settings')}
                        className={`${
                          activeTab === 'settings'
                            ? 'border-red-700 text-red-500'
                            : 'border-transparent text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] hover:text-[var(--text-secondary)]'
                        } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                      >
                        <Cog6ToothIcon className="mr-2 h-5 w-5" aria-hidden="true" />
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

      {/* Footer is rendered globally in RootLayout */}
    </div>
  );
}
