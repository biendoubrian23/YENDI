'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp,
  Zap,
  Clock,
  BarChart3,
  Activity,
  Users,
  Timer,
  UserCheck,
  Shield,
  Info,
  ChevronDown,
  Check,
  X,
  Search,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

/* ───── Types ───── */
interface Agency {
  id: string
  name: string
  color: string | null
  status: string
}

interface PricingConfig {
  id: string
  agency_id: string
  is_enabled: boolean
  factor_fill_rate_enabled: boolean
  factor_fill_rate_tiers: any[]
  factor_time_proximity_enabled: boolean
  factor_time_proximity_tiers: any[]
  factor_demand_enabled: boolean
  factor_demand_config: any
  factor_velocity_enabled: boolean
  factor_velocity_config: any
  factor_competition_enabled: boolean
  countdown_enabled: boolean
  countdown_duration_minutes: number
  countdown_price_increase: number
  user_personalization_enabled: boolean
  max_price_multiplier: number
  price_step: number
  updated_at: string
}

/* ───── Tooltip Descriptions ───── */
const FACTOR_INFO: Record<string, { title: string; icon: any; description: string; details: string }> = {
  factor_fill_rate: {
    title: 'Taux de remplissage',
    icon: BarChart3,
    description: 'Plus le bus se remplit, plus le prix augmente automatiquement.',
    details:
      'L\'algorithme applique un multiplicateur progressif basé sur le pourcentage de sièges vendus. Exemple : à 30% de remplissage le prix reste stable, à 70% il augmente de ~8%, à 95% de ~25%. Cela maximise les revenus quand la demande est forte sans pénaliser les premiers acheteurs.',
  },
  factor_time_proximity: {
    title: 'Proximité du départ',
    icon: Clock,
    description: 'Plus on se rapproche de l\'heure de départ, plus le prix monte.',
    details:
      'Un bonus en FCFA est ajouté en fonction du nombre d\'heures avant le départ. Ex: +100 FCFA entre 24-72h avant, +500 entre 5-12h, +1200 les 2 dernières heures. Exception intelligente : si le bus est quasi vide (<20%) à moins de 5h du départ, le bonus est annulé pour attirer des passagers.',
  },
  factor_demand: {
    title: 'Demande historique',
    icon: TrendingUp,
    description: 'Ajuste les prix selon le jour et l\'horaire (jours de pointe, heures populaires).',
    details:
      'Se base sur les données de réservation existantes. Les vendredis et dimanches (retours) reçoivent un bonus (+300 FCFA par défaut). Les créneaux populaires (6h-8h, 17h-19h) ajoutent +200 FCFA. Les jours fériés ou veilles de fêtes +500 FCFA. Les créneaux creux (10h-14h) restent au prix normal.',
  },
  factor_velocity: {
    title: 'Vélocité de vente',
    icon: Activity,
    description: 'Détecte la vitesse à laquelle les sièges partent pour ajuster en temps réel.',
    details:
      'Mesure les réservations des 3 dernières heures. Si 5+ sièges vendus/3h → +300 FCFA (forte demande). Si 3-4/3h → +200 FCFA. Si 1-2/3h → +100 FCFA. Si 0 vente en 3h → -100 FCFA (stimulation, sans descendre sous le prix de base).',
  },
  factor_competition: {
    title: 'Concurrence interne',
    icon: Users,
    description: 'Équilibre les prix entre plusieurs bus sur le même trajet.',
    details:
      'S\'il y a plusieurs bus pour le même trajet le même jour, le bus avec le meilleur taux de remplissage aura le prix le plus haut. Le bus le moins rempli garde un prix attractif pour se remplir en priorité. Cela optimise le revenu global.',
  },
  countdown: {
    title: 'Countdown / FOMO',
    icon: Timer,
    description: 'Affiche un compte à rebours persistant : "Ce prix expire dans X temps".',
    details:
      'Quand un utilisateur voit un trajet, un compteur démarre (ex: 2h). Même s\'il se déconnecte et revient, le compteur continue (stocké côté serveur). Après expiration, le prix augmente (ex: +300 FCFA). Un nouveau compteur redémarre avec le prix actualisé. Cela crée un sentiment d\'urgence réel.',
  },
  user_personalization: {
    title: 'Personnalisation FOMO',
    icon: UserCheck,
    description: 'Adapte les messages d\'urgence selon le comportement de chaque utilisateur.',
    details:
      'Basé sur : nombre de recherches sur le même trajet (3ème recherche = messages plus agressifs), historique de réservation (client fidèle = messages doux, nouveau = countdown agressif), heure de connexion (tard le soir = urgence perçue), paniers abandonnés ("Votre prix de 3 200 expire dans 45 min").',
  },
}

