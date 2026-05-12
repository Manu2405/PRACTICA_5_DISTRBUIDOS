package schemas

type HealthResponse struct {
	Status string `json:"status"`
}

type ConsultaResponse struct {
	ConsultaID string `json:"consulta_id"`
	Rows       []any  `json:"rows"`
}

type FacturaMeta struct {
	Numero   string `json:"numero"`
	Cliente  string `json:"cliente"`
	Periodo  string `json:"periodo"`
	Importe  string `json:"importe"`
	Currency string `json:"currency"`
}
