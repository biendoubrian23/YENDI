'use client'

import { useState } from 'react'
import {
  Search,
  Filter,
  Download,
  Eye,
  X,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  XCircle,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  Bus,
  Ticket,
} from 'lucide-react'

interface Reservation {
  id: string
  ref: string
  passengerName: string
  passengerEmail: string
  passengerPhone: string
  line: string
  from: string
  to: string
  date: string
  departure: string
  seats: number
  price: string
  status: 'confirmé' | 'en_attente' | 'annulé' | 'embarqué'
  paymentMethod: string
  createdAt: string
  busCode: string
}

const mockReservations: Reservation[] = [
  {
    id: '1',
    ref: 'RES-2026-001',
    passengerName: 'Marie Dubois',
    passengerEmail: 'marie.dubois@email.com',
    passengerPhone: '+33 6 12 34 56 78',
    line: 'LIGNE 104',
    from: 'Paris',
    to: 'Lyon',
    date: '12 Fév 2026',
    departure: '08:30',
    seats: 2,
    price: '58,00€',
    status: 'confirmé',
    paymentMethod: 'Carte bancaire',
    createdAt: '08 Fév 2026',
    busCode: '#402',
  },
  {
    id: '2',
    ref: 'RES-2026-002',
    passengerName: 'Jean Martin',
    passengerEmail: 'j.martin@email.com',
    passengerPhone: '+33 6 98 76 54 32',
    line: 'LIGNE 208',
    from: 'Marseille',
    to: 'Nice',
    date: '12 Fév 2026',
    departure: '10:00',
    seats: 1,
    price: '24,00€',
    status: 'en_attente',
    paymentMethod: 'Mobile Money',
    createdAt: '09 Fév 2026',
    busCode: '#104',
  },
  {
    id: '3',
    ref: 'RES-2026-003',
    passengerName: 'Sophie Laurent',
    passengerEmail: 's.laurent@email.com',
    passengerPhone: '+33 7 11 22 33 44',
    line: 'LIGNE 104',
    from: 'Paris',
    to: 'Lyon',
    date: '11 Fév 2026',
    departure: '08:30',
    seats: 3,
    price: '87,00€',
    status: 'embarqué',
    paymentMethod: 'Carte bancaire',
    createdAt: '07 Fév 2026',
    busCode: '#402',
  },
  {
    id: '4',
    ref: 'RES-2026-004',
    passengerName: 'Pierre Durand',
    passengerEmail: 'p.durand@email.com',
    passengerPhone: '+33 6 55 44 33 22',
    line: 'LIGNE 305',
    from: 'Toulouse',
    to: 'Bordeaux',
    date: '13 Fév 2026',
    departure: '09:00',
    seats: 1,
    price: '32,00€',
    status: 'annulé',
    paymentMethod: 'Espèces',
    createdAt: '09 Fév 2026',
    busCode: '#301',
  },
  {
    id: '5',
    ref: 'RES-2026-005',
    passengerName: 'Amina Koné',
    passengerEmail: 'amina.kone@email.com',
    passengerPhone: '+225 07 08 09 10 11',
    line: 'LIGNE 104',
    from: 'Paris',
    to: 'Lyon',
    date: '14 Fév 2026',
    departure: '08:30',
    seats: 2,
    price: '58,00€',
    status: 'confirmé',
    paymentMethod: 'Mobile Money',
    createdAt: '10 Fév 2026',
    busCode: '#402',
  },
  {
    id: '6',
    ref: 'RES-2026-006',
    passengerName: 'Lucas Petit',
    passengerEmail: 'lucas.p@email.com',
    passengerPhone: '+33 6 77 88 99 00',
    line: 'LIGNE 208',
    from: 'Marseille',
    to: 'Nice',
    date: '14 Fév 2026',
    departure: '10:00',
    seats: 4,
    price: '96,00€',
    status: 'en_attente',
    paymentMethod: 'Carte bancaire',
    createdAt: '10 Fév 2026',
    busCode: '#104',
  },
  {
    id: '7',
    ref: 'RES-2026-007',
    passengerName: 'Clara Moreau',
    passengerEmail: 'clara.m@email.com',
    passengerPhone: '+33 6 11 22 33 44',
    line: 'LIGNE 305',
    from: 'Toulouse',
    to: 'Bordeaux',
    date: '15 Fév 2026',
    departure: '09:00',
    seats: 1,
    price: '32,00€',
    status: 'confirmé',
    paymentMethod: 'Carte bancaire',
    createdAt: '10 Fév 2026',
    busCode: '#510',
  },
]

