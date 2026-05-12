package handlers

import (
	"fmt"
	"math"
	"math/big"
	"net/http"
	"strconv"
	"time"

	"semapa-backend/internal/db"
	"semapa-backend/internal/models"
	"semapa-backend/internal/services"

	"github.com/gin-gonic/gin"
	"gopkg.in/inf.v0"
)

func defaultPeriodo(c *gin.Context) string {
	p := c.Query("periodo")
	if p == "" {
		p = time.Now().Format("2006-01")
	}
	return p
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

// decToFloat convierte inf.Dec (tipo decimal de Cassandra) a float64
func decToFloat(d *inf.Dec) float64 {
	if d == nil {
		return 0
	}
	f, _ := new(big.Float).SetString(d.String())
	if f == nil {
		return 0
	}
	v, _ := f.Float64()
	return v
}

// ---- HEALTH ----

func Health(c *gin.Context) {
	err := db.Session.Query("SELECT now() FROM system.local").Exec()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "database": "disconnected"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "database": "connected", "service": "semapa-backend"})
}

// ---- OPERACIONAL ----

func ResumenOperacional(c *gin.Context) {
	p := defaultPeriodo(c)

	// Medidores
	var estado string
	activos, inactivos, fuera, total := 0, 0, 0, 0
	iter := db.Session.Query("SELECT estado FROM medidores_por_serie").Iter()
	for iter.Scan(&estado) {
		total++
		switch estado {
		case "activo":
			activos++
		case "inactivo":
			inactivos++
		case "fuera_servicio":
			fuera++
		}
	}
	iter.Close()

	// Consumo del periodo
	var consumoDec *inf.Dec
	var periodoRow string
	consumoTotal := 0.0
	errTotal := 0
	iter2 := db.Session.Query("SELECT periodo, consumo_m3 FROM consumo_mensual_por_contrato").Iter()
	for iter2.Scan(&periodoRow, &consumoDec) {
		if periodoRow == p {
			consumoTotal += decToFloat(consumoDec)
		}
	}
	iter2.Close()

	// Errores
	var cantidad int
	iter3 := db.Session.Query("SELECT periodo, cantidad FROM errores_por_modelo_mes").Iter()
	for iter3.Scan(&periodoRow, &cantidad) {
		if periodoRow == p {
			errTotal += cantidad
		}
	}
	iter3.Close()

	// Población
	var poblacion int
	poblacionTotal := 0
	iter4 := db.Session.Query("SELECT poblacion FROM catalogo_distritos").Iter()
	for iter4.Scan(&poblacion) {
		poblacionTotal += poblacion
	}
	iter4.Close()

	c.JSON(http.StatusOK, models.ResumenOperacional{
		Periodo: p, ConsumoTotalM3: round2(consumoTotal),
		CantidadMedidores: total, MedidoresActivos: activos,
		MedidoresInactivos: inactivos, MedidoresFueraServ: fuera,
		PoblacionBenef: poblacionTotal, CantidadErrores: errTotal,
	})
}

func ConsumoDistritoHandler(c *gin.Context) {
	p := defaultPeriodo(c)
	byDist := make(map[string]*models.ConsumoDistrito)

	var periodo, distrito, tarifa string
	var consumoDec, montoDec *inf.Dec
	iter := db.Session.Query("SELECT periodo, distrito, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato").Iter()
	for iter.Scan(&periodo, &distrito, &tarifa, &consumoDec, &montoDec) {
		if periodo != p {
			continue
		}
		if _, ok := byDist[distrito]; !ok {
			byDist[distrito] = &models.ConsumoDistrito{Distrito: distrito}
		}
		byDist[distrito].ConsumoM3 += decToFloat(consumoDec)
		byDist[distrito].MontoBs += decToFloat(montoDec)
		byDist[distrito].Contratos++
	}
	iter.Close()

	result := make([]models.ConsumoDistrito, 0, len(byDist))
	for _, v := range byDist {
		v.ConsumoM3 = round2(v.ConsumoM3)
		v.MontoBs = round2(v.MontoBs)
		result = append(result, *v)
	}
	c.JSON(http.StatusOK, result)
}

func MapaMedidores(c *gin.Context) {
	var serie, estado, distrito, zona, modelo string
	var lat, lon float64
	medidores := make([]models.Medidor, 0, 500)
	iter := db.Session.Query("SELECT numero_serie, estado, lat, lon, distrito, zona, modelo FROM medidores_por_serie").Iter()
	for iter.Scan(&serie, &estado, &lat, &lon, &distrito, &zona, &modelo) {
		medidores = append(medidores, models.Medidor{
			NumeroSerie: serie, Estado: estado, Lat: lat, Lon: lon,
			Distrito: distrito, Zona: zona, Modelo: modelo,
		})
		if len(medidores) >= 500 {
			break
		}
	}
	iter.Close()
	c.JSON(http.StatusOK, medidores)
}

