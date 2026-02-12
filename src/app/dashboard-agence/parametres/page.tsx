'use client'

import { useState, useEffect } from 'react'
import {
  Building2,
  Globe,
  MapPin,
  Palette,
  Bell,
  Shield,
  CreditCard,
  Save,
  Check,
  AlertCircle,
  Mail,
  Phone,
  Clock,
  Eye,
  EyeOff,
  Lock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ParametresPage() {
  const [activeTab, setActiveTab] = useState('general')
  const [saved, setSaved] = useState(false)

  // General settings
  const [agencyData, setAgencyData] = useState({
    name: 'Buca Voyage',
    siret: '123 456 789 00001',
    website: 'www.bucavoyage.com',
    address: '12 Rue du Transport',
    city: 'Toulouse',
    country: 'France',
    phone: '+33 5 61 12 34 56',
    email: 'contact@bucavoyage.com',
    color: '#7c3aed',
  })

  // Notifications
  const [notifications, setNotifications] = useState({
    emailNewReservation: true,
    emailCancellation: true,
    emailDailyReport: false,
    pushNewReservation: true,
    pushIncident: true,
    pushMaintenance: true,
  })

  // Security
  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: '30',
    ipRestriction: false,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs = [
    { id: 'general', label: 'Général', icon: Building2 },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'billing', label: 'Facturation', icon: CreditCard },
  ]

  return (
    <div>
      <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <h1 className="text-3xl font-bold" style={{ color: '#1a1d29' }}>
          Paramètres
        </h1>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
          style={{ background: saved ? '#22c55e' : '#7c3aed' }}
        >
          {saved ? <Check size={16} /> : <Save size={16} />}
          {saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Tabs sidebar */}
        <div className="w-[220px] flex-shrink-0">
          <div className="bg-white rounded-2xl p-3" style={{ border: '1px solid #f0f0f0' }}>
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? 'bg-purple-50 text-purple-700'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={16} strokeWidth={isActive ? 2.2 : 1.8} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {/* General */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Agency Info */}
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <h2 className="text-base font-bold mb-5" style={{ color: '#1a1d29' }}>
                  Informations de l&apos;agence
                </h2>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Nom commercial
                      </label>
                      <input
                        type="text"
                        value={agencyData.name}
                        onChange={(e) => setAgencyData({ ...agencyData, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        SIRET
                      </label>
                      <input
                        type="text"
                        value={agencyData.siret}
                        onChange={(e) => setAgencyData({ ...agencyData, siret: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Site web
                    </label>
                    <div className="flex items-center gap-2">
                      <Globe size={16} className="text-gray-400" />
                      <input
                        type="text"
                        value={agencyData.website}
                        onChange={(e) => setAgencyData({ ...agencyData, website: e.target.value })}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={agencyData.address}
                      onChange={(e) => setAgencyData({ ...agencyData, address: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Ville
                      </label>
                      <input
                        type="text"
                        value={agencyData.city}
                        onChange={(e) => setAgencyData({ ...agencyData, city: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        Pays
                      </label>
                      <input
                        type="text"
                        value={agencyData.country}
                        onChange={(e) => setAgencyData({ ...agencyData, country: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <h2 className="text-base font-bold mb-5" style={{ color: '#1a1d29' }}>
                  Contact
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Téléphone
                    </label>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <input
                        type="tel"
                        value={agencyData.phone}
                        onChange={(e) => setAgencyData({ ...agencyData, phone: e.target.value })}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Email
                    </label>
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <input
                        type="email"
                        value={agencyData.email}
                        onChange={(e) => setAgencyData({ ...agencyData, email: e.target.value })}
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Apparence */}
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <h2 className="text-base font-bold mb-5" style={{ color: '#1a1d29' }}>
                  Apparence
                </h2>
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Couleur principale
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={agencyData.color}
                      onChange={(e) => setAgencyData({ ...agencyData, color: e.target.value })}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={agencyData.color}
                      onChange={(e) => setAgencyData({ ...agencyData, color: e.target.value })}
                      className="w-32 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-mono outline-none focus:border-purple-300 transition"
                    />
                    <div className="flex gap-2">
                      {['#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#1a1d29'].map((c) => (
                        <button
                          key={c}
                          onClick={() => setAgencyData({ ...agencyData, color: c })}
                          className={`w-8 h-8 rounded-full transition ring-offset-2 ${
                            agencyData.color === c ? 'ring-2 ring-gray-400' : ''
                          }`}
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <h2 className="text-base font-bold mb-5" style={{ color: '#1a1d29' }}>
                  Notifications par email
                </h2>
                <div className="space-y-4">
                  {[
                    { key: 'emailNewReservation', label: 'Nouvelle réservation', desc: 'Recevoir un email pour chaque nouvelle réservation' },
                    { key: 'emailCancellation', label: 'Annulation', desc: 'Être notifié en cas d\'annulation de réservation' },
                    { key: 'emailDailyReport', label: 'Rapport quotidien', desc: 'Recevoir un résumé quotidien de l\'activité' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key as keyof typeof notifications],
                          })
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          notifications[item.key as keyof typeof notifications]
                            ? 'bg-purple-600'
                            : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${
                            notifications[item.key as keyof typeof notifications]
                              ? 'translate-x-5'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <h2 className="text-base font-bold mb-5" style={{ color: '#1a1d29' }}>
                  Notifications push
                </h2>
                <div className="space-y-4">
                  {[
                    { key: 'pushNewReservation', label: 'Nouvelles réservations', desc: 'Notification en temps réel' },
                    { key: 'pushIncident', label: 'Incidents', desc: 'Alertes immédiates en cas de problème' },
                    { key: 'pushMaintenance', label: 'Maintenance', desc: 'Rappels de maintenance programmée' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{item.label}</p>
                        <p className="text-xs text-gray-400">{item.desc}</p>
                      </div>
                      <button
                        onClick={() =>
                          setNotifications({
                            ...notifications,
                            [item.key]: !notifications[item.key as keyof typeof notifications],
                          })
                        }
                        className={`w-11 h-6 rounded-full transition-colors relative ${
                          notifications[item.key as keyof typeof notifications]
                            ? 'bg-purple-600'
                            : 'bg-gray-200'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${
                            notifications[item.key as keyof typeof notifications]
                              ? 'translate-x-5'
                              : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Security */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <h2 className="text-base font-bold mb-5" style={{ color: '#1a1d29' }}>
                  Sécurité du compte
                </h2>
                <div className="space-y-5">
                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>
                        Authentification à deux facteurs
                      </p>
                      <p className="text-xs text-gray-400">
                        Renforce la sécurité de votre compte
                      </p>
                    </div>
                    <button
                      onClick={() => setSecurity({ ...security, twoFactor: !security.twoFactor })}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        security.twoFactor ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${
                          security.twoFactor ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between py-3 border-b border-gray-50">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>
                        Durée de session
                      </p>
                      <p className="text-xs text-gray-400">
                        Déconnexion automatique après inactivité
                      </p>
                    </div>
                    <select
                      value={security.sessionTimeout}
                      onChange={(e) => setSecurity({ ...security, sessionTimeout: e.target.value })}
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300"
                    >
                      <option value="15">15 minutes</option>
                      <option value="30">30 minutes</option>
                      <option value="60">1 heure</option>
                      <option value="120">2 heures</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>
                        Restriction par IP
                      </p>
                      <p className="text-xs text-gray-400">
                        Limiter l&apos;accès à certaines adresses IP
                      </p>
                    </div>
                    <button
                      onClick={() => setSecurity({ ...security, ipRestriction: !security.ipRestriction })}
                      className={`w-11 h-6 rounded-full transition-colors relative ${
                        security.ipRestriction ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-transform ${
                          security.ipRestriction ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <h2 className="text-base font-bold mb-5" style={{ color: '#1a1d29' }}>
                  Changer le mot de passe
                </h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Mot de passe actuel
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      placeholder="Minimum 6 caractères"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Confirmer
                    </label>
                    <input
                      type="password"
                      placeholder="Retapez le mot de passe"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                    />
                  </div>
                  <button
                    className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
                    style={{ background: '#7c3aed' }}
                  >
                    Mettre à jour
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Billing */}
          {activeTab === 'billing' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-bold" style={{ color: '#1a1d29' }}>
                    Plan actuel
                  </h2>
                  <span className="text-xs font-bold px-3 py-1 rounded-lg text-purple-700 bg-purple-50">
                    Standard
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-5">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Commission YENDI</p>
                    <p className="text-2xl font-extrabold" style={{ color: '#1a1d29' }}>10%</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Revenus ce mois</p>
                    <p className="text-2xl font-extrabold" style={{ color: '#22c55e' }}>24,500€</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Commission due</p>
                    <p className="text-2xl font-extrabold" style={{ color: '#f59e0b' }}>2,450€</p>
                  </div>
                </div>

                <div className="bg-purple-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-purple-700 mb-1">
                    ✨ Passer au plan Premium
                  </p>
                  <p className="text-[11px] text-purple-500">
                    Commission réduite à 7%, support prioritaire, analytics avancés et plus encore.
                  </p>
                  <button className="mt-3 px-4 py-2 text-xs font-semibold text-white rounded-lg transition hover:opacity-90" style={{ background: '#7c3aed' }}>
                    Découvrir le Premium
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #f0f0f0' }}>
                <h2 className="text-base font-bold mb-5" style={{ color: '#1a1d29' }}>
                  Historique des reversements
                </h2>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3">Période</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3">Revenus</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3">Commission</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3">Net versé</th>
                      <th className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider py-3">Statut</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { period: 'Janvier 2026', revenue: '18,200€', commission: '1,820€', net: '16,380€', status: 'payé' },
                      { period: 'Décembre 2025', revenue: '22,450€', commission: '2,245€', net: '20,205€', status: 'payé' },
                      { period: 'Novembre 2025', revenue: '15,800€', commission: '1,580€', net: '14,220€', status: 'payé' },
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-3 text-sm font-medium" style={{ color: '#1a1d29' }}>{row.period}</td>
                        <td className="py-3 text-sm text-gray-500">{row.revenue}</td>
                        <td className="py-3 text-sm text-gray-500">{row.commission}</td>
                        <td className="py-3 text-sm font-bold" style={{ color: '#22c55e' }}>{row.net}</td>
                        <td className="py-3">
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg text-green-600 bg-green-50">
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
