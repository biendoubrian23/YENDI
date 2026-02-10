'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      // Vérifier que c'est un superadmin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, status')
        .eq('id', session.user.id)
        .single()

      if (!profile || profile.role !== 'superadmin' || profile.status !== 'actif') {
        await supabase.auth.signOut()
        router.push('/login')
        return
      }

      setAuthenticated(true)
    }

    checkAuth()

    // Écouter les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthenticated(false)
        router.push('/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#ffffff' }}>
        <div className="text-gray-400">Chargement...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" style={{ background: '#ffffff' }}>
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