func MedidoresEstado(c *gin.Context) {
	byDist := make(map[string]*models.MedidorEstadoDistrito)
	var estado, distrito string
	iter := db.Session.Query("SELECT estado, distrito FROM medidores_por_serie").Iter()
	for iter.Scan(&estado, &distrito) {
		if _, ok := byDist[distrito]; !ok {
			byDist[distrito] = &models.MedidorEstadoDistrito{Distrito: distrito}
		}
		switch estado {
		case "activo":
			byDist[distrito].Activo++
		case "inactivo":
			byDist[distrito].Inactivo++
		case "fuera_servicio":
			byDist[distrito].FueraServicio++
		}
	}
	iter.Close()
	result := make([]models.MedidorEstadoDistrito, 0)
	for _, v := range byDist {
		result = append(result, *v)
	}
	c.JSON(http.StatusOK, result)
}

// ---- CONTABILIDAD ----

func IngresosTarifa(c *gin.Context) {
	p := defaultPeriodo(c)
	byTarifa := make(map[string]*models.IngresoTarifa)

	var periodo, tarifa string
	var consumoDec, montoDec *inf.Dec
	iter := db.Session.Query("SELECT periodo, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato").Iter()
	for iter.Scan(&periodo, &tarifa, &consumoDec, &montoDec) {
		if periodo != p {
			continue
		}
		if _, ok := byTarifa[tarifa]; !ok {
			byTarifa[tarifa] = &models.IngresoTarifa{Tarifa: tarifa}
		}
		byTarifa[tarifa].ConsumoM3 += decToFloat(consumoDec)
		byTarifa[tarifa].MontoBs += decToFloat(montoDec)
		byTarifa[tarifa].Contratos++
	}
	iter.Close()

	result := make([]models.IngresoTarifa, 0)
	for _, v := range byTarifa {
		v.ConsumoM3 = round2(v.ConsumoM3)
		v.MontoBs = round2(v.MontoBs)
		result = append(result, *v)
	}
	c.JSON(http.StatusOK, result)
}

func TopConsumidores(c *gin.Context) {
	p := defaultPeriodo(c)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	type topItem struct {
		Contrato  string  `json:"contrato"`
		Nombre    string  `json:"nombre"`
		Distrito  string  `json:"distrito"`
		Zona      string  `json:"zona"`
		Tarifa    string  `json:"tarifa"`
		ConsumoM3 float64 `json:"consumoM3"`
		MontoBs   float64 `json:"montoBs"`
	}

	var all []topItem
	var contrato, periodoR, nombre, distrito, zona, tarifa string
	var consumoDec, montoDec *inf.Dec
	iter := db.Session.Query("SELECT numero_contrato, periodo, nombre_titular, distrito, zona, tarifa_alias, consumo_m3, monto_bs FROM consumo_mensual_por_contrato").Iter()
	for iter.Scan(&contrato, &periodoR, &nombre, &distrito, &zona, &tarifa, &consumoDec, &montoDec) {
		if periodoR == p {
			all = append(all, topItem{
				Contrato: contrato, Nombre: nombre, Distrito: distrito,
				Zona: zona, Tarifa: tarifa,
				ConsumoM3: round2(decToFloat(consumoDec)),
				MontoBs:   round2(decToFloat(montoDec)),
			})
		}
	}
	iter.Close()

	// Sort desc
	for i := 0; i < len(all); i++ {
		for j := i + 1; j < len(all); j++ {
			if all[j].ConsumoM3 > all[i].ConsumoM3 {
				all[i], all[j] = all[j], all[i]
			}
		}
	}
	if len(all) > limit {
		all = all[:limit]
	}
	c.JSON(http.StatusOK, all)
}

// ---- ADMINISTRACIÓN ----

func ErroresModelo(c *gin.Context) {
	p := defaultPeriodo(c)
	var e models.ErrorModelo
	result := make([]models.ErrorModelo, 0)
	iter := db.Session.Query("SELECT periodo, modelo, codigo_error, descripcion_error, cantidad FROM errores_por_modelo_mes").Iter()
	for iter.Scan(&e.Periodo, &e.Modelo, &e.CodigoError, &e.Descripcion, &e.Cantidad) {
		if e.Periodo == p {
			result = append(result, e)
		}
	}
	iter.Close()
	c.JSON(http.StatusOK, result)
}

