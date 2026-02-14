'use client'

import { useState, useEffect } from 'react'
import { Bell, Plus, MoreVertical, Search, SlidersHorizontal } from 'lucide-react'
import Link from 'next/link'
import { supabase, type Agency } from '@/lib/supabase'
import { formatFCFA } from '@/lib/format-utils'

interface AgencyWithAdmin extends Agency {
  adminName?: string
  adminEmail?: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    operationnel: 'Actif',
    inactive: 'Inactive',
    suspendu: 'Suspendu',
    en_attente: 'En attente',
    configuration: 'Configuration',
  }
  const label = map[status] || status
  const statusClass = label === 'Actif'
    ? 'status-actif'
    : label === 'Configuration'
    ? 'status-configuration'
    : label === 'En attente'
    ? 'status-en-attente'
    : 'status-inactive'

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className="status-dot" />
      {label}
    </span>
  )
}

export default function DashboardPage() {
  const [agencies, setAgencies] = useState<AgencyWithAdmin[]>([])
  const [stats, setStats] = useState({ activeAgencies: 0, totalAdmins: 0, monthlyVolume: 0, newThisWeek: 0, totalAgencies: 0 })
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch current user profile
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', session.user.id)
            .single()
          if (profile?.full_name) {
            setUserName(profile.full_name.split(' ')[0])
          }
        }

        // Fetch agencies with their primary admin
        const { data: agenciesData } = await supabase
          .from('agencies')
          .select('*, agency_admins(profile_id, is_primary, profiles(full_name, email))')
          .order('created_at', { ascending: false })
          .limit(6)

        const mapped: AgencyWithAdmin[] = (agenciesData || [])
          .map((a: Record<string, unknown>) => {
            const admins = (a.agency_admins as Array<{ is_primary: boolean; profiles: { full_name: string; email: string } | null }>) || []
            const primary = admins.find((ad) => ad.is_primary)
            return {
              ...a,
              adminName: primary?.profiles?.full_name || 'En attente',
              adminEmail: primary?.profiles?.email || '-',
              adminsCount: admins.length,
            } as AgencyWithAdmin & { adminsCount: number }
          })
          .filter((a) => a.adminsCount > 0) // Ne garder que les agences avec admin
        setAgencies(mapped)

        // Stats - compter uniquement les agences avec admin
        const { data: allAgenciesData } = await supabase
          .from('agencies')
          .select('id, status, created_at, agency_admins(profile_id)')
        
        const agenciesWithAdmin = (allAgenciesData || []).filter(
          (a: any) => a.agency_admins && a.agency_admins.length > 0
        )

        const activeCount = agenciesWithAdmin.filter((a: any) => a.status === 'operationnel').length

        const { count: adminCount } = await supabase
          .from('agency_admins')
          .select('*', { count: 'exact', head: true })

        // Total agencies (with admin only)
        const totalAgencies = agenciesWithAdmin.length

        // Monthly volume — real data from seat_reservations
        let monthlyVol = 0
        try {
          const finResponse = await fetch('/api/stats/real-finances')
          if (finResponse.ok) {
            const realData = await finResponse.json()
            monthlyVol = realData.totals?.revenue || 0
          }
        } catch (e) {
          console.error('Erreur chargement volume réel:', e)
        }

        // New agencies this week (with admin only)
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const newCount = agenciesWithAdmin.filter(
          (a: any) => new Date(a.created_at) >= oneWeekAgo
        ).length

        setStats({
          activeAgencies: activeCount,
          totalAdmins: adminCount || 0,
          monthlyVolume: monthlyVol,
          newThisWeek: newCount,
          totalAgencies: totalAgencies,
        })
      } catch (err) {
        console.error('Erreur chargement dashboard:', err)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  const filteredAgencies = agencies.filter((a) =>
    !searchQuery || a.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Bienvenue{userName ? `, ${userName}` : ''}</h1>
          <p className="page-subtitle">
            Voici ce qu&apos;il se passe sur le réseau YENDI aujourd&apos;hui.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition">
            <Bell size={18} />
          </button>
          <Link href="/dashboard/agences/nouvelle" className="btn-accent">
            <Plus size={16} />
            Nouvelle Agence
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-5 mb-10">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef4ff' }}>
              <Building2Icon />
            </div>
          </div>
          <span className="stat-badge stat-badge-green">{stats.newThisWeek > 0 ? `+${stats.newThisWeek} cette semaine` : `${stats.totalAgencies} au total`}</span>
          <p className="stat-label">Agences Actives</p>
          <p className="stat-value">{loading ? '...' : stats.activeAgencies}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff4ec' }}>
              <UsersIcon />
            </div>
          </div>
          <span className="stat-badge stat-badge-green">Total</span>
          <p className="stat-label">Administrateurs</p>
          <p className="stat-value">{loading ? '...' : stats.totalAdmins}</p>
        </div>

        <div className="stat-card stat-card-accent" style={{ background: '#f26522' }}>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <span className="text-white font-bold text-lg">₣</span>
            </div>
          </div>
          <span className="stat-badge" style={{ background: 'rgba(255,255,255,0.2)', color: 'white' }}>Mensuel</span>
          <p className="stat-label" style={{ color: 'rgba(255,255,255,0.7)' }}>Volume Traité</p>
          <p className="stat-value text-white">{loading ? '...' : formatFCFA(stats.monthlyVolume)}</p>
        </div>
      </div>

      {/* Réseau d'Agences */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1a1d29' }}>Réseau d&apos;Agences</h2>
            <p className="text-sm text-gray-400 mt-1">
              Gérez les accès et les statuts des agences partenaires.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="search-input">
              <Search size={16} className="text-gray-400" />
              <input type="text" placeholder="Rechercher..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-gray-400 py-12">Chargement des agences...</div>
        ) : (
        <div className="grid grid-cols-4 gap-6">
          {filteredAgencies.map((agency) => (
            <div key={agency.id} className="agency-card">
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm overflow-hidden"
                      style={{ background: agency.color || '#e5e7eb' }}
                    >
                      {agency.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm" style={{ color: '#1a1d29' }}>
                        {agency.name}
                      </h3>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <span>📍</span> {agency.city}, {agency.country_code}
                      </p>
                    </div>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreVertical size={16} />
                  </button>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Admin</span>
                    <span className="font-medium">{agency.adminName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Email</span>
                    <span className="font-medium text-xs truncate ml-2 max-w-[150px]">
                      {agency.adminEmail}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Statut</span>
                    <StatusBadge status={agency.status} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button className="btn-outline flex-1 text-xs py-1.5 px-2">Détails</button>
                  <button className="btn-primary flex-1 text-xs py-1.5 px-2">Connexion Admin</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    </div>
  )
}

// SVG Icons 
function Building2Icon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  )
}

function UsersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f26522" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