const statsCards = [
  { label: 'RÉSERVATIONS (J)', value: '28', change: '+6 vs hier', changeColor: '#22c55e', icon: Ticket, iconColor: '#7c3aed' },
  { label: 'TAUX REMPLISSAGE', value: '84%', sub: 'Moyenne flotte', icon: Bus, iconColor: '#3b82f6' },
  { label: 'EN ATTENTE', value: '5', sub: 'À confirmer', icon: Clock, iconColor: '#f59e0b', alert: true },
  { label: 'REVENUS (J)', value: '3,450€', change: '+12% vs J-1', changeColor: '#22c55e', icon: CreditCard, iconColor: '#22c55e' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
    confirmé: { label: 'Confirmé', color: '#22c55e', bg: '#f0fdf4', icon: CheckCircle2 },
    en_attente: { label: 'En attente', color: '#f59e0b', bg: '#fffbeb', icon: Clock },
    annulé: { label: 'Annulé', color: '#ef4444', bg: '#fef2f2', icon: XCircle },
    embarqué: { label: 'Embarqué', color: '#3b82f6', bg: '#eff6ff', icon: CheckCircle2 },
  }
  const s = map[status] || { label: status, color: '#6b7280', bg: '#f9fafb', icon: AlertCircle }
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg w-fit"
      style={{ color: s.color, background: s.bg }}
    >
      <s.icon size={12} />
      {s.label}
    </span>
  )
}