func ErroresDistrito(c *gin.Context) {
	p := defaultPeriodo(c)
	var e models.ErrorDistrito
	result := make([]models.ErrorDistrito, 0)
	iter := db.Session.Query("SELECT periodo, distrito, zona, codigo_error, descripcion_error, cantidad FROM errores_por_distrito_zona").Iter()
	for iter.Scan(&e.Periodo, &e.Distrito, &e.Zona, &e.CodigoError, &e.Descripcion, &e.Cantidad) {
		if e.Periodo == p {
			result = append(result, e)
		}
	}
	iter.Close()
	c.JSON(http.StatusOK, result)
}

// ---- CONSULTAS ----

func BuscarContrato(c *gin.Context) {
	numero := c.Param("numero")
	var ct models.Contrato
	err := db.Session.Query("SELECT numero_contrato, identificador_titular, nombre_titular, tipo_persona, direccion, distrito, zona, tarifa_alias, estado FROM contratos_por_numero WHERE numero_contrato = ?", numero).
		Scan(&ct.NumeroContrato, &ct.Identificador, &ct.Nombre, &ct.TipoPersona, &ct.Direccion, &ct.Distrito, &ct.Zona, &ct.TarifaAlias, &ct.Estado)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contrato no encontrado"})
		return
	}
	c.JSON(http.StatusOK, ct)
}

func BuscarMedidor(c *gin.Context) {
	serie := c.Param("serie")
	var m models.Medidor
	err := db.Session.Query("SELECT numero_serie, mac, modelo, numero_contrato, tarifa_alias, distrito, zona, radiobase, estado, lat, lon FROM medidores_por_serie WHERE numero_serie = ?", serie).
		Scan(&m.NumeroSerie, &m.MAC, &m.Modelo, &m.Contrato, &m.TarifaAlias, &m.Distrito, &m.Zona, &m.Radiobase, &m.Estado, &m.Lat, &m.Lon)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medidor no encontrado"})
		return
	}
	c.JSON(http.StatusOK, m)
}

func ConsumoContrato(c *gin.Context) {
	contrato := c.Param("contrato")
	result := make([]gin.H, 0)
	var periodo, estadoFact string
	var consumoDec, montoDec *inf.Dec
	iter := db.Session.Query("SELECT periodo, consumo_m3, monto_bs, estado_facturacion FROM consumo_mensual_por_contrato WHERE numero_contrato = ?", contrato).Iter()
	for iter.Scan(&periodo, &consumoDec, &montoDec, &estadoFact) {
		result = append(result, gin.H{
			"periodo": periodo, "consumoM3": round2(decToFloat(consumoDec)),
			"montoBs": round2(decToFloat(montoDec)), "estado": estadoFact,
		})
	}
	iter.Close()
	c.JSON(http.StatusOK, result)
}

// ---- CATÁLOGOS ----

func Distritos(c *gin.Context) {
	var d models.Distrito
	result := make([]models.Distrito, 0)
	iter := db.Session.Query("SELECT id_distrito, nombre, subalcaldia, poblacion, lat, lon FROM catalogo_distritos").Iter()
	for iter.Scan(&d.ID, &d.Nombre, &d.Subalcaldia, &d.Poblacion, &d.Lat, &d.Lon) {
		result = append(result, d)
	}
	iter.Close()
	c.JSON(http.StatusOK, result)
}

func Tarifas(c *gin.Context) {
	var alias, categoria, descripcion, moneda string
	var consumoMin, cargoFijo *inf.Dec
	result := make([]models.Tarifa, 0)
	iter := db.Session.Query("SELECT alias, categoria, descripcion, consumo_minimo_m3, cargo_fijo, moneda FROM catalogo_tarifas").Iter()
	for iter.Scan(&alias, &categoria, &descripcion, &consumoMin, &cargoFijo, &moneda) {
		result = append(result, models.Tarifa{
			Alias: alias, Categoria: categoria, Descripcion: descripcion,
			ConsumoMinimo: decToFloat(consumoMin), CargoFijo: decToFloat(cargoFijo), Moneda: moneda,
		})
	}
	iter.Close()
	c.JSON(http.StatusOK, result)
}

func Gateways(c *gin.Context) {
	var g models.Gateway
	result := make([]models.Gateway, 0)
	iter := db.Session.Query("SELECT id_gateway, nombre, lat, lon FROM catalogo_gateways").Iter()
	for iter.Scan(&g.ID, &g.Nombre, &g.Lat, &g.Lon) {
		result = append(result, g)
	}
	iter.Close()
	c.JSON(http.StatusOK, result)
}

