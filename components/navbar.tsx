'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  LineChart,
  History,
  LogOut
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-provider'

const routes = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/budget',
    label: 'Budget',
    icon: Wallet,
  },
  {
    href: '/investissements',
    label: 'Investissements',
    icon: TrendingUp,
  },
  {
    href: '/projections',
    label: 'Projections',
    icon: LineChart,
  },
  {
    href: '/historique',
    label: 'Historique',
    icon: History,
  },
]

export function Navbar() {
  const pathname = usePathname()

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 md:px-8">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <TrendingUp className="h-6 w-6" />
          <span className="text-xl font-bold">Gestion Finance</span>
        </Link>

        <div className="ml-auto flex items-center space-x-4">
          <div className="hidden md:flex space-x-2">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  pathname === route.href
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <route.icon className="h-4 w-4" />
                <span>{route.label}</span>
              </Link>
            ))}
          </div>

          <ThemeToggle />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t px-4 py-2 flex overflow-x-auto space-x-2">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors',
              pathname === route.href
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <route.icon className="h-4 w-4" />
            <span>{route.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