/* ───── Toggle Component ───── */
function ToggleSwitch({
  enabled,
  onToggle,
  loading,
}: {
  enabled: boolean
  onToggle: () => void
  loading?: boolean
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
        enabled ? 'bg-indigo-500' : 'bg-gray-300'
      } ${loading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

/* ───── InfoTooltip Component ───── */
function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        className="text-gray-400 hover:text-indigo-500 transition"
      >
        <Info size={15} />
      </button>
      {open && (
        <div className="absolute left-6 top-0 z-50 w-80 p-4 bg-white border border-gray-200 rounded-xl shadow-xl text-sm text-gray-600 leading-relaxed">
          {text}
          <div className="absolute left-[-6px] top-2 w-3 h-3 bg-white border-l border-b border-gray-200 rotate-45" />
        </div>
      )}
    </div>
  )
}

/* ───── Factor Card Component ───── */
function FactorCard({
  factorKey,
  enabled,
  onToggle,
  globalEnabled,
  loading,
}: {
  factorKey: string
  enabled: boolean
  onToggle: () => void
  globalEnabled: boolean
  loading?: boolean
}) {
  const info = FACTOR_INFO[factorKey]
  if (!info) return null
  const Icon = info.icon

  return (
    <div
      className={`p-5 rounded-xl border transition-all duration-200 ${
        enabled && globalEnabled
          ? 'bg-white border-indigo-100 shadow-sm'
          : 'bg-gray-50 border-gray-100 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
              enabled && globalEnabled ? 'bg-indigo-50 text-indigo-500' : 'bg-gray-100 text-gray-400'
            }`}
          >
            <Icon size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-gray-800">{info.title}</h4>
              <InfoTooltip text={info.details} />
            </div>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{info.description}</p>
          </div>
        </div>
        <ToggleSwitch enabled={enabled} onToggle={onToggle} loading={loading || !globalEnabled} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/* ──────── MAIN PAGE ──────── */
/* ═══════════════════════════════════════════ */
export default function YieldManagementPage() {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [selectedAgencyId, setSelectedAgencyId] = useState<string | null>(null)
  const [config, setConfig] = useState<PricingConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [globalStats, setGlobalStats] = useState({ totalAgencies: 0, enabledCount: 0 })
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  /* ─── Fetch agencies ─── */
  const fetchAgencies = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('agencies')
      .select('id, name, color, status, agency_admins(profile_id)')
      .order('name')

    if (data) {
      // Filtrer pour ne garder que les agences avec admin
      const filteredData = data.filter((a: any) => a.agency_admins && a.agency_admins.length > 0)
      setAgencies(filteredData)

      // Count enabled via API (bypasses RLS)
      try {
        const statsRes = await fetch('/api/pricing/config', { method: 'POST' })
        const statsData = await statsRes.json()
        setGlobalStats({
          totalAgencies: filteredData.length,
          enabledCount: statsData.enabledCount || 0,
        })
      } catch {
        setGlobalStats({ totalAgencies: filteredData.length, enabledCount: 0 })
      }

      // Auto-select first if none selected
      if (!selectedAgencyId && filteredData.length > 0) {
        setSelectedAgencyId(filteredData[0].id)
      }
    }
    setLoading(false)
  }, [selectedAgencyId])

  /* ─── Fetch config for selected agency (via API — bypasses RLS) ─── */
  const fetchConfig = useCallback(async () => {
    if (!selectedAgencyId) return
    
    try {
      const res = await fetch(`/api/pricing/config?agency_id=${selectedAgencyId}`)
      const data = await res.json()

      if (res.ok && data && data.id) {
        setConfig(data)
      } else {
        console.error('Failed to fetch pricing config:', data)
        setConfig(null)
      }
    } catch (err) {
      console.error('Pricing config fetch error:', err)
      setConfig(null)
    }
  }, [selectedAgencyId])

  useEffect(() => {
    fetchAgencies()
  }, [])

  useEffect(() => {
    if (selectedAgencyId) {
      fetchConfig()
    }
  }, [selectedAgencyId, fetchConfig])

  /* ─── Helper: update config via API ─── */
  const patchConfig = async (updates: Record<string, any>): Promise<boolean> => {
    if (!config) return false
    try {
      const res = await fetch('/api/pricing/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config_id: config.id, updates }),
      })
      if (!res.ok) return false
      const data = await res.json()
      if (data && data.id) setConfig(data)
      return true
    } catch {
      return false
    }
  }

  /* ─── Toggle a specific factor ─── */
  const toggleFactor = async (field: string) => {
    if (!config) return
    setSaving(true)
    const newValue = !(config as any)[field]

    const ok = await patchConfig({ [field]: newValue })
    if (ok) {
      showSaveMessage(`${newValue ? 'Activé' : 'Désactivé'} avec succès`)
    }
    setSaving(false)
  }

  /* ─── Toggle global yield for agency ─── */
  const toggleGlobal = async () => {
    if (!config) return
    setSaving(true)
    const newValue = !config.is_enabled

    const ok = await patchConfig({ is_enabled: newValue })
    if (ok) {
      setGlobalStats((prev) => ({
        ...prev,
        enabledCount: prev.enabledCount + (newValue ? 1 : -1),
      }))
      showSaveMessage(
        `Yield Management ${newValue ? 'activé' : 'désactivé'} pour cette agence`
      )
    }
    setSaving(false)
  }

  /* ─── Update countdown settings ─── */
  const updateCountdownSettings = async (field: string, value: number) => {
    if (!config) return
    setSaving(true)
    await patchConfig({ [field]: value })
    setSaving(false)
  }

  /* ─── Update max multiplier ─── */
  const updateMaxMultiplier = async (value: number) => {
    if (!config) return
    setSaving(true)
    const ok = await patchConfig({ max_price_multiplier: value })
    if (ok) showSaveMessage('Plafond mis à jour')
    setSaving(false)
  }

  const showSaveMessage = (msg: string) => {
    setSaveMessage(msg)
    setTimeout(() => setSaveMessage(null), 2500)
  }

  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId)
  const filteredAgencies = agencies.filter((a) =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl">
      {/* ───── Page Header ───── */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#1a1d29' }}>
            Yield Management
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Dynamic pricing intelligent — configurez les facteurs de prix par agence
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
            <Zap size={16} className="text-indigo-500" />
            <span className="text-sm font-semibold text-indigo-600">
              {globalStats.enabledCount}/{globalStats.totalAgencies} agences actives
            </span>
          </div>
        </div>
      </div>

      {/* ───── Agency Selector ───── */}
      <div className="mb-6">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
          Sélectionner une agence
        </label>
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-200 rounded-xl text-left hover:border-indigo-300 transition"
          >
            <div className="flex items-center gap-3">
              {selectedAgency && (
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: selectedAgency.color || '#6366f1' }}
                >
                  {selectedAgency.name.charAt(0)}
                </div>
              )}
              <span className="font-medium text-gray-800">
                {selectedAgency?.name || 'Choisir une agence...'}
              </span>
            </div>
            <ChevronDown
              size={18}
              className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-40 overflow-hidden">
              <div className="p-2 border-b border-gray-100">
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher..."
                    className="bg-transparent border-none outline-none text-sm flex-1 text-gray-700"
                  />
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {filteredAgencies.map((agency) => (
                  <button
                    key={agency.id}
                    onClick={() => {
                      setSelectedAgencyId(agency.id)
                      setDropdownOpen(false)
                      setSearchQuery('')
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
                      agency.id === selectedAgencyId ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: agency.color || '#6366f1' }}
                    >
                      {agency.name.charAt(0)}
                    </div>
                    <span className="text-sm font-medium text-gray-700 flex-1">{agency.name}</span>
                    {agency.id === selectedAgencyId && (
                      <Check size={16} className="text-indigo-500" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ───── Config Panel ───── */}
      {config && selectedAgency && (
        <div className="space-y-6">
          {/* Global Toggle */}
          <div
            className={`p-6 rounded-2xl border-2 transition-all duration-300 ${
              config.is_enabled
                ? 'bg-white border-indigo-200 shadow-sm'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    config.is_enabled ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-400'
                  }`}
                >
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-800">
                    Yield Management — {selectedAgency.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {config.is_enabled
                      ? 'Le pricing dynamique est actif pour cette agence'
                      : 'Désactivé — les prix restent fixes (base_price)'}
                  </p>
                </div>
              </div>
              <ToggleSwitch enabled={config.is_enabled} onToggle={toggleGlobal} loading={saving} />
            </div>
          </div>

          {/* Factors Grid */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield size={15} className="text-gray-400" />
              Facteurs de pricing
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FactorCard
                factorKey="factor_fill_rate"
                enabled={config.factor_fill_rate_enabled}
                onToggle={() => toggleFactor('factor_fill_rate_enabled')}
                globalEnabled={config.is_enabled}
                loading={saving}
              />
              <FactorCard
                factorKey="factor_time_proximity"
                enabled={config.factor_time_proximity_enabled}
                onToggle={() => toggleFactor('factor_time_proximity_enabled')}
                globalEnabled={config.is_enabled}
                loading={saving}
              />
              <FactorCard
                factorKey="factor_demand"
                enabled={config.factor_demand_enabled}
                onToggle={() => toggleFactor('factor_demand_enabled')}
                globalEnabled={config.is_enabled}
                loading={saving}
              />
              <FactorCard
                factorKey="factor_velocity"
                enabled={config.factor_velocity_enabled}
                onToggle={() => toggleFactor('factor_velocity_enabled')}
                globalEnabled={config.is_enabled}
                loading={saving}
              />
              <FactorCard
                factorKey="factor_competition"
                enabled={config.factor_competition_enabled}
                onToggle={() => toggleFactor('factor_competition_enabled')}
                globalEnabled={config.is_enabled}
                loading={saving}
              />
            </div>
          </div>

          {/* FOMO Section */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Timer size={15} className="text-gray-400" />
              FOMO &amp; Urgence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FactorCard
                factorKey="countdown"
                enabled={config.countdown_enabled}
                onToggle={() => toggleFactor('countdown_enabled')}
                globalEnabled={config.is_enabled}
                loading={saving}
              />
              <FactorCard
                factorKey="user_personalization"
                enabled={config.user_personalization_enabled}
                onToggle={() => toggleFactor('user_personalization_enabled')}
                globalEnabled={config.is_enabled}
                loading={saving}
              />
            </div>
          </div>

          {/* Countdown & Limits Settings */}
          {config.is_enabled && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Countdown Duration */}
              <div className="p-5 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Timer size={15} className="text-gray-400" />
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Durée countdown
                  </h4>
                  <InfoTooltip text="Durée du compte à rebours affiché aux utilisateurs. Après expiration, le prix augmente. Les valeurs typiques sont entre 30 min et 3h." />
                </div>
                <select
                  value={config.countdown_duration_minutes}
                  onChange={(e) => updateCountdownSettings('countdown_duration_minutes', parseInt(e.target.value))}
                  disabled={!config.countdown_enabled || saving}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-40"
                >
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 heure</option>
                  <option value={90}>1h 30min</option>
                  <option value={120}>2 heures</option>
                  <option value={180}>3 heures</option>
                </select>
              </div>

              {/* Price increase after countdown */}
              <div className="p-5 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={15} className="text-gray-400" />
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Hausse après countdown
                  </h4>
                  <InfoTooltip text="Montant en FCFA ajouté au prix quand le countdown expire. Le prix ne descendra plus après cette hausse." />
                </div>
                <select
                  value={config.countdown_price_increase}
                  onChange={(e) => updateCountdownSettings('countdown_price_increase', parseInt(e.target.value))}
                  disabled={!config.countdown_enabled || saving}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-40"
                >
                  <option value={100}>+100 FCFA</option>
                  <option value={200}>+200 FCFA</option>
                  <option value={300}>+300 FCFA</option>
                  <option value={500}>+500 FCFA</option>
                  <option value={800}>+800 FCFA</option>
                </select>
              </div>

              {/* Max Price Multiplier */}
              <div className="p-5 bg-white rounded-xl border border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={15} className="text-gray-400" />
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Plafond de prix
                  </h4>
                  <InfoTooltip text="Le prix dynamique ne dépassera jamais base_price × ce multiplicateur. Ex: un trajet à 3 000 FCFA avec plafond x1.80 ne dépassera jamais 5 400 FCFA." />
                </div>
                <select
                  value={config.max_price_multiplier}
                  onChange={(e) => updateMaxMultiplier(parseFloat(e.target.value))}
                  disabled={saving}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-40"
                >
                  <option value={1.3}>x1.30 (modéré)</option>
                  <option value={1.5}>x1.50 (équilibré)</option>
                  <option value={1.8}>x1.80 (agressif)</option>
                  <option value={2.0}>x2.00 (maximum)</option>
                </select>
              </div>
            </div>
          )}

          {/* Price Simulation Preview */}
          {config.is_enabled && (
            <div className="p-6 bg-gradient-to-br from-indigo-50 to-white rounded-2xl border border-indigo-100">
              <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                <BarChart3 size={15} className="text-indigo-500" />
                Simulation de prix — Trajet à 3 000 FCFA
              </h3>

              {/* Plafond indicator */}
              <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Plafond actif : x{config.max_price_multiplier.toFixed(2)}</span>
                  {' '}— Le prix ne dépassera jamais{' '}
                  <span className="font-bold">{Math.floor(3000 * config.max_price_multiplier).toLocaleString('fr-FR')} FCFA</span>
                  {' '}(base 3 000 × {config.max_price_multiplier.toFixed(2)})
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Bus vide (10%)', fill: 10, hours: 48, isPeakDay: false, velocity: 0 },
                  { label: '50% rempli', fill: 50, hours: 24, isPeakDay: false, velocity: 2 },
                  { label: '80% rempli', fill: 80, hours: 6, isPeakDay: true, velocity: 4 },
                  { label: 'Quasi plein (95%)', fill: 95, hours: 1, isPeakDay: true, velocity: 6 },
                ].map((sim) => {
                  const BASE = 3000
                  let factorA = 0, factorB = 0, factorC = 0, factorD = 0

                  // Facteur A: Taux de remplissage
                  if (config.factor_fill_rate_enabled) {
                    const tiers = config.factor_fill_rate_tiers || []
                    for (const tier of tiers) {
                      if (sim.fill >= tier.min && sim.fill <= tier.max) {
                        factorA = Math.floor(BASE * (tier.multiplier - 1))
                        break
                      }
                    }
                  }

                  // Facteur B: Proximité du départ
                  if (config.factor_time_proximity_enabled) {
                    const tiers = config.factor_time_proximity_tiers || []
                    for (const tier of tiers) {
                      if (sim.hours >= tier.hours_min && sim.hours < tier.hours_max) {
                        // Logique identique au SQL: bus vide + proche = pas de bonus
                        if (sim.fill < 20 && sim.hours < 5) {
                          factorB = 0
                        } else {
                          factorB = tier.bonus
                        }
                        break
                      }
                    }
                  }

                  // Facteur C: Demande historique (jour de pointe + heure de pointe)
                  if (config.factor_demand_enabled) {
                    const demandCfg = config.factor_demand_config || {}
                    if (sim.isPeakDay) {
                      factorC += demandCfg.peak_day_bonus || 300
                    }
                    // Simuler heure de pointe pour les scénarios tendus
                    if (sim.hours <= 12) {
                      factorC += demandCfg.peak_hour_bonus || 200
                    }
                  }

                  // Facteur D: Vélocité de vente
                  if (config.factor_velocity_enabled) {
                    const veloCfg = config.factor_velocity_config || {}
                    if (sim.velocity >= (veloCfg.high_velocity_threshold || 5)) {
                      factorD = veloCfg.high_velocity_bonus || 300
                    } else if (sim.velocity >= (veloCfg.medium_velocity_threshold || 3)) {
                      factorD = veloCfg.medium_velocity_bonus || 200
                    } else if (sim.velocity >= (veloCfg.low_velocity_threshold || 1)) {
                      factorD = veloCfg.low_velocity_bonus || 100
                    } else {
                      factorD = veloCfg.zero_velocity_penalty || -100
                    }
                  }

                  // Prix sans plafond
                  let rawPrice = BASE + factorA + factorB + factorC + factorD
                  if (rawPrice < BASE) rawPrice = BASE

                  // Plafond
                  const maxP = Math.floor(BASE * config.max_price_multiplier)
                  const isCapped = rawPrice > maxP
                  let price = isCapped ? maxP : rawPrice

                  // Arrondir au palier
                  price = Math.floor(price / config.price_step) * config.price_step

                  const diff = price - BASE
                  const pct = Math.round((diff / BASE) * 100)
                  const savedByCapAmount = isCapped ? rawPrice - price : 0

                  return (
                    <div key={sim.label} className={`bg-white rounded-xl p-4 text-center shadow-sm border ${isCapped ? 'border-amber-300' : 'border-transparent'}`}>
                      <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">{sim.label}</p>
                      <p className="text-lg font-bold text-gray-800">
                        {price.toLocaleString('fr-FR')} <span className="text-xs font-normal text-gray-400">FCFA</span>
                      </p>
                      {diff > 0 && (
                        <p className="text-xs font-semibold text-emerald-600 mt-1">
                          +{diff.toLocaleString('fr-FR')} ({pct}%)
                        </p>
                      )}
                      {diff === 0 && (
                        <p className="text-xs text-gray-400 mt-1">Prix de base</p>
                      )}
                      {isCapped && (
                        <p className="text-[10px] font-bold text-amber-600 mt-1.5 flex items-center justify-center gap-1">
                          <AlertTriangle size={10} /> PLAFONNÉ
                          <span className="font-normal text-amber-500">(-{savedByCapAmount.toLocaleString('fr-FR')})</span>
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Last Updated */}
          <div className="flex items-center justify-between text-xs text-gray-400 pt-2">
            <span>
              Dernière modification :{' '}
              {new Date(config.updated_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <button
              onClick={fetchConfig}
              className="flex items-center gap-1.5 text-gray-400 hover:text-indigo-500 transition"
            >
              <RefreshCw size={13} />
              Actualiser
            </button>
          </div>
        </div>
      )}

      {/* ───── Save Toast ───── */}
      {saveMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 bg-gray-800 text-white text-sm font-medium rounded-xl shadow-xl animate-fade-in">
          <Check size={16} className="text-emerald-400" />
          {saveMessage}
        </div>
      )}
    </div>
  )
}
