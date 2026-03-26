import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Nav } from '@/components/Nav'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Madam Boss Kids Corner - Real-Time update',
  description: 'Madam Boss Kids Corner Real-Time update — synced from the desktop app. Editing is disabled.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <TooltipProvider>
          <div className="w-full bg-brand-gradient text-white text-sm py-2.5 text-center font-medium shadow-sm">
            Madam Boss Kids Corner Real-Time update — synced from the desktop app. Editing is disabled.
          </div>
          <Nav />
          <main className="min-h-screen bg-background">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  )
}
