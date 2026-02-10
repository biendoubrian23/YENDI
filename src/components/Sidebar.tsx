'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import { supabase, type Profile } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: '/dashboard/agences', label: 'Agences', icon: Building2, badge: 12 },
  { href: '/dashboard/admins', label: 'Administrateurs', icon: Users },
  { href: '/dashboard/finances', label: 'Finances', icon: BarChart3 },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (data) setProfile(data)
      }
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <aside
      className="w-64 h-screen fixed left-0 top-0 flex flex-col justify-between py-6 px-4"
      style={{ background: '#f9fafb', borderRight: '1px solid #e5e7eb' }}
    >
      {/* Logo */}
      <div>
        <div className="flex items-center gap-2.5 px-3 mb-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm"
            style={{ background: '#1a1d29' }}
          >
            Y
          </div>
          <span className="text-xl font-bold" style={{ color: '#1a1d29' }}>
            YENDI
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/dashboard'
                ? pathname === '/dashboard'
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-500 hover:text-gray-800 hover:bg-white/60'
                }`}
                style={
                  isActive
                    ? { background: '#1a1d29' }
                    : {}
                }
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-auto text-xs font-semibold px-2 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white'
                    }`}
                    style={!isActive ? { background: '#f26522' } : {}}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* User info */}
      <div className="flex items-center gap-3 px-3 pt-4 border-t border-gray-200">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: '#6366f1' }}
        >
          {profile ? getInitials(profile.full_name) : '...'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">
            {profile?.full_name || 'Chargement...'}
          </p>
          <p className="text-xs text-gray-400">Super Admin</p>
        </div>
        <button
          onClick={handleLogout}
          className="text-gray-400 hover:text-gray-600 transition"
          title="Déconnexion"
        >
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  )
}
