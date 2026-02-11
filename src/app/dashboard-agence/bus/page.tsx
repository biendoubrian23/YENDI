'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, MoreHorizontal, Bus, Wrench, MapPin,
  Users, CheckCircle2, X, Wifi, BatteryCharging,
  Snowflake, Eye, Edit3, RotateCcw, Trash2, LayoutGrid, List,
  Monitor,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { BusItem, SeatLayout } from '@/lib/supabase'

// ───── Helpers ─────

// Calcule la progression du trajet en % (0-100)
function getTripProgress(departure: string, arrival: string): number {
  const now = Date.now()
  const dep = new Date(departure).getTime()
  const arr = new Date(arrival).getTime()
  if (arr <= dep) return 100
  const progress = ((now - dep) / (arr - dep)) * 100
  return Math.min(100, Math.max(0, Math.round(progress)))
}

// Libellé de la progression
function getTripProgressLabel(progress: number): string {
  if (progress >= 95) return 'Arrivée imminente'
  if (progress >= 75) return 'Presque arrivé'
  if (progress >= 50) return 'En milieu de trajet'
  if (progress >= 25) return 'En route'
  return 'Vient de partir'
}

// Couleur de la progression
function getTripProgressColor(progress: number): string {
  if (progress >= 95) return '#22c55e'  // vert — presque arrivé
  if (progress >= 75) return '#3b82f6'  // bleu
  if (progress >= 50) return '#8b5cf6'  // violet
  if (progress >= 25) return '#f59e0b'  // orange
  return '#6366f1'                       // indigo — vient de partir
}

