'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Plus,
  MoreHorizontal,
  Clock,
  ChevronRight,
  ChevronLeft,
  Loader2,
  MapPin,
} from 'lucide-react'
import { supabase, type ScheduledTrip } from '@/lib/supabase'

// ── Dates helpers ──────────────────────────────────────────
function generateDates() {
  const dates = []
  const today = new Date()
  for (let i = -3; i <= 30; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    dates.push(date)
  }
  return dates
}

const daysOfWeek = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function formatDateLabel(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)
  const diff = Math.round((checkDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  return null
}

function formatTime(datetime: string) {
  return new Date(datetime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Douala',
  })
}

function formatShortDate(datetime: string) {
  return new Date(datetime).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'Africa/Douala',
  })
}

function formatDuration(departure: string, arrival: string) {
  const dep = new Date(departure).getTime()
  const arr = new Date(arrival).getTime()
  const diff = arr - dep
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  return `${hours}h ${minutes.toString().padStart(2, '0')}m`
}

function formatDateFr(date: Date) {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
}

// ── Status Badge ───────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    actif: { label: 'Actif', color: '#22c55e' },
    inactif: { label: 'Inactif', color: '#6b7280' },
    termine: { label: 'Terminé', color: '#3b82f6' },
    annule: { label: 'Annulé', color: '#ef4444' },
  }
  const s = map[status] || { label: status, color: '#6b7280' }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

// Vérifie si un trajet est actuellement en cours de déplacement
function isTripInTransit(trip: ScheduledTrip): boolean {
  if (trip.status !== 'actif') return false
  const now = Date.now()
  const dep = new Date(trip.departure_datetime).getTime()
  const arr = new Date(trip.arrival_datetime).getTime()
  return now >= dep && now <= arr
}

