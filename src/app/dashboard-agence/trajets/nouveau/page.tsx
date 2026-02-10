'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Plus,
  Clock,
  AlertCircle,
  Bus,
  X,
  MapPin,
  Loader2,
} from 'lucide-react'
import { supabase, CAMEROON_CITIES, type BusItem, type RouteStop } from '@/lib/supabase'

// Chauffeurs mockés (temporaire — sera géré dans Équipe & Droits)
const mockDrivers = [
  { id: '1', name: 'Jean-Paul Kamga' },
  { id: '2', name: 'Emmanuel Ndjock' },
  { id: '3', name: 'Pierre Tchinda' },
  { id: '4', name: 'Samuel Fotso' },
]

// Composant TimePicker avec selects (pas de scroll infini)
function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':')
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'))

  return (
    <div className="flex items-center gap-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl bg-white">
      <select
        value={h || '06'}
        onChange={(e) => onChange(`${e.target.value}:${m || '00'}`)}
        title="Heure"
        className="flex-1 text-sm font-medium outline-none bg-transparent text-center appearance-none cursor-pointer"
      >
        {hours.map((hr) => (
          <option key={hr} value={hr}>{hr}h</option>
        ))}
      </select>
      <span className="text-gray-300 font-bold">:</span>
      <select
        value={m || '00'}
        onChange={(e) => onChange(`${h || '06'}:${e.target.value}`)}
        title="Minutes"
        className="flex-1 text-sm font-medium outline-none bg-transparent text-center appearance-none cursor-pointer"
      >
        {minutes.map((min) => (
          <option key={min} value={min}>{min}</option>
        ))}
      </select>
    </div>
  )
}

