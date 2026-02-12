'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Bus, Download, Loader2, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface RouteInfo {
  departure_city: string
  departure_location?: string
  arrival_city: string
  arrival_location?: string
  stops?: { city: string; location?: string }[]
}

interface TripHistory {
  id: string
  departure_datetime: string
  arrival_datetime: string
  driver_id: string | null
  base_price: number
  total_seats: number
  available_seats_count: number
  status: string
  routes: RouteInfo | null
  drivers: { first_name: string; last_name: string } | null
}

interface BusInfo {
  id: string
  brand: string
  model: string
  number: string
}

function formatDateFr(datetime: string) {
  return new Date(datetime).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Africa/Douala',
  })
}

function formatTimeFr(datetime: string) {
  return new Date(datetime).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Douala',
  })
}

function statusLabel(status: string) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    actif: { label: 'Actif', color: '#22c55e', bg: '#f0fdf4' },
    inactif: { label: 'Inactif', color: '#6b7280', bg: '#f9fafb' },
    termine: { label: 'Terminé', color: '#3b82f6', bg: '#eff6ff' },
    annule: { label: 'Annulé', color: '#ef4444', bg: '#fef2f2' },
  }
  return map[status] || { label: status, color: '#6b7280', bg: '#f9fafb' }
}

export default function HistoriqueBusPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: busId } = use(params)
  const [bus, setBus] = useState<BusInfo | null>(null)
  const [trips, setTrips] = useState<TripHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const res = await fetch(`/api/buses/${busId}/trips`, {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (res.ok) {
          const data = await res.json()
          setBus(data.bus)
          setTrips(data.trips)
        }
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [busId])

  // Export CSV
  const exportCSV = () => {
    if (trips.length === 0) return
    const header = 'Date départ;Heure départ;Date arrivée;Heure arrivée;Départ;Arrivée;Arrêts;Chauffeur;Prix (FCFA);Places totales;Places en vente;Statut'
    const rows = trips.map(t => {
      const r = t.routes
      const stopsCount = r?.stops ? r.stops.length : 0
      return [
        formatDateFr(t.departure_datetime),
        formatTimeFr(t.departure_datetime),
        formatDateFr(t.arrival_datetime),
        formatTimeFr(t.arrival_datetime),
        r ? `${r.departure_city}${r.departure_location ? ` (${r.departure_location})` : ''}` : '',
        r ? `${r.arrival_city}${r.arrival_location ? ` (${r.arrival_location})` : ''}` : '',
        stopsCount,
        t.drivers ? `${t.drivers.first_name} ${t.drivers.last_name}` : '',
        t.base_price,
        t.total_seats,
        t.available_seats_count,
        statusLabel(t.status).label,
      ].join(';')
    })
    const csv = '\uFEFF' + header + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `historique_${bus?.brand}_${bus?.model}_${bus?.number}.csv`
    link.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between pb-6 mb-6 flex-wrap gap-3" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <div>
          <Link href="/dashboard-agence/bus" className="text-sm text-gray-400 hover:text-gray-600 transition">
            ← Retour à la flotte
          </Link>
          <h1 className="text-2xl lg:text-3xl font-bold mt-1" style={{ color: '#1a1d29' }}>
            Historique — {bus ? `${bus.brand} ${bus.model} #${bus.number}` : '...'}
          </h1>
        </div>
        {trips.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 hover:bg-gray-50 transition"
          >
            <Download size={14} />
            Exporter CSV
          </button>
        )}
      </div>

      {/* Résumé */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #f0f0f0' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Total trajets</p>
          <p className="text-2xl font-bold mt-1" style={{ color: '#1a1d29' }}>{trips.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #f0f0f0' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Actifs</p>
          <p className="text-2xl font-bold mt-1 text-green-600">{trips.filter(t => t.status === 'actif').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #f0f0f0' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Terminés</p>
          <p className="text-2xl font-bold mt-1 text-blue-600">{trips.filter(t => t.status === 'termine').length}</p>
        </div>
        <div className="bg-white rounded-xl p-4" style={{ border: '1px solid #f0f0f0' }}>
          <p className="text-[10px] font-semibold text-gray-400 uppercase">Annulés</p>
          <p className="text-2xl font-bold mt-1 text-red-500">{trips.filter(t => t.status === 'annule').length}</p>
        </div>
      </div>

      {/* Table */}
      {trips.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center" style={{ border: '1px solid #f0f0f0' }}>
          <Bus size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">Aucun trajet enregistré pour ce bus</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #f0f0f0' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Date</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Itinéraire</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Horaires</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Chauffeur</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Prix</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Places</th>
                  <th className="text-center px-4 py-3 text-[10px] font-semibold text-gray-400 uppercase">Statut</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => {
                  const r = trip.routes
                  const s = statusLabel(trip.status)
                  const stopsCount = r?.stops ? r.stops.length : 0

                  return (
                    <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-medium" style={{ color: '#1a1d29' }}>
                          {formatDateFr(trip.departure_datetime)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold" style={{ color: '#1a1d29' }}>
                            {r?.departure_city || '?'}
                          </span>
                          <ArrowRight size={12} className="text-gray-300" />
                          <span className="font-semibold" style={{ color: '#1a1d29' }}>
                            {r?.arrival_city || '?'}
                          </span>
                          {stopsCount > 0 && (
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {stopsCount} arrêt{stopsCount > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {r?.departure_location && (
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {r.departure_location} → {r.arrival_location || ''}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {formatTimeFr(trip.departure_datetime)} → {formatTimeFr(trip.arrival_datetime)}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {trip.drivers ? `${trip.drivers.first_name} ${trip.drivers.last_name}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold whitespace-nowrap" style={{ color: '#1a1d29' }}>
                        {trip.base_price.toLocaleString()} F
                      </td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className="text-gray-500">{trip.available_seats_count}</span>
                        <span className="text-gray-300">/{trip.total_seats}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="text-[10px] font-semibold px-2 py-1 rounded-md"
                          style={{ color: s.color, background: s.bg }}
                        >
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
