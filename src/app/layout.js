import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { FirebaseProvider } from '../../firebase/context/FirebaseContext';
import StoreProvider from './StoreProvider';
import AuthCheck from './auth/AuthCheck';
import Footer from './components/Footer';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'RAGESTATE',
  description: 'Welcome to RAGESTATE',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ragestate.com'),
};

export default function RootLayout({ children }) {
  return (
    <StoreProvider>
      <AuthCheck />
      <html lang="en" className="h-full">
        <body className={`${inter.className} h-full`}>
          <div className="flex min-h-screen flex-col">
            <div className="flex-grow">
              <FirebaseProvider>{children}</FirebaseProvider>
            </div>
            <Toaster
              position="bottom-center"
              gutter={8}
              toastOptions={{
                style: { background: '#333', color: '#fff', border: '1px solid #444' },
              }}
            />
            <Footer />
            <SpeedInsights />
            <Analytics />
          </div>
        </body>
      </html>
    </StoreProvider>
  );
}
