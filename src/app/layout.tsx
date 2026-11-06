import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AppHeaderSlot } from "@/components/app-header-slot";
import { Header } from "@/components/header";
import { env } from "@/lib/env";

// Self-hosted by Next at build time: no request to Google from the visitor's browser.
const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

const description =
  "Upload a chapter, practise with quizzes that explain every answer, and track how far you've come.";

// metadataBase makes the URL of the preview image (opengraph-image.tsx) absolute. CI and image builds
// skip env validation, so APP_URL can be missing there and new URL() would stop the build.
export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL || "https://quiz.ziadalghawi.com"),
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
