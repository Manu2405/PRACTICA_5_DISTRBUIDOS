/** Espejo de DTOs del backend (Pydantic → TS). Ajustar cuando los modelos estén cerrados. */

export type HealthResponse = {
  status: string
}

export type ConsultaResponse = {
  consulta_id: string
  rows: unknown[]
}

export type FacturaMeta = {
  numero: string
  cliente?: string
  periodo?: string
  importe?: string
  currency?: string
}
