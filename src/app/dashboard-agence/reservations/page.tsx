'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Download,
  X,
  Phone,
  Calendar,
  CreditCard,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Bus,
  Ticket,
  TrendingUp,
  FileText,
  Send,
  Plus,
  Check,
  Loader2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// Types
interface Reservation {
  reservation_id: string
  ticket_ref: string
  seat_number: number
  status: string
  passenger_name: string
  passenger_phone: string
  reserved_at: string
  booking_group_id: string
  booked_by_name: string
  booked_by_phone: string
  booked_by_email: string
  payment_method: string
  payment_status: string
  total_passengers: number
  group_total_amount: number
  trip_id: string
  departure_datetime: string
  arrival_datetime: string
  price: number
  trip_status: string
  departure_city: string
  departure_location: string
  arrival_city: string
  arrival_location: string
  route_id: string
  bus_number: string
  bus_plate: string
  agency_name: string
  agency_color: string
  duration_hours: number
}

interface Stats {
  today_count: number
  yesterday_count: number
  today_revenue: number
  yesterday_revenue: number
  total_seats: number
  occupied_seats: number
  fill_rate: number
  mobile_money_count: number
  card_count: number
}

interface RouteOption { id: string; departure_city: string; arrival_city: string }

interface TripOption {
  id: string; route_id: string; departure_datetime: string; arrival_datetime: string
  base_price: number; available_seats_count: number; available_seat_numbers: number[]
  bus_seats: number; bus_seat_layout: any; departure_city: string; arrival_city: string; bus_number: string; bus_plate: string
}

// Helpers
function fmtDate(d: string) { return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) }
function fmtTime(d: string) { return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }
function fmtPrice(a: number) { return a.toLocaleString('fr-FR') + ' FCFA' }
function payLabel(m: string) { return m === 'mobile_money' ? 'Mobile Money' : m === 'card' ? 'Carte bancaire' : m || 'Non specifie' }
function PayIcon({ method }: { method: string }) { return method === 'card' ? <CreditCard size={12} /> : <Smartphone size={12} /> }

