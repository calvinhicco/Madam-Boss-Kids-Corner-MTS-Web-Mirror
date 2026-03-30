"use client"
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Home, Users, Receipt, FileText, AlertTriangle, X, GraduationCap, Boxes } from 'lucide-react'
import { useState } from 'react'

const items = [
  { 
    href: '/' as const, 
    label: 'Dashboard',
    icon: Home 
  },
  { 
    href: '/inventory' as const, 
    label: 'Inventory',
    icon: Boxes
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
]

export function Nav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  
  return (
    <nav className="border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Desktop Navigation */}
        <div className="hidden md:flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-md">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-brand-gradient">My Students Track</span>
          </Link>
          
          <div className="flex items-center gap-2">
            {items.map((it) => {
              const isActive = pathname === it.href || 
                             (it.href !== '/' && pathname.startsWith(it.href))
              const Icon = it.icon
              
              return (
                <Link 
                  key={it.href} 
                  href={it.href} 
                  className={cn(
                    'flex items-center gap-2 text-sm font-medium transition-all duration-200 rounded-xl px-4 py-2.5',
                    isActive 
                      ? 'bg-brand-gradient text-white shadow-md' 
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{it.label}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-brand-gradient flex items-center justify-center shadow-md">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-brand-gradient">My Students Track</span>
            </Link>
            
            <Button
              onClick={() => setIsOpen(!isOpen)}
              variant={isOpen ? 'outline' : 'default'}
              size="sm"
              className={cn(
                'rounded-xl px-4',
                !isOpen && 'bg-brand-gradient text-white shadow-md hover:shadow-lg'
              )}
            >
              {isOpen ? (
                <>
                  <X className="w-4 h-4 mr-2" />
                  Close
                </>
              ) : (
                <>
                  <span className="mr-2">☰</span>
                  Menu
                </>
              )}
            </Button>
          </div>
          
          {/* Mobile Menu Panel */}
          {isOpen && (
            <div className="pb-4">
              <Card className="border-0 shadow-lg bg-white/95 backdrop-blur">
                <CardContent className="p-3 space-y-2">
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
                          'flex items-center gap-3 text-sm font-medium transition-all duration-200 rounded-xl px-4 py-3',
                          isActive 
                            ? 'bg-brand-gradient text-white shadow-md' 
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                        )}
                      >
                        <div className={cn(
                          'w-8 h-8 rounded-lg flex items-center justify-center',
                          isActive ? 'bg-white/20' : 'bg-muted'
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span>{it.label}</span>
                        {isActive && (
                          <span className="ml-auto w-2 h-2 rounded-full bg-white" />
                        )}
                      </Link>
                    )
                  })}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
