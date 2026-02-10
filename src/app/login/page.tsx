'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Authentification via Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Identifiants incorrects')
        setLoading(false)
        return
      }

      // Vérifier le rôle dans la table profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, status, full_name')
        .eq('id', data.user.id)
        .single()

      if (profileError || !profile) {
        setError('Profil introuvable')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      if (profile.status === 'suspendu') {
        setError('Votre compte est suspendu. Contactez l\'administrateur.')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // Redirection selon le rôle
      if (profile.role === 'superadmin') {
        router.push('/dashboard')
      } else if (profile.role === 'admin') {
        // Dashboard admin (à coder plus tard)
        router.push('/admin')
      } else {
        setError('Rôle non reconnu')
        await supabase.auth.signOut()
      }
    } catch {
      setError('Erreur de connexion')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-2xl shadow-lg p-10"
          style={{ border: '1px solid #e5e7eb' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
              style={{ background: '#1a1d29' }}
            >
              Y.
            </div>
            <div>
              <span className="text-2xl font-bold" style={{ color: '#1a1d29' }}>YENDI</span>
              <span className="text-2xl font-light text-gray-400 ml-1">Admin</span>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            {/* Identifiant */}
            <div className="mb-6">
              <label className="form-label">IDENTIFIANT</label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@yendi.pro"
                  className="form-input pl-4"
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div className="mb-8">
              <label className="form-label">MOT DE PASSE</label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-4"
                  required
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 text-sm text-red-500 text-center font-medium">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all"
              style={{ background: '#1a1d29' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#2d3142')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1d29')}
            >
              {loading ? 'Connexion...' : 'Accéder à la plateforme'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Simulateur de Système de Gestion de Flotte v2.0
          </p>
        </div>
      </div>
    </div>
  )
}
