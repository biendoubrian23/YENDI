'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { TrendingUp, Users, Bus, AlertTriangle, ArrowUpRight, Clock, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface TodayTrip {
  id: string
  departure_datetime: string
  arrival_datetime: string
  status: string
  routes: { departure_city: string; arrival_city: string } | null
  buses: { number: string } | null
}

interface RevenueData {
  day: string
  revenue: number
  reservations_count: number
}

type FilterType = 'day' | 'week' | 'month' | '3months' | '6months' | 'year' | 'custom'

// Fonction pour calculer les dates de début et fin selon le filtre
function getDateRange(filter: FilterType, customStart?: string, customEnd?: string): { start: string; end: string } {
  const now = new Date()
  let start: Date
  let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

  switch (filter) {
    case 'day':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
      break
    case 'week':
      const dayOfWeek = now.getDay()
      const monday = new Date(now)
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0)
      break
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      break
    case '3months':
      start = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0)
      break
    case '6months':
      start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0)
      break
    case 'year':
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0)
      break
    case 'custom':
      if (customStart && customEnd) {
        start = new Date(customStart + 'T00:00:00')
        end = new Date(customEnd + 'T23:59:59')
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0)
      }
      break
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  }
}

export default function DashboardAgencePage() {
  const [filter, setFilter] = useState<FilterType>('week')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [showCustomCalendar, setShowCustomCalendar] = useState(false)
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [todayTrips, setTodayTrips] = useState<TodayTrip[]>([])
  const [loading, setLoading] = useState(true)

  const loadRevenueStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { start, end } = getDateRange(filter, customStartDate, customEndDate)
      
      const res = await fetch(
        `/api/stats/revenue?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`,
        { headers: { Authorization: `Bearer ${session.access_token}` } }
      )

      if (res.ok) {
        const data = await res.json()
        setRevenueData(data || [])
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err)
    } finally {
      setLoadingStats(false)
    }
  }, [filter, customStartDate, customEndDate])

  useEffect(() => {
    setLoadingStats(true)
    loadRevenueStats()
  }, [loadRevenueStats])

  const loadTodayTrips = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Récupérer les trajets du jour actuel
      const today = new Date()
      const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`
      
      const res = await fetch(`/api/scheduled-trips?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        const data = await res.json()
        // Filtrer et trier: trajets actifs du jour, triés par heure de départ
        const filtered = (data || [])
          .filter((t: TodayTrip) => t.status === 'actif')
          .sort((a: TodayTrip, b: TodayTrip) => 
            new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime()
          )
          .slice(0, 3) // Limiter à 3 trajets
        setTodayTrips(filtered)
      }
    } catch (err) {
      console.error('Erreur chargement trajets:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTodayTrips()
    // Rafraîchir toutes les minutes pour la progression
    const interval = setInterval(loadTodayTrips, 60000)
    return () => clearInterval(interval)
  }, [loadTodayTrips])

  // Calculer les stats à partir des données réelles
  const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0)
  const totalReservations = revenueData.reduce((sum, d) => sum + d.reservations_count, 0)
  const avgDailyRevenue = revenueData.length > 0 ? Math.round(totalRevenue / revenueData.length) : 0

  // Préparer les données pour le graphique avec TOUS les labels selon le filtre
  const prepareChartData = (): Array<{ label: string; revenue: number; reservations_count: number; date: string }> => {
    const now = new Date()
    const result: Array<{ label: string; revenue: number; reservations_count: number; date: string }> = []

    if (filter === 'day') {
      // 24 heures
      for (let h = 0; h < 24; h++) {
        const hourStr = `${h.toString().padStart(2, '0')}h`
        const hour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h)
        const dateStr = hour.toISOString().split('T')[0]
        
        // Trouver les données pour cette heure
        const dayData = revenueData.filter(d => {
          const dataDate = new Date(d.day)
          return dataDate.getHours() === h
        })
        const revenue = dayData.reduce((sum, d) => sum + d.revenue, 0)
        const reservations = dayData.reduce((sum, d) => sum + d.reservations_count, 0)
        
        result.push({ label: hourStr, revenue, reservations_count: reservations, date: dateStr })
      }
    } else if (filter === 'week') {
      // 7 jours de la semaine
      const monday = new Date(now)
      const dayOfWeek = now.getDay()
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
      
      const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
      for (let i = 0; i < 7; i++) {
        const day = new Date(monday)
        day.setDate(monday.getDate() + i)
        const dateStr = day.toISOString().split('T')[0]
        const dayLabel = `${days[i]} ${day.getDate()}/${day.getMonth() + 1}`
        
        const dayData = revenueData.find(d => d.day === dateStr)
        result.push({
          label: dayLabel,
          revenue: dayData?.revenue || 0,
          reservations_count: dayData?.reservations_count || 0,
          date: dateStr
        })
      }
    } else if (filter === 'month') {
      // Tous les jours du mois
      const year = now.getFullYear()
      const month = now.getMonth()
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      
      for (let d = 1; d <= daysInMonth; d++) {
        const day = new Date(year, month, d)
        const dateStr = day.toISOString().split('T')[0]
        const dayData = revenueData.find(rd => rd.day === dateStr)
        
        result.push({
          label: `${d}`,
          revenue: dayData?.revenue || 0,
          reservations_count: dayData?.reservations_count || 0,
          date: dateStr
        })
      }
    } else if (filter === '3months' || filter === '6months') {
      // Grouper par semaine
      const monthsBack = filter === '3months' ? 3 : 6
      const start = new Date(now.getFullYear(), now.getMonth() - monthsBack + 1, 1)
      const weeks = []
      
      let currentWeek = new Date(start)
      while (currentWeek <= now) {
        const weekStart = new Date(currentWeek)
        const weekEnd = new Date(currentWeek)
        weekEnd.setDate(currentWeek.getDate() + 6)
        
        const weekData = revenueData.filter(d => {
          const date = new Date(d.day)
          return date >= weekStart && date <= weekEnd
        })
        
        const revenue = weekData.reduce((sum, d) => sum + d.revenue, 0)
        const reservations = weekData.reduce((sum, d) => sum + d.reservations_count, 0)
        
        weeks.push({
          label: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
          revenue,
          reservations_count: reservations,
          date: weekStart.toISOString().split('T')[0]
        })
        
        currentWeek.setDate(currentWeek.getDate() + 7)
      }
      return weeks
    } else if (filter === 'year') {
      // 12 mois
      const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(now.getFullYear(), m, 1)
        const monthEnd = new Date(now.getFullYear(), m + 1, 0)
        const monthStartStr = monthStart.toISOString().split('T')[0]
        const monthEndStr = monthEnd.toISOString().split('T')[0]
        
        const monthData = revenueData.filter(d => d.day >= monthStartStr && d.day <= monthEndStr)
        const revenue = monthData.reduce((sum, d) => sum + d.revenue, 0)
        const reservations = monthData.reduce((sum, d) => sum + d.reservations_count, 0)
        
        result.push({
          label: months[m],
          revenue,
          reservations_count: reservations,
          date: monthStartStr
        })
      }
    } else {
      // Custom ou pas de données - utiliser les données brutes
      return revenueData.map(d => ({
        label: new Date(d.day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        revenue: d.revenue,
        reservations_count: d.reservations_count,
        date: d.day
      }))
    }

    return result
  }

  const chartData = prepareChartData()
  const maxValue = chartData.length > 0 ? Math.max(...chartData.map(d => d.revenue), 1) : 1
  
  // Calculer les paliers pour l'axe Y (5 paliers)
  const yAxisSteps = 5
  const stepValue = Math.ceil(maxValue / yAxisSteps / 1000) * 1000 // Arrondir au millier
  const yAxisLabels = Array.from({ length: yAxisSteps + 1 }, (_, i) => stepValue * i)
  const yAxisMax = yAxisLabels[yAxisLabels.length - 1] || 1 // Valeur max de l'axe Y pour le calcul des hauteurs

  const statsCards: Array<{
    label: string
    value: string
    change?: string | null
    changeType?: string | null
    icon?: React.ComponentType<{ size?: number; style?: React.CSSProperties }> | null
    iconColor?: string
    accentColor?: string
    hasBorder: boolean
    badge?: string | null
    badgeColor?: string | null
    sub?: string | null
    progress?: number | null
    progressColor?: string | null
  }> = [
    {
      label: filter === 'day' ? 'Revenu Journalier' : 'Revenu Total',
      value: `${totalRevenue.toLocaleString()} FCFA`,
      change: null,
      changeType: null,
      icon: null,
      accentColor: '#7c3aed',
      hasBorder: true,
    },
    {
      label: 'Réservations',
      value: totalReservations.toString(),
      change: null,
      changeType: null,
      icon: Users,
      iconColor: '#3b82f6',
      hasBorder: false,
    },
    {
      label: 'Revenu Moyen/Jour',
      value: `${avgDailyRevenue.toLocaleString()} FCFA`,
      change: null,
      icon: TrendingUp,
      iconColor: '#10b981',
      hasBorder: false,
    },
    {
      label: 'Jours Actifs',
      value: revenueData.filter(d => d.revenue > 0).length.toString(),
      badge: null,
      badgeColor: null,
      icon: Calendar,
      iconColor: '#f26522',
      hasBorder: false,
    },
  ]

  // Calculer la progression du trajet en %
  const getTripProgress = (departure: string, arrival: string): number => {
    const now = Date.now()
    const depTime = new Date(departure).getTime()
    const arrTime = new Date(arrival).getTime()
    
    if (now < depTime) return 0 // Pas encore parti
    if (now > arrTime) return 100 // Déjà arrivé
    
    const elapsed = now - depTime
    const total = arrTime - depTime
    return Math.round((elapsed / total) * 100)
  }

  const formatTime = (datetime: string) => {
    return new Date(datetime).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Africa/Douala',
    })
  }

  return (
    <div>
      {/* Titre */}
      <h1 className="text-3xl font-bold pb-6 mb-6" style={{ color: '#1a1d29', borderBottom: '1px solid #e5e7eb' }}>
        Vue d&apos;ensemble
      </h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {statsCards.map((card, i) => (
          <div
            key={i}
            className="bg-white rounded-2xl p-5 relative"
            style={{
              border: '1px solid #f0f0f0',
              borderLeft: card.hasBorder ? '4px solid #7c3aed' : '1px solid #f0f0f0',
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                {card.label}
              </p>
              {card.change && (
                <span className="flex items-center gap-0.5 text-xs font-semibold text-green-500">
                  <TrendingUp size={12} />
                  {card.change}
                </span>
              )}
              {card.icon && (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${card.iconColor}12` }}
                >
                  <card.icon size={16} style={{ color: card.iconColor }} />
                </div>
              )}
              {card.badge && (
                <span
                  className="text-[10px] font-bold px-2 py-1 rounded-md text-white"
                  style={{ background: card.badgeColor || undefined }}
                >
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-3xl font-extrabold" style={{ color: '#1a1d29' }}>
              {card.value}
              {card.sub && <span className="text-lg font-medium text-gray-300">{card.sub}</span>}
            </p>
            {card.progress && (
              <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full"
                  style={{ width: `${card.progress}%`, background: '#3b82f6' }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Performance des ventes + Planification */}
      <div className="grid grid-cols-3 gap-5">
        {/* Graphique des ventes */}
        <div className="col-span-2 bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
              Performances des ventes
            </h2>
          </div>

          {/* Filtres */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {(['day', 'week', 'month', '3months', '6months', 'year'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f)
                  setShowCustomCalendar(false)
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                  filter === f && !showCustomCalendar
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'day' && 'Jour'}
                {f === 'week' && 'Semaine'}
                {f === 'month' && 'Mois'}
                {f === '3months' && '3 Mois'}
                {f === '6months' && '6 Mois'}
                {f === 'year' && 'Année'}
              </button>
            ))}
            <button
              onClick={() => setShowCustomCalendar(!showCustomCalendar)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition flex items-center gap-1 ${
                showCustomCalendar
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Calendar size={12} />
              Personnalisé
            </button>
          </div>

          {/* Calendrier personnalisé */}
          {showCustomCalendar && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Date début</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 block mb-1">Date fin</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none"
                />
              </div>
              <button
                onClick={() => {
                  if (customStartDate && customEndDate) {
                    setFilter('custom')
                    setLoadingStats(true)
                    loadRevenueStats()
                  }
                }}
                disabled={!customStartDate || !customEndDate}
                className="px-4 py-1.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition mt-5"
              >
                Appliquer
              </button>
            </div>
          )}

          {/* Bar chart */}
          {loadingStats ? (
            <div className="flex items-center justify-center h-[350px]">
              <Clock size={24} className="animate-spin text-gray-400" />
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-[350px]">
              <p className="text-sm text-gray-400">Aucune donnée pour cette période</p>
            </div>
          ) : (
            <>
            <div className="flex gap-3 px-2">
              {/* Axe Y */}
              <div className="flex flex-col justify-between text-xs text-gray-500 pr-2 border-r border-gray-200 min-w-[50px]" style={{ height: '300px' }}>
                {[...yAxisLabels].reverse().map((value, idx) => (
                  <div key={idx} className="text-right">
                    {value.toLocaleString()}
                  </div>
                ))}
              </div>

              {/* Barres du graphique */}
              <div className="flex-1 flex items-end gap-1" style={{ height: '300px', overflow: 'visible' }}>
                {chartData.map((item, idx) => {
                  const barHeight = yAxisMax > 0 ? (item.revenue / yAxisMax) * 300 : 0
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center min-w-[30px]">
                      {/* Zone de la barre */}
                      <div className="w-full flex items-end justify-center relative group" style={{ height: '300px' }}>
                        {/* Tooltip au hover */}
                        {item.revenue > 0 && (
                          <div 
                            className="absolute left-1/2 -translate-x-1/2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none"
                            style={{ bottom: `${barHeight + 8}px` }}
                          >
                            <div className="bg-gray-900 text-white px-3 py-2 rounded-lg text-xs whitespace-nowrap shadow-lg">
                              <div className="font-semibold">{item.label}</div>
                              <div>{item.revenue.toLocaleString()} FCFA</div>
                              <div>{item.reservations_count} réservation{item.reservations_count > 1 ? 's' : ''}</div>
                            </div>
                            <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
                          </div>
                        )}
                        
                        {/* Barre */}
                        <div 
                          className="w-full max-w-[40px] rounded-t hover:opacity-80 transition-all cursor-pointer"
                          style={{ 
                            height: `${barHeight}px`, 
                            minHeight: item.revenue > 0 ? '4px' : '0px',
                            background: 'linear-gradient(to top, #8b5cf6, #c4b5fd)'
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Labels X - en dessous du graphique */}
            <div className="flex gap-3 px-2 mt-2">
              <div className="min-w-[50px] pr-2" />
              <div className="flex-1 flex gap-1">
                {chartData.map((item, idx) => (
                  <div key={idx} className="flex-1 text-center min-w-[30px]">
                    <span className="text-xs text-gray-600 font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
            </>
          )}
        </div>

        {/* Planification ce soir */}
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
          <h2 className="text-lg font-bold mb-6" style={{ color: '#1a1d29' }}>
            Trajets du jour
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Clock size={24} className="animate-spin text-gray-400" />
            </div>
          ) : todayTrips.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">Aucun trajet prévu aujourd&apos;hui</p>
          ) : (
            <div className="flex flex-col gap-5">
              {todayTrips.map((trip, i) => {
                const progress = getTripProgress(trip.departure_datetime, trip.arrival_datetime)
                const route = trip.routes
                const bus = trip.buses
                
                return (
                  <div key={trip.id}>
                    <div className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-2.5 h-2.5 rounded-full mt-1"
                          style={{ background: progress > 0 ? '#3b82f6' : '#d1d5db' }}
                        />
                        {i < todayTrips.length - 1 && (
                          <div className="w-px flex-1 bg-gray-100 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-1">
                        <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>
                          {route?.departure_city || '?'} → {route?.arrival_city || '?'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Départ: {formatTime(trip.departure_datetime)} • {bus?.number ? `Bus #${bus.number}` : 'Bus'}
                        </p>
                        {progress > 0 && progress < 100 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-semibold text-blue-500">
                                En cours
                              </span>
                              <span className="text-[10px] font-medium text-gray-400">
                                {progress}%
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-blue-500 transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <Link 
            href="/dashboard-agence/trajets"
            className="block w-full mt-6 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition text-center"
          >
            Voir tout le planning
          </Link>
        </div>
      </div>
    </div>
  )
}
