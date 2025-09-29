"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, Users, Receipt, FileText, AlertTriangle, Menu, X, UserCheck } from 'lucide-react'
import { useState } from 'react'

const items = [
  { 
    href: '/' as const, 
    label: 'Dashboard',
    icon: Home 
  },
  { 
    href: '/students' as const, 
    label: 'Students',
    icon: Users
  },
  { 
    href: '/expenses' as const, 
    label: 'Expenses',
    icon: Receipt
  },
  { 
    href: '/extrabilling' as const, 
    label: 'Extra Billing',
    icon: FileText
  },
  { 
    href: '/outstanding' as const, 
    label: 'Outstanding',
    icon: AlertTriangle
  },
  { 
    href: '/staff' as const, 
    label: 'Staff Log',
    icon: UserCheck
  },
]

export function Nav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <nav className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Desktop Navigation */}
        <div className="hidden md:flex h-14 items-center gap-6">
          {items.map((it) => {
            const isActive = pathname === it.href || 
                           (it.href !== '/' && pathname.startsWith(it.href))
            const Icon = it.icon
            
            return (
              <Link 
                key={it.href} 
                href={it.href} 
                className={cn(
                  'flex items-center gap-2 text-sm transition-colors hover:text-primary py-2 px-3 rounded-md',
                  isActive 
                    ? 'text-primary font-medium bg-primary/5' 
                    : 'text-muted-foreground hover:bg-accent/50'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{it.label}</span>
                {isActive && (
                  <span className="ml-1 h-1.5 w-1.5 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex h-14 items-center justify-between">
            <h1 className="text-lg font-semibold">My Students Track</h1>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-md hover:bg-accent/50"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
          
          {/* Mobile Menu */}
          {isOpen && (
            <div className="border-t bg-white">
              <div className="py-2 space-y-1">
                {items.map((it) => {
                  const isActive = pathname === it.href || 
                                 (it.href !== '/' && pathname.startsWith(it.href))
                  const Icon = it.icon
                  
                  return (
                    <Link 
                      key={it.href} 
                      href={it.href}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        'flex items-center gap-3 text-sm py-3 px-4 transition-colors',
                        isActive 
                          ? 'text-primary font-medium bg-primary/5 border-r-2 border-primary' 
                          : 'text-muted-foreground hover:bg-accent/50'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{it.label}</span>
                      {isActive && (
                        <span className="ml-auto h-2 w-2 rounded-full bg-primary" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
