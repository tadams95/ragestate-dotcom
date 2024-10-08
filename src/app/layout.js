import "./globals.css";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import StoreProvider from "./StoreProvider";
import AuthCheck from "./auth/AuthCheck";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "RAGESTATE",
  description: "Welcome to RAGESTATE",
};

export default function RootLayout({ children }) {
  return (
    <StoreProvider>
      <AuthCheck />
      <html lang="en">
        <body className={inter.className}>
          {children}
          <SpeedInsights />
          <Analytics />
        </body>
      </html>
    </StoreProvider>
  );
}
