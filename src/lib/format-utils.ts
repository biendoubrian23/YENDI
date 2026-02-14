// Utilitaires de formatage YENDI

export const formatFCFA = (amount: number): string => {
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M FCFA`
  }
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

export const formatNumber = (num: number): string => {
  return num.toLocaleString('fr-FR')
}
