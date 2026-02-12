'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  X,
  Users,
  Shield,
  Pencil,
  Trash2,
  Copy,
  Check,
  Mail,
  Phone,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  UserX,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ============================================================
// Types
// ============================================================
interface TeamMember {
  id: string
  profile_id: string
  name: string
  email: string
  phone: string
  role: 'proprietaire' | 'manager' | 'operateur' | 'visiteur'
  is_primary: boolean
  status: 'actif' | 'en_attente' | 'suspendu'
  last_login_at: string | null
  created_at: string
}

interface Driver {
  id: string
  first_name: string
  last_name: string
  phone: string
  status: 'actif' | 'inactif' | 'suspendu'
  created_at: string
}

// ============================================================
// Rôles & Permissions
// ============================================================
const rolePerms: Record<string, { label: string; color: string; bg: string; permissions: string[] }> = {
  proprietaire: {
    label: 'Propriétaire',
    color: '#f26522',
    bg: '#fff7ed',
    permissions: ['Accès complet', 'Gérer l\'équipe', 'Gérer les bus', 'Gérer les trajets', 'Gérer les réservations', 'Voir le dashboard', 'Paramètres'],
  },
  manager: {
    label: 'Manager',
    color: '#3b82f6',
    bg: '#eff6ff',
    permissions: ['Voir le dashboard', 'Gérer les bus', 'Gérer les trajets', 'Gérer les réservations', 'Paramètres'],
  },
  operateur: {
    label: 'Opérateur',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    permissions: ['Gérer les bus', 'Gérer les trajets', 'Gérer les réservations'],
  },
  visiteur: {
    label: 'Visiteur',
    color: '#6b7280',
    bg: '#f9fafb',
    permissions: ['Voir les bus', 'Voir les trajets', 'Voir les réservations'],
  },
}