// Main
export default function ReservationsPage() {
  const [agencyId, setAgencyId] = useState<string | null>(null)
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [routes, setRoutes] = useState<RouteOption[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterPayment, setFilterPayment] = useState<string | null>(null)
  const [filterRoute, setFilterRoute] = useState<string | null>(null)
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const perPage = 20
  const searchTimeout = useRef<any>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showNewReservation, setShowNewReservation] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase.from('agency_admins').select('agency_id').eq('profile_id', session.user.id).single()
      if (data) setAgencyId(data.agency_id)
    }
    load()
  }, [])

  useEffect(() => {
    if (!agencyId) return
    supabase.from('routes').select('id, departure_city, arrival_city').eq('agency_id', agencyId).eq('is_active', true)
      .then(({ data }) => { if (data) setRoutes(data) })
  }, [agencyId])

  const loadStats = useCallback(async () => {
    if (!agencyId) return
    const { data } = await supabase.rpc('get_agency_reservation_stats', { p_agency_id: agencyId })
    if (data) setStats(data)
  }, [agencyId])

  const loadReservations = useCallback(async () => {
    if (!agencyId) return
    setLoading(true)
    const { data, error } = await supabase.rpc('get_agency_reservations', {
      p_agency_id: agencyId, p_search: search || null, p_payment_method: filterPayment || null,
      p_route_id: filterRoute || null, p_date_from: filterDateFrom || null, p_date_to: filterDateTo || null,
      p_limit: perPage, p_offset: (currentPage - 1) * perPage,
    })
    if (!error && data) { setReservations(data.data || []); setTotal(data.total || 0) }
    setLoading(false)
  }, [agencyId, search, filterPayment, filterRoute, filterDateFrom, filterDateTo, currentPage])

  useEffect(() => { loadStats() }, [loadStats])
  useEffect(() => { loadReservations() }, [loadReservations])

  const handleSearch = (v: string) => {
    setSearch(v)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => setCurrentPage(1), 300)
  }

  const totalPages = Math.ceil(total / perPage)

  const handleExportCSV = async () => {
    if (!agencyId) return
    const { data } = await supabase.rpc('get_agency_reservations', {
      p_agency_id: agencyId, p_search: search || null, p_payment_method: filterPayment || null,
      p_route_id: filterRoute || null, p_date_from: filterDateFrom || null, p_date_to: filterDateTo || null,
      p_limit: 10000, p_offset: 0,
    })
    if (!data?.data) return
    const rows = data.data as Reservation[]
    const csv = 'Reference,Passager,Telephone,Trajet,Date depart,Heure,Place,Prix (FCFA),Paiement\n' +
      rows.map((r: Reservation) => `${r.ticket_ref},${r.passenger_name},${r.passenger_phone},${r.departure_city} - ${r.arrival_city},${fmtDate(r.departure_datetime)},${fmtTime(r.departure_datetime)},${r.seat_number},${r.price},${payLabel(r.payment_method)}`).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `reservations_${new Date().toISOString().split('T')[0]}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const sc = stats ? [
    { label: 'RESERVATIONS (J)', value: String(stats.today_count), change: stats.yesterday_count > 0 ? `${stats.today_count >= stats.yesterday_count ? '+' : ''}${stats.today_count - stats.yesterday_count} vs hier` : 'Aucune hier', up: stats.today_count >= stats.yesterday_count, icon: Ticket, color: '#7c3aed' },
    { label: 'TAUX REMPLISSAGE', value: stats.fill_rate + '%', sub: `${stats.occupied_seats}/${stats.total_seats} places`, icon: Bus, color: '#3b82f6' },
    { label: 'PAIEMENTS', value: String(stats.mobile_money_count + stats.card_count), sub: `${stats.mobile_money_count} MoMo - ${stats.card_count} Carte`, icon: Smartphone, color: '#f59e0b' },
    { label: 'REVENUS (J)', value: fmtPrice(stats.today_revenue), change: stats.yesterday_revenue > 0 ? `${stats.today_revenue >= stats.yesterday_revenue ? '+' : ''}${Math.round(((stats.today_revenue - stats.yesterday_revenue) / stats.yesterday_revenue) * 100)}% vs J-1` : '--', up: stats.today_revenue >= stats.yesterday_revenue, icon: TrendingUp, color: '#22c55e' },
  ] : []

  return (
    <div>
      <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: '1px solid #e5e7eb' }}>
        <h1 className="text-3xl font-bold" style={{ color: '#1a1d29' }}>Reservations</h1>
        <div className="flex gap-3">
          <button onClick={() => setShowNewReservation(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition hover:opacity-90" style={{ background: '#7c3aed' }}><Plus size={16} />Reservation</button>
          <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition"><Download size={16} />Exporter</button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-5 mb-8">
          {sc.map((c, i) => (
            <div key={i} className="bg-white rounded-2xl p-5" style={{ border: '1px solid #f0f0f0' }}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{c.label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${c.color}12` }}><c.icon size={16} style={{ color: c.color }} /></div>
              </div>
              <p className="text-2xl font-extrabold" style={{ color: '#1a1d29' }}>{c.value}</p>
              {c.change && <p className="text-xs font-medium mt-1" style={{ color: c.up ? '#22c55e' : '#ef4444' }}>{c.change}</p>}
              {c.sub && <p className="text-xs text-gray-400 mt-1">{c.sub}</p>}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex-1 min-w-[280px] max-w-md">
          <Search size={16} className="text-gray-400" />
          <input type="text" placeholder="Rechercher par nom, ref, telephone..." value={search} onChange={e => handleSearch(e.target.value)} className="bg-transparent border-none outline-none text-sm text-gray-700 w-full" />
          {search && <button onClick={() => { setSearch(''); setCurrentPage(1) }} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>}
        </div>
        <div className="flex gap-2">
          {([{ key: null, label: 'Tous' }, { key: 'mobile_money', label: 'Mobile Money' }, { key: 'card', label: 'Carte' }] as const).map(f => (
            <button key={f.key || 'all'} onClick={() => { setFilterPayment(f.key); setCurrentPage(1) }} className={`px-3 py-2 text-xs font-medium rounded-lg border transition ${filterPayment === f.key ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>{f.label}</button>
          ))}
        </div>
        <select value={filterRoute || ''} onChange={e => { setFilterRoute(e.target.value || null); setCurrentPage(1) }} className="px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 bg-white text-gray-600 outline-none">
          <option value="">Tous les trajets</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.departure_city} - {r.arrival_city}</option>)}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" value={filterDateFrom} onChange={e => { setFilterDateFrom(e.target.value); setCurrentPage(1) }} className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 outline-none" />
          <span className="text-xs text-gray-400">-</span>
          <input type="date" value={filterDateTo} onChange={e => { setFilterDateTo(e.target.value); setCurrentPage(1) }} className="px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white text-gray-600 outline-none" />
        </div>
        {(filterPayment || filterRoute || filterDateFrom || filterDateTo) && (
          <button onClick={() => { setFilterPayment(null); setFilterRoute(null); setFilterDateFrom(''); setFilterDateTo(''); setCurrentPage(1) }} className="px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition">Reinitialiser</button>
        )}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: '1px solid #f0f0f0' }}>
        <table className="w-full">
          <thead><tr className="border-b border-gray-100">
            {['Ref', 'Passager', 'Trajet', 'Date', 'Place', 'Prix', 'Paiement', 'Statut'].map(h => (
              <th key={h} className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider px-5 py-4">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="text-center py-12"><Loader2 size={24} className="animate-spin text-purple-500 mx-auto" /></td></tr>
            ) : reservations.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-sm text-gray-400">Aucune reservation trouvee</td></tr>
            ) : reservations.map(r => (
              <tr key={r.reservation_id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer transition" onClick={() => setSelectedReservation(r)}>
                <td className="px-5 py-4"><span className="text-xs font-mono font-medium text-purple-600">#{r.ticket_ref}</span></td>
                <td className="px-5 py-4"><p className="text-sm font-semibold" style={{ color: '#1a1d29' }}>{r.passenger_name || r.booked_by_name}</p><p className="text-[11px] text-gray-400">{r.passenger_phone || r.booked_by_phone}</p></td>
                <td className="px-5 py-4"><p className="text-sm font-medium" style={{ color: '#1a1d29' }}>{r.departure_city} - {r.arrival_city}</p><p className="text-[11px] text-gray-400">{r.bus_plate}</p></td>
                <td className="px-5 py-4"><p className="text-sm font-medium" style={{ color: '#1a1d29' }}>{fmtDate(r.departure_datetime)}</p><p className="text-[11px] text-gray-400">{fmtTime(r.departure_datetime)}</p></td>
                <td className="px-5 py-4 text-sm font-medium text-center" style={{ color: '#1a1d29' }}>N{r.seat_number}</td>
                <td className="px-5 py-4 text-sm font-bold" style={{ color: '#1a1d29' }}>{fmtPrice(r.price)}</td>
                <td className="px-5 py-4"><span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg w-fit" style={{ color: r.payment_method === 'mobile_money' ? '#f59e0b' : '#3b82f6', background: r.payment_method === 'mobile_money' ? '#fffbeb' : '#eff6ff' }}><PayIcon method={r.payment_method} />{payLabel(r.payment_method)}</span></td>
                <td className="px-5 py-4 text-right">
                  {r.status === 'annule' ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ color: '#DC2626', background: '#FEE2E2' }}>Annulé</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg" style={{ color: '#16A34A', background: '#DCFCE7' }}>Valide</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">{total} reservation{total > 1 ? 's' : ''} • Page {currentPage}/{totalPages || 1}</p>
          <div className="flex items-center gap-1">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-30"><ChevronLeft size={14} /></button>
            {(() => {
              const pages: (number | '...')[] = []
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) pages.push(i)
              } else {
                pages.push(1)
                if (currentPage > 3) pages.push('...')
                for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i)
                if (currentPage < totalPages - 2) pages.push('...')
                pages.push(totalPages)
              }
              return pages.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button key={p} onClick={() => setCurrentPage(p)} className={`w-8 h-8 rounded-lg text-xs font-medium transition ${currentPage === p ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>{p}</button>
                )
              )
            })()}
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        </div>
      </div>

      {selectedReservation && <DetailModal r={selectedReservation} onClose={() => setSelectedReservation(null)} />}
      {showNewReservation && agencyId && <NewReservationModal agencyId={agencyId} onClose={() => setShowNewReservation(false)} onSuccess={() => { setShowNewReservation(false); loadReservations(); loadStats() }} />}
    </div>
  )
}

