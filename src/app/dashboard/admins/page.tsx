'use client'

import { useState, useEffect } from 'react'
import {
  Search,
  Download,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  Copy,
  Phone,
  Mail,
  Building2,
  Shield,
  Check,
  Trash2,
  Send,
  AlertTriangle,
  Pencil,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface AdminRow {
  id: string
  profileId: string
  name: string
  email: string
  phone: string
  agency: string
  agencyId: string
  agencyInitial: string
  agencyColor: string
  role: string
  status: string
  tempPassword: string | null
  createdAt: string
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = { actif: 'Actif', suspendu: 'Suspendu', en_attente: 'En attente' }
  const label = map[status] || status
  const statusClass =
    label === 'Actif'
      ? 'status-actif'
      : label === 'Suspendu'
      ? 'status-suspendu'
      : 'status-inactive'

  return (
    <span className={`status-badge ${statusClass}`}>
      <span className="status-dot" />
      {label}
    </span>
  )
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = { manager: 'Manager', proprietaire: 'Propriétaire', operateur: 'Opérateur' }
  const label = map[role] || role
  const colors: Record<string, string> = {
    Manager: '#3b82f6',
    Propriétaire: '#22c55e',
    Opérateur: '#8b5cf6',
  }
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-md"
      style={{
        background: `${colors[label] || '#6b7280'}15`,
        color: colors[label] || '#6b7280',
      }}
    >
      {label}
    </span>
  )
}

interface Agency {
  id: string
  name: string
  city: string
  color: string
}

