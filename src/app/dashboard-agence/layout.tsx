'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard,
  Bus,
  Route,
  CalendarCheck,
  Users,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronUp,
} from 'lucide-react'
import { supabase, type Profile, type AdminRole } from '@/lib/supabase'

type NavItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  badge?: number
  // Rôles qui peuvent voir cet item (vide = tous)
  roles?: AdminRole[]
  // Si true, le visiteur ne peut que consulter (pas modifier)
  readOnly?: boolean
}

type NavSection = {
  label: string
  items: NavItem[]
}

const allNavSections: NavSection[] = [
  {
    label: 'AGENCE',
    items: [
      // Dashboard : proprietaire + manager uniquement
      { href: '/dashboard-agence', label: 'Dashboard', icon: LayoutDashboard, roles: ['proprietaire', 'manager'] },
    ],
  },
  {
    label: 'OPÉRATIONS',
    items: [
      // Tous les rôles voient ces pages (visiteur en lecture seule)
      { href: '/dashboard-agence/bus', label: 'Flotte & Bus', icon: Bus },
      { href: '/dashboard-agence/trajets', label: 'Trajets & Lignes', icon: Route },
      { href: '/dashboard-agence/reservations', label: 'Réservations', icon: CalendarCheck, badge: 12 },
    ],
  },
  {
    label: 'ADMINISTRATION',
    items: [
      // Équipe & Droits : proprietaire uniquement
      { href: '/dashboard-agence/equipe', label: 'Équipe & Droits', icon: Users, roles: ['proprietaire'] },
      // Paramètres : proprietaire + manager
      { href: '/dashboard-agence/parametres', label: 'Paramètres', icon: Settings, roles: ['proprietaire', 'manager'] },
    ],
  },
]

// Filtrer les sections de navigation selon le rôle
function getNavForRole(role: AdminRole): NavSection[] {
  return allNavSections
    .map(section => ({
      ...section,
      items: section.items.filter(item => {
        if (!item.roles || item.roles.length === 0) return true
        return item.roles.includes(role)
      }),
    }))
    .filter(section => section.items.length > 0)
}

export default function DashboardAgenceLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [authenticated, setAuthenticated] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [agencyName, setAgencyName] = useState('')
  const [agencyRole, setAgencyRole] = useState<AdminRole>('proprietaire')

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Vérifier que c'est un admin
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (!profileData || profileData.role !== 'admin') {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      setProfile(profileData)

      // Récupérer le nom de l'agence ET le rôle dans l'agence
      const { data: agencyAdmin } = await supabase
        .from('agency_admins')
        .select('agency_id, role, agencies(name)')
        .eq('profile_id', session.user.id)
        .single()

      if (agencyAdmin) {
        if (agencyAdmin.agencies) {
          const agencies = agencyAdmin.agencies as unknown as { name: string }
          setAgencyName(agencies.name)
        }
        setAgencyRole(agencyAdmin.role as AdminRole)

        // Mettre à jour last_login_at dans le profil
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString(), status: profileData.status === 'en_attente' ? 'actif' : profileData.status })
          .eq('id', session.user.id)
      }

      setAuthenticated(true)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false)
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getFirstNameAndInitial = (fullName: string) => {
    const parts = fullName.split(' ')
    if (parts.length >= 2) {
      return `${parts[0]} ${parts[1][0]}.`
    }
    return parts[0]
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8f9fb' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#7c3aed' }}>
            <Bus size={20} className="text-white" />
          </div>
          <div className="w-8 h-8 border-3 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#f8f9fb' }}>
      {/* Sidebar fixe */}
      <aside className="w-[250px] h-screen fixed left-0 top-0 flex flex-col justify-between py-6 px-4 bg-white border-r border-gray-100 z-50">
        {/* Logo */}
        <div>
          <div className="flex items-center gap-2.5 px-3 mb-8">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: '#7c3aed' }}>
              <Bus size={18} />
            </div>
            <span className="text-lg font-bold" style={{ color: '#1a1d29' }}>
              YENDI
            </span>
          </div>

          {/* Navigation sections - filtrée selon le rôle */}
          <nav className="flex flex-col gap-6">
            {getNavForRole(agencyRole).map((section) => (
              <div key={section.label}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => {
                    const isActive =
                      item.href === '/dashboard-agence'
                        ? pathname === '/dashboard-agence'
                        : pathname.startsWith(item.href)

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                          isActive
                            ? 'text-purple-700 bg-purple-50'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                        }`}
                      >
                        <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                        <span>{item.label}</span>
                        {item.badge && (
                          <span
                            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                            style={{ background: '#7c3aed' }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* User info en bas */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-3 px-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#7c3aed' }}
            >
              {profile ? getInitials(profile.full_name) : '..'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {profile ? getFirstNameAndInitial(profile.full_name) : 'Chargement...'}
              </p>
              <p className="text-[11px] text-gray-400">
                {{ proprietaire: 'Admin', manager: 'Manager', operateur: 'Opérateur', visiteur: 'Visiteur' }[agencyRole] || 'Admin'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 transition"
              title="Déconnexion"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Contenu principal */}
      <main className="flex-1 ml-[250px] overflow-x-hidden min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between">
          <div />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-4 py-2 w-[280px]">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un trajet, bus..."
                className="bg-transparent border-none outline-none text-sm text-gray-700 w-full"
              />
            </div>
            <button className="relative p-2 rounded-xl hover:bg-gray-50 transition">
              <Bell size={20} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
