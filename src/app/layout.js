import "./globals.css";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import StoreProvider from "./StoreProvider";
import AuthCheck from "./auth/AuthCheck";
import { FirebaseProvider } from '../../firebase/context/FirebaseContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "RAGESTATE",
  description: "Welcome to RAGESTATE",
};

export default function RootLayout({ children }) {
  return (
    <StoreProvider>
      <AuthCheck />
      <html lang="en" className="h-full">
        <body className="h-full">
          <div className="flex flex-col min-h-screen">
            <div className="flex-grow">
              <FirebaseProvider>
                {children}
              </FirebaseProvider>
            </div>
            <SpeedInsights />
            <Analytics />
          </div>
        </body>
      </html>
    </StoreProvider>
  );
}