// Detail Modal
function DetailModal({ r, onClose }: { r: Reservation; onClose: () => void }) {
  const [sendingEmail, setSendingEmail] = useState(false)
  const [downloadingPDF, setDownloadingPDF] = useState(false)

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true)
    try {
      // Import dynamique pour éviter les problèmes SSR
      const { default: jsPDF } = await import('jspdf')
      
      const doc = new jsPDF()
      
      // En-tête
      doc.setFontSize(20)
      doc.setTextColor(124, 58, 237) // Purple
      doc.text('YENDI', 105, 20, { align: 'center' })
      
      doc.setFontSize(10)
      doc.setTextColor(156, 163, 175) // Gray
      doc.text(r.agency_name, 105, 27, { align: 'center' })
      
      // Ligne de séparation
      doc.setDrawColor(243, 244, 246)
      doc.line(20, 32, 190, 32)
      
      // Titre du reçu
      doc.setFontSize(9)
      doc.setTextColor(156, 163, 175)
      doc.text('RECU DE RESERVATION', 20, 40)
      
      doc.setFontSize(14)
      doc.setTextColor(26, 29, 41)
      doc.setFont(undefined, 'bold')
      doc.text(`Ref: #${r.ticket_ref}`, 20, 48)
      
      // Informations du trajet (encadré)
      doc.setFillColor(249, 250, 251)
      doc.roundedRect(20, 52, 170, 18, 3, 3, 'F')
      
      doc.setFontSize(11)
      doc.setTextColor(26, 29, 41)
      doc.text(`${r.departure_city} - ${r.arrival_city}`, 25, 60)
      
      doc.setFontSize(9)
      doc.setTextColor(107, 114, 128)
      doc.setFont(undefined, 'normal')
      doc.text(`${fmtDate(r.departure_datetime)} - ${fmtTime(r.departure_datetime)} - ${fmtTime(r.arrival_datetime)}`, 25, 66)
      
      // Détails de la réservation
      doc.setFontSize(10)
      doc.setTextColor(156, 163, 175)
      let y = 80
      
      doc.text('Passager', 20, y)
      doc.setTextColor(26, 29, 41)
      doc.setFont(undefined, 'bold')
      doc.text(r.passenger_name || r.booked_by_name, 190, y, { align: 'right' })
      
      y += 8
      doc.setFont(undefined, 'normal')
      doc.setTextColor(156, 163, 175)
      doc.text('Telephone', 20, y)
      doc.setTextColor(26, 29, 41)
      doc.setFont(undefined, 'bold')
      doc.text(r.passenger_phone || r.booked_by_phone, 190, y, { align: 'right' })
      
      y += 8
      doc.setFont(undefined, 'normal')
      doc.setTextColor(156, 163, 175)
      doc.text('Place', 20, y)
      doc.setTextColor(26, 29, 41)
      doc.setFont(undefined, 'bold')
      doc.text(`N${r.seat_number}`, 190, y, { align: 'right' })
      
      y += 8
      doc.setFont(undefined, 'normal')
      doc.setTextColor(156, 163, 175)
      doc.text('Immatriculation', 20, y)
      doc.setTextColor(26, 29, 41)
      doc.setFont(undefined, 'bold')
      doc.text(r.bus_plate, 190, y, { align: 'right' })
      
      y += 8
      doc.setFont(undefined, 'normal')
      doc.setTextColor(156, 163, 175)
      doc.text('Paiement', 20, y)
      doc.setTextColor(26, 29, 41)
      doc.setFont(undefined, 'bold')
      doc.text(payLabel(r.payment_method), 190, y, { align: 'right' })
      
      // Ligne de séparation
      y += 6
      doc.setDrawColor(243, 244, 246)
      doc.line(20, y, 190, y)
      
      // Total
      y += 10
      doc.setFontSize(11)
      doc.setTextColor(156, 163, 175)
      doc.setFont(undefined, 'normal')
      doc.text('Total paye', 20, y)
      
      doc.setFontSize(16)
      doc.setTextColor(34, 197, 94) // Green
      doc.setFont(undefined, 'bold')
      doc.text(fmtPrice(r.price), 190, y, { align: 'right' })
      
      // Ligne de séparation
      y += 6
      doc.setDrawColor(243, 244, 246)
      doc.line(20, y, 190, y)
      
      // Message de fin
      y += 10
      doc.setFontSize(8)
      doc.setTextColor(156, 163, 175)
      doc.setFont(undefined, 'normal')
      const message = `Merci de voyager avec Yendi & ${r.agency_name} !\nPresentez ce recu ou votre QR code au moment de l'embarquement.`
      doc.text(message, 105, y, { align: 'center' })
      
      // Télécharger le PDF
      doc.save(`Recu_${r.ticket_ref}.pdf`)
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error)
      alert('Erreur lors du téléchargement du PDF')
    } finally {
      setDownloadingPDF(false)
    }
  }

  const handleSendEmail = () => {
    const email = r.booked_by_email
    if (!email) { alert('Aucune adresse email associee.'); return }
    const subject = encodeURIComponent('Votre recu Yendi - Ref #' + r.ticket_ref)
    const body = encodeURIComponent('Bonjour ' + (r.passenger_name || r.booked_by_name) + ',\n\nMerci d avoir reserve avec Yendi & ' + r.agency_name + ' !\n\nDetails :\n- Reference : #' + r.ticket_ref + '\n- Trajet : ' + r.departure_city + ' - ' + r.arrival_city + '\n- Date : ' + fmtDate(r.departure_datetime) + ' a ' + fmtTime(r.departure_datetime) + '\n- Place : N' + r.seat_number + '\n- Montant : ' + fmtPrice(r.price) + '\n\nBon voyage !\nL equipe Yendi & ' + r.agency_name)
    window.open('mailto:' + email + '?subject=' + subject + '&body=' + body)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div><h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>Recu de reservation</h2><p className="text-xs text-purple-600 font-mono font-semibold">#{r.ticket_ref}</p></div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          <span className="flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg w-fit" style={{ color: r.payment_method === 'mobile_money' ? '#f59e0b' : '#3b82f6', background: r.payment_method === 'mobile_money' ? '#fffbeb' : '#eff6ff' }}><PayIcon method={r.payment_method} />Paye par {payLabel(r.payment_method)}</span>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase">Passager</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: '#7c3aed' }}>{(r.passenger_name || r.booked_by_name || 'P').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
              <div><p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{r.passenger_name || r.booked_by_name}</p><p className="text-[11px] text-gray-400">{r.booked_by_email || '--'}</p></div>
            </div>
            <span className="text-xs text-gray-500 flex items-center gap-1"><Phone size={11} /> {r.passenger_phone || r.booked_by_phone}</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4"><p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Trajet</p><p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{r.departure_city} - {r.arrival_city}</p><p className="text-[11px] text-gray-400">{r.bus_plate}</p></div>
            <div className="bg-gray-50 rounded-xl p-4"><p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Date & Heure</p><p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{fmtDate(r.departure_datetime)}</p><p className="text-[11px] text-gray-400">{fmtTime(r.departure_datetime)} - {fmtTime(r.arrival_datetime)}</p></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Place</p><p className="text-xl font-extrabold" style={{ color: '#1a1d29' }}>N{r.seat_number}</p></div>
            <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Immatriculation</p><p className="text-lg font-extrabold text-purple-600">{r.bus_plate}</p></div>
            <div className="bg-gray-50 rounded-xl p-4 text-center"><p className="text-[10px] font-semibold text-gray-400 uppercase mb-1">Total</p><p className="text-xl font-extrabold" style={{ color: '#22c55e' }}>{fmtPrice(r.price)}</p></div>
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100"><span className="text-gray-400">Reserve le</span><span className="font-medium" style={{ color: '#1a1d29' }}>{fmtDate(r.reserved_at)} a {fmtTime(r.reserved_at)}</span></div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={handleDownloadPDF} disabled={downloadingPDF} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-50" style={{ background: '#7c3aed' }}>
            {downloadingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
            {downloadingPDF ? 'Telechargement...' : 'Telecharger PDF'}
          </button>
          <button onClick={handleSendEmail} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-50 transition"><Send size={14} /> Envoyer par email</button>
        </div>
      </div>
    </div>
  )
}

