'use client'

import { useState, useEffect } from 'react'
import { Plus, Search, SlidersHorizontal, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { supabase, type Agency } from '@/lib/supabase'
import { formatFCFA } from '@/lib/mock-data'

type TabType = 'Toutes' | 'Actives' | 'En Attente' | 'Suspendues'

interface AgencyRow extends Agency {
  admin?: string
  initials?: string
  revenue: number
  debt?: number
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

export default function AgencesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('Toutes')
  const [currentPage, setCurrentPage] = useState(1)
  const [agencies, setAgencies] = useState<AgencyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, blocked: 0, trips: 0 })

  useEffect(() => {
    const fetchAgencies = async () => {
      try {
        const { data: agenciesData } = await supabase
          .from('agencies')
          .select('*, agency_admins(profile_id, is_primary, profiles(full_name))')
          .order('created_at', { ascending: false })

        const { data: finData } = await supabase
          .from('financial_records')
          .select('agency_id, ca_brut, commission_amount')

        const revenueMap: Record<string, number> = {}
        ;(finData || []).forEach((r: { agency_id: string; ca_brut: number }) => {
          revenueMap[r.agency_id] = (revenueMap[r.agency_id] || 0) + r.ca_brut
        })

        const mapped: AgencyRow[] = (agenciesData || []).map((a: Record<string, unknown>) => {
          const admins = (a.agency_admins as Array<{ is_primary: boolean; profiles: { full_name: string } | null }>) || []
          const primary = admins.find((ad) => ad.is_primary)
          const rev = revenueMap[a.id as string] || 0
          return {
            ...a,
            admin: primary?.profiles?.full_name || 'En attente',
            initials: (primary?.profiles?.full_name || '?').split(' ').map((n: string) => n[0]).join('').toUpperCase(),
            revenue: rev,
            debt: (a.status === 'suspendu' && rev < 0) ? rev : undefined,
          } as AgencyRow
        })

        setAgencies(mapped)

        const total = mapped.length
        const active = mapped.filter((a) => a.status === 'operationnel').length
        const blocked = mapped.filter((a) => a.status === 'en_attente' || a.status === 'inactive').length
        
        const { data: tripsData } = await supabase
          .from('trips')
          .select('*', { count: 'exact', head: true })
        
        setStats({ total, active, blocked, trips: (tripsData as unknown as number) || 0 })
      } catch (err) {
        console.error('Erreur chargement agences:', err)
      }
      setLoading(false)
    }
    fetchAgencies()
  }, [])

  const tabs: TabType[] = ['Toutes', 'Actives', 'En Attente', 'Suspendues']

  const filteredAgencies = agencies.filter((a) => {
    if (activeTab === 'Toutes') return true
    if (activeTab === 'Actives') return a.status === 'operationnel'
    if (activeTab === 'Suspendues') return a.status === 'suspendu'
    if (activeTab === 'En Attente') return a.status === 'inactive' || a.status === 'en_attente'
    return true
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Agences Partenaires</h1>
          <p className="page-subtitle">Vue d&apos;ensemble du réseau YENDI</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="search-input">
            <Search size={16} className="text-gray-400" />
            <input type="text" placeholder="Rechercher une agence..." className="w-48" />
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
          <span className="stat-badge stat-badge-green">+3 cette semaine</span>
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
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white font-medium">
            <option>Date d&apos;inscription (Récent)</option>
            <option>Nom (A-Z)</option>
            <option>Revenus</option>
          </select>
        </div>
      </div>

      {/* Agency Cards Grid */}
      {loading ? (
        <div className="text-center text-gray-400 py-12 mb-8">Chargement des agences...</div>
      ) : (
      <div className="grid grid-cols-3 gap-8 mb-8">
        {filteredAgencies.map((agency) => (
          <div key={agency.id} className="agency-card">
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg overflow-hidden flex-shrink-0"
                  style={{ background: agency.color || '#ddd' }}
                >
                  {agency.initials || agency.name.charAt(0)}
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

              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-medium">Admin</p>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ background: agency.color || '#9ca3af' }}
                    >
                      {agency.initials || '?'}
                    </span>
                    {agency.admin}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400 uppercase font-medium">
                    {agency.debt ? 'Dette' : 'Revenus (Mensuel)'}
                  </p>
                  <p
                    className="text-sm font-bold"
                    style={{ color: agency.debt ? '#ef4444' : '#1a1d29' }}
                  >
                    {formatFCFA(agency.revenue)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <StatusBadge status={agency.status} />
                {agency.debt ? (
                  <span className="text-xs font-medium text-red-500 cursor-pointer hover:underline">
                    Gérer le litige →
                  </span>
                ) : (
                  <span className="text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-800">
                    Voir Détails →
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Add Agency Card */}
        <Link
          href="/dashboard/agences/nouvelle"
          className="agency-card flex items-center justify-center p-10 border-2 border-dashed border-gray-200 hover:border-gray-300 cursor-pointer"
          style={{ background: 'transparent', minHeight: '220px' }}
        >
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mx-auto mb-3">
              <Plus size={20} className="text-gray-400" />
            </div>
            <p className="font-bold text-sm" style={{ color: '#1a1d29' }}>
              Ajouter une Agence
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Intégrer un nouveau partenaire de transport au réseau YENDI.
            </p>
          </div>
        </Link>
      </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center">
        <div className="pagination">
          <button>
            <ChevronLeft size={14} />
          </button>
          {[1, 2, 3].map((page) => (
            <button
              key={page}
              className={currentPage === page ? 'active' : ''}
              onClick={() => setCurrentPage(page)}
            >
              {page}
            </button>
          ))}
          <span className="text-gray-400 text-sm mx-1">...</span>
          <button onClick={() => setCurrentPage(8)}>8</button>
          <button>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
