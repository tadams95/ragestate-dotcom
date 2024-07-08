import { Inter } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";
import { Analytics } from "@vercel/analytics/react";
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
        <body className={inter.className}>{children}</body>
        <Analytics />
      </html>
    </StoreProvider>
  );
}
