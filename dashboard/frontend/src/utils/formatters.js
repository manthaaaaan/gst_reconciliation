export function formatCurrency(val) {
  if (val === null || val === undefined || val === '') return '-'
  const num = parseFloat(val)
  if (isNaN(num)) return '-'
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatPercentage(val) {
  if (val === null || val === undefined) return '0%'
  return `${val}%`
}
