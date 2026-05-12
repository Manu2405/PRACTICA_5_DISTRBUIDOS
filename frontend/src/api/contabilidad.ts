import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/api/client'
import type { ConsultaResponse } from '@/schemas'

export function useConsultaContabilidad(id: number) {
  return useQuery({
    queryKey: ['contabilidad', 'consulta', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ConsultaResponse>(`/api/contabilidad/consulta/${id}`)
      return data
    },
  })
}
