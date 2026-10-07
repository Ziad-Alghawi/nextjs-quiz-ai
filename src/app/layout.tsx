import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/ui/header';

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Quizz Ai',
  description: 'Generated Quizzes And Study Faster Using AI',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={"dark"}>
        <Header />
        {children}
      </body>
    </html>
  )
}
