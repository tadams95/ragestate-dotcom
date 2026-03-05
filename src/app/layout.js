import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { FirebaseProvider } from '../../firebase/context/FirebaseContext';
import { ChatUnreadProvider } from '../../lib/context/ChatUnreadProvider';
import { ThemeProvider } from '../../lib/context/ThemeContext';
import { FB_PIXEL_ID } from '../../lib/fpixel';
import StoreProvider from './StoreProvider';
import AuthCheck from './auth/AuthCheck';
import FacebookPixel from './components/FacebookPixel';
import Footer from './components/Footer';
import Header from './components/Header';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'RAGESTATE',
  description: 'Welcome to RAGESTATE',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://ragestate.com'),
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Inline script to prevent theme flash on page load (runs before React hydrates)
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var theme = stored && ['light', 'dark', 'system'].includes(stored) ? stored : 'system';
    var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.add(isDark ? 'dark' : 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <StoreProvider>
      <AuthCheck />
      <html lang="en" className="h-full" suppressHydrationWarning>
        <head>
          <script dangerouslySetInnerHTML={{ __html: themeScript }} />
          {FB_PIXEL_ID && (
            <script
              dangerouslySetInnerHTML={{
                __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${FB_PIXEL_ID}');`,
              }}
            />
          )}
        </head>
        <body className={`${inter.className} h-full`}>
          <ThemeProvider defaultTheme="dark">
            <div className="flex min-h-screen flex-col bg-[var(--bg-root)] text-[var(--text-primary)] transition-colors duration-200">
              <FirebaseProvider>
                <ChatUnreadProvider>
                  <Header />
                  <div className="flex-grow">{children}</div>
                </ChatUnreadProvider>
              </FirebaseProvider>
              <Toaster
                position="bottom-center"
                gutter={8}
                toastOptions={{
                  style: {
                    background: 'var(--bg-elev-1)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-subtle)',
                  },
                }}
              />
              <Footer />
              <SpeedInsights />
              <Analytics />
              <FacebookPixel />
            </div>
          </ThemeProvider>
        </body>
      </html>
    </StoreProvider>
  );
}
