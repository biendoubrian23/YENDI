'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Suspense } from 'react'

function SetupPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [invitation, setInvitation] = useState<{ full_name: string; agency_name: string } | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) return

      const { data, error } = await supabase
        .from('invitations')
        .select('full_name, agencies(name)')
        .eq('token', token)
        .eq('status', 'pending')
        .single()

      if (data) {
        setInvitation({
          full_name: data.full_name,
          agency_name: (data.agencies as unknown as { name: string })?.name || '',
        })
      }
    }
    fetchInvitation()
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas')
      return
    }

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }

    setLoading(true)

    try {
      // Mettre à jour le mot de passe via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError('Erreur lors de la mise à jour du mot de passe')
        setLoading(false)
        return
      }

      // Accepter l'invitation côté serveur
      if (token) {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await supabase.rpc('accept_invitation', {
            p_token: token,
            p_user_id: session.user.id,
          })
        }
      }

      setSuccess(true)
      setTimeout(() => router.push('/login'), 3000)
    } catch {
      setError('Une erreur est survenue')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-10" style={{ border: '1px solid #e5e7eb' }}>
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
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

          {success ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-xl font-bold mb-2" style={{ color: '#1a1d29' }}>Compte activé!</h2>
              <p className="text-sm text-gray-500">Redirection vers la page de connexion...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold mb-1" style={{ color: '#1a1d29' }}>
                Créer votre mot de passe
              </h2>
              {invitation && (
                <p className="text-sm text-gray-500 mb-6">
                  Bienvenue <strong>{invitation.full_name}</strong> !
                  Vous avez été invité(e) à rejoindre <strong>{invitation.agency_name}</strong>.
                </p>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className="form-label">NOUVEAU MOT DE PASSE</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 caractères"
                    className="form-input"
                    required
                    minLength={8}
                  />
                </div>

                <div className="mb-6">
                  <label className="form-label">CONFIRMER LE MOT DE PASSE</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le mot de passe"
                    className="form-input"
                    required
                  />
                </div>

                {error && (
                  <div className="mb-4 text-sm text-red-500 text-center font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all"
                  style={{ background: '#f26522' }}
                >
                  {loading ? 'Activation...' : 'Activer mon compte'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function SetupPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Chargement...</div>
      </div>
    }>
      <SetupPasswordForm />
    </Suspense>
  )
}
