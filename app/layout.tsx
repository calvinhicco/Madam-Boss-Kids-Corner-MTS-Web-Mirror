import './globals.css'
import type { Metadata } from 'next'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Nav } from '@/components/Nav'

export const metadata: Metadata = {
  title: 'My Students - Madam Boss Kids Corner Real-Time update',
  description: 'Madam Boss Kids Corner Real-Time update — synced from the desktop app. Editing is disabled.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <TooltipProvider>
          <div className="w-full bg-yellow-50 border-b border-yellow-200 text-yellow-900 text-sm py-2 text-center">
            Madam Boss Kids Corner Real-Time update — synced from the desktop app. Editing is disabled.
          </div>
          <Nav />
          <main className="min-h-screen">
            {children}
          </main>
        </TooltipProvider>
      </body>
    </html>
  )
}
