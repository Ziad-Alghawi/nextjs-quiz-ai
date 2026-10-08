import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Header from "@/components/ui/header";

// Self-hosted by Next at build time: no request to Google from the visitor's browser.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Quiz AI",
  description: "Generate quizzes from your documents and study faster with AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
