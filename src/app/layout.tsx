import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/ui/header";

export const metadata: Metadata = {
  title: "Quiz AI",
  description: "Generate quizzes from your documents and study faster with AI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={"dark"}>
        <Header />
        {children}
      </body>
    </html>
  );
}
