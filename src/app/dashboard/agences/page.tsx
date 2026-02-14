'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X,
  MapPin,
  Users,
  TrendingUp,
  Calendar,
  Globe,
  Building2,
  CreditCard,
} from 'lucide-react'
import Link from 'next/link'
import { supabase, type Agency } from '@/lib/supabase'
import { formatFCFA } from '@/lib/format-utils'

type TabType = 'Toutes' | 'Actives' | 'En Attente' | 'Suspendues'

interface AgencyRow extends Agency {
  admin?: string
  adminEmail?: string
  initials?: string
  revenue: number
  debt?: number
  adminsCount: number
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    operationnel: 'Opérationnel',
    inactive: 'Inactive',
    suspendu: 'Suspendu',
    en_attente: 'En attente',
    configuration: 'Configuration',
  }
  const label = map[status] || status
  const statusClass =
    label === 'Opérationnel'
      ? 'status-operationnel'
      : label === 'Inactive'
      ? 'status-inactive'
      : label === 'Suspendu'
      ? 'status-suspendu'
      : label === 'En attente'
      ? 'status-en-attente'
      : 'status-actif'

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className="status-dot" />
      {label}
    </span>
  )
}

function AgencyDetailModal({ agency, onClose }: { agency: AgencyRow; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header coloré */}
        <div className="px-6 pt-6 pb-5 flex items-start justify-between" style={{ background: `${agency.color || '#3b82f6'}10` }}>
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
              style={{ background: agency.color || '#3b82f6' }}
            >
              {agency.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>{agency.name}</h2>
              <p className="text-sm text-gray-400 flex items-center gap-1 mt-0.5">
                <MapPin size={13} /> {agency.city}, {agency.country_code}
              </p>
              <div className="mt-2">
                <StatusBadge status={agency.status} />
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-white/60 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <TrendingUp size={16} className="mx-auto mb-1 text-gray-400" />
              <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{formatFCFA(agency.revenue)}</p>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Revenus</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <Users size={16} className="mx-auto mb-1 text-gray-400" />
              <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{agency.adminsCount}</p>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Admin(s)</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <CreditCard size={16} className="mx-auto mb-1 text-gray-400" />
              <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{agency.commission_rate}%</p>
              <p className="text-[10px] text-gray-400 uppercase font-medium">Commission</p>
            </div>
          </div>

          {/* Détails */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Building2 size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 uppercase font-medium">Adresse</p>
                <p className="text-sm font-medium" style={{ color: '#1a1d29' }}>{agency.address || 'Non renseignée'}</p>
              </div>
            </div>

            {agency.siret_number && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">SIRET / Registre</p>
                  <p className="text-sm font-medium" style={{ color: '#1a1d29' }}>{agency.siret_number}</p>
                </div>
              </div>
            )}

            {agency.website && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <Globe size={16} className="text-gray-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Site web</p>
                  <p className="text-sm font-medium" style={{ color: '#3b82f6' }}>{agency.website}</p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Users size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 uppercase font-medium">Admin principal</p>
                <p className="text-sm font-medium" style={{ color: '#1a1d29' }}>
                  {agency.admin || 'En attente'}
                  {agency.adminEmail && <span className="text-gray-400 ml-2 text-xs">({agency.adminEmail})</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Calendar size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] text-gray-400 uppercase font-medium">Date d&apos;inscription</p>
                <p className="text-sm font-medium" style={{ color: '#1a1d29' }}>
                  {new Date(agency.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AgencesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('Toutes')
  const [currentPage, setCurrentPage] = useState(1)
  const [agencies, setAgencies] = useState<AgencyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, trips: 0, newThisWeek: 0 })
  const [selectedAgency, setSelectedAgency] = useState<AgencyRow | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'revenue'>('recent')
  const ITEMS_PER_PAGE = 8

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const { data: agenciesData } = await supabase
          .from('agencies')
          .select('*, agency_admins(profile_id, is_primary, profiles(full_name, email))')
          .order('created_at', { ascending: false })

        // Fetch real revenue from seat_reservations via API
        const revenueMap: Record<string, number> = {}
        try {
          const finResponse = await fetch('/api/stats/real-finances')
          if (finResponse.ok) {
            const realData = await finResponse.json()
            ;(realData.agencies || []).forEach((a: { agency_id: string; revenue: number }) => {
              revenueMap[a.agency_id] = a.revenue
            })
          }
        } catch (e) {
          console.error('Erreur chargement revenus réels:', e)
        }

        const mapped: AgencyRow[] = (agenciesData || [])
          .map((a: Record<string, unknown>) => {
            const admins = (a.agency_admins as Array<{ is_primary: boolean; profiles: { full_name: string; email: string } | null }>) || []
            const primary = admins.find((ad) => ad.is_primary)
            const rev = revenueMap[a.id as string] || 0
            return {
              ...a,
              admin: primary?.profiles?.full_name || 'En attente',
              adminEmail: primary?.profiles?.email || '',
              initials: (primary?.profiles?.full_name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
              revenue: rev,
              adminsCount: admins.length,
              debt: (a.status === 'suspendu' && rev < 0) ? rev : undefined,
            } as AgencyRow
          })
          .filter((a) => a.adminsCount > 0) // Ne garder que les agences avec admin

        setAgencies(mapped)

        const total = mapped.length
        const active = mapped.filter((a) => a.status === 'operationnel').length
        const blocked = mapped.filter((a) => a.status === 'en_attente' || a.status === 'inactive').length

        // Count trips from scheduled_trips
        const { count: tripsCount } = await supabase
          .from('scheduled_trips')
          .select('*', { count: 'exact', head: true })

        // New agencies this week
        const oneWeekAgo = new Date()
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        const newThisWeek = mapped.filter(
          (a) => new Date(a.created_at) >= oneWeekAgo
        ).length

        setStats({ total, active, blocked, trips: tripsCount || 0, newThisWeek })
      } catch (err) {
        console.error('Erreur chargement agences:', err)
      }
      setLoading(false)
    }
    fetchAgencies()
  }, [])

  const tabs: TabType[] = ['Toutes', 'Actives', 'En Attente', 'Suspendues']

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1)
  }, [activeTab, searchQuery, sortBy])

  const filteredAgencies = agencies
    .filter((a) => {
      // Tab filter
      if (activeTab === 'Actives' && a.status !== 'operationnel') return false
      if (activeTab === 'Suspendues' && a.status !== 'suspendu') return false
      if (activeTab === 'En Attente' && a.status !== 'inactive' && a.status !== 'en_attente') return false
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          a.name.toLowerCase().includes(q) ||
          a.city.toLowerCase().includes(q) ||
          (a.admin || '').toLowerCase().includes(q)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      if (sortBy === 'revenue') return b.revenue - a.revenue
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  const totalPages = Math.max(1, Math.ceil(filteredAgencies.length / ITEMS_PER_PAGE))
  const paginatedAgencies = filteredAgencies.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  )

  return (
    <div>
      {/* Modal Détail Agence */}
      {selectedAgency && (
        <AgencyDetailModal agency={selectedAgency} onClose={() => setSelectedAgency(null)} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Agences Partenaires</h1>
          <p className="page-subtitle">Vue d&apos;ensemble du réseau YENDI</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="search-input">
            <Search size={16} className="text-gray-400" />
            <input type="text" placeholder="Rechercher une agence..." className="w-48" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <SlidersHorizontal size={16} />
          </button>
          <Link href="/dashboard/agences/nouvelle" className="btn-accent">
            <Plus size={16} />
            Nouvelle Agence
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef4ff' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
              </svg>
            </div>
          </div>
          <span className="stat-badge stat-badge-green">{stats.newThisWeek > 0 ? `+${stats.newThisWeek} cette semaine` : 'Stable'}</span>
          <p className="stat-value">{loading ? '...' : stats.total}</p>
          <p className="stat-label">Total des Agences</p>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #22c55e' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <p className="stat-value">{loading ? '...' : stats.active}</p>
          <p className="stat-label">Agences Actives</p>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #ef4444' }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ef4444' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
          </div>
          <p className="stat-value">{loading ? '...' : stats.blocked}</p>
          <p className="stat-label">En attente / Bloquées</p>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid #6366f1' }}>
          <span className="stat-badge" style={{ background: '#eef2ff', color: '#6366f1', fontSize: '0.65rem' }}>Ce mois</span>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#6366f1' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                <polyline points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
          </div>
          <p className="stat-value">{loading ? '...' : stats.trips.toLocaleString('fr-FR')}</p>
          <p className="stat-label">Voyages Totaux</p>
        </div>
      </div>

      {/* Tabs + Sort */}
      <div className="flex items-center justify-between mb-6">
        <div className="tab-group">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`tab-item ${activeTab === tab ? 'active' : ''}`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Trier par:</span>
          <select
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white font-medium"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'recent' | 'name' | 'revenue')}
          >
            <option value="recent">Date d&apos;inscription (Récent)</option>
            <option value="name">Nom (A-Z)</option>
            <option value="revenue">Revenus</option>
          </select>
        </div>
      </div>

      {/* Agency Table List */}
      {loading ? (
        <div className="text-center text-gray-400 py-12 mb-8">Chargement des agences...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-8">
          <table className="data-table">
            <thead>
              <tr>
                <th>Agence</th>
                <th>Localisation</th>
                <th>Admin Principal</th>
                <th>Revenus</th>
                <th>Plan</th>
                <th>Statut</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAgencies.map((agency) => (
                <tr
                  key={agency.id}
                  className="cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setSelectedAgency(agency)}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ background: agency.color || '#3b82f6' }}
                      >
                        {agency.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#1a1d29' }}>
                          {agency.name}
                        </p>
                        {agency.siret_number && (
                          <p className="text-xs text-gray-400">{agency.siret_number}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <MapPin size={13} className="text-gray-400" />
                      {agency.city}, {agency.country_code}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                        style={{ background: agency.color || '#9ca3af' }}
                      >
                        {agency.initials || '?'}
                      </div>
                      <span className="text-sm font-medium">{agency.admin}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className="text-sm font-semibold"
                      style={{ color: agency.debt ? '#ef4444' : '#1a1d29' }}
                    >
                      {formatFCFA(agency.revenue)}
                    </span>
                  </td>
                  <td>
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-md capitalize"
                      style={{
                        background: agency.plan === 'premium' ? '#fef3c7' : '#f3f4f6',
                        color: agency.plan === 'premium' ? '#d97706' : '#6b7280',
                      }}
                    >
                      {agency.plan}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={agency.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAgencies.length === 0 && (
            <div className="text-center text-gray-400 py-12">
              Aucune agence dans cette catégorie.
            </div>
          )}
        </div>
      )}

      {/* Add agency link */}
      <div className="flex justify-center mb-6">
        <Link
          href="/dashboard/agences/nouvelle"
          className="flex items-center gap-2 px-6 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition text-sm font-medium text-gray-500 hover:text-orange-600"
        >
          <Plus size={16} />
          Ajouter une nouvelle agence
        </Link>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-400">
          Affichage {filteredAgencies.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredAgencies.length)} sur {filteredAgencies.length} agences
        </p>
        <div className="pagination">
          <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1} className="disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
            .map((p, idx, arr) => (
              <span key={p}>
                {idx > 0 && arr[idx - 1] !== p - 1 && (
                  <span className="text-gray-400 text-sm mx-1">...</span>
                )}
                <button
                  className={currentPage === p ? 'active' : ''}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              </span>
            ))}
          <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
