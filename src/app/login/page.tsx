'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import { Eye, EyeOff, Check, Lock } from 'lucide-react'

function ChangePasswordModal({
  onSubmit,
  loading,
  error,
}: {
  onSubmit: (password: string) => void
  loading: boolean
  error: string
}) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [localError, setLocalError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError('')

    if (newPassword.length < 6) {
      setLocalError('Le mot de passe doit contenir au moins 6 caractères')
      return
    }
    if (newPassword !== confirmPassword) {
      setLocalError('Les mots de passe ne correspondent pas')
      return
    }
    onSubmit(newPassword)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl mx-auto mb-6 flex items-center justify-center" style={{ background: '#fff7ed' }}>
          <Lock size={28} style={{ color: '#f26522' }} />
        </div>

        <h2 className="text-xl font-bold text-center mb-2" style={{ color: '#1a1d29' }}>
          Modifier votre mot de passe
        </h2>
        <p className="text-sm text-gray-400 text-center mb-6">
          C&apos;est votre première connexion. Veuillez définir un nouveau mot de passe sécurisé.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* New Password */}
          <div>
            <label className="form-label">NOUVEAU MOT DE PASSE</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 caractères"
                className="form-input pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="form-label">CONFIRMER LE MOT DE PASSE</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Retapez le mot de passe"
                className="form-input pr-12"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Password match indicator */}
          {confirmPassword && (
            <div className={`text-xs flex items-center gap-1 ${newPassword === confirmPassword ? 'text-green-500' : 'text-red-500'}`}>
              {newPassword === confirmPassword ? (
                <><Check size={12} /> Les mots de passe correspondent</>
              ) : (
                <><span>✕</span> Les mots de passe ne correspondent pas</>
              )}
            </div>
          )}

          {/* Error */}
          {(localError || error) && (
            <p className="text-sm text-red-500 text-center font-medium">
              {localError || error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all disabled:opacity-50"
            style={{ background: '#f26522' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#e05a1a')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#f26522')}
          >
            {loading ? 'Modification...' : 'Valider le nouveau mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}

function SuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-8 text-center">
        {/* Checkmark */}
        <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: '#ecfdf5' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
            <Check size={28} className="text-white" strokeWidth={3} />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-2" style={{ color: '#1a1d29' }}>
          Mot de passe modifié !
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Votre mot de passe a été mis à jour avec succès.<br />
          Votre compte est maintenant actif.
        </p>

        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <p className="text-xs text-blue-600 font-medium">
            🎉 Bienvenue sur YENDI ! Votre tableau de bord sera bientôt disponible.
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl font-semibold text-sm text-white transition"
          style={{ background: '#1a1d29' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#2d3142')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1a1d29')}
        >
          Compris
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [changePasswordError, setChangePasswordError] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('Identifiants incorrects')
        setLoading(false)
        return
      }

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

      // Si c'est un admin en attente → forcer changement de mdp
      if (profile.role === 'admin' && profile.status === 'en_attente') {
        setShowChangePassword(true)
        setLoading(false)
        return
      }

      // Redirection selon le rôle
      if (profile.role === 'superadmin') {
        router.push('/dashboard')
      } else if (profile.role === 'admin') {
        router.push('/dashboard-agence')
      } else {
        setError('Rôle non reconnu')
        await supabase.auth.signOut()
      }
    } catch {
      setError('Erreur de connexion')
    }

    setLoading(false)
  }

  const handleChangePassword = async (newPassword: string) => {
    setChangePasswordError('')
    setChangingPassword(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setChangePasswordError('Session expirée. Reconnectez-vous.')
        setChangingPassword(false)
        return
      }

      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ new_password: newPassword }),
      })

      const result = await res.json()

      if (!res.ok) {
        setChangePasswordError(result.error || 'Erreur lors du changement')
        setChangingPassword(false)
        return
      }

      // Succès → afficher modal de succès
      setShowChangePassword(false)
      setShowSuccess(true)
    } catch {
      setChangePasswordError('Erreur réseau. Réessayez.')
    }

    setChangingPassword(false)
  }

  const handleSuccessClose = async () => {
    await supabase.auth.signOut()
    setShowSuccess(false)
    setEmail('')
    setPassword('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      {/* Modal changement de mot de passe */}
      {showChangePassword && (
        <ChangePasswordModal
          onSubmit={handleChangePassword}
          loading={changingPassword}
          error={changePasswordError}
        />
      )}

      {/* Modal succès */}
      {showSuccess && <SuccessModal onClose={handleSuccessClose} />}

      <div className="w-full max-w-md">
        <div
          className="bg-white rounded-2xl shadow-lg p-10"
          style={{ border: '1px solid #e5e7eb' }}
        >
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <Image 
              src="/yendilogo.png" 
              alt="YENDI Logo" 
              width={150} 
              height={50}
              className="object-contain"
            />
            <span className="text-2xl font-light text-gray-400 ml-1">Admin</span>
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="form-input pl-4 pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
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
