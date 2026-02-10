'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  X,
  Users,
  Shield,
  Eye,
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
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: 'manager' | 'operateur' | 'visiteur'
  status: 'actif' | 'en_attente' | 'suspendu'
  createdAt: string
  avatar?: string
  lastLogin?: string
}

const mockMembers: TeamMember[] = [
  {
    id: '1',
    name: 'Jean-Michel Dupont',
    email: 'jm.dupont@email.com',
    phone: '+33 6 12 34 56 78',
    role: 'manager',
    status: 'actif',
    createdAt: '15 Jan 2026',
    lastLogin: 'Aujourd\'hui, 10:30',
  },
  {
    id: '2',
    name: 'Sophie Bernard',
    email: 's.bernard@email.com',
    phone: '+33 6 98 76 54 32',
    role: 'operateur',
    status: 'actif',
    createdAt: '20 Jan 2026',
    lastLogin: 'Hier, 18:45',
  },
  {
    id: '3',
    name: 'Pierre Martin',
    email: 'p.martin@email.com',
    phone: '+33 7 11 22 33 44',
    role: 'operateur',
    status: 'en_attente',
    createdAt: '08 Fév 2026',
    lastLogin: null,
  },
  {
    id: '4',
    name: 'Alice Moreau',
    email: 'a.moreau@email.com',
    phone: '+225 07 08 09 10 11',
    role: 'visiteur',
    status: 'actif',
    createdAt: '01 Fév 2026',
    lastLogin: '09 Fév 2026',
  },
  {
    id: '5',
    name: 'Marc Laurent',
    email: 'm.laurent@email.com',
    phone: '+33 6 55 44 33 22',
    role: 'manager',
    status: 'suspendu',
    createdAt: '10 Déc 2025',
    lastLogin: '05 Jan 2026',
  },
]

const rolePerms: Record<string, { label: string; color: string; bg: string; permissions: string[] }> = {
  manager: {
    label: 'Manager',
    color: '#3b82f6',
    bg: '#eff6ff',
    permissions: ['Gérer les trajets', 'Gérer les réservations', 'Voir les stats', 'Gérer les bus', 'Voir l\'équipe'],
  },
  operateur: {
    label: 'Opérateur',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    permissions: ['Gérer les trajets', 'Gérer les réservations', 'Voir les stats'],
  },
  visiteur: {
    label: 'Visiteur',
    color: '#6b7280',
    bg: '#f9fafb',
    permissions: ['Voir les trajets', 'Voir les réservations', 'Voir les stats'],
  },
}

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