func Contratos(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	result := make([]models.Contrato, 0, limit)
	var ct models.Contrato
	iter := db.Session.Query(fmt.Sprintf("SELECT numero_contrato, identificador_titular, nombre_titular, tipo_persona, direccion, distrito, zona, tarifa_alias, estado FROM contratos_por_numero LIMIT %d", limit)).Iter()
	for iter.Scan(&ct.NumeroContrato, &ct.Identificador, &ct.Nombre, &ct.TipoPersona, &ct.Direccion, &ct.Distrito, &ct.Zona, &ct.TarifaAlias, &ct.Estado) {
		result = append(result, ct)
	}
	iter.Close()
	c.JSON(http.StatusOK, result)
}

// ---- FACTURACIÓN ----

func GenerarFactura(c *gin.Context) {
	var req models.FacturaRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.NumeroContrato == "" || req.Periodo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Faltan campos numeroContrato y periodo"})
		return
	}

	var ct models.Contrato
	err := db.Session.Query("SELECT numero_contrato, nombre_titular, identificador_titular, distrito, zona, tarifa_alias, direccion, tipo_persona FROM contratos_por_numero WHERE numero_contrato = ?", req.NumeroContrato).
		Scan(&ct.NumeroContrato, &ct.Nombre, &ct.Identificador, &ct.Distrito, &ct.Zona, &ct.TarifaAlias, &ct.Direccion, &ct.TipoPersona)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contrato no encontrado"})
		return
	}

	var consumoDec, montoDec *inf.Dec
	err = db.Session.Query("SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?", req.NumeroContrato, req.Periodo).
		Scan(&consumoDec, &montoDec)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Sin consumo para ese periodo"})
		return
	}

	consumo := round2(decToFloat(consumoDec))
	monto := round2(decToFloat(montoDec))

	// Buscar medidor asociado
	var numMedidor string
	db.Session.Query("SELECT numero_serie FROM medidores_por_serie WHERE numero_contrato = ? LIMIT 1 ALLOW FILTERING", req.NumeroContrato).Scan(&numMedidor)

	datos := services.DatosRecibo{
		NumeroContrato: ct.NumeroContrato,
		NombreTitular:  ct.Nombre,
		Identificador:  ct.Identificador,
		TipoPersona:    ct.TipoPersona,
		Direccion:      ct.Direccion,
		Distrito:       ct.Distrito,
		Zona:           ct.Zona,
		TarifaAlias:    ct.TarifaAlias,
		Periodo:        req.Periodo,
		ConsumoM3:      consumo,
		MontoBs:        monto,
		NumeroMedidor:  numMedidor,
	}

	pdfMedia, errPdf1 := services.GenerarMediaCarta(datos)
	pdfRollo, errPdf2 := services.GenerarRolloTermico(datos)

	if errPdf1 != nil || errPdf2 != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error generando PDFs"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"estado":        "generado",
		"cliente":       ct.Nombre,
		"periodo":       req.Periodo,
		"consumoM3":     consumo,
		"montoBs":       monto,
		"pdfMediaCarta": "/recibos/" + pdfMedia,
		"pdfRollo":      "/recibos/" + pdfRollo,
	})
}

// ---- NOTIFICACIÓN ----

func SimularNotificacion(c *gin.Context) {
	var req models.NotificacionRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.NumeroContrato == "" || req.Periodo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Faltan campos"})
		return
	}

	var nombre string
	err := db.Session.Query("SELECT nombre_titular FROM contratos_por_numero WHERE numero_contrato = ?", req.NumeroContrato).Scan(&nombre)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Contrato no encontrado"})
		return
	}

	var consumoDec, montoDec *inf.Dec
	db.Session.Query("SELECT consumo_m3, monto_bs FROM consumo_mensual_por_contrato WHERE numero_contrato = ? AND periodo = ?", req.NumeroContrato, req.Periodo).
		Scan(&consumoDec, &montoDec)

	consumo := decToFloat(consumoDec)
	monto := decToFloat(montoDec)

	mensaje := fmt.Sprintf("Estimado/a %s, SEMAPA le informa que su consumo del período %s fue de %.2f m³, con un monto de Bs %.2f. Contrato: %s.",
		nombre, req.Periodo, consumo, monto, req.NumeroContrato)

	db.Session.Query("INSERT INTO notificaciones_por_contrato (numero_contrato, periodo, fecha_hora, formato, identificador, estado, mensaje) VALUES (?, ?, ?, ?, ?, ?, ?)",
		req.NumeroContrato, req.Periodo, time.Now(), req.Formato, req.NumeroContrato, "simulado", mensaje).Exec()

	c.JSON(http.StatusOK, models.NotificacionResponse{
		Estado: "simulado", Formato: req.Formato, Mensaje: mensaje,
	})
}
