'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  MoreHorizontal,
  Clock,
  MapPin,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

interface Line {
  id: string
  code: string
  codeColor: string
  status: 'actif' | 'retardé' | 'suspendu'
  from: string
  fromStation: string
  to: string
  toStation: string
  departureTime: string
  arrivalTime: string
  duration: string
  stops: number
  drivers: { name: string; avatar?: string; initials: string }[]
  nextDeparture: string
  details: {
    name: string
    time: string
    label: string
    isTerminus?: boolean
  }[]
}

const mockLines: Line[] = [
  {
    id: '1',
    code: 'LIGNE 104',
    codeColor: '#1a1d29',
    status: 'actif',
    from: 'Paris',
    fromStation: 'Gare de Bercy',
    to: 'Lyon',
    toStation: 'Perrache',
    departureTime: '08:30',
    arrivalTime: '12:45',
    duration: '4h 15m',
    stops: 2,
    drivers: [
      { name: 'M. Dupont', initials: 'MD' },
      { name: 'J. Pierre', initials: 'JP' },
    ],
    nextDeparture: 'Demain, 08:30',
    details: [
      { name: 'Paris (Bercy)', time: '08:30', label: 'Départ' },
      { name: 'Auxerre', time: '10:15', label: 'Pause 15 min • Changement chauffeur' },
      { name: 'Macon', time: '11:50', label: 'Arrêt minute' },
      { name: 'Lyon (Perrache)', time: '12:45', label: 'Terminus', isTerminus: true },
    ],
  },
  {
    id: '2',
    code: 'LIGNE 208',
    codeColor: '#22c55e',
    status: 'retardé',
    from: 'Marseille',
    fromStation: 'St Charles',
    to: 'Nice',
    toStation: 'Aéroport',
    departureTime: '10:00',
    arrivalTime: '12:30',
    duration: '2h 30m',
    stops: 0,
    drivers: [{ name: 'J. Polnaref', initials: 'JP' }],
    nextDeparture: 'Aujourd\'hui, 14:00',
    details: [
      { name: 'Marseille (St Charles)', time: '10:00', label: 'Départ' },
      { name: 'Nice (Aéroport)', time: '12:30', label: 'Terminus', isTerminus: true },
    ],
  },
  {
    id: '3',
    code: 'LIGNE 305',
    codeColor: '#f59e0b',
    status: 'actif',
    from: 'Toulouse',
    fromStation: 'Matabiau',
    to: 'Bordeaux',
    toStation: 'St Jean',
    departureTime: '09:00',
    arrivalTime: '12:00',
    duration: '3h 00m',
    stops: 1,
    drivers: [{ name: 'A. Martin', initials: 'AM' }],
    nextDeparture: 'Demain, 09:00',
    details: [
      { name: 'Toulouse (Matabiau)', time: '09:00', label: 'Départ' },
      { name: 'Agen', time: '10:30', label: 'Arrêt 10 min' },
      { name: 'Bordeaux (St Jean)', time: '12:00', label: 'Terminus', isTerminus: true },
    ],
  },
]

const statsCards = [
  { label: 'LIGNES ACTIVES', value: '24', change: '+2 cette semaine', changeColor: '#22c55e', icon: '↗' },
  { label: 'TAUX PONCTUALITÉ', value: '98.2%', sub: 'Derniers 30 jours', icon: null, dotColor: '#3b82f6' },
  { label: 'INCIDENTS', value: '1', sub: 'Maintenance requise (Bus #402)', subColor: '#f59e0b', dotColor: '#ef4444' },
  { label: "CHIFFRE D'AFFAIRE (J)", value: '12.4k', change: '+8.4% vs J-1', changeColor: '#22c55e', dotColor: '#22c55e' },
]

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    actif: { label: 'Actif', color: '#22c55e' },
    retardé: { label: 'Retardé', color: '#f59e0b' },
    suspendu: { label: 'Suspendu', color: '#ef4444' },
  }
  const s = map[status] || { label: status, color: '#6b7280' }
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: s.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