export default function ReservationsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 5

  const filteredList = mockReservations.filter((r) => {
    const matchSearch =
      r.passengerName.toLowerCase().includes(search.toLowerCase()) ||
      r.ref.toLowerCase().includes(search.toLowerCase()) ||
      r.from.toLowerCase().includes(search.toLowerCase()) ||
      r.to.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filterStatus === 'all' || r.status === filterStatus
    return matchSearch && matchFilter
  })

  const totalPages = Math.ceil(filteredList.length / perPage)
  const paginated = filteredList.slice((currentPage - 1) * perPage, currentPage * perPage)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a1d29' }}>
          Réservations
        </h1>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition">
          <Download size={16} />
          Exporter
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {statsCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {card.label}
              </p>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${card.iconColor}12` }}
              >
                <card.icon size={16} style={{ color: card.iconColor }} />
              </div>
            </div>
            <p className="text-3xl font-extrabold" style={{ color: '#1a1d29' }}>
              {card.value}
            </p>
            {card.change && (
              <p className="text-xs font-medium mt-1" style={{ color: card.changeColor }}>
                ↗ {card.change}
              </p>
            )}
            {card.sub && (
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            )}
            {card.alert && (
              <span className="text-[10px] font-semibold text-orange-500 mt-1 inline-block">
                ⚠ Action requise
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, référence, ville..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-gray-700 w-full"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'confirmé', 'en_attente', 'embarqué', 'annulé'].map((s) => {
            const labels: Record<string, string> = {
              all: 'Tous',
              confirmé: 'Confirmés',
              en_attente: 'En attente',
              embarqué: 'Embarqués',
              annulé: 'Annulés',
            }
            return (
              <button
                key={s}
                onClick={() => { setFilterStatus(s); setCurrentPage(1) }}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                  filterStatus === s
                    ? 'border-purple-300 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}
              >
                {labels[s]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #f0f0f0' }}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4">Ref</th>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4">Passager</th>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4">Trajet</th>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4">Date</th>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4">Places</th>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4">Prix</th>
              <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4">Statut</th>
              <th className="text-right text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4"></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr
                key={r.id}
                className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition"
                onClick={() => setSelectedReservation(r)}
              >
                <td className="px-5 py-4">
                  <span className="text-xs font-mono font-medium text-purple-600">{r.ref}</span>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{r.passengerName}</p>
                  <p className="text-[11px] text-gray-400">{r.passengerEmail}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium" style={{ color: '#1a1d29' }}>
                    {r.from} → {r.to}
                  </p>
                  <p className="text-[11px] text-gray-400">{r.line} • Bus {r.busCode}</p>
                </td>
                <td className="px-5 py-4">
                  <p className="text-sm font-medium" style={{ color: '#1a1d29' }}>{r.date}</p>
                  <p className="text-[11px] text-gray-400">{r.departure}</p>
                </td>
                <td className="px-5 py-4 text-sm font-medium text-center" style={{ color: '#1a1d29' }}>
                  {r.seats}
                </td>
                <td className="px-5 py-4 text-sm font-bold" style={{ color: '#1a1d29' }}>
                  {r.price}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-5 py-4 text-right">
                  <button className="text-gray-300 hover:text-gray-500">
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {filteredList.length} réservation{filteredList.length > 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition ${
                  currentPage === i + 1
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedReservation(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
                  Détails de la réservation
                </h2>
                <p className="text-xs text-gray-400 font-mono">{selectedReservation.ref}</p>
              </div>
              <button
                onClick={() => setSelectedReservation(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Status */}
              <StatusBadge status={selectedReservation.status} />

              {/* Passager */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase">Passager</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#7c3aed' }}>
                    {selectedReservation.passengerName.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{selectedReservation.passengerName}</p>
                    <p className="text-[11px] text-gray-400">{selectedReservation.passengerEmail}</p>
                  </div>
                </div>
                <div className="flex gap-4 mt-2">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <Phone size={11} /> {selectedReservation.passengerPhone}
                  </span>
                </div>
              </div>

              {/* Trajet */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Trajet</p>
                  <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>
                    {selectedReservation.from} → {selectedReservation.to}
                  </p>
                  <p className="text-[11px] text-gray-400">{selectedReservation.line}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Date & Heure</p>
                  <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{selectedReservation.date}</p>
                  <p className="text-[11px] text-gray-400">Départ {selectedReservation.departure}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Places</p>
                  <p className="text-xl font-extrabold" style={{ color: '#1a1d29' }}>{selectedReservation.seats}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Bus</p>
                  <p className="text-xl font-extrabold text-purple-600">{selectedReservation.busCode}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Total</p>
                  <p className="text-xl font-extrabold" style={{ color: '#22c55e' }}>{selectedReservation.price}</p>
                </div>
              </div>

              {/* Paiement */}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
                <span className="text-gray-400">Paiement</span>
                <span className="font-medium flex items-center gap-1.5" style={{ color: '#1a1d29' }}>
                  <CreditCard size={14} className="text-gray-400" />
                  {selectedReservation.paymentMethod}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Réservé le</span>
                <span className="font-medium" style={{ color: '#1a1d29' }}>{selectedReservation.createdAt}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              {selectedReservation.status === 'en_attente' && (
                <>
                  <button className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90" style={{ background: '#22c55e' }}>
                    Confirmer
                  </button>
                  <button className="flex-1 py-2.5 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition">
                    Annuler
                  </button>
                </>
              )}
              {selectedReservation.status === 'confirmé' && (
                <button className="flex-1 py-2.5 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition">
                  Annuler la réservation
                </button>
              )}
              <button
                onClick={() => setSelectedReservation(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
