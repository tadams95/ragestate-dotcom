'use client';

import Cog6ToothIcon from '@heroicons/react/24/outline/Cog6ToothIcon';
import QrCodeIcon from '@heroicons/react/24/outline/QrCodeIcon';
import ShoppingBagIcon from '@heroicons/react/24/outline/ShoppingBagIcon';
import TicketIcon from '@heroicons/react/24/outline/TicketIcon';
import UserCircleIcon from '@heroicons/react/24/outline/UserCircleIcon';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Image from 'next/image';
import OrderHistory from '../../../components/OrderHistory';
import { getUserFromFirestore } from '../../../firebase/util/getUserData';
import { logoutUser } from '../../../lib/utils/auth';
import Header from '../components/Header';
import styles from './account.module.css';

import storage from '@/utils/storage';
import ProfileTab from './components/ProfileTab';
import QrCodeTab from './components/QrCodeTab';
import SettingsTab from './components/SettingsTab';
import TicketsTab from './components/TicketsTab';

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

  const inputStyling =
    'block w-full bg-black pl-2 rounded-md border py-1.5 px-1 text-gray-100 shadow-sm placeholder:text-gray-500 appearance-none focus:outline-none focus:ring-2 focus:ring-red-700 sm:text-sm sm:leading-6';

  const buttonStyling =
    'flex justify-center rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 border border-gray-700 transition-all duration-300';

  const cardStyling =
    'bg-tranparent p-5 rounded-lg border border-gray-800 shadow-md hover:border-red-500/30 transition-all duration-300';

  const containerStyling =
    'bg-gray-900/30 p-6 rounded-lg border border-gray-800 hover:border-red-500/30 transition-all duration-300 shadow-xl';

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
      qrcode: (
        <QrCodeTab userId={userId} cardStyling={cardStyling} containerStyling={containerStyling} />
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
      inputStyling,
      buttonStyling,
      cardStyling,
      containerStyling,
      eventCardStyling,
      handleLogout,
    ],
  );

  return (
    <div className="min-h-screen bg-black">
      <Header profilePicture={profilePicture} userName={userName} />

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
                <h1 className="text-center text-3xl font-bold leading-tight text-white">
                  {userName ? `${userName}'s Account` : 'Your Account'}
                </h1>
                <p className="mt-2 max-w-2xl text-center text-gray-400">
                  Manage your profile, view your QR code, and update your account settings.
                </p>
              </div>

              <div className="mb-8 mt-6">
                <div className="border-b border-zinc-700">
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
                            : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
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
                            : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                        } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                      >
                        <TicketIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        My Tickets
                      </button>
                      <button
                        onClick={() => setActiveTab('qrcode')}
                        className={`${
                          activeTab === 'qrcode'
                            ? 'border-red-700 text-red-500'
                            : 'border-transparent text-gray-400 hover:border-gray-300 hover:text-gray-300'
                        } flex flex-shrink-0 items-center whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium`}
                      >
                        <QrCodeIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                        QR Code
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
                        Order History
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
