import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/api/client'
import type { ConsultaResponse } from '@/schemas'

export function useConsultaAdministracion(id: number) {
  return useQuery({
    queryKey: ['administracion', 'consulta', id],
    queryFn: async () => {
      const { data } = await apiClient.get<ConsultaResponse>(`/api/administracion/consulta/${id}`)
      return data
    },
  })
}
