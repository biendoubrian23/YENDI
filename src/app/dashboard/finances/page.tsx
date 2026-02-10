'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  SlidersHorizontal,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { formatFCFA } from '@/lib/mock-data'

interface FinanceStats {
  chiffreAffaires: number
  commissionNette: number
  trajetsEffectues: number
  reversementsAttente: number
}

interface EvolutionPoint {
  month: string
  value: number
}

interface TopPerformer {
  name: string
  percentage: number
  generated: string
}

interface AgenceDetail {
  id: string
  name: string
  initial: string
  color: string
  trajets: number
  caBrut: number
  commission: number
  croissance: number
  statutReversement: string
}

function ReversementBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Payé: { bg: '#dcfce7', color: '#16a34a' },
    'En attente': { bg: '#fff7ed', color: '#f59e0b' },
    Bloqué: { bg: '#fef2f2', color: '#ef4444' },
  }
  const style = colors[status] || { bg: '#f3f4f6', color: '#6b7280' }

  return (
    <span
      className="text-xs font-semibold px-3 py-1 rounded-full"
      style={{ background: style.bg, color: style.color }}
    >
      {status}
    </span>
  )
}

function MiniChart({ data }: { data: EvolutionPoint[] }) {
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const minVal = Math.min(...data.map((d) => d.value), 0)
  const width = 100
  const height = 100

  // Créer une courbe lisse avec des points de contrôle
  const createSmoothPath = () => {
    const points = data.map((d, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((d.value - minVal) / (maxVal - minVal)) * height
      return { x, y }
    })

    if (points.length === 0) return ''

    let path = `M ${points[0].x},${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i]
      const next = points[i + 1]
      const controlX = current.x + (next.x - current.x) / 2

      path += ` C ${controlX},${current.y} ${controlX},${next.y} ${next.x},${next.y}`
    }

    return path
  }

  const smoothPath = createSmoothPath()
  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((d.value - minVal) / (maxVal - minVal)) * height
    return { x, y }
  })

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f26522" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#f26522" stopOpacity="0" />
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.1" />
        </filter>
      </defs>
      
      {/* Filled area under curve */}
      <path
        d={`${smoothPath} L ${width},${height} L 0,${height} Z`}
        fill="url(#chartGradient)"
      />
      
      {/* Main curve */}
      <path
        d={smoothPath}
        fill="none"
        stroke="#f26522"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#shadow)"
      />
      
      {/* Points */}
      {points.map((point, i) => (
        <g key={i}>
          <circle
            cx={point.x}
            cy={point.y}
            r="4"
            fill="white"
            stroke="#f26522"
            strokeWidth="2.5"
          />
        </g>
      ))}
    </svg>
  )
}

export default function FinancesPage() {
  const [period, setPeriod] = useState<'30j' | 'mois' | 'annee'>('mois')
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<FinanceStats>({ chiffreAffaires: 0, commissionNette: 0, trajetsEffectues: 0, reversementsAttente: 0 })
  const [evolution, setEvolution] = useState<EvolutionPoint[]>([])
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
  const [agenceDetails, setAgenceDetails] = useState<AgenceDetail[]>([])

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        // Fetch financial records with agency data
        const { data: records } = await supabase
          .from('financial_records')
          .select('*, agencies(name, color)')
          .order('year', { ascending: false })
          .order('month', { ascending: false })

        const allRecords = records || []

        // Compute stats
        const totalCA = allRecords.reduce((s: number, r: { ca_brut: number }) => s + r.ca_brut, 0)
        const totalCommission = allRecords.reduce((s: number, r: { commission_amount: number }) => s + r.commission_amount, 0)
        const totalTrips = allRecords.reduce((s: number, r: { trips_count: number }) => s + r.trips_count, 0)
        const pendingReversements = allRecords
          .filter((r: { reversement_status: string }) => r.reversement_status === 'en_attente')
          .reduce((s: number, r: { commission_amount: number }) => s + r.commission_amount, 0)

        setStats({ chiffreAffaires: totalCA, commissionNette: totalCommission, trajetsEffectues: totalTrips, reversementsAttente: pendingReversements })

        // Evolution: group by month
        const monthMap: Record<string, number> = {}
        allRecords.forEach((r: { month: number; year: number; ca_brut: number }) => {
          const key = `${r.month}/${r.year}`
          monthMap[key] = (monthMap[key] || 0) + r.ca_brut
        })
        const evoData: EvolutionPoint[] = Object.entries(monthMap)
          .sort(([a], [b]) => {
            const [am, ay] = a.split('/').map(Number)
            const [bm, by] = b.split('/').map(Number)
            return ay - by || am - bm
          })
          .map(([key, value]) => ({ month: key, value }))
        setEvolution(evoData.length > 0 ? evoData : [{ month: '-', value: 0 }])

        // Top performers: group by agency
        const agencyMap: Record<string, { name: string; color: string; ca: number; trips: number; commission: number; reversement: string }> = {}
        allRecords.forEach((r: { agency_id: string; ca_brut: number; trips_count: number; commission_amount: number; reversement_status: string; agencies: { name: string; color: string } | null }) => {
          if (!agencyMap[r.agency_id]) {
            agencyMap[r.agency_id] = {
              name: (r.agencies as { name: string; color: string } | null)?.name || 'Inconnu',
              color: (r.agencies as { name: string; color: string } | null)?.color || '#6b7280',
              ca: 0,
              trips: 0,
              commission: 0,
              reversement: r.reversement_status,
            }
          }
          agencyMap[r.agency_id].ca += r.ca_brut
          agencyMap[r.agency_id].trips += r.trips_count
          agencyMap[r.agency_id].commission += r.commission_amount
        })

        const sorted = Object.entries(agencyMap).sort(([, a], [, b]) => b.ca - a.ca)
        const topTotal = sorted.reduce((s, [, v]) => s + v.ca, 0) || 1

        setTopPerformers(sorted.slice(0, 3).map(([, v]) => ({
          name: v.name,
          percentage: Math.round((v.ca / topTotal) * 100),
          generated: formatFCFA(v.ca),
        })))

        setAgenceDetails(sorted.map(([id, v]) => ({
          id,
          name: v.name,
          initial: v.name.charAt(0),
          color: v.color,
          trajets: v.trips,
          caBrut: v.ca,
          commission: v.commission,
          croissance: 0,
          statutReversement: v.reversement === 'paye' ? 'Payé' : v.reversement === 'en_attente' ? 'En attente' : 'Bloqué',
        })))
      } catch (err) {
        console.error('Erreur chargement finances:', err)
      }
      setLoading(false)
    }
    fetchFinances()
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Finance Monitor</h1>
          <p className="page-subtitle">
            Vue globale sur la performance financière du réseau.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Period Toggle */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setPeriod('30j')}
              className={`px-4 py-2 text-sm font-medium transition ${
                period === '30j' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              30J
            </button>
            <button
              onClick={() => setPeriod('mois')}
              className={`px-4 py-2 text-sm font-medium transition ${
                period === 'mois' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Ce mois
            </button>
            <button
              onClick={() => setPeriod('annee')}
              className={`px-4 py-2 text-sm font-medium transition ${
                period === 'annee' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              Année
            </button>
          </div>

          <button className="btn-outline flex items-center gap-2">
            <Download size={16} />
            Export CSV
          </button>

          {/* Super Admin avatar */}
          <div className="flex items-center gap-2 ml-2">
            <div className="text-right">
              <p className="text-sm font-semibold">Super Admin</p>
              <p className="text-xs text-gray-400">master@yendi.com</p>
            </div>
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ background: '#6366f1' }}
            >
              SA
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef4ff' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <span className="stat-badge stat-badge-green">
            <TrendingUp size={10} /> +12.5%
          </span>
          <p className="stat-label">Chiffre d&apos;Affaires (Global)</p>
          <p className="stat-value">{loading ? '...' : formatFCFA(stats.chiffreAffaires)}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f0f0ff' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>
          <span className="stat-badge stat-badge-green">
            <TrendingUp size={10} /> +8.2%
          </span>
          <p className="stat-label">Commission Nette (Yendi)</p>
          <p className="stat-value">{loading ? '...' : formatFCFA(stats.commissionNette)}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff7ed' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                <polyline points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
          </div>
          <span className="stat-badge" style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '0.65rem' }}>Ce mois</span>
          <p className="stat-label">Trajets Effectués</p>
          <p className="stat-value">{loading ? '...' : stats.trajetsEffectues.toLocaleString('fr-FR')}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fef2f2' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          </div>
          <span className="stat-badge" style={{ background: '#fef2f2', color: '#ef4444', fontSize: '0.65rem' }}>Action requise</span>
          <p className="stat-label">Reversements en attente</p>
          <p className="stat-value">{loading ? '...' : formatFCFA(stats.reversementsAttente)}</p>
        </div>
      </div>

      {/* Chart + Top Performers */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* Chart */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
              Évolution du Chiffre d&apos;Affaires
            </h2>
            <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white font-medium">
              <option>Tous les agences</option>
            </select>
          </div>

          {/* Y-axis labels + Chart */}
          <div className="flex gap-4" style={{ height: '240px' }}>
            <div className="flex flex-col justify-between text-xs text-gray-400 py-2">
              <span>30M</span>
              <span>25M</span>
              <span>20M</span>
              <span>15M</span>
              <span>10M</span>
              <span>5M</span>
              <span>0M</span>
            </div>
            <div className="flex-1 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="border-b border-gray-100 w-full" />
                ))}
              </div>
              {/* Chart */}
              <div className="absolute inset-0">
                <MiniChart data={evolution} />
              </div>
            </div>
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between mt-2 ml-12 text-xs text-gray-400">
            {evolution.map((d) => (
              <span key={d.month}>{d.month}</span>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-1" style={{ color: '#1a1d29' }}>
            Top Performers
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            Par volume de vente (Mois en cours)
          </p>

          <div className="space-y-5">
            {topPerformers.map((performer) => (
              <div key={performer.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{performer.name}</span>
                  <span className="text-sm font-bold">{performer.percentage}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${performer.percentage}%`,
                      background: '#f26522',
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {performer.generated} générés
                </p>
              </div>
            ))}
          </div>

          <button className="btn-outline w-full mt-6 text-sm">
            Voir le classement complet
          </button>
        </div>
      </div>

      {/* Detail par Agence */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
            Détail par Agence
          </h2>
          <div className="flex items-center gap-3">
            <div className="search-input">
              <Search size={16} className="text-gray-400" />
              <input type="text" placeholder="Rechercher une agence..." />
            </div>
            <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50">
              <SlidersHorizontal size={16} />
            </button>
          </div>
        </div>

        <table className="data-table">
          <thead>
            <tr>
              <th>Agence</th>
              <th>Trajets (Mois)</th>
              <th>CA Brut</th>
              <th>Commission (10%)</th>
              <th>Croissance</th>
              <th>Statut Reversement</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {agenceDetails.map((agence) => (
              <tr key={agence.id}>
                <td>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ background: agence.color }}
                    >
                      {agence.initial}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{agence.name}</p>
                      <p className="text-xs text-gray-400">ID: #{agence.id.toUpperCase()}</p>
                    </div>
                  </div>
                </td>
                <td className="font-semibold">{agence.trajets}</td>
                <td className="font-medium">{agence.caBrut.toLocaleString('fr-FR')} F</td>
                <td className="font-bold" style={{ color: '#f26522' }}>
                  {agence.commission.toLocaleString('fr-FR')} F
                </td>
                <td>
                  <span
                    className="flex items-center gap-1 text-sm font-semibold"
                    style={{
                      color: agence.croissance >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {agence.croissance >= 0 ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    {agence.croissance >= 0 ? '+' : ''}
                    {agence.croissance}%
                  </span>
                </td>
                <td>
                  <ReversementBadge status={agence.statutReversement} />
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
            Affichage 1-{agenceDetails.length} sur {agenceDetails.length} agences
          </p>
          <div className="pagination">
            <button>
              <ChevronLeft size={14} />
            </button>
            <button className="active">1</button>
            <button>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