function AddMemberModal({ onClose, onSuccess }: {
  onClose: () => void
  onSuccess: (member: { email: string; password: string; name: string; role: string }) => void
}) {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'operateur',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Simulation de création (mock)
    const tempPassword = `Yendi-${Math.random().toString(36).slice(2, 5).toUpperCase()}-2026`

    setTimeout(() => {
      onSuccess({
        email: formData.email,
        password: tempPassword,
        name: `${formData.firstName} ${formData.lastName}`,
        role: formData.role,
      })
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>
            Ajouter un membre
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Prénom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                placeholder="Prénom"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Nom <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
                placeholder="Nom"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Adresse email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
              placeholder="email@exemple.com"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Téléphone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-purple-300 transition"
              placeholder="+33 6 XX XX XX XX"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Rôle <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {Object.entries(rolePerms).map(([key, val]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFormData({ ...formData, role: key })}
                  className={`p-3 rounded-xl border text-left transition ${
                    formData.role === key
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-bold" style={{ color: val.color }}>{val.label}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{val.permissions.length} permissions</p>
                </button>
              ))}
            </div>
          </div>

          {/* Permissions preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Permissions du rôle {rolePerms[formData.role]?.label}
            </p>
            <div className="flex flex-col gap-1.5">
              {rolePerms[formData.role]?.permissions.map((p, i) => (
                <span key={i} className="text-xs text-gray-600 flex items-center gap-2">
                  <CheckCircle2 size={12} className="text-green-500" />
                  {p}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
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
              style={{ background: '#7c3aed' }}
            >
              {loading ? 'Création...' : 'Inviter le membre'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SuccessModal({ credentials, onClose }: {
  credentials: { email: string; password: string; name: string; role: string }
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copyPassword = () => {
    navigator.clipboard.writeText(credentials.password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sendByEmail = () => {
    const subject = encodeURIComponent('Vos identifiants YENDI')
    const body = encodeURIComponent(
      `Bonjour ${credentials.name},\n\nVotre compte a été créé sur YENDI.\n\nIdentifiant : ${credentials.email}\nMot de passe : ${credentials.password}\nRôle : ${rolePerms[credentials.role]?.label}\n\nConnectez-vous ici : ${window.location.origin}/login\n\nCordialement,\nL'équipe YENDI`
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
          {credentials.name} a été invité avec le rôle {rolePerms[credentials.role]?.label}.
        </p>

        {/* Credentials box */}
        <div className="bg-orange-50 rounded-xl p-4 mb-5 text-left" style={{ border: '2px dashed #f2652240' }}>
          <p className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-2">
            🔑 Mot de passe provisoire
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono font-bold px-3 py-2 bg-white rounded-lg" style={{ color: '#f26522' }}>
              {credentials.password}
            </code>
            <button
              onClick={copyPassword}
              className="p-2 rounded-lg hover:bg-orange-100 transition"
              title="Copier"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} className="text-orange-400" />}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
            <AlertCircle size={10} />
            Le membre devra changer ce mot de passe à sa première connexion.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={sendByEmail}
            className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 transition hover:opacity-90"
            style={{ background: '#7c3aed' }}
          >
            <Send size={14} />
            Envoyer par email
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EquipePage() {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [members] = useState<TeamMember[]>(mockMembers)
  const [showAddModal, setShowAddModal] = useState(false)
  const [successCredentials, setSuccessCredentials] = useState<{ email: string; password: string; name: string; role: string } | null>(null)
  const [expandedMember, setExpandedMember] = useState<string | null>(null)

  const filteredMembers = members.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filterRole === 'all' || m.role === filterRole
    return matchSearch && matchFilter
  })

  const roleStats = {
    total: members.length,
    managers: members.filter(m => m.role === 'manager').length,
    operateurs: members.filter(m => m.role === 'operateur').length,
    visitors: members.filter(m => m.role === 'visiteur').length,
  }

  return (
    <div>
      {/* Modals */}
      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(creds) => {
            setShowAddModal(false)
            setSuccessCredentials(creds)
          }}
        />
      )}
      {successCredentials && (
        <SuccessModal
          credentials={successCredentials}
          onClose={() => setSuccessCredentials(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: '#1a1d29' }}>
          Équipe & Droits
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-semibold transition hover:opacity-90"
          style={{ background: '#7c3aed' }}
        >
          <Plus size={16} />
          Ajouter un membre
        </button>
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
          <input
            type="text"
            placeholder="Rechercher un membre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none text-sm text-gray-700 w-full"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'manager', 'operateur', 'visiteur'].map((r) => {
            const labels: Record<string, string> = {
              all: 'Tous',
              manager: 'Managers',
              operateur: 'Opérateurs',
              visiteur: 'Visiteurs',
            }
            return (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${
                  filterRole === r
                    ? 'border-purple-300 bg-purple-50 text-purple-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'
                }`}
              >
                {labels[r]}
              </button>
            )
          })}
        </div>
      </div>

      {/* Members list */}
      <div className="flex flex-col gap-4">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white rounded-2xl p-5 transition"
            style={{ border: '1px solid #f0f0f0' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold"
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
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Mail size={10} /> {member.email}
                    </span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                      <Phone size={10} /> {member.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right mr-4">
                  {member.lastLogin ? (
                    <>
                      <p className="text-[10px] text-gray-400">Dernière connexion</p>
                      <p className="text-xs font-medium" style={{ color: '#1a1d29' }}>{member.lastLogin}</p>
                    </>
                  ) : (
                    <span className="text-[10px] font-semibold text-orange-500 flex items-center gap-1">
                      <Clock size={10} /> Jamais connecté
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setExpandedMember(expandedMember === member.id ? null : member.id)}
                  className="text-gray-300 hover:text-gray-500 transition"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>
            </div>

            {/* Expanded actions */}
            {expandedMember === member.id && (
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                  <Pencil size={12} />
                  Modifier le rôle
                </button>
                {member.status === 'actif' ? (
                  <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-orange-500 border border-orange-200 rounded-lg hover:bg-orange-50 transition">
                    <AlertCircle size={12} />
                    Suspendre
                  </button>
                ) : member.status === 'suspendu' ? (
                  <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition">
                    <CheckCircle2 size={12} />
                    Réactiver
                  </button>
                ) : null}
                {member.status === 'en_attente' && (
                  <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition">
                    <Send size={12} />
                    Renvoyer l&apos;invitation
                  </button>
                )}
                <button className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition ml-auto">
                  <Trash2 size={12} />
                  Supprimer
                </button>
              </div>
            )}
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center" style={{ border: '1px solid #f0f0f0' }}>
            <Users size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">Aucun membre trouvé</p>
          </div>
        )}
      </div>

      {/* Rôles & Permissions overview */}
      <div className="mt-8">
        <h2 className="text-lg font-bold mb-4" style={{ color: '#1a1d29' }}>
          Rôles & Permissions
        </h2>
        <div className="grid grid-cols-3 gap-5">
          {Object.entries(rolePerms).map(([key, val]) => (
            <div key={key} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={16} style={{ color: val.color }} />
                <p className="text-sm font-bold" style={{ color: val.color }}>{val.label}</p>
              </div>
              <div className="flex flex-col gap-2">
                {val.permissions.map((p, i) => (
                  <span key={i} className="text-xs text-gray-600 flex items-center gap-2">
                    <CheckCircle2 size={12} style={{ color: val.color }} />
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
