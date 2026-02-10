'use client'

import { useState } from 'react'
import { TrendingUp, Users, Bus, AlertTriangle, ArrowUpRight, Clock } from 'lucide-react'

// Mock data pour le dashboard
const statsCards = [
  {
    label: 'Revenu Journalier',
    value: '12,450€',
    change: '+12%',
    changeType: 'up',
    icon: null,
    accentColor: '#7c3aed',
    hasBorder: true,
  },
  {
    label: "Taux d'occupation",
    value: '84%',
    change: null,
    changeType: null,
    icon: Users,
    iconColor: '#3b82f6',
    progress: 84,
    hasBorder: false,
  },
  {
    label: 'Flotte Active',
    value: '42',
    sub: '/50',
    change: null,
    icon: Bus,
    iconColor: '#f26522',
    hasBorder: false,
  },
  {
    label: 'Incidents',
    value: '2',
    badge: 'Action requise',
    badgeColor: '#ef4444',
    icon: null,
    hasBorder: false,
  },
]

const weeklyData = [
  { day: 'Lun', value: 35 },
  { day: 'Mar', value: 50 },
  { day: 'Mer', value: 45 },
  { day: 'Jeu', value: 62 },
  { day: 'Ven', value: 75 },
  { day: 'Sam', value: 85 },
  { day: 'Dim', value: 70 },
]

const planningTonight = [
  {
    from: 'Paris',
    to: 'Lyon',
    time: '20:30',
    bus: 'Bus #402',
    status: 'delay',
    statusLabel: 'Retard probable (10m)',
    dotColor: '#3b82f6',
  },
  {
    from: 'Marseille',
    to: 'Nice',
    time: '21:00',
    bus: 'Bus #104',
    status: 'ok',
    statusLabel: null,
    dotColor: '#d1d5db',
  },
  {
    from: 'Lille',
    to: 'Bruxelles',
    time: '22:15',
    bus: 'Bus #309',
    status: 'ok',
    statusLabel: null,
    dotColor: '#d1d5db',
  },
]

export default function DashboardAgencePage() {
  const [period, setPeriod] = useState('Cette Semaine')
  const maxValue = Math.max(...weeklyData.map(d => d.value))

  return (
    <div>
      {/* Titre */}
      <h1 className="text-2xl font-bold mb-6" style={{ color: '#1a1d29' }}>
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
                  style={{ background: card.badgeColor }}
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
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
              Performances des ventes
            </h2>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="text-sm text-gray-500 bg-transparent border border-gray-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer"
            >
              <option>Cette Semaine</option>
              <option>Ce Mois</option>
              <option>Ce Trimestre</option>
            </select>
          </div>

          {/* Bar chart */}
          <div className="flex items-end justify-between gap-3 h-[200px] px-2">
            {weeklyData.map((item, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-1">
                <div className="w-full flex justify-center">
                  <div
                    className="w-10 rounded-lg transition-all hover:opacity-80"
                    style={{
                      height: `${(item.value / maxValue) * 180}px`,
                      background: `linear-gradient(to top, #c4b5fd, #ede9fe)`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-400 font-medium">{item.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Planification ce soir */}
        <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
          <h2 className="text-lg font-bold mb-6" style={{ color: '#1a1d29' }}>
            Planification ce soir
          </h2>

          <div className="flex flex-col gap-5">
            {planningTonight.map((trip, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className="w-2.5 h-2.5 rounded-full mt-1"
                    style={{ background: trip.dotColor }}
                  />
                  {i < planningTonight.length - 1 && (
                    <div className="w-px flex-1 bg-gray-100 mt-1" />
                  )}
                </div>
                <div className="flex-1 pb-1">
                  <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>
                    {trip.from} → {trip.to}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Départ: {trip.time} • {trip.bus}
                  </p>
                  {trip.statusLabel && (
                    <span className="text-[11px] font-semibold text-orange-500 mt-1 inline-block">
                      {trip.statusLabel}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button className="w-full mt-6 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Voir tout le planning
          </button>
        </div>
      </div>
    </div>
  )
}
