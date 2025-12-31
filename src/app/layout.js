import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { FirebaseProvider } from '../../firebase/context/FirebaseContext';
import { ThemeProvider } from '../../lib/context/ThemeContext';
import StoreProvider from './StoreProvider';
import AuthCheck from './auth/AuthCheck';
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
        </head>
        <body className={`${inter.className} h-full`}>
          <ThemeProvider defaultTheme="dark">
            <div className="flex min-h-screen flex-col bg-[var(--bg-root)] text-[var(--text-primary)] transition-colors duration-200">
              <FirebaseProvider>
                <Header />
                <div className="flex-grow">{children}</div>
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
            </div>
          </ThemeProvider>
        </body>
      </html>
    </StoreProvider>
  );
}