// New Reservation Modal
function NewReservationModal({ agencyId, onClose, onSuccess }: { agencyId: string; onClose: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [departureCity, setDepartureCity] = useState('')
  const [arrivalCity, setArrivalCity] = useState('')
  const [cityOptions, setCityOptions] = useState<{ departures: string[]; arrivals: string[] }>({ departures: [], arrivals: [] })
  const [trips, setTrips] = useState<TripOption[]>([])
  const [searchingTrips, setSearchingTrips] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<TripOption | null>(null)
  const [passengerName, setPassengerName] = useState('')
  const [passengerPhone, setPassengerPhone] = useState('')
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [reservedSeats, setReservedSeats] = useState<number[]>([])
  const [paymentMethod, setPaymentMethod] = useState('mobile_money')
  const [hasPaid, setHasPaid] = useState(false)
  const [resultRef, setResultRef] = useState<string | null>(null)

  useEffect(() => {
    const loadCities = async () => {
      const { data } = await supabase.from('routes').select('departure_city, arrival_city').eq('agency_id', agencyId).eq('is_active', true)
      if (data) {
        const deps = [...new Set(data.map(r => r.departure_city))].sort()
        const arrs = [...new Set(data.map(r => r.arrival_city))].sort()
        setCityOptions({ departures: deps, arrivals: arrs })
      }
    }
    loadCities()
  }, [agencyId])

  const searchTrips = async () => {
    setSearchingTrips(true)
    const { data, error } = await supabase.from('scheduled_trips').select('id, route_id, departure_datetime, arrival_datetime, base_price, available_seats_count, available_seat_numbers, status, buses!inner(seats, seat_layout, number, plate), routes!inner(departure_city, arrival_city)').eq('agency_id', agencyId).eq('status', 'actif').gt('available_seats_count', 0).gte('departure_datetime', new Date().toISOString())
    if (!error && data) {
      const filtered = data.filter((t: any) => {
        const route = t.routes as any
        const dm = !departureCity || route.departure_city.toLowerCase().includes(departureCity.toLowerCase())
        const am = !arrivalCity || route.arrival_city.toLowerCase().includes(arrivalCity.toLowerCase())
        return dm && am
      }).map((t: any) => ({ id: t.id, route_id: t.route_id, departure_datetime: t.departure_datetime, arrival_datetime: t.arrival_datetime, base_price: t.base_price, available_seats_count: t.available_seats_count, available_seat_numbers: t.available_seat_numbers, bus_seats: (t.buses as any).seats, bus_seat_layout: (t.buses as any).seat_layout, departure_city: (t.routes as any).departure_city, arrival_city: (t.routes as any).arrival_city, bus_number: (t.buses as any).number, bus_plate: (t.buses as any).plate }))
      setTrips(filtered)
    }
    setSearchingTrips(false)
  }

  const loadReservedSeats = async (tripId: string) => {
    const { data } = await supabase.from('seat_reservations').select('seat_number').eq('scheduled_trip_id', tripId).in('status', ['reserve', 'confirme'])
    if (data) setReservedSeats(data.map(s => s.seat_number))
  }

  const confirmReservation = async () => {
    if (!selectedTrip || !selectedSeat) return
    setLoading(true)
    const { data, error } = await supabase.rpc('create_group_reservation', { p_scheduled_trip_id: selectedTrip.id, p_passengers: [{ seat_number: selectedSeat, name: passengerName, phone: passengerPhone }], p_booked_by_client_id: null, p_booked_by_name: passengerName, p_booked_by_phone: passengerPhone, p_booked_by_email: null, p_payment_method: paymentMethod })
    if (!error && data?.success) { setResultRef(data.ticket_ids?.[0] || null); setStep(6); onSuccess() }
    else { alert(data?.error || error?.message || 'Erreur lors de la reservation') }
    setLoading(false)
  }

  const titles: Record<number, string> = { 1: 'Rechercher un trajet', 2: 'Selectionner un trajet', 3: 'Informations passager', 4: 'Choix de la place', 5: 'Confirmation & Paiement', 6: 'Reservation confirmee !' }
  const layout = selectedTrip?.bus_seat_layout || { left: 2, right: 2, back_row: 5, rows: 10 }
  const availNums = selectedTrip?.available_seat_numbers || []
  
  // Calculer le nombre de sièges pour les rangées normales et la rangée arrière
  const normalRowsSeats = layout.rows * (layout.left + layout.right)
  const backRowCount = layout.back_row || 0
  const totalSeats = selectedTrip ? selectedTrip.bus_seats : normalRowsSeats + backRowCount
  
  // Générer les rangées normales
  const generateSeatRows = () => {
    const rows = []
    let seatNum = 1
    for (let rowIdx = 0; rowIdx < layout.rows; rowIdx++) {
      const leftSeats = []
      const rightSeats = []
      for (let i = 0; i < layout.left; i++) {
        if (seatNum <= normalRowsSeats) leftSeats.push(seatNum++)
      }
      for (let i = 0; i < layout.right; i++) {
        if (seatNum <= normalRowsSeats) rightSeats.push(seatNum++)
      }
      rows.push({ leftSeats, rightSeats })
    }
    return rows
  }
  
  // Générer la rangée arrière
  const generateBackRow = () => {
    const backSeats = []
    let seatNum = normalRowsSeats + 1
    const actualBackRow = Math.min(backRowCount, totalSeats - normalRowsSeats)
    for (let i = 0; i < actualBackRow; i++) {
      if (seatNum <= totalSeats) backSeats.push(seatNum++)
    }
    return backSeats
  }
  
  const seatRows = selectedTrip ? generateSeatRows() : []
  const backRowSeats = selectedTrip ? generateBackRow() : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            {step > 1 && step < 6 && <button onClick={() => setStep(s => s - 1)} className="text-gray-400 hover:text-gray-600"><ChevronLeft size={20} /></button>}
            <div><h2 className="text-lg font-bold" style={{ color: '#1a1d29' }}>{titles[step]}</h2>{step < 6 && <p className="text-xs text-gray-400">Etape {step}/5</p>}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Ville de depart</label><select value={departureCity} onChange={e => setDepartureCity(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white"><option value="">-- Selectionnez une ville --</option>{cityOptions.departures.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Ville d arrivee</label><select value={arrivalCity} onChange={e => setArrivalCity(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400 bg-white"><option value="">-- Selectionnez une ville --</option>{cityOptions.arrivals.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
              <button onClick={() => { searchTrips(); setStep(2) }} disabled={!departureCity && !arrivalCity} className="w-full py-3 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-50" style={{ background: '#7c3aed' }}><div className="flex items-center justify-center gap-2"><Search size={16} /> Rechercher</div></button>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              {searchingTrips ? <div className="text-center py-8"><Loader2 className="animate-spin mx-auto text-purple-500" size={24} /></div> : trips.length === 0 ? <div className="text-center py-8 text-sm text-gray-400">Aucun trajet disponible</div> : trips.map(trip => (
                <button key={trip.id} onClick={() => { setSelectedTrip(trip); loadReservedSeats(trip.id); setStep(3) }} className="w-full text-left bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 rounded-xl p-4 transition">
                  <div className="flex justify-between items-start mb-2"><p className="text-sm font-bold" style={{ color: '#1a1d29' }}>{trip.departure_city} - {trip.arrival_city}</p><span className="text-sm font-bold text-purple-600">{fmtPrice(trip.base_price)}</span></div>
                  <div className="flex justify-between text-xs text-gray-500"><span>{fmtDate(trip.departure_datetime)} - {fmtTime(trip.departure_datetime)}</span><span>{trip.available_seats_count} places dispo - {trip.bus_plate}</span></div>
                </button>
              ))}
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              {selectedTrip && <div className="bg-purple-50 rounded-xl p-3 text-sm"><span className="font-bold text-purple-700">{selectedTrip.departure_city} - {selectedTrip.arrival_city}</span><span className="text-purple-500 ml-2">- {fmtDate(selectedTrip.departure_datetime)} a {fmtTime(selectedTrip.departure_datetime)}</span></div>}
              <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Nom complet du passager</label><input value={passengerName} onChange={e => setPassengerName(e.target.value)} placeholder="Nom et prenom" className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400" /></div>
              <div><label className="text-xs font-semibold text-gray-500 uppercase mb-1 block">Numero de telephone</label><input value={passengerPhone} onChange={e => setPassengerPhone(e.target.value)} placeholder="+237..." className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-purple-400" /></div>
              <button onClick={() => setStep(4)} disabled={!passengerName || !passengerPhone} className="w-full py-3 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-50" style={{ background: '#7c3aed' }}>Continuer</button>
            </div>
          )}
          {step === 4 && selectedTrip && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 justify-center text-xs mb-2">
                <span className="flex items-center gap-1"><span className="w-5 h-5 rounded border border-gray-300 bg-white inline-block" /> Libre</span>
                <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-red-100 border border-red-300 inline-block" /> Occupe</span>
                <span className="flex items-center gap-1"><span className="w-5 h-5 rounded bg-purple-500 inline-block" /> Selectionne</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-center text-xs text-gray-400 mb-3">Avant du bus</p>
                <div className="space-y-2">
                  {/* Rangées normales */}
                  {seatRows.map((row, rowIdx) => (
                    <div key={rowIdx} className="flex items-center justify-center gap-3">
                      <div className="flex gap-1">
                        {row.leftSeats.map(n => <SeatBtn key={n} num={n} reserved={reservedSeats} available={availNums} selected={selectedSeat} onSelect={setSelectedSeat} />)}
                      </div>
                      <div className="w-4" />
                      <div className="flex gap-1">
                        {row.rightSeats.map(n => <SeatBtn key={n} num={n} reserved={reservedSeats} available={availNums} selected={selectedSeat} onSelect={setSelectedSeat} />)}
                      </div>
                    </div>
                  ))}
                  
                  {/* Rangée arrière */}
                  {backRowSeats.length > 0 && (
                    <>
                      <div className="border-t border-gray-300 my-2 pt-2">
                        <p className="text-center text-xs text-gray-400 mb-2">Arrière</p>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        {backRowSeats.map(n => <SeatBtn key={n} num={n} reserved={reservedSeats} available={availNums} selected={selectedSeat} onSelect={setSelectedSeat} />)}
                      </div>
                    </>
                  )}
                </div>
              </div>
              {selectedSeat && <p className="text-sm text-center font-semibold text-purple-600">Place N{selectedSeat} selectionnee</p>}
              <button onClick={() => setStep(5)} disabled={!selectedSeat} className="w-full py-3 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-50" style={{ background: '#7c3aed' }}>Continuer</button>
            </div>
          )}
          {step === 5 && selectedTrip && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Trajet</span><span className="font-bold">{selectedTrip.departure_city} - {selectedTrip.arrival_city}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Date</span><span className="font-bold">{fmtDate(selectedTrip.departure_datetime)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Heure</span><span className="font-bold">{fmtTime(selectedTrip.departure_datetime)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Passager</span><span className="font-bold">{passengerName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Telephone</span><span className="font-bold">{passengerPhone}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Place</span><span className="font-bold text-purple-600">N{selectedSeat}</span></div>
                <hr className="border-gray-200" />
                <div className="flex justify-between"><span className="text-gray-400">Montant</span><span className="font-extrabold text-lg" style={{ color: '#22c55e' }}>{fmtPrice(selectedTrip.base_price)}</span></div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Moyen de paiement</p>
                <div className="flex gap-3">
                  {[{ k: 'mobile_money', l: 'Mobile Money', I: Smartphone }, { k: 'card', l: 'Carte bancaire', I: CreditCard }].map(pm => (
                    <button key={pm.k} onClick={() => setPaymentMethod(pm.k)} className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition ${paymentMethod === pm.k ? 'border-purple-400 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}><pm.I size={16} /> {pm.l}</button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <input type="checkbox" checked={hasPaid} onChange={e => setHasPaid(e.target.checked)} className="w-4 h-4 accent-purple-600" />
                <label className="text-sm font-medium text-amber-800">Le client a effectue le paiement</label>
              </div>
              <button onClick={confirmReservation} disabled={!hasPaid || loading} className="w-full py-3 text-sm font-semibold text-white rounded-xl transition hover:opacity-90 disabled:opacity-50" style={{ background: '#7c3aed' }}>{loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : <div className="flex items-center justify-center gap-2"><Check size={16} /> Confirmer la reservation</div>}</button>
            </div>
          )}
          {step === 6 && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto"><Check size={32} className="text-green-600" /></div>
              <h3 className="text-xl font-bold" style={{ color: '#1a1d29' }}>Reservation confirmee !</h3>
              {resultRef && <p className="text-sm text-gray-500">Reference : <span className="font-mono font-bold text-purple-600">#{resultRef}</span></p>}
              <p className="text-sm text-gray-400">Le billet a ete cree avec succes.</p>
              <button onClick={onClose} className="px-8 py-3 text-sm font-semibold text-white rounded-xl transition hover:opacity-90" style={{ background: '#7c3aed' }}>Fermer</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function SeatBtn({ num, reserved, available, selected, onSelect }: { num: number; reserved: number[]; available: number[]; selected: number | null; onSelect: (n: number) => void }) {
  const isRes = reserved.includes(num)
  const isAvail = available.length === 0 || available.includes(num)
  const isSel = selected === num
  const dis = isRes || !isAvail
  return (
    <button disabled={dis} onClick={() => onSelect(isSel ? 0 : num)} className={`w-9 h-9 rounded-lg text-xs font-bold transition ${isSel ? 'bg-purple-500 text-white border-2 border-purple-600' : isRes ? 'bg-red-100 text-red-400 border border-red-300 cursor-not-allowed' : !isAvail ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-white text-gray-700 border border-gray-300 hover:border-purple-400'}`}>{num}</button>
  )
}
