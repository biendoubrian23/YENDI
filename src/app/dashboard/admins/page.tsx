'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  SlidersHorizontal,
  Download,
  Plus,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AdminRow {
  id: string
  name: string
  email: string
  agency: string
  agencyInitial: string
  agencyColor: string
  role: string
  status: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { actif: 'Actif', suspendu: 'Suspendu', en_attente: 'En attente' }
  const label = map[status] || status
  const statusClass =
    label === 'Actif'
      ? 'status-actif'
      : label === 'Suspendu'
      ? 'status-suspendu'
      : 'status-inactive'

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className="status-dot" />
      {label}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = { manager: 'Manager', proprietaire: 'Propriétaire', operateur: 'Opérateur' }
  const label = map[role] || role
  const colors: Record<string, string> = {
    Manager: '#3b82f6',
    Propriétaire: '#22c55e',
    Opérateur: '#8b5cf6',
  }
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-md"
      style={{
        background: `${colors[label] || '#6b7280'}15`,
        color: colors[label] || '#6b7280',
      }}
    >
      {label}
    </span>
  )
}

export default function AdminsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, recent: 0 })

  useEffect(() => {
    const fetchAdmins = async () => {
      try {
        const { data } = await supabase
          .from('agency_admins')
          .select('id, role, profiles(full_name, email, status), agencies(name, color)')

        const mapped: AdminRow[] = (data || []).map((row: Record<string, unknown>) => {
          const profile = row.profiles as { full_name: string; email: string; status: string } | null
          const agency = row.agencies as { name: string; color: string } | null
          return {
            id: row.id as string,
            name: profile?.full_name || 'Inconnu',
            email: profile?.email || '-',
            agency: agency?.name || '-',
            agencyInitial: (agency?.name || '?').charAt(0),
            agencyColor: agency?.color || '#6b7280',
            role: row.role as string,
            status: profile?.status || 'en_attente',
          }
        })

        setAdmins(mapped)
        setStats({
          total: mapped.length,
          active: mapped.filter((a) => a.status === 'actif').length,
          recent: 0,
        })
      } catch (err) {
        console.error('Erreur chargement admins:', err)
      }
      setLoading(false)
    }
    fetchAdmins()
  }, [])

  return (
    <div>
      {/* Breadcrumb */}
      <div className="text-sm mb-2">
        <span className="text-gray-400">Dashboard</span>
        <span className="text-gray-300 mx-2">{'>'}</span>
        <span className="font-medium" style={{ color: '#f26522' }}>
          Administrateurs
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="page-title">Gestion des Admins</h1>
          <p className="page-subtitle">
            Visualisez et gérez les comptes administrateurs de toutes les agences affiliées.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline flex items-center gap-2">
            <Download size={16} />
            Exporter CSV
          </button>
          <button className="btn-accent">
            <Plus size={16} />
            Assigner un Admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mt-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef4ff' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <p className="stat-label">Total Administrateurs</p>
          <p className="stat-value">{loading ? '...' : stats.total}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <p className="stat-label">Comptes Actifs</p>
          <p className="stat-value">{loading ? '...' : stats.active}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff7ed' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          </div>
          <p className="stat-label">Connexions (24h)</p>
          <p className="stat-value">{loading ? '...' : '-'}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="search-input w-80">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="Rechercher par nom, email ou agence..." className="w-full" />
        </div>
        <div className="flex items-center gap-3">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option>Tous les rôles</option>
            <option>Manager</option>
            <option>Propriétaire</option>
            <option>Opérateur</option>
          </select>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <span className="text-sm">Statut: Actif</span>
            <ChevronLeft size={14} className="text-gray-400 rotate-[270deg]" />
          </div>
          <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" className="rounded" />
              </th>
              <th>Administrateur</th>
              <th>Agence Affiliée</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td>
                  <input type="checkbox" className="rounded" />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: admin.agencyColor }}
                    >
                      {admin.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#1a1d29' }}>
                        {admin.name}
                      </p>
                      <p className="text-xs text-gray-400">{admin.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: admin.agencyColor }}
                    >
                      {admin.agencyInitial}
                    </div>
                    <span className="text-sm font-medium">{admin.agency}</span>
                  </div>
                </td>
                <td>
                  <RoleBadge role={admin.role} />
                </td>
                <td>
                  <StatusBadge status={admin.status} />
                </td>
                <td>
                  <button className="text-gray-400 hover:text-gray-600 transition">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Affichage de 1-{admins.length} sur {stats.total}
          </p>
          <div className="pagination">
            <button>
              <ChevronLeft size={14} />
            </button>
            {[1, 2].map((page) => (
              <button
                key={page}
                className={currentPage === page ? 'active' : ''}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <span className="text-gray-400 text-sm mx-1">...</span>
            <button onClick={() => setCurrentPage(42)}>42</button>
            <button>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