// ══════════════════════════════════════════════════════════════
// PAGE PRINCIPALE
// ══════════════════════════════════════════════════════════════
export default function TrajetsPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<ScheduledTrip[]>([])
  const [selectedTrip, setSelectedTrip] = useState<ScheduledTrip | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [loadingTrips, setLoadingTrips] = useState(true)
  const [togglingStatus, setTogglingStatus] = useState(false)

  // Menu contextuel
  const [menuTripId, setMenuTripId] = useState<string | null>(null)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)
  const hasDragged = useRef(false)
  const dates = generateDates()

  // ── Charger les trajets pour la date sélectionnée ────────
  const loadTrips = useCallback(async () => {
    setLoadingTrips(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const dateStr = formatDateFr(selectedDate)
      const res = await fetch(`/api/scheduled-trips?date=${dateStr}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setTrips(data)
        if (data.length > 0) {
          setSelectedTrip(data[0])
        } else {
          setSelectedTrip(null)
        }
      }
    } catch {
      // silently fail
    } finally {
      setLoadingTrips(false)
    }
  }, [selectedDate])

  useEffect(() => {
    loadTrips()
  }, [loadTrips])

  // ── Toggle statut (activer/désactiver) ───────────────────
  const toggleTripStatus = async (trip: ScheduledTrip) => {
    setTogglingStatus(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const newStatus = trip.status === 'actif' ? 'inactif' : 'actif'
      const res = await fetch(`/api/scheduled-trips/${trip.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok) {
        await loadTrips()
      } else {
        const err = await res.json()
        alert(err.error || 'Erreur')
      }
    } catch {
      alert('Erreur réseau')
    } finally {
      setTogglingStatus(false)
      setMenuTripId(null)
    }
  }

  // ── Dates helpers ────────────────────────────────────────
  const isDateSelected = (date: Date) => date.toDateString() === selectedDate.toDateString()
  const isToday = (date: Date) => date.toDateString() === new Date().toDateString()
  const isPastDate = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -88 : 88
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Mouse drag
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true
    hasDragged.current = false
    startX.current = e.pageX - (scrollContainerRef.current?.offsetLeft || 0)
    scrollLeft.current = scrollContainerRef.current?.scrollLeft || 0
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grabbing'
      scrollContainerRef.current.style.userSelect = 'none'
    }
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return
    e.preventDefault()
    const x = e.pageX - (scrollContainerRef.current?.offsetLeft || 0)
    const walk = (x - startX.current) * 1.5
    if (Math.abs(walk) > 5) hasDragged.current = true
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = scrollLeft.current - walk
    }
  }
  const handleMouseUp = () => {
    isDragging.current = false
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab'
      scrollContainerRef.current.style.userSelect = ''
    }
  }
  const handleMouseLeave = () => {
    isDragging.current = false
    if (scrollContainerRef.current) {
      scrollContainerRef.current.style.cursor = 'grab'
      scrollContainerRef.current.style.userSelect = ''
    }
  }

  // Scroll to today on mount
  const todayRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    setTimeout(() => {
      if (todayRef.current && scrollContainerRef.current) {
        const container = scrollContainerRef.current
        const todayEl = todayRef.current
        const containerRect = container.getBoundingClientRect()
        const todayRect = todayEl.getBoundingClientRect()
        const cardFullWidth = 88
        const positionsBeforeToday = 2
        const scrollOffset = todayRect.left - containerRect.left - (positionsBeforeToday * cardFullWidth)
        container.scrollLeft += scrollOffset
      }
    }, 100)
  }, [])

  // ── Rendu ────────────────────────────────────────────────
  return (
    <div className="overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl lg:text-2xl font-bold" style={{ color: '#1a1d29' }}>
          Gestion des Trajets
        </h1>
        <Link
          href="/dashboard-agence/trajets/nouveau"
          className="flex items-center gap-2 px-4 lg:px-5 py-2 lg:py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
          style={{ background: '#1a1d29' }}
        >
          <Plus size={16} />
          Nouveau Trajet
        </Link>
      </div>

      {/* Date Carousel */}
      <div className="relative mb-8 flex items-center gap-2">
        <button
          onClick={() => scroll('left')}
          title="Dates précédentes"
          className="shrink-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition border border-gray-200"
        >
          <ChevronLeft size={16} className="text-gray-600" />
        </button>
        <div className="relative w-full min-w-0">
          <div
            ref={scrollContainerRef}
            className="flex gap-2 overflow-x-scroll scrollbar-hide py-2"
            style={{ cursor: 'grab' }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {dates.map((date, i) => {
              const label = formatDateLabel(date)
              const dayName = daysOfWeek[date.getDay()]
              const dayNum = date.getDate()
              const month = months[date.getMonth()]
              const selected = isDateSelected(date)
              const today = isToday(date)
              const isPast = isPastDate(date)

              return (
                <button
                  key={i}
                  ref={today ? todayRef : undefined}
                  onClick={() => { if (!hasDragged.current) setSelectedDate(date) }}
                  title={`${dayNum} ${month}`}
                  className={`shrink-0 flex flex-col items-center w-[80px] py-3 rounded-xl transition-all ${
                    selected
                      ? 'bg-[#1a1d29] text-white'
                      : today
                      ? 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                      : isPast
                      ? 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {label ? (
                    <span className="text-[10px] font-semibold mb-1">{label}</span>
                  ) : (
                    <span className="text-xs font-medium mb-1">{dayName}</span>
                  )}
                  <span className={`text-lg font-bold ${selected ? 'text-white' : isPast ? 'text-gray-400' : ''}`}>
                    {dayNum}
                  </span>
                  <span className={`text-[10px] ${selected ? 'text-gray-300' : 'text-gray-400'}`}>
                    {month}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <button
          onClick={() => scroll('right')}
          title="Dates suivantes"
          className="shrink-0 w-8 h-8 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition border border-gray-200"
        >
          <ChevronRight size={16} className="text-gray-600" />
        </button>
      </div>

      {/* Content: Trips list + Details */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Liste des trajets */}
        <div className="xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
              Trajets du jour
            </h2>
            <span className="text-sm text-gray-400">
              {trips.length} trajet{trips.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loadingTrips ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : trips.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center" style={{ border: '1px solid #f0f0f0' }}>
              <MapPin size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400 mb-4">Aucun trajet planifié pour cette date</p>
              <Link
                href="/dashboard-agence/trajets/nouveau"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
                style={{ background: '#7c3aed' }}
              >
                <Plus size={14} />
                Créer un trajet
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {trips.map((trip) => {
                const route = trip.routes
                if (!route) return null
                const bus = trip.buses
                const stopsCount = Array.isArray(route.stops) ? route.stops.length : 0

                return (
                  <div
                    key={trip.id}
                    onClick={() => setSelectedTrip(trip)}
                    className={`bg-white rounded-2xl p-5 cursor-pointer transition-all relative ${
                      selectedTrip?.id === trip.id ? 'ring-2 ring-purple-200' : ''
                    }`}
                    style={{ border: '1px solid #f0f0f0' }}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span
                          className="text-xs font-bold text-white px-3 py-1 rounded-md"
                          style={{ background: trip.status === 'actif' ? '#1a1d29' : '#9ca3af' }}
                        >
                          {route.departure_city.slice(0, 3).toUpperCase()} → {route.arrival_city.slice(0, 3).toUpperCase()}
                        </span>
                        <StatusBadge status={trip.status} />
                      </div>
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuTripId(menuTripId === trip.id ? null : trip.id)
                          }}
                          className="text-gray-300 hover:text-gray-500 transition"
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {menuTripId === trip.id && (
                          <div className="absolute right-0 top-8 bg-white shadow-lg rounded-xl border border-gray-100 z-20 py-1 w-44">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                toggleTripStatus(trip)
                              }}
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition"
                            >
                              {trip.status === 'actif' ? '🔴 Désactiver' : '🟢 Activer'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Route */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="shrink-0">
                        <p className="text-xl lg:text-2xl font-bold" style={{ color: '#1a1d29' }}>
                          {route.departure_city}
                        </p>
                        <p className="text-xs text-gray-400">{route.departure_location || ''}</p>
                        <p className="text-xs text-gray-400">Dep: {formatTime(trip.departure_datetime)}</p>
                      </div>

                      <div className="flex-1 mx-3 lg:mx-6 flex items-center min-w-0">
                        <div className="flex-1 relative">
                          <div className="w-full h-px bg-gray-200" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-3 py-1 rounded-lg">
                            <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                              <Clock size={10} />
                              <span>{formatDuration(trip.departure_datetime, trip.arrival_datetime)}</span>
                            </div>
                            <p className="text-[10px] text-gray-300 text-center">
                              {stopsCount > 0
                                ? `${stopsCount} arrêt${stopsCount > 1 ? 's' : ''}`
                                : 'Direct'}
                            </p>
                          </div>
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-300" />
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-300" />
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xl lg:text-2xl font-bold" style={{ color: '#1a1d29' }}>
                          {route.arrival_city}
                        </p>
                        <p className="text-xs text-gray-400">{route.arrival_location || ''}</p>
                        <p className="text-xs text-gray-400">Arr: {formatTime(trip.arrival_datetime)}</p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 flex-wrap gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {trip.driver_name && (
                          <>
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white"
                              style={{ background: '#7c3aed' }}
                            >
                              {trip.driver_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-xs text-gray-400 truncate">
                              {trip.driver_name}
                            </span>
                          </>
                        )}
                        {bus && (
                          <span className="text-xs text-gray-300 ml-2">
                            {bus.brand} {bus.model}
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold" style={{ color: '#1a1d29' }}>
                          {trip.base_price.toLocaleString()} FCFA
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {trip.available_seats_count} places en vente
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Détails du trajet sélectionné */}
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
          {selectedTrip && selectedTrip.routes ? (
            <>
              <h2 className="text-lg font-bold mb-6" style={{ color: '#1a1d29' }}>
                Détails — {selectedTrip.routes.departure_city} → {selectedTrip.routes.arrival_city}
              </h2>

              {/* Timeline */}
              <div className="flex flex-col gap-0">
                {/* Départ */}
                <TimelineItem
                  name={`${selectedTrip.routes.departure_city}${selectedTrip.routes.departure_location ? ` (${selectedTrip.routes.departure_location})` : ''}`}
                  label="Départ"
                  time={formatTime(selectedTrip.departure_datetime)}
                  date={formatShortDate(selectedTrip.departure_datetime)}
                  isFirst
                  hasNext={Array.isArray(selectedTrip.routes.stops) && selectedTrip.routes.stops.length > 0 || true}
                />

                {/* Arrêts intermédiaires */}
                {Array.isArray(selectedTrip.routes.stops) && selectedTrip.routes.stops.map((stop, i) => (
                  <TimelineItem
                    key={i}
                    name={`${stop.city}${stop.location ? ` (${stop.location})` : ''}`}
                    label="Arrêt"
                    hasNext
                  />
                ))}

                {/* Arrivée */}
                <TimelineItem
                  name={`${selectedTrip.routes.arrival_city}${selectedTrip.routes.arrival_location ? ` (${selectedTrip.routes.arrival_location})` : ''}`}
                  label="Terminus"
                  time={formatTime(selectedTrip.arrival_datetime)}
                  date={formatShortDate(selectedTrip.arrival_datetime)}
                  isTerminus
                />
              </div>

              {/* Infos complémentaires */}
              <div className="mt-6 space-y-3 text-xs border-t border-gray-100 pt-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Bus</span>
                  <span className="font-medium" style={{ color: '#1a1d29' }}>
                    {selectedTrip.buses ? `${selectedTrip.buses.brand} ${selectedTrip.buses.model} #${selectedTrip.buses.number}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chauffeur</span>
                  <span className="font-medium" style={{ color: '#1a1d29' }}>
                    {selectedTrip.driver_name || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Capacité totale</span>
                  <span className="font-medium" style={{ color: '#1a1d29' }}>
                    {selectedTrip.total_seats} places
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Places en vente</span>
                  <span className="font-bold text-purple-600">
                    {selectedTrip.available_seats_count}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Prix</span>
                  <span className="font-bold" style={{ color: '#1a1d29' }}>
                    {selectedTrip.base_price.toLocaleString()} FCFA
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3 mt-6 pt-4 border-t border-gray-100">
                {isTripInTransit(selectedTrip) && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-600 mb-1">
                    <MapPin size={14} className="shrink-0" />
                    <span className="font-medium">Ce trajet est actuellement en cours de déplacement.</span>
                  </div>
                )}
                <button
                  onClick={() => router.push(`/dashboard-agence/trajets/nouveau?edit=${selectedTrip.id}${isTripInTransit(selectedTrip) ? '&readonly=true' : ''}`)}
                  className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
                >
                  {isTripInTransit(selectedTrip) ? 'Voir l\'itinéraire' : 'Modifier itinéraire'}
                </button>
                {isTripInTransit(selectedTrip) ? (
                  <button
                    disabled
                    className="w-full py-2.5 text-sm font-semibold text-gray-400 border border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed flex items-center justify-center gap-2 opacity-60"
                  >
                    Bus en déplacement — action impossible
                  </button>
                ) : (
                  <button
                    onClick={() => toggleTripStatus(selectedTrip)}
                    disabled={togglingStatus}
                    className={`w-full py-2.5 text-sm font-semibold border rounded-xl transition flex items-center justify-center gap-2 ${
                      selectedTrip.status === 'actif'
                        ? 'text-red-500 border-red-200 hover:bg-red-50'
                        : 'text-green-600 border-green-200 hover:bg-green-50'
                    }`}
                  >
                    {togglingStatus && <Loader2 size={14} className="animate-spin" />}
                    {selectedTrip.status === 'actif' ? 'Suspendre le trajet' : 'Activer le trajet'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-10">
              <MapPin size={32} className="text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Sélectionnez un trajet pour voir les détails</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Composant Timeline ─────────────────────────────────────
function TimelineItem({
  name,
  label,
  time,
  date,
  isFirst,
  isTerminus,
  hasNext,
}: {
  name: string
  label: string
  time?: string
  date?: string
  isFirst?: boolean
  isTerminus?: boolean
  hasNext?: boolean
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div
          className={`w-3 h-3 rounded-full border-2 mt-1 ${
            isTerminus
              ? 'bg-gray-800 border-gray-800'
              : isFirst
              ? 'bg-white border-gray-400'
              : 'bg-white border-gray-300'
          }`}
        />
        {hasNext && !isTerminus && (
          <div className="w-px flex-1 bg-gray-200 my-1" />
        )}
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
          {time && (
            <div className="text-right">
              <span className="text-sm font-medium text-gray-500">{time}</span>
              {date && <p className="text-[10px] text-gray-400 mt-0.5">{date}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
