// Données mockées pour YENDI

export const mockAgenciesOverview = [
  {
    id: 'ag-001',
    name: 'Azure Voyages',
    location: 'Paris, France',
    admin: 'Sophie Martin',
    email: 's.martin@azure.com',
    status: 'Actif' as const,
    image: '/agencies/azure.jpg',
  },
  {
    id: 'ag-002',
    name: 'Atlas Horizons',
    location: 'Lyon, France',
    admin: 'Karim Bensala',
    email: 'k.bensala@atlas.fr',
    status: 'Actif' as const,
    image: '/agencies/atlas.jpg',
  },
  {
    id: 'ag-003',
    name: 'Yendi Travel Beta',
    location: 'Bruxelles, Be',
    admin: 'En attente',
    email: 'contact@yenditravel.com',
    status: 'Configuration' as const,
    image: '/agencies/yendi.jpg',
  },
]

export const mockAgencies = [
  {
    id: 'ag-101',
    name: 'Horizon Express',
    location: 'Abidjan, CI',
    admin: 'Jean Doe',
    initials: 'JD',
    revenue: 4500000,
    status: 'Opérationnel' as const,
    color: '#f26522',
    image: '/agencies/horizon.jpg',
  },
  {
    id: 'ag-102',
    name: 'Yamousso Transport',
    location: 'Yamoussoukro, CI',
    admin: 'Marc O.',
    initials: 'MO',
    revenue: 0,
    status: 'Inactive' as const,
    color: '#9ca3af',
    image: '/agencies/yamousso.jpg',
  },
  {
    id: 'ag-103',
    name: 'Golden Coast Lines',
    location: 'San-Pédro, CI',
    admin: 'Alice L.',
    initials: 'AL',
    revenue: 2800000,
    status: 'Opérationnel' as const,
    color: '#22c55e',
    image: '/agencies/golden.jpg',
  },
  {
    id: 'ag-104',
    name: 'Savane Travel',
    location: 'Korhogo, CI',
    admin: 'Kone Ibrahim',
    initials: 'KI',
    revenue: -450000,
    status: 'Suspendu' as const,
    color: '#ef4444',
    image: '/agencies/savane.jpg',
    debt: -450000,
  },
  {
    id: 'ag-105',
    name: 'Swift Babi',
    location: 'Abidjan, CI',
    admin: 'Sarah K.',
    initials: 'SK',
    revenue: 8200000,
    status: 'Opérationnel' as const,
    color: '#f59e0b',
    image: '/agencies/swift.jpg',
  },
]

export const mockAdmins = [
  {
    id: 'adm-001',
    name: 'Sophie Martin',
    email: 's.martin@horizon-travel.com',
    agency: 'Horizon Travel',
    agencyInitial: 'H',
    agencyColor: '#3b82f6',
    role: 'Manager',
    status: 'Actif' as const,
    avatar: '/avatars/sophie.jpg',
  },
  {
    id: 'adm-002',
    name: 'Thomas Dubreuil',
    email: 'thomas.d@atlas-monde.fr',
    agency: 'Atlas Monde',
    agencyInitial: 'A',
    agencyColor: '#f59e0b',
    role: 'Propriétaire',
    status: 'Actif' as const,
    avatar: '/avatars/thomas.jpg',
  },
  {
    id: 'adm-003',
    name: 'Julien K.',
    email: 'j.k@voyage-express.com',
    agency: 'Voyage Express',
    agencyInitial: 'V',
    agencyColor: '#8b5cf6',
    role: 'Opérateur',
    status: 'Suspendu' as const,
    avatar: '/avatars/julien.jpg',
  },
  {
    id: 'adm-004',
    name: 'Sarah Connor',
    email: 'admin@skynet-tours.org',
    agency: 'Skynet Tours',
    agencyInitial: 'S',
    agencyColor: '#06b6d4',
    role: 'Propriétaire',
    status: 'Actif' as const,
    avatar: '/avatars/sarah.jpg',
  },
]

export const mockFinanceData = {
  chiffreAffaires: 128000000,
  commissionNette: 12400000,
  trajetsEffectues: 1492,
  reversementsAttente: 3200000,
  evolution: [
    { month: '1 Mai', value: 10000000 },
    { month: '5 Mai', value: 14000000 },
    { month: '10 Mai', value: 12000000 },
    { month: '15 Mai', value: 15000000 },
    { month: '20 Mai', value: 18000000 },
    { month: '25 Mai', value: 22000000 },
    { month: '30 Mai', value: 28000000 },
  ],
  topPerformers: [
    { name: 'Horizon Voyages', percentage: 42, generated: '54.2M FCFA' },
    { name: 'Safari Express', percentage: 28, generated: '36.1M FCFA' },
    { name: 'Ivoire Transport', percentage: 15, generated: '19.3M FCFA' },
  ],
  agenceDetails: [
    {
      id: 'ag-8832',
      name: 'Horizon Voyages',
      initial: 'H',
      color: '#3b82f6',
      trajets: 432,
      caBrut: 54200500,
      commission: 5420060,
      croissance: 12,
      statutReversement: 'Payé' as const,
    },
    {
      id: 'ag-1029',
      name: 'Safari Express',
      initial: 'S',
      color: '#22c55e',
      trajets: 285,
      caBrut: 36150000,
      commission: 3615000,
      croissance: 5,
      statutReversement: 'En attente' as const,
    },
    {
      id: 'ag-7721',
      name: 'Ivoire Transport',
      initial: 'I',
      color: '#6366f1',
      trajets: 150,
      caBrut: 19300000,
      commission: 1930000,
      croissance: -2,
      statutReversement: 'Payé' as const,
    },
    {
      id: 'ag-9901',
      name: 'Globo Bus',
      initial: 'G',
      color: '#f59e0b',
      trajets: 98,
      caBrut: 10500000,
      commission: 1050000,
      croissance: 22,
      statutReversement: 'Bloqué' as const,
    },
  ],
}

export const formatFCFA = (amount: number): string => {
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M FCFA`
  }
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

export const formatNumber = (num: number): string => {
  return num.toLocaleString('fr-FR')
}