export default function TrajetsPage() {
  const [selectedLine, setSelectedLine] = useState<Line>(mockLines[0])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a1d29' }}>
          Gestion des Trajets
        </h1>
        <Link
          href="/dashboard-agence/trajets/nouveau"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
          style={{ background: '#1a1d29' }}
        >
          <Plus size={16} />
          Nouveau Trajet
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {statsCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 relative" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-start justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                {card.label}
              </p>
              {card.dotColor && (
                <div className="w-3 h-3 rounded-full" style={{ background: card.dotColor }} />
              )}
            </div>
            <p className="text-3xl font-extrabold mb-1" style={{ color: '#1a1d29' }}>
              {card.value}
            </p>
            {card.change && (
              <p className="text-xs font-medium" style={{ color: card.changeColor }}>
                ↗ {card.change}
              </p>
            )}
            {card.sub && (
              <p className="text-xs text-gray-400" style={card.subColor ? { color: card.subColor } : {}}>
                {card.sub}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Content: Lines list + Details */}
      <div className="grid grid-cols-3 gap-5">
        {/* Lignes régulières */}
        <div className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
              Lignes Régulières
            </h2>
            <button className="text-sm font-semibold" style={{ color: '#7c3aed' }}>
              Voir tout
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {mockLines.map((line) => (
              <div
                key={line.id}
                onClick={() => setSelectedLine(line)}
                className={`bg-white rounded-2xl p-5 cursor-pointer transition-all ${
                  selectedLine.id === line.id ? 'ring-2 ring-purple-200' : ''
                }`}
                style={{ border: '1px solid #f0f0f0' }}
              >
                {/* Line header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs font-bold text-white px-3 py-1 rounded-md"
                      style={{ background: line.codeColor }}
                    >
                      {line.code}
                    </span>
                    <StatusBadge status={line.status} />
                  </div>
                  <button className="text-gray-300 hover:text-gray-500 transition">
                    <MoreHorizontal size={18} />
                  </button>
                </div>

                {/* Route */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: '#1a1d29' }}>{line.from}</p>
                    <p className="text-xs text-gray-400">{line.fromStation}</p>
                    <p className="text-xs text-gray-400">Dep: {line.departureTime}</p>
                  </div>

                  {/* Route line */}
                  <div className="flex-1 mx-6 flex items-center">
                    <div className="flex-1 relative">
                      <div className="w-full h-px bg-gray-200" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 px-3 py-1 rounded-lg">
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <Clock size={10} />
                          <span>{line.duration}</span>
                        </div>
                        {line.stops > 0 && (
                          <p className="text-[10px] text-gray-300 text-center">
                            {line.stops} arrêt{line.stops > 1 ? 's' : ''}
                          </p>
                        )}
                        {line.stops === 0 && (
                          <p className="text-[10px] text-gray-300 text-center">Direct</p>
                        )}
                      </div>
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-300" />
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-300" />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: '#1a1d29' }}>{line.to}</p>
                    <p className="text-xs text-gray-400">{line.toStation}</p>
                    <p className="text-xs text-gray-400">Arr: {line.arrivalTime}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {line.drivers.map((d, j) => (
                        <div
                          key={j}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-bold text-white border-2 border-white"
                          style={{ background: '#7c3aed' }}
                        >
                          {d.initials}
                        </div>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      Chauffeurs assignés: {line.drivers.map(d => d.name).join(', ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400">Prochaine départ</p>
                    <p className="text-xs font-bold" style={{ color: '#1a1d29' }}>{line.nextDeparture}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Détails de la ligne sélectionnée */}
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
          <h2 className="text-lg font-bold mb-6" style={{ color: '#1a1d29' }}>
            Détails {selectedLine.code.replace('LIGNE ', 'Ligne ')}
          </h2>

          {/* Timeline */}
          <div className="flex flex-col gap-0">
            {selectedLine.details.map((stop, i) => (
              <div key={i} className="flex gap-4">
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 mt-1 ${
                      stop.isTerminus
                        ? 'bg-gray-800 border-gray-800'
                        : i === 0
                        ? 'bg-white border-gray-400'
                        : 'bg-white border-gray-300'
                    }`}
                  />
                  {i < selectedLine.details.length - 1 && (
                    <div className="w-px flex-1 bg-gray-200 my-1" />
                  )}
                </div>

                {/* Stop info */}
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>
                        {stop.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {stop.label}
                      </p>
                      {stop.label.includes('Changement') && (
                        <span className="text-[10px] font-semibold text-orange-500 mt-1 inline-block">
                          Changement chauffeur
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-500">{stop.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 mt-4 pt-4 border-t border-gray-100">
            <button className="w-full py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
              Modifier itinéraire
            </button>
            <button className="w-full py-2.5 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition">
              Suspendre ligne
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