// ============================================================
// Sub-components
// ============================================================
function RoleBadge({ role }: { role: string }) {
  const r = rolePerms[role] || { label: role, color: '#6b7280', bg: '#f9fafb' }
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-lg"
      style={{ color: r.color, background: r.bg }}
    >
      {r.label}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    actif: { label: 'Actif', color: '#22c55e', bg: '#f0fdf4' },
    en_attente: { label: 'En attente', color: '#f59e0b', bg: '#fffbeb' },
    suspendu: { label: 'Suspendu', color: '#ef4444', bg: '#fef2f2' },
  }
  const s = map[status] || { label: status, color: '#6b7280', bg: '#f9fafb' }
  return (
    <span
      className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg w-fit"
      style={{ color: s.color, background: s.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function formatLastLogin(dateStr: string | null): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return `Aujourd'hui, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' })}`
  } else if (diffDays === 1) {
    return `Hier, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala' })}`
  } else {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Africa/Douala' })
  }
}

// ============================================================
// Modal: Ajouter un membre
// ============================================================
function AddMemberModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: (creds: { email: string; password: string; name: string; role: string }) => void
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'operateur',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/team/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création')
        setLoading(false)
        return
      }

      onSuccess({
        email: data.email,
        password: data.tempPassword,
        name: data.fullName,
        role: data.role,
      })
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>Ajouter un membre</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition" placeholder="Prénom" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition" placeholder="Nom" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Adresse email <span className="text-red-500">*</span>
            </label>
            <input type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition" placeholder="email@exemple.com" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Téléphone</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition" placeholder="+237 6XX XXX XXX" />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Rôle <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {(['manager', 'operateur', 'visiteur'] as const).map((key) => {
                const val = rolePerms[key]
                return (
                  <button key={key} type="button" onClick={() => setFormData({ ...formData, role: key })}
                    className={`p-3 rounded-xl border text-left transition ${formData.role === key ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <p className="text-sm font-bold" style={{ color: val.color }}>{val.label}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{val.permissions.length} permissions</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Permissions du rôle {rolePerms[formData.role]?.label}
            </p>
            <div className="flex flex-col gap-1.5">
              {rolePerms[formData.role]?.permissions.map((p, i) => (
                <span key={i} className="text-xs text-gray-600 flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-green-500" /> {p}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#7c3aed' }}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Création...</> : 'Inviter le membre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// Modal: Succès (mot de passe)
// ============================================================
function SuccessModal({ credentials, onClose, agencyName }: {
  credentials: { email: string; password: string; name: string; role: string }
  onClose: () => void
  agencyName: string
}) {
  const [copied, setCopied] = useState(false)

  const copyPassword = () => {
    navigator.clipboard.writeText(credentials.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendByEmail = () => {
    const subject = encodeURIComponent(`Vos identifiants YENDI — ${agencyName}`)
    const body = encodeURIComponent(
      `Bonjour ${credentials.name},\n\nVotre compte a été créé sur la plateforme YENDI.\n\nIdentifiant : ${credentials.email}\nMot de passe provisoire : ${credentials.password}\nRôle : ${rolePerms[credentials.role]?.label || credentials.role}\n\nConnectez-vous ici : ${window.location.origin}/login\n\nVous serez invité(e) à changer votre mot de passe à la première connexion.\n\nCordialement,\n${agencyName}`
    )
    window.location.href = `mailto:${credentials.email}?subject=${subject}&body=${body}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 text-center">
        <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0fdf4' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
            <Check size={24} className="text-white" strokeWidth={3} />
          </div>
        </div>

        <h2 className="text-xl font-bold mb-1" style={{ color: '#1a1d29' }}>Membre ajouté !</h2>
        <p className="text-sm text-gray-400 mb-5">
          {credentials.name} a été invité(e) avec le rôle <strong>{rolePerms[credentials.role]?.label}</strong>.
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-3 text-left" style={{ border: '1px solid #e5e7eb' }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Email</p>
          <p className="text-sm font-mono text-gray-700">{credentials.email}</p>
        </div>

        <div className="bg-orange-50 rounded-xl p-4 mb-5 text-left" style={{ border: '2px dashed #f2652240' }}>
          <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Mot de passe provisoire</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono font-bold px-3 py-2 bg-white rounded-lg" style={{ color: '#f26522' }}>
              {credentials.password}
            </code>
            <button onClick={copyPassword} className="p-2 rounded-lg hover:bg-orange-100 transition" title="Copier">
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-orange-400" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
            <AlertCircle size={10} /> Le membre devra changer ce mot de passe à sa première connexion.
          </p>
        </div>

        <div className="flex gap-3">
          <button onClick={sendByEmail}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition hover:opacity-90"
            style={{ background: '#7c3aed' }}
          >
            <Send size={14} /> Envoyer par email
          </button>
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Modal: Modifier le rôle
// ============================================================
function EditRoleModal({ member, onClose, onSuccess }: {
  member: TeamMember
  onClose: () => void
  onSuccess: () => void
}) {
  const [selectedRole, setSelectedRole] = useState(member.role)
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (selectedRole === member.role) { onClose(); return }
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch('/api/team/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ memberId: member.id, newRole: selectedRole }),
      })
      if (res.ok) onSuccess()
    } catch { /* silent */ } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>Modifier le rôle</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Changer le rôle de <strong>{member.name}</strong> :</p>
        <div className="flex flex-col gap-2 mb-6">
          {(['manager', 'operateur', 'visiteur'] as const).map((key) => {
            const val = rolePerms[key]
            return (
              <button key={key} type="button" onClick={() => setSelectedRole(key)}
                className={`p-4 rounded-xl border text-left transition ${selectedRole === key ? 'border-purple-300 bg-purple-50' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <p className="text-sm font-bold" style={{ color: val.color }}>{val.label}</p>
                <p className="text-[10px] text-gray-400 mt-1">{val.permissions.join(' • ')}</p>
              </button>
            )
          })}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: '#7c3aed' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Modal: Ajouter un chauffeur
// ============================================================
function AddDriverModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch('/api/drivers/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la création')
        setLoading(false)
        return
      }

      onSuccess()
    } catch {
      setError('Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>Ajouter un chauffeur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition" placeholder="Prénom" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input type="text" required value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition" placeholder="Nom" />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Téléphone <span className="text-red-500">*</span>
            </label>
            <input type="tel" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition" placeholder="+237 6XX XXX XXX" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#22c55e' }}
            >
              {loading ? <><Loader2 size={14} className="animate-spin" />Création...</> : 'Créer le chauffeur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// Modal: Confirmation suppression
// ============================================================
function DeleteConfirmModal({ member, onClose, onConfirm, loading }: {
  member: TeamMember; onClose: () => void; onConfirm: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center">
        <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-50">
          <UserX size={24} className="text-red-500" />
        </div>
        <h2 className="text-lg font-bold mb-2" style={{ color: '#1a1d29' }}>Supprimer ce membre ?</h2>
        <p className="text-sm text-gray-400 mb-6">
          <strong>{member.name}</strong> sera définitivement supprimé(e) de votre équipe.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition">Annuler</button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-semibold bg-red-500 hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PAGE PRINCIPALE
// ============================================================
export default function EquipePage() {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [members, setMembers] = useState<TeamMember[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [agencyName, setAgencyName] = useState('')

  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddDriverModal, setShowAddDriverModal] = useState(false)
  const [successCredentials, setSuccessCredentials] = useState<{ email: string; password: string; name: string; role: string } | null>(null)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const fetchMembers = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const { data: agencyAdmin } = await supabase
        .from('agency_admins')
        .select('agencies(name)')
        .eq('profile_id', session.user.id)
        .single()

      if (agencyAdmin?.agencies) {
        setAgencyName((agencyAdmin.agencies as unknown as { name: string }).name)
      }

      const res = await fetch('/api/team/list', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setMembers(data.members)
      }

      // Charger les chauffeurs
      const driversRes = await fetch('/api/drivers/list', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })

      if (driversRes.ok) {
        const driversData = await driversRes.json()
        setDrivers(driversData)
      }
    } catch { /* silent */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMembers() }, [fetchMembers])

  const filteredMembers = members.filter((m) => {
    const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filterRole === 'all' || m.role === filterRole
    return matchSearch && matchFilter
  })

  const roleStats = {
    total: members.length,
    managers: members.filter(m => m.role === 'manager').length,
    operateurs: members.filter(m => m.role === 'operateur').length,
    visitors: members.filter(m => m.role === 'visiteur').length,
  }

  const handleToggleStatus = async (member: TeamMember) => {
    const newStatus = member.status === 'actif' ? 'suspendu' : 'actif'
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      await fetch('/api/team/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ memberId: member.id, newStatus }),
      })
      fetchMembers()
      setExpandedMember(null)
    } catch { /* silent */ }
  }

  const handleDelete = async () => {
    if (!deletingMember) return
    setDeleteLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(`/api/team/delete?memberId=${deletingMember.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (res.ok) { setDeletingMember(null); setExpandedMember(null); fetchMembers() }
    } catch { /* silent */ } finally { setDeleteLoading(false) }
  }

  const handleResendInvite = (member: TeamMember) => {
    const subject = encodeURIComponent(`Rappel — Vos identifiants YENDI — ${agencyName}`)
    const body = encodeURIComponent(
      `Bonjour ${member.name},\n\nPour rappel, votre compte YENDI est prêt.\n\nIdentifiant : ${member.email}\n\nConnectez-vous ici : ${window.location.origin}/login\n\nCordialement,\n${agencyName}`
    )
    window.location.href = `mailto:${member.email}?subject=${subject}&body=${body}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div>
      {/* Modals */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(creds) => { setShowAddModal(false); setSuccessCredentials(creds); fetchMembers() }}
        />
      )}
      {showAddDriverModal && (
        <AddDriverModal
          onClose={() => setShowAddDriverModal(false)}
          onSuccess={() => { setShowAddDriverModal(false); fetchMembers() }}
        />
      )}
      {successCredentials && (
        <SuccessModal credentials={successCredentials} agencyName={agencyName} onClose={() => setSuccessCredentials(null)} />
      )}
      {editingMember && (
        <EditRoleModal member={editingMember} onClose={() => setEditingMember(null)}
          onSuccess={() => { setEditingMember(null); setExpandedMember(null); fetchMembers() }}
        />
      )}
      {deletingMember && (
        <DeleteConfirmModal member={deletingMember} onClose={() => setDeletingMember(null)} onConfirm={handleDelete} loading={deleteLoading} />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <h1 className="text-3xl font-bold" style={{ color: '#1a1d29' }}>Équipe & Droits</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
            style={{ background: '#7c3aed' }}
          >
            <Plus size={16} /> Ajouter un membre
          </button>
          <button onClick={() => setShowAddDriverModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
            style={{ background: '#22c55e' }}
          >
            <Plus size={16} /> Ajouter un chauffeur
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">ÉQUIPE</p>
          <p className="text-3xl font-extrabold" style={{ color: '#1a1d29' }}>{roleStats.total}</p>
          <p className="text-xs text-gray-400 mt-1">membres au total</p>
        </div>
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">MANAGERS</p>
          <p className="text-3xl font-extrabold" style={{ color: '#3b82f6' }}>{roleStats.managers}</p>
          <p className="text-xs text-gray-400 mt-1">accès complet</p>
        </div>
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">OPÉRATEURS</p>
          <p className="text-3xl font-extrabold" style={{ color: '#8b5cf6' }}>{roleStats.operateurs}</p>
          <p className="text-xs text-gray-400 mt-1">gestion trajets/résa</p>
        </div>
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">VISITEURS</p>
          <p className="text-3xl font-extrabold" style={{ color: '#6b7280' }}>{roleStats.visitors}</p>
          <p className="text-xs text-gray-400 mt-1">lecture seule</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="Rechercher un membre..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-gray-700 w-full" />
        </div>
        <div className="flex gap-2">
          {['all', 'manager', 'operateur', 'visiteur'].map((r) => {
            const labels: Record<string, string> = { all: 'Tous', manager: 'Managers', operateur: 'Opérateurs', visiteur: 'Visiteurs' }
            return (
              <button key={r} onClick={() => setFilterRole(r)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${filterRole === r ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}
              >
                {labels[r]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Members list */}
      <div className="flex flex-col gap-4">
        {filteredMembers.map((member) => {
          const isOwner = member.role === 'proprietaire' && member.is_primary

          return (
            <div key={member.id} className="bg-white rounded-2xl p-5 transition" style={{ border: '1px solid #f0f0f0' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: rolePerms[member.role]?.color || '#6b7280' }}
                  >
                    {member.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{member.name}</p>
                      <RoleBadge role={member.role} />
                      <StatusBadge status={member.status} />
                    </div>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-[11px] text-gray-400 flex items-center gap-1"><Mail size={10} /> {member.email}</span>
                      {member.phone && (
                        <span className="text-[11px] text-gray-400 flex items-center gap-1"><Phone size={10} /> {member.phone}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right mr-4">
                    {member.last_login_at ? (
                      <>
                        <p className="text-[10px] text-gray-400">Dernière connexion</p>
                        <p className="text-xs font-medium" style={{ color: '#1a1d29' }}>{formatLastLogin(member.last_login_at)}</p>
                      </>
                    ) : (
                      <span className="text-[10px] font-semibold text-orange-500 flex items-center gap-1">
                        <Clock size={10} /> Jamais connecté
                      </span>
                    )}
                  </div>
                  {!isOwner && (
                    <button onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                      className="text-gray-300 hover:text-gray-500 transition">
                      <MoreHorizontal size={18} />
                    </button>
                  )}
                </div>
              </div>

              {/* Actions */}
              {expandedMember === member.id && !isOwner && (
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                  <button onClick={() => setEditingMember(member)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                    <Pencil size={12} /> Modifier le rôle
                  </button>
                  {member.status === 'actif' ? (
                    <button onClick={() => handleToggleStatus(member)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-50 transition">
                      <AlertCircle size={12} /> Désactiver
                    </button>
                  ) : member.status === 'suspendu' ? (
                    <button onClick={() => handleToggleStatus(member)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition">
                      <CheckCircle2 size={12} /> Réactiver
                    </button>
                  ) : null}
                  {member.status === 'en_attente' && (
                    <button onClick={() => handleResendInvite(member)}
                      className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition">
                      <Send size={12} /> Renvoyer l&apos;invitation
                    </button>
                  )}
                  <button onClick={() => setDeletingMember(member)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition ml-auto">
                    <Trash2 size={12} /> Supprimer
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {filteredMembers.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '1px solid #f0f0f0' }}>
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun membre trouvé</p>
          </div>
        )}
      </div>

      {/* Section Chauffeurs */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1a1d29' }}>Chauffeurs ({drivers.length})</h2>
        <div className="grid grid-cols-4 gap-4">
          {drivers.map((driver) => (
            <div key={driver.id} className="bg-white rounded-xl p-4" style={{ border: '1px solid #f0f0f0' }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: driver.status === 'actif' ? '#22c55e' : '#6b7280' }}
                >
                  {driver.first_name[0]}{driver.last_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: '#1a1d29' }}>
                    {driver.first_name} {driver.last_name}
                  </p>
                  <p className="text-[11px] text-gray-400 flex items-center gap-1">
                    <Phone size={10} /> {driver.phone}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-lg ${
                  driver.status === 'actif' ? 'text-green-600 bg-green-50' : 'text-gray-500 bg-gray-50'
                }`}>
                  {driver.status === 'actif' ? '✓ Actif' : 'Inactif'}
                </span>
              </div>
            </div>
          ))}
          {drivers.length === 0 && (
            <div className="col-span-4 bg-white rounded-xl p-8 text-center" style={{ border: '1px solid #f0f0f0' }}>
              <Users size={32} className="text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun chauffeur. Cliquez sur le bouton ci-dessus pour en ajouter.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rôles & Permissions overview */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1a1d29' }}>Rôles & Permissions</h2>
        <div className="grid grid-cols-3 gap-5">
          {(['manager', 'operateur', 'visiteur'] as const).map((key) => {
            const val = rolePerms[key]
            return (
              <div key={key} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
                <div className="flex items-center gap-2 mb-4">
                  <Shield size={16} style={{ color: val.color }} />
                  <p className="text-sm font-bold" style={{ color: val.color }}>{val.label}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {val.permissions.map((p, i) => (
                    <span key={i} className="text-xs text-gray-600 flex items-center gap-2">
                      <CheckCircle2 size={12} style={{ color: val.color }} /> {p}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
