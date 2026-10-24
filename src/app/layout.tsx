import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppHeaderSlot } from "@/components/app-header-slot";
import { Header } from "@/components/header";

// Self-hosted by Next at build time: no request to Google from the visitor's browser.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

const description =
  "Upload a chapter, practise with quizzes that explain every answer, and track how far you've come.";

// The preview image comes from opengraph-image.tsx; on Vercel, Next makes its URL absolute with the
// production domain.
export const metadata: Metadata = {
  title: { default: "Quiz AI", template: "%s · Quiz AI" },
  description,
  openGraph: { title: "Quiz AI", description, siteName: "Quiz AI", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={geistSans.variable}>
      <body>
        <AppHeaderSlot>
          <Header />
        </AppHeaderSlot>
        {children}
      </body>
    </html>
  );
}
