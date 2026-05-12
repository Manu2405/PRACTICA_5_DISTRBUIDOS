import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/api/client'
import type { ConsultaResponse } from '@/schemas'

export function useConsultaFactura(id: number) {
  return useQuery({
    queryKey: ['factura', 'consulta', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ConsultaResponse>(`/api/factura/consulta/${id}`)
      return data
    },
  })
}

export function facturaTicketPdfUrl(numero: string, params?: URLSearchParams) {
  const q = params?.toString()
  return `/api/factura/${encodeURIComponent(numero)}/pdf/ticket${q ? `?${q}` : ''}`
}

export function facturaMediaCartaPdfUrl(numero: string, params?: URLSearchParams) {
  const q = params?.toString()
  return `/api/factura/${encodeURIComponent(numero)}/pdf/mediacarta${q ? `?${q}` : ''}`
}