function AssignAdminModal({ 
  onClose, 
  onSuccess 
}: { 
  onClose: () => void
  onSuccess: (credentials: { email: string; password: string; fullName: string }) => void
}) {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    agencyId: '',
    role: 'manager',
  })

  useEffect(() => {
    const fetchAgencies = async () => {
      const { data } = await supabase.from('agencies').select('id, name, city, color').order('name')
      setAgencies(data || [])
    }
    fetchAgencies()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admins/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error || 'Erreur lors de la création')
        setLoading(false)
        return
      }

      // Appeler le callback de succès avec les credentials
      onSuccess({
        email: result.email,
        password: result.tempPassword,
        fullName: result.fullName,
      })
    } catch (err) {
      console.error('Erreur création admin:', err)
      alert('Erreur lors de la création')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: '#1a1d29' }}>Assigner un Administrateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="form-input w-full"
                placeholder="Entrez le prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
                Nom de famille <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="form-input w-full"
                placeholder="Entrez le nom"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
              Adresse email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input w-full"
              placeholder="exemple@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="form-input w-full"
              placeholder="+225 XX XX XX XX XX"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
              Agence <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.agencyId}
              onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
              className="form-input w-full"
            >
              <option value="">Sélectionner une agence</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} - {agency.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="form-input w-full"
            >
              <option value="manager">Manager</option>
              <option value="proprietaire">Propriétaire</option>
              <option value="operateur">Opérateur</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: '#f26522' }}
            >
              {loading ? 'Création...' : 'Créer l\'administrateur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AssignSuccessModal({ 
  credentials, 
  onClose 
}: { 
  credentials: { email: string; password: string; fullName: string }
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copyPassword = () => {
    navigator.clipboard.writeText(credentials.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSendEmail = () => {
    const subject = encodeURIComponent('Vos identifiants YENDI')
    const body = encodeURIComponent(
      `Bonjour ${credentials.fullName},\n\nVotre compte administrateur YENDI a été créé.\n\nVoici vos identifiants de connexion :\n\n📧 Identifiant : ${credentials.email}\n🔑 Mot de passe temporaire : ${credentials.password}\n\n🔗 Connectez-vous ici : ${window.location.origin}/login\n\n⚠️ Vous devrez changer votre mot de passe lors de votre première connexion.\n\nCordialement,\nL'équipe YENDI`
    )
    window.location.href = `mailto:${credentials.email}?subject=${subject}&body=${body}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#22c55e15' }}>
            <Check size={32} style={{ color: '#22c55e' }} />
          </div>
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#1a1d29' }}>
            Administrateur créé !
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Le compte a été créé avec succès. Voici les identifiants de connexion :
          </p>

          <div className="bg-gray-50 rounded-xl p-4 mb-4 text-left space-y-3">
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Nom complet</p>
              <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{credentials.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Email (Identifiant)</p>
              <p className="text-sm font-mono" style={{ color: '#1a1d29' }}>{credentials.email}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1">Mot de passe provisoire</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-lg px-3 py-2 font-mono text-sm font-semibold border border-orange-200" style={{ color: '#f26522' }}>
                  {credentials.password}
                </div>
                <button
                  onClick={copyPassword}
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition"
                  style={{ background: copied ? '#22c55e' : '#f26522' }}
                >
                  {copied ? <Check size={16} className="text-white" /> : <Copy size={16} className="text-white" />}
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleSendEmail}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-semibold mb-3 hover:bg-gray-50 transition"
            style={{ borderColor: '#f26522', color: '#f26522' }}
          >
            <Send size={16} />
            Envoyer les identifiants par email
          </button>

          <button
            onClick={onClose}
            className="w-full px-4 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition"
            style={{ backgroundColor: '#1a1d29' }}
          >
            Fermer
          </button>

          <p className="text-xs text-gray-400 mt-4">
            ℹ️ L'administrateur devra changer ce mot de passe à la première connexion.
          </p>
        </div>
      </div>
    </div>
  )
}

function EditAdminModal({ 
  admin, 
  onClose, 
  onSuccess 
}: { 
  admin: AdminRow
  onClose: () => void
  onSuccess: () => void
}) {
  const [agencies, setAgencies] = useState<Agency[]>([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: admin.name.split(' ')[0] || '',
    lastName: admin.name.split(' ').slice(1).join(' ') || '',
    email: admin.email,
    phone: admin.phone || '',
    agencyId: admin.agencyId,
    role: admin.role,
  })

  useEffect(() => {
    const fetchAgencies = async () => {
      const { data } = await supabase.from('agencies').select('id, name, city, color').order('name')
      setAgencies(data || [])
    }
    fetchAgencies()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/admins/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: admin.id,
          ...formData,
        }),
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error || 'Erreur lors de la modification')
        setLoading(false)
        return
      }

      alert('Administrateur modifié avec succès')
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erreur modification admin:', err)
      alert('Erreur lors de la modification')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold" style={{ color: '#1a1d29' }}>Modifier l'Administrateur</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="form-input w-full"
                placeholder="Entrez le prénom"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
                Nom de famille <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="form-input w-full"
                placeholder="Entrez le nom"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
              Adresse email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input w-full"
              placeholder="exemple@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="form-input w-full"
              placeholder="+225 XX XX XX XX XX"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
              Agence <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.agencyId}
              onChange={(e) => setFormData({ ...formData, agencyId: e.target.value })}
              className="form-input w-full"
            >
              <option value="">Sélectionner une agence</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} - {agency.city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: '#1a1d29' }}>
              Rôle <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="form-input w-full"
            >
              <option value="manager">Manager</option>
              <option value="proprietaire">Propriétaire</option>
              <option value="operateur">Opérateur</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 transition"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
              style={{ backgroundColor: '#f26522' }}
            >
              {loading ? 'Modification...' : 'Enregistrer les modifications'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminDetailModal({ admin, onClose }: { admin: AdminRow; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  const copyPassword = () => {
    if (admin.tempPassword) {
      navigator.clipboard.writeText(admin.tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-bold"
              style={{ background: admin.agencyColor }}
            >
              {admin.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>{admin.name}</h2>
              <p className="text-sm text-gray-400">{admin.agency}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-4">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase">Email</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{admin.email}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Phone size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase">Téléphone</span>
              </div>
              <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{admin.phone || 'Non renseigné'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building2 size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase">Agence</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ background: admin.agencyColor }}
                >
                  {admin.agencyInitial}
                </div>
                <p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{admin.agency}</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={14} className="text-gray-400" />
                <span className="text-xs font-medium text-gray-400 uppercase">Rôle & Statut</span>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={admin.role} />
                <StatusBadge status={admin.status} />
              </div>
            </div>
          </div>

          {/* Mot de passe provisoire */}
          <div className="rounded-xl border-2 border-dashed border-orange-200 bg-orange-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#f26522' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </div>
              <span className="text-sm font-bold" style={{ color: '#1a1d29' }}>Mot de passe provisoire</span>
            </div>
            {admin.tempPassword ? (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-white rounded-lg px-4 py-2.5 font-mono text-sm font-semibold border border-orange-200" style={{ color: '#f26522' }}>
                  {admin.tempPassword}
                </div>
                <button
                  onClick={copyPassword}
                  className="w-10 h-10 rounded-lg flex items-center justify-center transition"
                  style={{ background: copied ? '#22c55e' : '#f26522' }}
                >
                  {copied ? <Check size={16} className="text-white" /> : <Copy size={16} className="text-white" />}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Mot de passe non disponible (déjà modifié par l&apos;administrateur)
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {admin.status === 'en_attente'
                ? "⚠️ L'administrateur n'a pas encore changé son mot de passe."
                : "✅ L'administrateur a déjà configuré son propre mot de passe."}
            </p>
          </div>

          {/* Date de création */}
          <div className="text-xs text-gray-400 text-center pt-2">
            Compte créé le {new Date(admin.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition"
            style={{ background: '#1a1d29' }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, active: 0, recent: 0 })
  const [selectedAdmin, setSelectedAdmin] = useState<AdminRow | null>(null)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [assignedCredentials, setAssignedCredentials] = useState<{ email: string; password: string; fullName: string } | null>(null)
  const [editingAdmin, setEditingAdmin] = useState<AdminRow | null>(null)

  const fetchAdmins = async () => {
      try {
        const { data } = await supabase
          .from('agency_admins')
          .select('id, role, profile_id, agency_id, created_at, profiles(full_name, email, phone, status), agencies(name, color)')

        // Fetch invitations to get temp passwords
        const { data: invitations } = await supabase
          .from('invitations')
          .select('email, temp_password, agency_id')

        const invMap = new Map<string, string | null>()
        interface InvitationRow { email: string; temp_password: string | null; agency_id: string }
        ;(invitations || []).forEach((inv: InvitationRow) => {
          invMap.set(`${inv.email}_${inv.agency_id}`, inv.temp_password)
        })

        const mapped: AdminRow[] = (data || []).map((row: Record<string, unknown>) => {
          const profile = row.profiles as { full_name: string; email: string; phone: string | null; status: string } | null
          const agency = row.agencies as { name: string; color: string } | null
          const email = profile?.email || '-'
          const agencyId = row.agency_id as string
          const tempPw = invMap.get(`${email}_${agencyId}`) || null

          return {
            id: row.id as string,
            profileId: row.profile_id as string,
            name: profile?.full_name || 'Inconnu',
            email,
            phone: profile?.phone || '',
            agency: agency?.name || '-',
            agencyId,
            agencyInitial: (agency?.name || '?').charAt(0),
            agencyColor: agency?.color || '#6b7280',
            role: row.role as string,
            status: profile?.status || 'en_attente',
            tempPassword: tempPw,
            createdAt: row.created_at as string,
          }
        })

        setAdmins(mapped)
        setStats({
          total: mapped.length,
          active: mapped.filter((a) => a.status === 'actif').length,
          recent: 0,
        })
      } catch (err) {
        console.error('Erreur chargement admins:', err)
      }
      setLoading(false)
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const handleAssignSuccess = (credentials: { email: string; password: string; fullName: string }) => {
    setAssignedCredentials(credentials)
    setShowAssignModal(false)
    setShowSuccessModal(true)
    fetchAdmins() // Recharger la liste
  }

  const handleDeleteAdmin = async (adminId: string, agencyId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet administrateur ?')) {
      return
    }

    try {
      const res = await fetch(`/api/admins/delete?id=${adminId}&agencyId=${agencyId}`, {
        method: 'DELETE',
      })

      const result = await res.json()

      if (!res.ok) {
        alert(result.error || 'Erreur lors de la suppression')
        return
      }

      alert('Administrateur supprimé avec succès')
      fetchAdmins() // Recharger la liste
    } catch (err) {
      console.error('Erreur suppression admin:', err)
      alert('Erreur lors de la suppression')
    }
  }

  return (
    <div>
      {/* Modal Détail Admin */}
      {selectedAdmin && (
        <AdminDetailModal admin={selectedAdmin} onClose={() => setSelectedAdmin(null)} />
      )}

      {/* Modal Assigner Admin */}
      {showAssignModal && (
        <AssignAdminModal
          onClose={() => setShowAssignModal(false)}
          onSuccess={handleAssignSuccess}
        />
      )}

      {/* Modal Succès */}
      {showSuccessModal && assignedCredentials && (
        <AssignSuccessModal
          credentials={assignedCredentials}
          onClose={() => {
            setShowSuccessModal(false)
            setAssignedCredentials(null)
          }}
        />
      )}

      {/* Modal Modifier Admin */}
      {editingAdmin && (
        <EditAdminModal
          admin={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onSuccess={fetchAdmins}
        />
      )}

      {/* Breadcrumb */}
      <div className="text-sm mb-2">
        <span className="text-gray-400">Dashboard</span>
        <span className="text-gray-300 mx-2">{'>'}</span>
        <span className="font-medium" style={{ color: '#f26522' }}>
          Administrateurs
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="page-title">Gestion des Admins</h1>
          <p className="page-subtitle">
            Visualisez et gérez les comptes administrateurs de toutes les agences affiliées.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-outline flex items-center gap-2">
            <Download size={16} />
            Exporter CSV
          </button>
          <button 
            onClick={() => setShowAssignModal(true)}
            className="btn-accent"
          >
            <Plus size={16} />
            Assigner un Admin
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mt-6 mb-8">
        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#eef4ff' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <p className="stat-label">Total Administrateurs</p>
          <p className="stat-value">{loading ? '...' : stats.total}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#22c55e' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </div>
          <p className="stat-label">Comptes Actifs</p>
          <p className="stat-value">{loading ? '...' : stats.active}</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fff7ed' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            </div>
          </div>
          <p className="stat-label">Connexions (24h)</p>
          <p className="stat-value">{loading ? '...' : '-'}</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="search-input w-80">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="Rechercher par nom, email ou agence..." className="w-full" />
        </div>
        <div className="flex items-center gap-3">
          <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option>Tous les rôles</option>
            <option>Manager</option>
            <option>Propriétaire</option>
            <option>Opérateur</option>
          </select>
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 bg-white">
            <span className="text-sm">Statut: Actif</span>
            <ChevronLeft size={14} className="text-gray-400 rotate-[270deg]" />
          </div>
          <button className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50">
            <Filter size={16} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" className="rounded" />
              </th>
              <th>Administrateur</th>
              <th>Agence Affiliée</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th className="text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr
                key={admin.id}
                className="cursor-pointer hover:bg-gray-50 transition"
                onClick={() => setSelectedAdmin(admin)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" className="rounded" />
                </td>
                <td>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ background: admin.agencyColor }}
                    >
                      {admin.name.split(' ').map((n) => n[0]).join('').substring(0, 2)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: '#1a1d29' }}>
                        {admin.name}
                      </p>
                      <p className="text-xs text-gray-400">{admin.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-md flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: admin.agencyColor }}
                    >
                      {admin.agencyInitial}
                    </div>
                    <span className="text-sm font-medium">{admin.agency}</span>
                  </div>
                </td>
                <td>
                  <RoleBadge role={admin.role} />
                </td>
                <td>
                  <StatusBadge status={admin.status} />
                </td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 justify-center">
                    <button 
                      onClick={() => setEditingAdmin(admin)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-600 hover:bg-blue-50 transition"
                      title="Modifier"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAdmin(admin.id, admin.agencyId)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 transition"
                      title="Supprimer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Table Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
          <p className="text-sm text-gray-400">
            Affichage de 1-{admins.length} sur {stats.total}
          </p>
          <div className="pagination">
            <button>
              <ChevronLeft size={14} />
            </button>
            {[1, 2].map((page) => (
              <button
                key={page}
                className={currentPage === page ? 'active' : ''}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <span className="text-gray-400 text-sm mx-1">...</span>
            <button onClick={() => setCurrentPage(42)}>42</button>
            <button>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
