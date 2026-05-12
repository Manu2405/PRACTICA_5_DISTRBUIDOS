/** Litros o m³ según prefijo del proyecto */
export function formatM3(value: number, fractionDigits = 2) {
  return `${value.toLocaleString('es-BO', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })} m³`
}

export function formatBs(value: number) {
  return `Bs ${value.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatPct(value: number, fractionDigits = 1) {
  return `${value.toFixed(fractionDigits)} %`
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-BO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
