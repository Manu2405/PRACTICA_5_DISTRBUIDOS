import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/api/client'
import type { ConsultaResponse } from '@/schemas'

export function useConsultaOperacional(id: number) {
  return useQuery({
    queryKey: ['operacional', 'consulta', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ConsultaResponse>(`/api/operacional/consulta/${id}`)
      return data
    },
  })
}
