'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  Clock,
  Calendar,
  AlertCircle,
  Bus,
  User,
  Check,
  MapPin,
} from 'lucide-react'

const existingLines = [
  { id: '1', name: 'Paris → Lyon', code: 'LIGNE 104' },
  { id: '2', name: 'Marseille → Nice', code: 'LIGNE 208' },
  { id: '3', name: 'Toulouse → Bordeaux', code: 'LIGNE 305' },
]

const availableBuses = [
  { id: '1', name: 'Mercedes Tourismo #402', seats: 54, features: ['WiFi', 'WC'], available: true },
  { id: '2', name: 'Irizar i6 #405', seats: 58, features: ['Standard'], available: true },
  { id: '3', name: 'Volvo 9700 #301', seats: 50, features: ['WiFi', 'Prises USB'], available: false },
]

const availableDrivers = [
  { id: '1', name: 'Jean-Michel Dupont', status: 'Dispo' },
  { id: '2', name: 'Pierre Martin', status: 'Dispo' },
  { id: '3', name: 'Sophie Bernard', status: 'En route' },
]

export default function NouveauTrajetPage() {
  const [selectedLine, setSelectedLine] = useState('')
  const [selectedBus, setSelectedBus] = useState('1')
  const [selectedDriver, setSelectedDriver] = useState('1')
  const [pricingMode, setPricingMode] = useState<'yield' | 'fixed'>('yield')
  const [basePrice, setBasePrice] = useState('29,00')
  const [departureDate, setDepartureDate] = useState('')
  const [departureTime, setDepartureTime] = useState('08:00')
  const [arrivalTime, setArrivalTime] = useState('13:30')
  const [addRelay, setAddRelay] = useState(false)

  const selectedLineData = existingLines.find(l => l.id === selectedLine)
  const selectedBusData = availableBuses.find(b => b.id === selectedBus)
  const selectedDriverData = availableDrivers.find(d => d.id === selectedDriver)

  return (
    <div className="flex gap-6">
      {/* Main Form */}
      <div className="flex-1 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard-agence/trajets" className="text-gray-400 hover:text-gray-600 text-sm transition">
                ← Trajets
              </Link>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#1a1d29' }}>
              Planification de Voyage
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              REF-{new Date().getFullYear()}-{Math.floor(Math.random() * 900 + 100)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300" />
              Brouillon
            </button>
            <Link
              href="/dashboard-agence/trajets"
              className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Annuler
            </Link>
            <button
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90"
              style={{ background: '#1a1d29' }}
            >
              Publier le trajet
            </button>
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {/* 01 - Itinéraire & Ligne */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-bold text-gray-400">01</span>
              <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>Itinéraire & Ligne</h2>
            </div>

            <div className="mb-4">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                Sélection de la ligne
              </label>
              <select
                value={selectedLine}
                onChange={(e) => setSelectedLine(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition"
              >
                <option value="">Choisir une ligne existante...</option>
                {existingLines.map((line) => (
                  <option key={line.id} value={line.id}>{line.name} ({line.code})</option>
                ))}
              </select>
            </div>

            {selectedLineData && (
              <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Départ</p>
                  <p className="text-lg font-bold" style={{ color: '#1a1d29' }}>PARIS</p>
                  <p className="text-xs text-gray-400">Gare de Bercy Seine</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-px bg-gray-300" />
                  <div className="text-center">
                    <p className="text-[10px] text-gray-400">≈430 KM</p>
                    <p className="text-xs font-semibold text-red-400">⏱ 5h 30m</p>
                  </div>
                  <div className="w-20 h-px bg-gray-300" />
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400 uppercase mb-1">Arrivée</p>
                  <p className="text-lg font-bold" style={{ color: '#1a1d29' }}>LYON</p>
                  <p className="text-xs text-gray-400">Gare de Perrache</p>
                </div>
              </div>
            )}
          </div>

          {/* 02 - Horaires & Dates */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-bold text-gray-400">02</span>
              <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>Horaires & Dates</h2>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Date & heure de départ
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                  />
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Arrivée estimée
                </label>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500">
                    Même jour
                  </span>
                  <input
                    type="time"
                    value={arrivalTime}
                    onChange={(e) => setArrivalTime(e.target.value)}
                    className="w-24 px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl">
              <AlertCircle size={16} className="text-orange-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-semibold text-orange-600">Attention aux heures de pointe</p>
                <p className="text-[11px] text-orange-400">
                  Un départ à 08:00 un Lundi implique un risque de retard de +45min à la sortie de Paris.
                </p>
              </div>
            </div>
          </div>

          {/* 03 - Affectation Bus & Chauffeur */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-bold text-gray-400">03</span>
              <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>Affectation Bus & Chauffeur</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Véhicule */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                  Véhicule
                </label>
                <div className="space-y-2">
                  {availableBuses.map((bus) => (
                    <label
                      key={bus.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition border ${
                        selectedBus === bus.id
                          ? 'border-purple-300 bg-purple-50'
                          : 'border-gray-100 hover:border-gray-200'
                      } ${!bus.available ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      <input
                        type="radio"
                        name="bus"
                        value={bus.id}
                        checked={selectedBus === bus.id}
                        onChange={(e) => bus.available && setSelectedBus(e.target.value)}
                        className="sr-only"
                        disabled={!bus.available}
                      />
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f3f4f6' }}>
                        <Bus size={14} className="text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>
                          {bus.name}
                          {selectedBus === bus.id && bus.available && (
                            <span className="ml-2 text-purple-500">●</span>
                          )}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {bus.seats} Places • {bus.features.join(' • ')}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Chauffeur */}
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3 block">
                  Chauffeur Principal
                </label>
                <select
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-gray-400 transition mb-4"
                >
                  {availableDrivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} ({driver.status})
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addRelay}
                    onChange={(e) => setAddRelay(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  Ajouter un conducteur secondaire (Relais)
                </label>
              </div>
            </div>
          </div>

          {/* 04 - Tarification */}
          <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
            <div className="flex items-center gap-3 mb-5">
              <span className="text-xs font-bold text-gray-400">04</span>
              <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>Tarification</h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Prix de base
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-2xl font-bold outline-none focus:border-gray-400"
                    style={{ color: '#1a1d29' }}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-lg text-gray-400">€</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Prix minimum standard</p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 block">
                  Options de remplissage
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPricingMode('yield')}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition ${
                      pricingMode === 'yield'
                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-sm">Yield Management</p>
                    <p className="text-[10px] font-normal mt-0.5 opacity-70">
                      Augmente auto. selon la demande
                    </p>
                  </button>
                  <button
                    onClick={() => setPricingMode('fixed')}
                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold border transition ${
                      pricingMode === 'fixed'
                        ? 'border-purple-300 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-sm">Prix Fixe</p>
                    <p className="text-[10px] font-normal mt-0.5 opacity-70">
                      Pas de fluctuation
                    </p>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sidebar - Aperçu Billet */}
      <div className="w-[300px] flex-shrink-0">
        <div className="sticky top-24 space-y-5">
          {/* Ticket preview */}
          <div className="bg-gray-900 text-white rounded-2xl p-5">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Aperçu Billet
            </p>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-extrabold">PAR</p>
                <p className="text-[10px] text-gray-400">08:00</p>
              </div>
              <div className="flex items-center gap-2 text-gray-500">
                <div className="w-8 h-px bg-gray-600" />
                <Bus size={14} />
                <div className="w-8 h-px bg-gray-600" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-extrabold">LYO</p>
                <p className="text-[10px] text-gray-400">{arrivalTime}</p>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-gray-700 pt-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="font-medium">{departureDate || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Bus</span>
                <span className="font-medium">{selectedBusData?.name.split(' ').slice(0, 2).join(' ') || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Chauffeur</span>
                <span className="font-medium">
                  {selectedDriverData ? selectedDriverData.name.split(' ').map((n, i) => i === 0 ? n[0] + '.-' : n).join('') : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Capacité Totale</span>
                <span className="text-xl font-extrabold">{selectedBusData?.seats || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Prix Départ</span>
                <span className="text-xl font-extrabold">{basePrice}€</span>
              </div>
            </div>
          </div>

          {/* Checklist */}
          <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
            <p className="text-sm font-bold mb-3" style={{ color: '#1a1d29' }}>Checklist</p>
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm" style={{ background: selectedBus ? '#22c55e' : '#e5e7eb' }} />
                <span className={selectedBus ? 'text-gray-700' : 'text-gray-400'}>Bus disponible</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm" style={{ background: selectedDriver ? '#22c55e' : '#e5e7eb' }} />
                <span className={selectedDriver ? 'text-gray-700' : 'text-gray-400'}>Chauffeur qualifié</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-sm" style={{ background: selectedLine ? '#22c55e' : '#e5e7eb' }} />
                <span className={selectedLine ? 'text-gray-700' : 'text-gray-400'}>Ligne active</span>
              </div>
            </div>
          </div>

          {/* Taux remplissage */}
          <div className="rounded-2xl p-5 text-white" style={{ background: '#7c3aed' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-80">Taux remplissage</p>
            <p className="text-3xl font-extrabold mt-1">84%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