// Composant barre de progression trajet
function TripProgressBar({ bus }: { bus: BusItem }) {
  const trip = bus.active_trip
  if (!trip || bus.status !== 'en_route') {
    // Bus pas en route — pas de barre
    return (
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-gray-400">Pas de trajet en cours</span>
      </div>
    )
  }

  const progress = getTripProgress(trip.departure_datetime, trip.arrival_datetime)
  const label = getTripProgressLabel(progress)
  const color = getTripProgressColor(progress)

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-gray-400">
          {trip.departure_city} → {trip.arrival_city}
        </span>
        <span className="text-[10px] font-semibold" style={{ color }}>
          {label}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all"
            style={{ width: `${progress}%`, background: color }}
          />
        </div>
        <span className="text-[10px] font-medium text-gray-500">{progress}%</span>
      </div>
    </div>
  )
}
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    disponible: { label: 'Disponible', color: '#22c55e', bg: '#f0fdf4' },
    en_route: { label: 'En route', color: '#3b82f6', bg: '#eff6ff' },
    maintenance: { label: 'Maintenance', color: '#f59e0b', bg: '#fffbeb' },
    hors_service: { label: 'Hors service', color: '#ef4444', bg: '#fef2f2' },
  }
  const s = map[status] || { label: status, color: '#6b7280', bg: '#f9fafb' }
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
      style={{ color: s.color, background: s.bg }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function FeatureIcon({ feature }: { feature: string }) {
  const icons: Record<string, typeof Wifi> = {
    WiFi: Wifi, 'Prises USB': BatteryCharging, Clim: Snowflake, WC: Users,
  }
  const Icon = icons[feature]
  if (!Icon) return <span className="text-[10px] text-gray-400">{feature}</span>
  return (
    <span className="text-[10px] text-gray-400 flex items-center gap-1">
      <Icon size={10} />{feature}
    </span>
  )
}

const FEATURES_LIST = ['WiFi', 'WC', 'Clim', 'Prises USB', 'TV', 'GPS']
const defaultLayout: SeatLayout = { left: 2, right: 2, back_row: 5, rows: 12 }

// ───── Seat Visualiser ─────
function SeatVisualiser({ layout, seats }: { layout: SeatLayout; seats: number }) {
  const { left, right, back_row, rows } = layout
  const seatsPerRow = left + right
  let seatNum = 0
  const totalSeats = (rows * seatsPerRow) + (back_row || 0)

  return (
    <div className="flex flex-col items-center gap-1">
      {/* Avant du bus */}
      <div className="w-full flex justify-center mb-2">
        <div className="w-36 h-8 bg-gray-200 rounded-t-3xl flex items-center justify-center">
          <Monitor size={14} className="text-gray-500 mr-1" />
          <span className="text-[10px] text-gray-500 font-medium">Avant</span>
        </div>
      </div>

      {/* Rangées */}
      <div className="flex flex-col gap-1">
        {Array.from({ length: rows }).map((_, rowIdx) => {
          const leftSeats = Array.from({ length: left }).map(() => ++seatNum)
          const rightSeats = Array.from({ length: right }).map(() => ++seatNum)
          return (
            <div key={rowIdx} className="flex items-center gap-3 justify-center">
              <div className="flex gap-1">
                {leftSeats.map((n) => (
                  <div key={n} className="w-7 h-7 rounded-md text-[9px] font-bold flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-200">
                    {n}
                  </div>
                ))}
              </div>
              <div className="w-4" />
              <div className="flex gap-1">
                {rightSeats.map((n) => (
                  <div key={n} className="w-7 h-7 rounded-md text-[9px] font-bold flex items-center justify-center bg-purple-50 text-purple-600 border border-purple-200">
                    {n}
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {/* Rangée arrière */}
        {back_row > 0 && (
          <div className="flex items-center gap-1 justify-center mt-1 pt-1 border-t border-dashed border-gray-200">
            {Array.from({ length: back_row }).map(() => {
              const n = ++seatNum
              return (
                <div key={n} className="w-7 h-7 rounded-md text-[9px] font-bold flex items-center justify-center bg-orange-50 text-orange-600 border border-orange-200">
                  {n}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Arrière du bus */}
      <div className="w-full flex justify-center mt-2">
        <div className="w-44 h-6 bg-gray-200 rounded-b-2xl flex items-center justify-center">
          <span className="text-[10px] text-gray-500 font-medium">Arrière</span>
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-2">
        {totalSeats} places • {left}+{right} par rangée • {rows} rangées
        {back_row > 0 ? ` + ${back_row} arrière` : ''}
      </p>
    </div>
  )
}

// ───── Add/Edit Bus Modal ─────
function BusFormModal({
  bus,
  onClose,
  onSave,
  agencyId,
  existingBuses,
}: {
  bus: BusItem | null
  onClose: () => void
  onSave: () => void
  agencyId: string
  existingBuses: BusItem[]
}) {
  const isEdit = !!bus
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Auto-générer le numéro interne si création
  const generateNextNumber = () => {
    if (isEdit || existingBuses.length === 0) return ''
    // Extraire les numéros numériques existants
    const numbers = existingBuses
      .map((b) => parseInt(b.number))
      .filter((n) => !isNaN(n))
    if (numbers.length === 0) return '101'
    const maxNum = Math.max(...numbers)
    return String(maxNum + 1)
  }

  const [brand, setBrand] = useState(bus?.brand || '')
  const [model, setModel] = useState(bus?.model || '')
  const [number, setNumber] = useState(bus?.number || generateNextNumber())
  const [plate, setPlate] = useState(bus?.plate || '')
  const [seats, setSeats] = useState(bus?.seats?.toString() || '50')
  const [fuelLevel, setFuelLevel] = useState(bus?.fuel_level?.toString() || '100')
  const [mileage, setMileage] = useState(bus?.mileage?.toString() || '0')
  const [lastRevision, setLastRevision] = useState(bus?.last_revision || '')
  const [nextRevision, setNextRevision] = useState(bus?.next_revision || '')
  const [features, setFeatures] = useState<string[]>(bus?.features || [])
  const [isVip, setIsVip] = useState(bus?.is_vip ?? false)

  const [layoutLeft, setLayoutLeft] = useState(bus?.seat_layout?.left?.toString() || '2')
  const [layoutRight, setLayoutRight] = useState(bus?.seat_layout?.right?.toString() || '2')
  const [layoutBackRow, setLayoutBackRow] = useState(bus?.seat_layout?.back_row?.toString() || '5')
  const [layoutRows, setLayoutRows] = useState(bus?.seat_layout?.rows?.toString() || '12')

  useEffect(() => {
    const l = parseInt(layoutLeft) || 0
    const r = parseInt(layoutRight) || 0
    const b = parseInt(layoutBackRow) || 0
    const rw = parseInt(layoutRows) || 0
    setSeats(String((l + r) * rw + b))
  }, [layoutLeft, layoutRight, layoutBackRow, layoutRows])

  const toggleFeature = (f: string) => {
    setFeatures((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])
  }

  const handleSave = async () => {
    setError('')
    if (!brand || !model || !plate) {
      setError('Remplissez tous les champs obligatoires (marque, modèle, immatriculation)')
      return
    }
    setSaving(true)

    const seatLayout: SeatLayout = {
      left: parseInt(layoutLeft) || 2,
      right: parseInt(layoutRight) || 2,
      back_row: parseInt(layoutBackRow) || 0,
      rows: parseInt(layoutRows) || 12,
    }

    const payload = {
      ...(isEdit ? { id: bus.id } : { agency_id: agencyId }),
      brand, model,
      number: number || 'N/A', // Fallback si vide
      plate,
      seats: parseInt(seats),
      seat_layout: seatLayout,
      features,
      fuel_level: parseInt(fuelLevel) || 100,
      mileage: parseInt(mileage) || 0,
      last_revision: lastRevision || null,
      next_revision: nextRevision || null,
      is_vip: isVip,
    }

    try {
      const res = await fetch(isEdit ? '/api/buses/update' : '/api/buses/create', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Erreur')
        setSaving(false)
        return
      }
      onSave()
    } catch {
      setError('Erreur réseau')
      setSaving(false)
    }
  }

  const currentLayout: SeatLayout = {
    left: parseInt(layoutLeft) || 2,
    right: parseInt(layoutRight) || 2,
    back_row: parseInt(layoutBackRow) || 0,
    rows: parseInt(layoutRows) || 12,
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-10 overflow-y-auto pb-10">
      <div className="bg-white rounded-2xl w-[800px] max-w-[95vw] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
            {isEdit ? 'Modifier le bus' : 'Ajouter un bus'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-2 gap-6">
          {/* Colonne gauche : formulaire */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Informations du véhicule</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Marque *</label>
                <input value={brand} onChange={(e) => setBrand(e.target.value)}
                  placeholder="Mercedes, Volvo..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Modèle *</label>
                <input value={model} onChange={(e) => setModel(e.target.value)}
                  placeholder="Tourismo, 9700..."
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Numéro interne</label>
                <input value={number} onChange={(e) => setNumber(e.target.value)}
                  placeholder="Auto-généré (modifiable)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Immatriculation *</label>
                <input value={plate} onChange={(e) => setPlate(e.target.value)}
                  placeholder="AB-123-CD"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Carburant (%)</label>
                <input type="number" min={0} max={100} value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Kilométrage</label>
                <input type="number" min={0} value={mileage} onChange={(e) => setMileage(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Dernière révision</label>
                <input type="date" value={lastRevision} onChange={(e) => setLastRevision(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Prochaine révision</label>
                <input type="date" value={nextRevision} onChange={(e) => setNextRevision(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
            </div>

            {/* Équipements */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-2">Équipements</label>
              <div className="flex flex-wrap gap-2">
                {FEATURES_LIST.map((f) => (
                  <button key={f} onClick={() => toggleFeature(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
                      features.includes(f)
                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* VIP */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 mb-2">Type de bus</label>
              <label onClick={() => setIsVip(!isVip)} className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                  isVip ? 'border-amber-500 bg-amber-500' : 'border-gray-300 group-hover:border-gray-400'
                }`}>
                  {isVip && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium" style={{ color: '#1a1d29' }}>Bus VIP</span>
                  <p className="text-[11px] text-gray-400">Sièges premium, confort supérieur, tarif majoré</p>
                </div>
              </label>
            </div>
          </div>

          {/* Colonne droite : layout des sièges */}
          <div className="space-y-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Disposition des sièges</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Sièges gauche / rangée</label>
                <select value={layoutLeft} onChange={(e) => setLayoutLeft(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300">
                  <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Sièges droite / rangée</label>
                <select value={layoutRight} onChange={(e) => setLayoutRight(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300">
                  <option value="1">1</option><option value="2">2</option><option value="3">3</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Rangées</label>
                <input type="number" min={1} max={20} value={layoutRows} onChange={(e) => setLayoutRows(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">Rangée arrière</label>
                <input type="number" min={0} max={6} value={layoutBackRow} onChange={(e) => setLayoutBackRow(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300" />
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-gray-500">Total places :</span>
              <span className="text-2xl font-extrabold" style={{ color: '#7c3aed' }}>{seats}</span>
            </div>

            {/* Prévisualisation */}
            <div className="border border-gray-200 rounded-xl p-4 max-h-[300px] overflow-y-auto">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 text-center">Aperçu</p>
              <SeatVisualiser layout={currentLayout} seats={parseInt(seats)} />
            </div>
          </div>
        </div>

        {/* Footer */}
        {error && (
          <div className="mx-6 mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">
            {error}
          </div>
        )}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-50"
            style={{ background: '#7c3aed' }}>
            {saving ? 'Enregistrement...' : isEdit ? 'Enregistrer' : 'Ajouter le bus'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ───── Seat View Modal ─────
function SeatViewModal({ bus, onClose }: { bus: BusItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl w-[500px] max-w-[95vw] shadow-xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
              {bus.brand} {bus.model} #{bus.number}
            </h2>
            <p className="text-xs text-gray-400">Vue intérieure — {bus.seats} places</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 flex justify-center">
          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200"
            style={{ background: 'linear-gradient(180deg, #f9fafb 0%, #f3f0ff 100%)' }}>
            <SeatVisualiser layout={bus.seat_layout || defaultLayout} seats={bus.seats} />
          </div>
        </div>
        <div className="flex justify-end p-6 border-t border-gray-100">
          <button onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ───── MAIN PAGE ─────
export default function BusPage() {
  const [buses, setBuses] = useState<BusItem[]>([])
  const [loading, setLoading] = useState(true)
  const [agencyId, setAgencyId] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [selectedBus, setSelectedBus] = useState<BusItem | null>(null)

  const [showFormModal, setShowFormModal] = useState(false)
  const [editingBus, setEditingBus] = useState<BusItem | null>(null)
  const [showSeatView, setShowSeatView] = useState(false)
  const [seatViewBus, setSeatViewBus] = useState<BusItem | null>(null)

  // Récupérer l'agencyId
  useEffect(() => {
    const getAgencyId = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('agency_admins')
        .select('agency_id')
        .eq('profile_id', session.user.id)
        .single()
      if (data) setAgencyId(data.agency_id)
    }
    getAgencyId()
  }, [])

  // Charger les bus
  const fetchBuses = useCallback(async () => {
    if (!agencyId) return
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/buses/list', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (res.ok) {
        setBuses(data || [])
        if (data?.length > 0 && !selectedBus) {
          setSelectedBus(data[0])
        }
      }
    } catch { /* ignore */ }
    setLoading(false)
  }, [agencyId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchBuses() }, [fetchBuses])

  // Filtres
  const filteredBuses = buses.filter((bus) => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      bus.brand.toLowerCase().includes(q) ||
      bus.model.toLowerCase().includes(q) ||
      bus.number.includes(q) ||
      bus.plate.toLowerCase().includes(q)
    const matchFilter = filterStatus === 'all' || bus.status === filterStatus
    return matchSearch && matchFilter
  })

  // Stats dynamiques
  const stats = {
    total: buses.length,
    disponible: buses.filter((b) => b.status === 'disponible').length,
    en_route: buses.filter((b) => b.status === 'en_route').length,
    maintenance: buses.filter((b) => b.status === 'maintenance').length,
    hors_service: buses.filter((b) => b.status === 'hors_service').length,
  }
  const urgentMaintenance = buses.filter((b) => {
    if (!b.next_revision) return false
    return new Date(b.next_revision) <= new Date()
  }).length

  // Actions
  const handleSaveForm = async () => {
    setShowFormModal(false)
    setEditingBus(null)
    await fetchBuses()
  }

  const changeStatus = async (busId: string, newStatus: string) => {
    await fetch('/api/buses/update', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: busId, status: newStatus }),
    })
    await fetchBuses()
    setSelectedBus((prev) => prev?.id === busId ? { ...prev, status: newStatus as BusItem['status'] } : prev)
  }

  const deleteBus = async (busId: string) => {
    if (!confirm('Supprimer ce bus définitivement ?')) return
    await fetch('/api/buses/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: busId }),
    })
    if (selectedBus?.id === busId) setSelectedBus(null)
    await fetchBuses()
  }

  const formatDate = (d: string | null) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const formatMileage = (km: number) => km.toLocaleString('fr-FR') + ' km'

  const statsCards = [
    { label: 'FLOTTE TOTALE', value: stats.total, sub: 'véhicules', icon: Bus, iconColor: '#7c3aed' },
    { label: 'DISPONIBLES', value: stats.disponible, sub: 'prêts à partir', icon: CheckCircle2, iconColor: '#22c55e' },
    { label: 'EN ROUTE', value: stats.en_route, sub: 'en circulation', icon: MapPin, iconColor: '#3b82f6' },
    {
      label: 'MAINTENANCE', value: stats.maintenance + stats.hors_service,
      sub: urgentMaintenance > 0 ? `${urgentMaintenance} urgent` : 'tout ok',
      icon: Wrench, iconColor: '#f59e0b',
      alert: urgentMaintenance > 0,
    },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a1d29' }}>Gestion de la Flotte</h1>
        <button
          onClick={() => { setEditingBus(null); setShowFormModal(true) }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
          style={{ background: '#1a1d29' }}>
          <Plus size={16} />Ajouter un bus
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {statsCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{card.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${card.iconColor}12` }}>
                <card.icon size={16} style={{ color: card.iconColor }} />
              </div>
            </div>
            <p className="text-3xl font-extrabold" style={{ color: '#1a1d29' }}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            {card.alert && (
              <span className="text-[10px] font-semibold text-orange-500 mt-1 inline-block">⚠ Intervention requise</span>
            )}
          </div>
        ))}
      </div>

      {/* Search + Filter + View toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="Rechercher un bus (marque, modèle, plaque...)"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-gray-700 w-full" />
        </div>
        <div className="flex gap-2">
          {['all', 'disponible', 'en_route', 'maintenance', 'hors_service'].map((s) => {
            const labels: Record<string, string> = {
              all: 'Tous', disponible: 'Disponible', en_route: 'En route',
              maintenance: 'Maintenance', hors_service: 'Hors service',
            }
            return (
              <button key={s} onClick={() => setFilterStatus(s)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                  filterStatus === s
                    ? 'border-purple-300 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}>
                {labels[s]}
              </button>
            )
          })}
        </div>
        {/* View toggle */}
        <div className="flex gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-purple-50 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}>
            <List size={16} />
          </button>
          <button onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-purple-50 text-purple-700' : 'text-gray-400 hover:text-gray-600'}`}>
            <LayoutGrid size={16} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-gray-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && buses.length === 0 && (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#7c3aed12' }}>
            <Bus size={32} style={{ color: '#7c3aed' }} />
          </div>
          <h3 className="text-lg font-bold mb-2" style={{ color: '#1a1d29' }}>Aucun bus dans votre flotte</h3>
          <p className="text-sm text-gray-400 mb-6">Commencez par ajouter votre premier véhicule</p>
          <button
            onClick={() => { setEditingBus(null); setShowFormModal(true) }}
            className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90"
            style={{ background: '#7c3aed' }}>
            <Plus size={14} className="inline mr-1" />Ajouter un bus
          </button>
        </div>
      )}

      {/* No results */}
      {!loading && buses.length > 0 && filteredBuses.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-gray-400">Aucun bus ne correspond aux filtres sélectionnés</p>
        </div>
      )}

      {/* Content */}
      {!loading && filteredBuses.length > 0 && (
        <div className={viewMode === 'list' ? 'grid grid-cols-3 gap-5' : ''}>

          {/* ── LIST VIEW ── */}
          {viewMode === 'list' && (
            <>
              <div className="col-span-2 flex flex-col gap-4">
                {filteredBuses.map((bus) => (
                  <div key={bus.id} onClick={() => setSelectedBus(bus)}
                    className={`bg-white rounded-2xl p-5 cursor-pointer transition-all ${
                      selectedBus?.id === bus.id ? 'ring-2 ring-purple-200' : ''
                    }`} style={{ border: '1px solid #f0f0f0' }}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#f3f4f6' }}>
                          <Bus size={18} className="text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>
                            {bus.brand} {bus.model}{' '}
                            <span className="text-purple-600">#{bus.number}</span>
                          </p>
                          <p className="text-[11px] text-gray-400">{bus.plate} • {bus.seats} places</p>
                        </div>
                        {bus.is_vip && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 border border-amber-200">VIP</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge status={bus.status} />
                        <button className="text-gray-300 hover:text-gray-500"><MoreHorizontal size={16} /></button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {bus.features?.slice(0, 4).map((f) => <FeatureIcon key={f} feature={f} />)}
                        {(bus.features?.length || 0) > 4 && <span className="text-[10px] text-gray-400">+{bus.features!.length - 4}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-[11px] text-gray-400">
                        {bus.current_line && <span className="flex items-center gap-1"><MapPin size={10} />{bus.current_line}</span>}
                        {bus.current_driver && <span className="flex items-center gap-1"><Users size={10} />{bus.current_driver}</span>}
                      </div>
                    </div>
                    <TripProgressBar bus={bus} />
                  </div>
                ))}
              </div>

              {/* Detail panel */}
              {selectedBus && (
                <div className="bg-white rounded-2xl p-6 h-fit sticky top-24" style={{ border: '1px solid #f0f0f0' }}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: '#7c3aed12' }}>
                      <Bus size={24} style={{ color: '#7c3aed' }} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
                        {selectedBus.brand} {selectedBus.model}
                      </h2>
                      <p className="text-xs text-gray-400">#{selectedBus.number} • {selectedBus.plate}</p>
                    </div>
                  </div>

                  <StatusBadge status={selectedBus.status} />
                  {selectedBus.is_vip && (
                    <span className="ml-2 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-600 border border-amber-200">★ VIP</span>
                  )}

                  {/* Actions — en haut */}
                  <div className="flex flex-col gap-3 mt-5">
                    <button onClick={() => { setEditingBus(selectedBus); setShowFormModal(true) }}
                      className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2">
                      <Edit3 size={14} />Modifier les informations
                    </button>

                    {selectedBus.status === 'maintenance' || selectedBus.status === 'hors_service' ? (
                      <button onClick={() => changeStatus(selectedBus.id, 'disponible')}
                        className="w-full py-2.5 text-sm font-semibold text-green-600 border border-green-200 rounded-xl hover:bg-green-50 transition flex items-center justify-center gap-2">
                        <RotateCcw size={14} />Remettre en service
                      </button>
                    ) : selectedBus.status === 'en_route' ? (
                      <button disabled
                        className="w-full py-2.5 text-sm font-semibold text-blue-400 border border-blue-100 rounded-xl bg-blue-50/50 cursor-not-allowed flex items-center justify-center gap-2 opacity-60">
                        <MapPin size={14} />Bus actuellement en route
                      </button>
                    ) : (
                      <button onClick={() => changeStatus(selectedBus.id, 'maintenance')}
                        className="w-full py-2.5 text-sm font-semibold text-orange-500 border border-orange-200 rounded-xl hover:bg-orange-50 transition flex items-center justify-center gap-2">
                        <Wrench size={14} />Mettre en maintenance
                      </button>
                    )}

                    <button onClick={() => { setSeatViewBus(selectedBus); setShowSeatView(true) }}
                      className="w-full py-2.5 text-sm font-semibold border rounded-xl transition flex items-center justify-center gap-2"
                      style={{ color: '#7c3aed', borderColor: '#e9d5ff' }}>
                      <Eye size={14} />Visualiser l&apos;intérieur
                    </button>

                    <button onClick={() => window.location.href = `/dashboard-agence/bus/${selectedBus.id}/historique`}
                      className="w-full py-2.5 text-sm font-semibold border rounded-xl transition flex items-center justify-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50">
                      <MapPin size={14} />Historique des trajets
                    </button>
                  </div>

                  {/* Informations — en bas */}
                  <div className="space-y-4 mt-6 pt-4 border-t border-gray-100">
                    {[
                      ['Places', String(selectedBus.seats)],
                      ['Kilométrage', formatMileage(selectedBus.mileage)],
                      ['Dernière révision', formatDate(selectedBus.last_revision)],
                      ['Prochaine révision', formatDate(selectedBus.next_revision)],
                    ].map(([label, val]) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-gray-400">{label}</span>
                        <span className="font-medium" style={{ color: '#1a1d29' }}>{val}</span>
                      </div>
                    ))}

                    {/* Progression du trajet en cours */}
                    {selectedBus.status === 'en_route' && selectedBus.active_trip && (
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Trajet en cours</p>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-400">Itinéraire</span>
                          <span className="font-medium" style={{ color: '#1a1d29' }}>
                            {selectedBus.active_trip.departure_city} → {selectedBus.active_trip.arrival_city}
                          </span>
                        </div>
                        {selectedBus.active_trip.driver_name && (
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">Chauffeur</span>
                            <span className="font-medium" style={{ color: '#1a1d29' }}>{selectedBus.active_trip.driver_name}</span>
                          </div>
                        )}
                        <div className="mt-2">
                          {(() => {
                            const progress = getTripProgress(selectedBus.active_trip!.departure_datetime, selectedBus.active_trip!.arrival_datetime)
                            const color = getTripProgressColor(progress)
                            const label = getTripProgressLabel(progress)
                            return (
                              <>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="text-gray-400">Progression</span>
                                  <span className="font-semibold" style={{ color }}>{label} — {progress}%</span>
                                </div>
                                <div className="bg-gray-100 rounded-full h-2">
                                  <div className="h-2 rounded-full transition-all" style={{ width: `${progress}%`, background: color }} />
                                </div>
                              </>
                            )
                          })()}
                        </div>
                      </div>
                    )}
                    {selectedBus.current_driver && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Chauffeur actuel</span>
                        <span className="font-medium" style={{ color: '#1a1d29' }}>{selectedBus.current_driver}</span>
                      </div>
                    )}
                    {selectedBus.current_line && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Ligne en cours</span>
                        <span className="font-medium text-purple-600">{selectedBus.current_line}</span>
                      </div>
                    )}
                  </div>

                  {/* Équipements */}
                  <div className="mt-6 pt-4 border-t border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Équipements</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedBus.features?.length ? selectedBus.features.map((f) => (
                        <span key={f} className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600">{f}</span>
                      )) : <span className="text-[11px] text-gray-400">Aucun</span>}
                    </div>
                  </div>

                  {/* Supprimer */}
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <button onClick={() => deleteBus(selectedBus.id)}
                      className="w-full py-2.5 text-sm font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition flex items-center justify-center gap-2">
                      <Trash2 size={14} />Supprimer
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── GRID VIEW ── */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-3 gap-5">
              {filteredBuses.map((bus) => (
                <div key={bus.id}
                  onClick={() => { setSelectedBus(bus); setViewMode('list') }}
                  className="bg-white rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
                  style={{ border: '1px solid #f0f0f0' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#7c3aed12' }}>
                      <Bus size={20} style={{ color: '#7c3aed' }} />
                    </div>
                    <StatusBadge status={bus.status} />
                  </div>

                  <h3 className="text-sm font-bold mb-0.5" style={{ color: '#1a1d29' }}>
                    {bus.brand} {bus.model}
                  </h3>
                  <p className="text-xs text-gray-400 mb-3">
                    <span className="text-purple-600 font-semibold">#{bus.number}</span> • {bus.plate}
                    {bus.is_vip && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">VIP</span>}
                  </p>

                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-[11px] text-gray-500">{bus.seats} places</span>
                    <span className="text-[11px] text-gray-500">{formatMileage(bus.mileage)}</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {bus.features?.slice(0, 3).map((f) => (
                      <span key={f} className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-50 text-gray-500">{f}</span>
                    ))}
                    {(bus.features?.length || 0) > 3 && <span className="text-[10px] text-gray-400">+{bus.features!.length - 3}</span>}
                  </div>

                  <TripProgressBar bus={bus} />

                  {bus.current_driver && (
                    <p className="text-[11px] text-gray-400 mt-2 flex items-center gap-1">
                      <Users size={10} />{bus.current_driver}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showFormModal && agencyId && (
        <BusFormModal
          bus={editingBus}
          agencyId={agencyId}
          existingBuses={buses}
          onClose={() => { setShowFormModal(false); setEditingBus(null) }}
          onSave={handleSaveForm}
        />
      )}

      {showSeatView && seatViewBus && (
        <SeatViewModal bus={seatViewBus} onClose={() => { setShowSeatView(false); setSeatViewBus(null) }} />
      )}
    </div>
  )
}
