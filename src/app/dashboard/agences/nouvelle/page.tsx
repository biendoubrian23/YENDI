'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, RefreshCw, Shield, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const countries = [
  { code: 'FR', label: 'France', flag: '🇫🇷' },
  { code: 'CI', label: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'SN', label: 'Sénégal', flag: '🇸🇳' },
  { code: 'CM', label: 'Cameroun', flag: '🇨🇲' },
]

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'Yendi-'
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  result += '-' + new Date().getFullYear()
  return result
}

export default function NouvelleAgencePage() {
  const router = useRouter()
  const [selectedCountry, setSelectedCountry] = useState('CI')
  const [password, setPassword] = useState(generatePassword())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    nomCommercial: '',
    siret: '',
    siteWeb: '',
    adresse: '',
    ville: '',
    superviseurNom: '',
    superviseurEmail: '',
  })

  const handleGenerate = () => {
    setPassword(generatePassword())
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Session expirée. Reconnectez-vous.')
        setSubmitting(false)
        return
      }

      const res = await fetch('/api/agencies/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          name: formData.nomCommercial,
          siret_number: formData.siret || null,
          website: formData.siteWeb || null,
          address: formData.adresse,
          city: formData.ville || selectedCountry,
          country_code: selectedCountry,
          admin_name: formData.superviseurNom,
          admin_email: formData.superviseurEmail,
          temp_password: password,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || 'Erreur lors de la création')
        setSubmitting(false)
        return
      }

      router.push('/dashboard/agences')
    } catch {
      setError('Erreur réseau. Réessayez.')
    }

    setSubmitting(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Breadcrumb + Cancel */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm">
          <Link href="/dashboard/agences" className="text-gray-400 hover:text-gray-600 transition">
            Agences
          </Link>
          <span className="text-gray-300">{'>'}</span>
          <span className="font-medium" style={{ color: '#f26522' }}>Création</span>
        </div>
        <Link
          href="/dashboard/agences"
          className="text-sm text-gray-500 hover:text-gray-700 font-medium"
        >
          Annuler
        </Link>
      </div>

      {/* Title */}
      <h1 className="page-title mb-1">Enregistrer une agence</h1>
      <p className="page-subtitle mb-8">
        Configurez le profil commercial et assignez un administrateur principal.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Form */}
          <div className="col-span-2 space-y-8">
            {/* Identité de l'Agence */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#eef4ff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
                  Identité de l&apos;Agence
                </h2>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nom Commercial"
                  className="form-input"
                  value={formData.nomCommercial}
                  onChange={(e) => setFormData({ ...formData, nomCommercial: e.target.value })}
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Numéro Siret / Registre"
                    className="form-input"
                    value={formData.siret}
                    onChange={(e) => setFormData({ ...formData, siret: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="Site Internet (Optionnel)"
                    className="form-input"
                    value={formData.siteWeb}
                    onChange={(e) => setFormData({ ...formData, siteWeb: e.target.value })}
                  />
                </div>

                <input
                  type="text"
                  placeholder="Adresse du Siège"
                  className="form-input"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  required
                />

                <input
                  type="text"
                  placeholder="Ville"
                  className="form-input"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  required
                />

                {/* Localisation */}
                <div>
                  <label className="form-label">LOCALISATION</label>
                  <div className="flex gap-3 mt-2">
                    {countries.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => setSelectedCountry(c.code)}
                        className={`flex flex-col items-center gap-1 px-5 py-3 rounded-xl border-2 transition ${
                          selectedCountry === c.code
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="text-xl">{c.flag}</span>
                        <span className="text-xs font-bold">{c.code}</span>
                        <span className="text-[10px] text-gray-400">{c.label}</span>
                      </button>
                    ))}
                    <button
                      type="button"
                      className="flex flex-col items-center justify-center gap-1 px-5 py-3 rounded-xl border-2 border-dashed border-gray-200 hover:border-gray-300 transition"
                    >
                      <span className="text-gray-400 text-sm">Autre...</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Superviseur Agence */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f0f0ff' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
                  Superviseur Agence
                </h2>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Nom complet"
                    className="form-input"
                    value={formData.superviseurNom}
                    onChange={(e) => setFormData({ ...formData, superviseurNom: e.target.value })}
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email professionnel"
                    className="form-input"
                    value={formData.superviseurEmail}
                    onChange={(e) => setFormData({ ...formData, superviseurEmail: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0">MOT DE PASSE PROVISOIRE</label>
                    <button
                      type="button"
                      onClick={handleGenerate}
                      className="text-xs font-medium flex items-center gap-1 hover:opacity-70 transition"
                      style={{ color: '#f26522' }}
                    >
                      <RefreshCw size={12} />
                      Générer
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={password}
                      readOnly
                      className="form-input flex-1 font-mono"
                      style={{ background: '#f9fafb' }}
                    />
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(password)}
                      className="w-11 h-11 rounded-xl border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 transition"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                    <span>ℹ️</span> L&apos;administrateur devra changer ce mot de passe à la première connexion.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
              <div className="w-24 h-24 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3 cursor-pointer hover:bg-gray-200 transition">
                <Camera size={28} className="text-gray-400" />
              </div>
              <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>
                Logo de l&apos;agence
              </p>
              <p className="text-xs text-gray-400 mt-1">
                PNG, JPG ou SVG (Max 2MB)
              </p>
            </div>

            {/* Récapitulatif */}
            <div
              className="rounded-2xl p-6 text-white"
              style={{ background: '#1a1d29' }}
            >
              <h3 className="text-base font-bold mb-4">Récapitulatif</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Plan</span>
                  <span className="font-semibold">Standard</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Licences Admin</span>
                  <span className="font-semibold">1 Incluse</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Statut</span>
                  <span className="status-badge status-actif" style={{ color: '#22c55e' }}>
                    <span className="status-dot" style={{ background: '#22c55e' }} />
                    Actif
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-6 py-3 rounded-xl font-semibold text-sm text-white transition disabled:opacity-50"
                style={{ background: '#f26522' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#e05a1a')}
                onMouseLeave={(e) => (e.currentTarget.style.background = '#f26522')}
              >
                {submitting ? 'Création en cours...' : "Créer l'agence"}
              </button>

              {error && (
                <p className="text-sm text-red-500 text-center mt-3 font-medium">{error}</p>
              )}
            </div>

            {/* Security note */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#ecfdf5' }}>
                  <Shield size={14} style={{ color: '#22c55e' }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>Sécurité</p>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Un email d&apos;invitation sécurisé sera automatiquement envoyé à l&apos;administrateur avec ses accès.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-12 pb-6">
        © 2024 YENDI Travel System. Tous droits réservés.
      </p>
    </div>
  )
}