export default function NouveauTrajetPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editTripId = searchParams.get('edit')
  const isEditMode = !!editTripId

  // Form state
  const [departureCity, setDepartureCity] = useState('')
  const [departureLocation, setDepartureLocation] = useState('')
  const [arrivalCity, setArrivalCity] = useState('')
  const [arrivalLocation, setArrivalLocation] = useState('')
  const [stops, setStops] = useState<RouteStop[]>([])
  const [departureDate, setDepartureDate] = useState('')
  const [departureTime, setDepartureTime] = useState('06:00')
  const [arrivalDate, setArrivalDate] = useState('')
  const [arrivalTime, setArrivalTime] = useState('10:00')
  const [selectedBusId, setSelectedBusId] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [basePrice, setBasePrice] = useState('')
  const [availableSeatsCount, setAvailableSeatsCount] = useState('')

  // Edit mode state
  const [editRouteId, setEditRouteId] = useState<string | null>(null)

  // Data state
  const [buses, setBuses] = useState<BusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState('')

  // Disponibilité du bus
  const [busAvailability, setBusAvailability] = useState<{
    available: boolean
    reason?: string
    last_position?: string | null
  } | null>(null)
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const selectedBus = buses.find(b => b.id === selectedBusId)
  const selectedDriver = mockDrivers.find(d => d.id === selectedDriverId)

  // Vérifier la disponibilité du bus quand les paramètres changent
  useEffect(() => {
    if (!selectedBusId || !departureDate || !departureTime || !arrivalDate || !arrivalTime) {
      setBusAvailability(null)
      return
    }

    const checkAvailability = async () => {
      setCheckingAvailability(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const dep = `${departureDate}T${departureTime}:00+01:00`
        const arr = `${arrivalDate}T${arrivalTime}:00+01:00`

        let url = `/api/buses/availability?bus_id=${selectedBusId}&departure=${encodeURIComponent(dep)}&arrival=${encodeURIComponent(arr)}`
        if (departureCity) url += `&departure_city=${encodeURIComponent(departureCity)}`
        if (isEditMode && editTripId) url += `&exclude_trip=${editTripId}`

        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setBusAvailability(data)
        }
      } catch {
        // silently fail
      } finally {
        setCheckingAvailability(false)
      }
    }

    // Debounce
    const timer = setTimeout(checkAvailability, 500)
    return () => clearTimeout(timer)
  }, [selectedBusId, departureDate, departureTime, arrivalDate, arrivalTime, departureCity, isEditMode, editTripId])

  // Charger les bus de l'agence
  useEffect(() => {
    const loadBuses = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch('/api/buses/list', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          // En mode édition, on charge tous les bus (pas seulement disponibles)
          // car le bus déjà affecté peut être "en route"
          if (isEditMode) {
            setBuses(data)
          } else {
            setBuses(data.filter((b: BusItem) => b.status === 'disponible'))
          }
        }
      } catch {
        // silently fail
      } finally {
        if (!isEditMode) setLoading(false)
      }
    }
    loadBuses()
  }, [isEditMode])

  // Charger les données existantes en mode édition
  useEffect(() => {
    if (!editTripId) {
      setLoading(false)
      return
    }
    const loadTrip = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch(`/api/scheduled-trips/${editTripId}`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (res.ok) {
          const trip = await res.json()
          const route = trip.routes

          // Pré-remplir les champs route
          if (route) {
            setEditRouteId(route.id)
            setDepartureCity(route.departure_city || '')
            setDepartureLocation(route.departure_location || '')
            setArrivalCity(route.arrival_city || '')
            setArrivalLocation(route.arrival_location || '')
            setStops(Array.isArray(route.stops) ? route.stops : [])
          }

          // Pré-remplir dates et heures (en heure locale Cameroun)
          if (trip.departure_datetime) {
            const dep = new Date(trip.departure_datetime)
            // Extraire date et heure en timezone Africa/Douala
            const depLocal = dep.toLocaleString('sv-SE', { timeZone: 'Africa/Douala' })
            setDepartureDate(depLocal.split(' ')[0])
            setDepartureTime(depLocal.split(' ')[1].slice(0, 5))
          }
          if (trip.arrival_datetime) {
            const arr = new Date(trip.arrival_datetime)
            const arrLocal = arr.toLocaleString('sv-SE', { timeZone: 'Africa/Douala' })
            setArrivalDate(arrLocal.split(' ')[0])
            setArrivalTime(arrLocal.split(' ')[1].slice(0, 5))
          }

          // Bus & chauffeur
          if (trip.bus_id) setSelectedBusId(trip.bus_id)
          if (trip.driver_name) {
            const driver = mockDrivers.find(d => d.name === trip.driver_name)
            if (driver) setSelectedDriverId(driver.id)
          }

          // Tarif & places
          if (trip.base_price) setBasePrice(trip.base_price.toString())
          if (trip.available_seats_count) setAvailableSeatsCount(trip.available_seats_count.toString())
        }
      } catch {
        setError('Impossible de charger le trajet')
      } finally {
        setLoading(false)
      }
    }
    loadTrip()
  }, [editTripId])

  // Auto-set arrival date = departure date si pas encore définie
  useEffect(() => {
    if (departureDate && !arrivalDate) {
      setArrivalDate(departureDate)
    }
  }, [departureDate, arrivalDate])

  const addStop = () => {
    setStops([...stops, { city: '', location: '' }])
  }

  const removeStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index))
  }

  const updateStop = (index: number, field: keyof RouteStop, value: string) => {
    const updated = [...stops]
    updated[index] = { ...updated[index], [field]: value }
    setStops(updated)
  }

  const handlePublish = async () => {
    setError('')

    // Validations
    if (!departureCity) return setError('Sélectionnez une ville de départ')
    if (!arrivalCity) return setError('Sélectionnez une ville d\'arrivée')
    if (departureCity === arrivalCity) return setError('Départ et arrivée doivent être différents')
    if (!departureDate) return setError('Sélectionnez une date de départ')
    if (!departureTime) return setError('Sélectionnez une heure de départ')
    if (!arrivalDate) return setError('Sélectionnez une date d\'arrivée')
    if (!arrivalTime) return setError('Sélectionnez une heure d\'arrivée')
    if (!selectedBusId) return setError('Sélectionnez un véhicule')
    if (busAvailability && !busAvailability.available) {
      return setError(busAvailability.reason || 'Ce bus n\'est pas disponible pour ce créneau')
    }
    if (!basePrice || parseInt(basePrice) <= 0) return setError('Le prix doit être supérieur à 0')
    if (!availableSeatsCount || parseInt(availableSeatsCount) <= 0) return setError('Le nombre de places doit être supérieur à 0')
    if (selectedBus && parseInt(availableSeatsCount) > selectedBus.seats) {
      return setError(`Le nombre de places ne peut pas dépasser ${selectedBus.seats}`)
    }

    setPublishing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non connecté')

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      }

      // +01:00 = Africa/Douala (Cameroun)
      const departureDatetime = `${departureDate}T${departureTime}:00+01:00`
      const arrivalDatetime = `${arrivalDate}T${arrivalTime}:00+01:00`

      if (isEditMode && editTripId) {
        // ── MODE ÉDITION : PUT pour mettre à jour ──
        const res = await fetch(`/api/scheduled-trips/${editTripId}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({
            route_id: editRouteId,
            route_data: {
              departure_city: departureCity,
              departure_location: departureLocation || null,
              arrival_city: arrivalCity,
              arrival_location: arrivalLocation || null,
              stops: stops.filter(s => s.city),
            },
            bus_id: selectedBusId,
            departure_datetime: departureDatetime,
            arrival_datetime: arrivalDatetime,
            driver_name: selectedDriver?.name || null,
            base_price: parseInt(basePrice),
            available_seats_count: parseInt(availableSeatsCount),
          }),
        })

        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Erreur lors de la mise à jour')
        }
      } else {
        // ── MODE CRÉATION : POST route + trip ──
        // 1. Créer la route
        const routeRes = await fetch('/api/routes', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            departure_city: departureCity,
            departure_location: departureLocation || null,
            arrival_city: arrivalCity,
            arrival_location: arrivalLocation || null,
            stops: stops.filter(s => s.city),
          }),
        })

        if (!routeRes.ok) {
          const err = await routeRes.json()
          throw new Error(err.error || 'Erreur lors de la création de la route')
        }

        const route = await routeRes.json()

        // 2. Créer le trajet planifié
        const tripRes = await fetch('/api/scheduled-trips', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            route_id: route.id,
            bus_id: selectedBusId,
            departure_datetime: departureDatetime,
            arrival_datetime: arrivalDatetime,
            driver_name: selectedDriver?.name || null,
            base_price: parseInt(basePrice),
            available_seats_count: parseInt(availableSeatsCount),
          }),
        })

        if (!tripRes.ok) {
          const err = await tripRes.json()
          throw new Error(err.error || 'Erreur lors de la création du trajet')
        }
      }

      router.push('/dashboard-agence/trajets')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      setError(message)
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard-agence/trajets" className="text-gray-400 hover:text-gray-600 text-sm transition">
              ← Trajets
            </Link>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a1d29' }}>
            {isEditMode ? 'Modifier le Trajet' : 'Planification de Voyage'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard-agence/trajets"
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
          >
            Annuler
          </Link>
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            style={{ background: '#1a1d29' }}
          >
            {publishing && <Loader2 size={14} className="animate-spin" />}
            {isEditMode ? 'Enregistrer' : 'Publier le trajet'}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-sm text-red-600">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="flex gap-6">
        {/* Form */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* 01 - Itinéraire */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-bold text-gray-400">01</span>
              <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>Itinéraire</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              {/* Départ */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Ville de départ
                </label>
                <select
                  value={departureCity}
                  onChange={(e) => setDepartureCity(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition"
                >
                  <option value="">Choisir une ville...</option>
                  {CAMEROON_CITIES.map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>

              {/* Arrivée */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Ville d&apos;arrivée
                </label>
                <select
                  value={arrivalCity}
                  onChange={(e) => setArrivalCity(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition"
                >
                  <option value="">Choisir une ville...</option>
                  {CAMEROON_CITIES.filter(c => c !== departureCity).map((city) => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Localisations précises */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Lieu précis de départ
                </label>
                <input
                  type="text"
                  value={departureLocation}
                  onChange={(e) => setDepartureLocation(e.target.value)}
                  placeholder="Ex: Gare routière de Bonabéri"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Lieu précis d&apos;arrivée
                </label>
                <input
                  type="text"
                  value={arrivalLocation}
                  onChange={(e) => setArrivalLocation(e.target.value)}
                  placeholder="Ex: Gare routière de Mvan"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                />
              </div>
            </div>

            {/* Arrêts intermédiaires */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                  Arrêts intermédiaires (optionnel)
                </label>
                <button
                  onClick={addStop}
                  className="text-xs font-semibold flex items-center gap-1 transition hover:opacity-80"
                  style={{ color: '#7c3aed' }}
                >
                  <Plus size={14} />
                  Ajouter un arrêt
                </button>
              </div>

              {stops.length === 0 && (
                <p className="text-xs text-gray-400 italic">
                  Pas d&apos;arrêt intermédiaire — trajet direct
                </p>
              )}

              <div className="space-y-3">
                {stops.map((stop, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 flex-wrap sm:flex-nowrap">
                    <MapPin size={14} className="text-gray-400 shrink-0" />
                    <select
                      value={stop.city}
                      onChange={(e) => updateStop(i, 'city', e.target.value)}
                      className="flex-1 min-w-[140px] px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
                    >
                      <option value="">Choisir une ville...</option>
                      {CAMEROON_CITIES
                        .filter(c => c !== departureCity && c !== arrivalCity)
                        .map((city) => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                    </select>
                    <input
                      type="text"
                      value={stop.location || ''}
                      onChange={(e) => updateStop(i, 'location', e.target.value)}
                      placeholder="Lieu précis (optionnel)"
                      className="flex-1 min-w-[140px] px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm outline-none"
                    />
                    <button
                      onClick={() => removeStop(i)}
                      className="text-gray-400 hover:text-red-500 transition shrink-0"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 02 - Horaires & Dates */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-bold text-gray-400">02</span>
              <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>Horaires & Dates</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Date de départ
                </label>
                <input
                  type="date"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Heure de départ
                </label>
                <TimePicker value={departureTime} onChange={setDepartureTime} />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Date d&apos;arrivée (estimée)
                </label>
                <input
                  type="date"
                  value={arrivalDate}
                  onChange={(e) => setArrivalDate(e.target.value)}
                  min={departureDate || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Heure d&apos;arrivée (estimée)
                </label>
                <TimePicker value={arrivalTime} onChange={setArrivalTime} />
              </div>
            </div>
          </div>

          {/* 03 - Affectation Véhicule & Chauffeur */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-bold text-gray-400">03</span>
              <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>Véhicule & Chauffeur</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Véhicule */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                  Véhicule
                </label>
                {buses.length === 0 ? (
                  <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl">
                    Aucun véhicule disponible. Créez d&apos;abord un bus dans Flotte & Bus.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {buses.map((bus) => (
                      <label
                        key={bus.id}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${
                          selectedBusId === bus.id
                            ? 'border-purple-300 bg-purple-50'
                            : 'border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <input
                          type="radio"
                          name="bus"
                          value={bus.id}
                          checked={selectedBusId === bus.id}
                          onChange={(e) => {
                            setSelectedBusId(e.target.value)
                            setAvailableSeatsCount('')
                            setBusAvailability(null)
                          }}
                          className="sr-only"
                        />
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-100">
                          <Bus size={14} className="text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: '#1a1d29' }}>
                            {bus.brand} {bus.model} #{bus.number}
                            {selectedBusId === bus.id && (
                              <span className="ml-2 text-purple-500">●</span>
                            )}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {bus.seats} places • {bus.plate}
                            {bus.is_vip && ' • VIP'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}

                {/* Alerte disponibilité bus */}
                {checkingAvailability && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl flex items-center gap-2 text-xs text-gray-400">
                    <Loader2 size={12} className="animate-spin" />
                    Vérification de la disponibilité...
                  </div>
                )}
                {busAvailability && !busAvailability.available && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-xs text-red-600">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Bus indisponible</p>
                      <p className="mt-0.5">{busAvailability.reason}</p>
                    </div>
                  </div>
                )}
                {busAvailability && busAvailability.available && busAvailability.last_position && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-xs text-blue-600">
                    <MapPin size={14} className="shrink-0 mt-0.5" />
                    <p>Dernière position connue : <span className="font-semibold">{busAvailability.last_position}</span></p>
                  </div>
                )}
              </div>

              {/* Chauffeur */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                  Chauffeur
                </label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition"
                >
                  <option value="">Sélectionner un chauffeur...</option>
                  {mockDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 mt-2 italic">
                  Les chauffeurs seront gérés dans Équipe & Droits (à venir)
                </p>
              </div>
            </div>
          </div>

          {/* 04 - Tarification & Places */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-bold text-gray-400">04</span>
              <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>Tarification & Places</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prix */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Prix du billet
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="5000"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-bold outline-none focus:border-gray-400 pr-16"
                    style={{ color: '#1a1d29' }}
                    min="0"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400 font-medium">
                    FCFA
                  </span>
                </div>
              </div>

              {/* Places disponibles */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Places mises en vente
                </label>
                <input
                  type="number"
                  value={availableSeatsCount}
                  onChange={(e) => setAvailableSeatsCount(e.target.value)}
                  placeholder={selectedBus ? `Max: ${selectedBus.seats}` : 'Sélectionnez un bus'}
                  disabled={!selectedBusId}
                  max={selectedBus?.seats}
                  min="1"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-xl font-bold outline-none focus:border-gray-400 disabled:bg-gray-50 disabled:text-gray-300"
                  style={{ color: selectedBusId ? '#1a1d29' : undefined }}
                />
                {selectedBus && (
                  <p className="text-[10px] text-gray-400 mt-1">
                    Capacité totale du bus : {selectedBus.seats} places
                    {availableSeatsCount && parseInt(availableSeatsCount) > 0 && (
                      <> — <span className="font-semibold text-purple-600">{availableSeatsCount} places seront mises en ligne</span></>
                    )}
                  </p>
                )}
              </div>
            </div>

            {/* Yield management placeholder */}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                <p className="text-xs text-gray-400">
                  <span className="font-semibold">Yield Management</span> — Fonctionnalité à venir. Les prix dynamiques seront disponibles prochainement.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar - Aperçu Billet */}
        <div className="w-[280px] flex-shrink-0 hidden xl:block">
          <div className="sticky top-24 space-y-5">
            {/* Ticket preview */}
            <div className="bg-gray-900 text-white rounded-2xl p-5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Aperçu Billet
              </p>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xl font-extrabold">
                    {departureCity ? departureCity.slice(0, 3).toUpperCase() : '---'}
                  </p>
                  <p className="text-[10px] text-gray-400">{departureTime || '--:--'}</p>
                </div>
                <div className="flex items-center gap-2 text-gray-500">
                  <div className="w-6 h-px bg-gray-600" />
                  <Bus size={14} />
                  <div className="w-6 h-px bg-gray-600" />
                </div>
                <div className="text-right">
                  <p className="text-xl font-extrabold">
                    {arrivalCity ? arrivalCity.slice(0, 3).toUpperCase() : '---'}
                  </p>
                  <p className="text-[10px] text-gray-400">{arrivalTime || '--:--'}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs border-t border-gray-700 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Date</span>
                  <span className="font-medium">{departureDate || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Bus</span>
                  <span className="font-medium truncate ml-2">
                    {selectedBus ? `${selectedBus.brand} ${selectedBus.model}` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Chauffeur</span>
                  <span className="font-medium">{selectedDriver?.name || '—'}</span>
                </div>
                {stops.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Arrêts</span>
                    <span className="font-medium">{stops.filter(s => s.city).length}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-400">Capacité totale</span>
                  <span className="text-lg font-extrabold">{selectedBus?.seats || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Places en vente</span>
                  <span className="text-lg font-extrabold text-purple-400">
                    {availableSeatsCount || '—'}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                  <span className="text-gray-400">Prix</span>
                  <span className="text-xl font-extrabold">
                    {basePrice ? `${parseInt(basePrice).toLocaleString()} FCFA` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
              <p className="text-sm font-bold mb-3" style={{ color: '#1a1d29' }}>Checklist</p>
              <div className="space-y-2.5">
                {[
                  { ok: !!departureCity && !!arrivalCity, label: 'Itinéraire défini' },
                  { ok: !!departureDate && !!departureTime, label: 'Date et heure de départ' },
                  { ok: !!arrivalDate && !!arrivalTime, label: 'Date et heure d\'arrivée' },
                  { ok: !!selectedBusId, label: 'Véhicule sélectionné' },
                  { ok: !!basePrice && parseInt(basePrice) > 0, label: 'Prix défini' },
                  { ok: !!availableSeatsCount && parseInt(availableSeatsCount) > 0, label: 'Places configurées' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ background: item.ok ? '#22c55e' : '#e5e7eb' }}
                    />
                    <span className={item.ok ? 'text-gray-700' : 'text-gray-400'}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
