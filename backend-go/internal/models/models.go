package models

// ---- Catálogos ----

type Distrito struct {
	ID          int     `json:"idDistrito"`
	Nombre      string  `json:"nombre"`
	Subalcaldia string  `json:"subalcaldia"`
	Poblacion   int     `json:"poblacion"`
	Lat         float64 `json:"lat"`
	Lon         float64 `json:"lon"`
}

type Tarifa struct {
	Alias         string  `json:"alias"`
	Categoria     string  `json:"categoria"`
	Descripcion   string  `json:"descripcion"`
	ConsumoMinimo float64 `json:"consumoMinimoM3"`
	CargoFijo     float64 `json:"cargoFijo"`
	Moneda        string  `json:"moneda"`
}

type Gateway struct {
	ID     int     `json:"idGateway"`
	Nombre string  `json:"nombre"`
	Lat    float64 `json:"lat"`
	Lon    float64 `json:"lon"`
}

// ---- Operacionales ----

type Contrato struct {
	NumeroContrato string `json:"numeroContrato"`
	Identificador  string `json:"identificadorTitular"`
	Nombre         string `json:"nombreTitular"`
	TipoPersona    string `json:"tipoPersona"`
	Direccion      string `json:"direccion"`
	Distrito       string `json:"distrito"`
	Zona           string `json:"zona"`
	TarifaAlias    string `json:"tarifaAlias"`
	Estado         string `json:"estado"`
	FechaAlta      string `json:"fechaAlta"`
}

type Medidor struct {
	NumeroSerie   string  `json:"numeroSerie"`
	MAC           string  `json:"mac"`
	Modelo        string  `json:"modelo"`
	Contrato      string  `json:"numeroContrato"`
	TarifaAlias   string  `json:"tarifaAlias"`
	Distrito      string  `json:"distrito"`
	Zona          string  `json:"zona"`
	Radiobase     string  `json:"radiobase"`
	Estado        string  `json:"estado"`
	Lat           float64 `json:"lat"`
	Lon           float64 `json:"lon"`
}

type ConsumoMensual struct {
	NumeroContrato string  `json:"numeroContrato"`
	Periodo        string  `json:"periodo"`
	Identificador  string  `json:"identificadorTitular"`
	Nombre         string  `json:"nombreTitular"`
	Distrito       string  `json:"distrito"`
	Zona           string  `json:"zona"`
	TarifaAlias    string  `json:"tarifaAlias"`
	ConsumoM3      float64 `json:"consumoM3"`
	MontoBs        float64 `json:"montoBs"`
	EstadoFact     string  `json:"estadoFacturacion"`
}

type ErrorModelo struct {
	Periodo     string `json:"periodo"`
	Modelo      string `json:"modelo"`
	CodigoError int    `json:"codigoError"`
	Descripcion string `json:"descripcion"`
	Cantidad    int    `json:"cantidad"`
}

type ErrorDistrito struct {
	Periodo     string `json:"periodo"`
	Distrito    string `json:"distrito"`
	Zona        string `json:"zona"`
	CodigoError int    `json:"codigoError"`
	Descripcion string `json:"descripcion"`
	Cantidad    int    `json:"cantidad"`
}

// ---- Requests/Responses ----

type FacturaRequest struct {
	NumeroContrato string `json:"numeroContrato"`
	Periodo        string `json:"periodo"`
}

type FacturaResponse struct {
	Estado    string  `json:"estado"`
	Cliente   string  `json:"cliente"`
	Periodo   string  `json:"periodo"`
	ConsumoM3 float64 `json:"consumoM3"`
	MontoBs   float64 `json:"montoBs"`
	PDF       string  `json:"pdfMediaCarta"`
}

type NotificacionRequest struct {
	Formato        string `json:"formato"`
	NumeroContrato string `json:"numeroContrato"`
	Periodo        string `json:"periodo"`
}

type NotificacionResponse struct {
	Estado  string `json:"estado"`
	Formato string `json:"formato"`
	Mensaje string `json:"mensaje"`
}

type ResumenOperacional struct {
	Periodo              string  `json:"periodo"`
	ConsumoTotalM3       float64 `json:"consumoTotalM3"`
	CantidadMedidores    int     `json:"cantidadMedidores"`
	MedidoresActivos     int     `json:"medidoresActivos"`
	MedidoresInactivos   int     `json:"medidoresInactivos"`
	MedidoresFueraServ   int     `json:"medidoresFueraServicio"`
	PoblacionBenef       int     `json:"poblacionBeneficiaria"`
	CantidadErrores      int     `json:"cantidadErrores"`
}

type ConsumoDistrito struct {
	Distrito  string  `json:"distrito"`
	ConsumoM3 float64 `json:"consumoM3"`
	MontoBs   float64 `json:"montoBs"`
	Contratos int     `json:"contratos"`
}

type IngresoTarifa struct {
	Tarifa    string  `json:"tarifa"`
	ConsumoM3 float64 `json:"consumoM3"`
	MontoBs   float64 `json:"montoBs"`
	Contratos int     `json:"contratos"`
}

type MedidorEstadoDistrito struct {
	Distrito      string `json:"distrito"`
	Activo        int    `json:"activo"`
	Inactivo      int    `json:"inactivo"`
	FueraServicio int    `json:"fueraServicio"`
}
