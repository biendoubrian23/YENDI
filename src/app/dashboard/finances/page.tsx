'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Download,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  RefreshCw,
  Calendar,
  BarChart3,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { supabase } from '@/lib/supabase'

/* ═══════════════════════════════════════════ */
/* ──────── TYPES ──────── */
/* ═══════════════════════════════════════════ */
type Granularity = 'jour' | 'semaine' | 'mois' | 'annee'

interface ChartPoint {
  label: string
  revenue: number
  commission: number
}

interface FinanceStats {
  chiffreAffaires: number
  commissionNette: number
  trajetsEffectues: number
  reversementsAttente: number
  caGrowth: number
  commGrowth: number
}

interface AgenceDetail {
  id: string
  name: string
  initial: string
  color: string
  agencyId: string
  trajets: number
  caBrut: number
  commission: number
  commissionRate: number
  croissance: number
  statutReversement: string
}

interface TopPerformer {
  name: string
  percentage: number
  generated: string
  color: string
}

interface AgencyOption {
  id: string
  name: string
}

/* ═══════════════════════════════════════════ */
/* ──────── HELPERS ──────── */
/* ═══════════════════════════════════════════ */
function formatFCFA(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M FCFA`
  if (Math.abs(amount) >= 1_000) return `${(amount / 1_000).toFixed(0)}K FCFA`
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

function formatShortAxis(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

function getGranularityLabel(g: Granularity): string {
  const map: Record<Granularity, string> = {
    jour: 'Jour',
    semaine: 'Semaine',
    mois: 'Mois',
    annee: 'Année',
  }
  return map[g]
}

/* ═══════════════════════════════════════════ */
/* ──────── SUB-COMPONENTS ──────── */
/* ═══════════════════════════════════════════ */
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

function GrowthBadge({ value }: { value: number }) {
  if (value === 0)
    return (
      <span
        className="stat-badge"
        style={{ background: '#f3f4f6', color: '#6b7280', fontSize: '0.65rem' }}
      >
        —
      </span>
    )
  const isPositive = value > 0
  return (
    <span
      className="stat-badge flex items-center gap-0.5"
      style={{
        background: isPositive ? '#dcfce7' : '#fef2f2',
        color: isPositive ? '#16a34a' : '#ef4444',
        fontSize: '0.65rem',
      }}
    >
      {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {isPositive ? '+' : ''}
      {value}%
    </span>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white px-4 py-3 rounded-xl shadow-lg border border-gray-100">
      <p className="text-[11px] text-gray-400 font-medium mb-1.5">{label}</p>
      <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>
        {formatFCFA(payload[0]?.value || 0)}
      </p>
      {payload[1] && (
        <p className="text-xs text-gray-500 mt-0.5">
          Commission : {formatFCFA(payload[1]?.value || 0)}
        </p>
      )}
    </div>
  )
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4 mb-6 rounded-xl bg-red-50 border border-red-100 text-red-700">
      <AlertCircle size={18} />
      <p className="text-sm flex-1">{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition"
      >
        <RefreshCw size={12} />
        Réessayer
      </button>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/* ──────── MAIN PAGE ──────── */
/* ═══════════════════════════════════════════ */
export default function FinancesPage() {
  const [granularity, setGranularity] = useState<Granularity>('mois')
  const [chartAgencyFilter, setChartAgencyFilter] = useState('all')
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [chartLoading, setChartLoading] = useState(false)
  const [stats, setStats] = useState<FinanceStats>({
    chiffreAffaires: 0,
    commissionNette: 0,
    trajetsEffectues: 0,
    reversementsAttente: 0,
    caGrowth: 0,
    commGrowth: 0,
  })
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
  const [agenceDetails, setAgenceDetails] = useState<AgenceDetail[]>([])
  const [agencies, setAgencies] = useState<AgencyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tableSearch, setTableSearch] = useState('')
  const [tablePage, setTablePage] = useState(1)
  const ITEMS_PER_PAGE = 8

  /* ─── Fetch chart data from API ─── */
  const fetchChart = useCallback(async () => {
    setChartLoading(true)
    try {
      const res = await fetch(
        `/api/stats/revenue-chart?g=${granularity}&agency=${chartAgencyFilter}`
      )
      if (!res.ok) throw new Error('Erreur chargement graphique')
      const json = await res.json()
      setChartData(json.data || [])
    } catch {
      setChartData([])
    }
    setChartLoading(false)
  }, [granularity, chartAgencyFilter])

  /* ─── Compute stats + table from REAL data (seat_reservations) ─── */
  const fetchFinancialData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // 1. Fetch REAL financial data from seat_reservations
      const response = await fetch('/api/stats/real-finances')
      if (!response.ok) throw new Error('Erreur lors du chargement des données')
      
      const realData = await response.json()
      const { totals, agencies: agenciesData } = realData

      // 2. Fetch agencies list for chart filter (only agencies with admins)
      const { data: agencyList } = await supabase
        .from('agencies')
        .select('id, name, agency_admins(profile_id)')
        .order('name')
      const filteredAgencies = (agencyList || [])
        .filter((a: any) => a.agency_admins && a.agency_admins.length > 0)
        .map((a: any) => ({ id: a.id, name: a.name }))
      setAgencies(filteredAgencies)

      // 3. Set stats from real data
      setStats({
        chiffreAffaires: totals.revenue || 0,
        commissionNette: totals.commission || 0,
        trajetsEffectues: totals.trips || 0,
        reversementsAttente: 0, // Pas encore géré dans les vraies données
        caGrowth: 0, // Besoin d'historique pour calculer
        commGrowth: 0, // Besoin d'historique pour calculer
      })

      // 4. Top Performers
      const sortedAgencies = (agenciesData || []).sort(
        (a: any, b: any) => b.revenue - a.revenue
      )
      const topTotal = sortedAgencies.reduce((s: number, a: any) => s + a.revenue, 0) || 1

      setTopPerformers(
        sortedAgencies.slice(0, 4).map((a: any) => ({
          name: a.agency_name,
          percentage: Math.round((a.revenue / topTotal) * 100),
          generated: formatFCFA(a.revenue),
          color: a.agency_color,
        }))
      )

      // 5. Agency details for table
      setAgenceDetails(
        sortedAgencies.map((a: any) => ({
          id: a.agency_id,
          agencyId: a.agency_id,
          name: a.agency_name,
          initial: a.agency_name.charAt(0),
          color: a.agency_color,
          trajets: a.trips_count,
          caBrut: a.revenue,
          commission: a.commission,
          commissionRate: a.commission_rate,
          croissance: 0, // Besoin d'historique
          statutReversement: 'Payé', // Par défaut pour les vraies données
        }))
      )
    } catch (err) {
      console.error('Erreur chargement finances:', err)
      setError(
        'Impossible de charger les données financières. Vérifiez votre connexion.'
      )
    }
    setLoading(false)
  }, [granularity])

  useEffect(() => {
    fetchFinancialData()
  }, [fetchFinancialData])

  useEffect(() => {
    fetchChart()
  }, [fetchChart])

  /* ─── CSV Export ─── */
  const exportCSV = () => {
    const headers = [
      'Agence',
      'Trajets',
      'CA Brut (FCFA)',
      'Commission (FCFA)',
      'Taux Commission',
      'Croissance (%)',
      'Statut Reversement',
    ]
    const rows = agenceDetails.map((a) => [
      a.name,
      a.trajets,
      a.caBrut,
      a.commission,
      `${a.commissionRate}%`,
      `${a.croissance}%`,
      a.statutReversement,
    ])
    const csv =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `yendi-finances-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  /* ─── Table filtering & pagination ─── */
  const filteredAgencies = agenceDetails.filter(
    (a) =>
      !tableSearch ||
      a.name.toLowerCase().includes(tableSearch.toLowerCase())
  )
  const totalPages = Math.max(
    1,
    Math.ceil(filteredAgencies.length / ITEMS_PER_PAGE)
  )
  const paginatedAgencies = filteredAgencies.slice(
    (tablePage - 1) * ITEMS_PER_PAGE,
    tablePage * ITEMS_PER_PAGE
  )

  // Reset page when search changes
  useEffect(() => {
    setTablePage(1)
  }, [tableSearch])

  /* ─── Period label ─── */
  const periodLabel =
    granularity === 'jour' || granularity === 'semaine'
      ? 'Ce mois'
      : granularity === 'mois'
        ? 'Cette année'
        : 'Global'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-gray-400">
          <RefreshCw size={18} className="animate-spin" />
          Chargement des données financières...
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* ───── Error Banner ───── */}
      {error && (
        <ErrorBanner message={error} onRetry={fetchFinancialData} />
      )}

      {/* ───── Header ───── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Finance Monitor</h1>
          <p className="page-subtitle">
            Vue globale sur la performance financière du réseau.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Granularity filter */}
          <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
            {(['jour', 'semaine', 'mois', 'annee'] as Granularity[]).map(
              (g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`px-4 py-2 text-sm font-medium transition ${
                    granularity === g
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {getGranularityLabel(g)}
                </button>
              )
            )}
          </div>

          <button
            onClick={exportCSV}
            className="btn-outline flex items-center gap-2"
          >
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* ───── Stats Cards ───── */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {/* CA */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#eef4ff' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <GrowthBadge value={stats.caGrowth} />
          <p className="stat-label">
            Chiffre d&apos;Affaires ({periodLabel})
          </p>
          <p className="stat-value">{formatFCFA(stats.chiffreAffaires)}</p>
        </div>

        {/* Commission */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#f0f0ff' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
              </svg>
            </div>
          </div>
          <GrowthBadge value={stats.commGrowth} />
          <p className="stat-label">Commission Nette (Yendi)</p>
          <p className="stat-value">
            {formatFCFA(stats.commissionNette)}
          </p>
        </div>

        {/* Trajets */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#fff7ed' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
                <polyline points="16 8 20 8 23 11 23 16 16 16 16 8" />
                <circle cx="5.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
            </div>
          </div>
          <span
            className="stat-badge"
            style={{
              background: '#f3f4f6',
              color: '#6b7280',
              fontSize: '0.65rem',
            }}
          >
            {periodLabel}
          </span>
          <p className="stat-label">Trajets Effectués</p>
          <p className="stat-value">
            {stats.trajetsEffectues.toLocaleString('fr-FR')}
          </p>
        </div>

        {/* Reversements */}
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#fef2f2' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          </div>
          <span
            className="stat-badge"
            style={{
              background: '#fef2f2',
              color: '#ef4444',
              fontSize: '0.65rem',
            }}
          >
            {stats.reversementsAttente > 0 ? 'Action requise' : '—'}
          </span>
          <p className="stat-label">Reversements en attente</p>
          <p className="stat-value">
            {formatFCFA(stats.reversementsAttente)}
          </p>
        </div>
      </div>

      {/* ───── Chart + Top Performers ───── */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {/* Chart */}
        <div className="col-span-2 bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <BarChart3 size={18} className="text-gray-400" />
              <h2
                className="text-lg font-bold"
                style={{ color: '#1a1d29' }}
              >
                Évolution du Chiffre d&apos;Affaires
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" />
              <select
                value={chartAgencyFilter}
                onChange={(e) => setChartAgencyFilter(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                title="Filtrer par agence"
              >
                <option value="all">Toutes les agences</option>
                {agencies.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {chartLoading ? (
            <div className="flex items-center justify-center h-[280px] text-gray-400">
              <RefreshCw size={18} className="animate-spin mr-2" />
              Chargement du graphique...
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[280px] text-gray-400">
              <BarChart3 size={32} className="mb-2 opacity-30" />
              <p className="text-sm">Aucune donnée pour cette période</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart
                data={chartData}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorRevenue"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#f26522"
                      stopOpacity={0.15}
                    />
                    <stop
                      offset="100%"
                      stopColor="#f26522"
                      stopOpacity={0}
                    />
                  </linearGradient>
                  <linearGradient
                    id="colorCommission"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="#6366f1"
                      stopOpacity={0.1}
                    />
                    <stop
                      offset="100%"
                      stopColor="#6366f1"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="#f5f5f5"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatShortAxis}
                  width={50}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Chiffre d'Affaires"
                  stroke="#f26522"
                  strokeWidth={2.5}
                  fill="url(#colorRevenue)"
                  dot={false}
                  activeDot={{
                    r: 5,
                    fill: '#f26522',
                    stroke: 'white',
                    strokeWidth: 2,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="commission"
                  name="Commission"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  fill="url(#colorCommission)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: '#6366f1',
                    stroke: 'white',
                    strokeWidth: 2,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2
            className="text-lg font-bold mb-1"
            style={{ color: '#1a1d29' }}
          >
            Top Performers
          </h2>
          <p className="text-xs text-gray-400 mb-6">
            Par volume de vente ({periodLabel})
          </p>

          {topPerformers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">
              Aucune donnée disponible
            </p>
          ) : (
            <div className="space-y-5">
              {topPerformers.map((performer) => (
                <div key={performer.name}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">
                      {performer.name}
                    </span>
                    <span className="text-sm font-bold">
                      {performer.percentage}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${performer.percentage}%`,
                        background: performer.color || '#f26522',
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {performer.generated} générés
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ───── Detail par Agence ───── */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-4">
          <h2
            className="text-lg font-bold"
            style={{ color: '#1a1d29' }}
          >
            Détail par Agence
          </h2>
          <div className="flex items-center gap-3">
            <div className="search-input">
              <Search size={16} className="text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher une agence..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
              />
            </div>
            <button
              onClick={fetchFinancialData}
              className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition"
              title="Actualiser les données"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </div>

        {paginatedAgencies.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {tableSearch
              ? 'Aucune agence trouvée pour cette recherche.'
              : 'Aucune donnée financière disponible.'}
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Agence</th>
                <th>Trajets</th>
                <th>CA Brut</th>
                <th>Commission</th>
                <th>Croissance</th>
                <th>Statut Reversement</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAgencies.map((agence) => (
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
                        <p className="font-semibold text-sm">
                          {agence.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          ID: #
                          {agence.agencyId
                            .substring(0, 8)
                            .toUpperCase()}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold">
                    {agence.trajets.toLocaleString('fr-FR')}
                  </td>
                  <td className="font-medium">
                    {agence.caBrut.toLocaleString('fr-FR')} F
                  </td>
                  <td
                    className="font-bold"
                    style={{ color: '#f26522' }}
                  >
                    {agence.commission.toLocaleString('fr-FR')} F
                    <span className="text-xs text-gray-400 font-normal ml-1">
                      ({agence.commissionRate}%)
                    </span>
                  </td>
                  <td>
                    <span
                      className="flex items-center gap-1 text-sm font-semibold"
                      style={{
                        color:
                          agence.croissance >= 0
                            ? '#22c55e'
                            : '#ef4444',
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
                    <ReversementBadge
                      status={agence.statutReversement}
                    />
                  </td>
                  <td>
                    <button
                      className="text-gray-400 hover:text-gray-600 transition"
                      title="Actions"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Affichage{' '}
            {filteredAgencies.length > 0
              ? (tablePage - 1) * ITEMS_PER_PAGE + 1
              : 0}
            –
            {Math.min(
              tablePage * ITEMS_PER_PAGE,
              filteredAgencies.length
            )}{' '}
            sur {filteredAgencies.length} agences
          </p>
          <div className="pagination">
            <button
              onClick={() => setTablePage((p) => Math.max(1, p - 1))}
              disabled={tablePage <= 1}
              className="disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from(
              { length: totalPages },
              (_, i) => i + 1
            )
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - tablePage) <= 1
              )
              .map((p, idx, arr) => (
                <span key={p}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && (
                    <span className="text-gray-400 text-sm mx-1">
                      ...
                    </span>
                  )}
                  <button
                    className={tablePage === p ? 'active' : ''}
                    onClick={() => setTablePage(p)}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() =>
                setTablePage((p) => Math.min(totalPages, p + 1))
              }
              disabled={tablePage >= totalPages}
              className="disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
