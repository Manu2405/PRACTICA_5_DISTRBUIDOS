package handlers

import (
	"math"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"semapa/backend-go/internal/db"
	"semapa/backend-go/internal/middleware"
	"semapa/backend-go/internal/services"

	"github.com/gin-gonic/gin"
)

// normalizeMedidorCodigo acepta MAC (XX:XX:XX:XX:XX:XX) o serie (XXXXXXXXXXXX).
// La serie en Cassandra es la MAC sin ":".
func normalizeMedidorCodigo(codigo string) string {
	return strings.ReplaceAll(strings.ToUpper(strings.TrimSpace(codigo)), ":", "")
}

func Health(c *gin.Context) {
	s := db.Session()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "database": "disconnected"})
		return
	}
	var v string
	if err := s.Query("SELECT release_version FROM system.local").Scan(&v); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "error", "database": "disconnected"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "database": "connected", "service": "semapa-backend-go"})
}

func Login(c *gin.Context) {
	var body struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if c.BindJSON(&body) != nil || body.Username == "" || body.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Usuario y contraseña requeridos"})
		return
	}
	for _, u := range middleware.LoadMobileUsers() {
		if u.Username == body.Username && u.Password == body.Password {
			access, _ := middleware.SignToken(u.ID, u.Username, u.Role, u.Nombre, "", 8)
			refresh, _ := middleware.SignToken(u.ID, u.Username, u.Role, u.Nombre, "refresh", 24*7)
			c.JSON(http.StatusOK, gin.H{
				"accessToken":  access,
				"refreshToken": refresh,
				"user":         gin.H{"id": u.ID, "username": u.Username, "role": u.Role, "nombre": u.Nombre},
			})
			return
		}
	}
	c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
}

func Refresh(c *gin.Context) {
	var body struct {
		RefreshToken string `json:"refreshToken"`
	}
	if c.BindJSON(&body) != nil || body.RefreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "refreshToken requerido"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"accessToken": body.RefreshToken, "note": "implementar validación JWT refresh en producción"})
}

func ListMedidores(c *gin.Context) {
	s := db.Session()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DB no disponible"})
		return
	}
	iter := s.Query("SELECT numero_serie, mac, modelo, estado, distrito, zona, tarifa_alias, lat, lon, numero_contrato FROM medidores_por_serie").Iter()
	var out []gin.H
	var serie, mac, modelo, estado, distrito, zona, tarifa, contrato string
	var lat, lon float64
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "100"))
	n := 0
	for iter.Scan(&serie, &mac, &modelo, &estado, &distrito, &zona, &tarifa, &lat, &lon, &contrato) && n < limit {
		out = append(out, gin.H{
			"codigo": serie, "numeroSerie": serie, "mac": mac, "modelo": modelo,
			"estado": estado, "distrito": distrito, "zona": zona, "tarifaAlias": tarifa,
			"lat": lat, "lon": lon, "numeroContrato": contrato,
		})
		n++
	}
	_ = iter.Close()
	c.JSON(http.StatusOK, out)
}

func GetMedidor(c *gin.Context) {
	codigo := normalizeMedidorCodigo(c.Param("codigo"))
	s := db.Session()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DB no disponible"})
		return
	}
	var serie, mac, modelo, estado, distrito, zona, tarifa, contrato string
	var lat, lon float64
	err := s.Query(
		"SELECT numero_serie, mac, modelo, estado, distrito, zona, tarifa_alias, lat, lon, numero_contrato FROM medidores_por_serie WHERE numero_serie = ?",
		codigo,
	).Scan(&serie, &mac, &modelo, &estado, &distrito, &zona, &tarifa, &lat, &lon, &contrato)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medidor no encontrado"})
		return
	}
	periodo := c.DefaultQuery("periodo", time.Now().Format("2006-01"))
	var fh time.Time
	var lecM3, lecActual, lecAnterior float32
	type lectRow struct {
		fh                      time.Time
		lecM3, lecAct, lecAnter float32
	}
	var lecturas []lectRow
	iter := s.Query(
		"SELECT fecha_hora, lectura_m3, lectura_actual_m3, lectura_anterior_m3 FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ?",
		codigo, periodo,
	).Iter()
	for iter.Scan(&fh, &lecM3, &lecActual, &lecAnterior) {
		lecturas = append(lecturas, lectRow{fh, lecM3, lecActual, lecAnterior})
	}
	_ = iter.Close()
	actual, anterior := float64(0), float64(0)
	if len(lecturas) > 0 {
		// Si hay lectura_actual_m3 (datos del CSV) la priorizamos; sino, usar lectura_m3
		if lecturas[0].lecAct > 0 {
			actual = float64(lecturas[0].lecAct)
			anterior = float64(lecturas[0].lecAnter)
		} else {
			actual = float64(lecturas[0].lecM3)
			if len(lecturas) > 1 {
				anterior = float64(lecturas[1].lecM3)
			}
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"codigo": serie, "numeroSerie": serie, "mac": mac, "modelo": modelo, "estado": estado,
		"distrito": distrito, "zona": zona, "tarifaAlias": tarifa, "lat": lat, "lon": lon,
		"numeroContrato": contrato, "periodo": periodo,
		"lecturaActual": actual, "lecturaAnterior": anterior,
		"consumoParcial": actual - anterior,
	})
}

func RegistrarLectura(c *gin.Context) {
	var body struct {
		CodigoMedidor    string  `json:"codigo_medidor"`
		LecturaM3        float64 `json:"lectura_m3"`
		LecturaActualM3  float64 `json:"lectura_actual_m3"`
		LecturaAnteriorM3 float64 `json:"lectura_anterior_m3"`
		Observaciones    string  `json:"observaciones"`
		Lat              float64 `json:"lat"`
		Lon              float64 `json:"lon"`
		FechaHora        string  `json:"fecha_hora"`
	}
	if c.BindJSON(&body) != nil || body.CodigoMedidor == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "codigo_medidor requerido"})
		return
	}
	s := db.Session()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DB no disponible"})
		return
	}
	codigo := normalizeMedidorCodigo(body.CodigoMedidor)
	var mac, radiobase, distrito, zona string
	err := s.Query(
		"SELECT mac, radiobase, distrito, zona FROM medidores_por_serie WHERE numero_serie = ?",
		codigo,
	).Scan(&mac, &radiobase, &distrito, &zona)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Medidor no encontrado"})
		return
	}
	ts := time.Now()
	if body.FechaHora != "" {
		if t, e := time.Parse(time.RFC3339, body.FechaHora); e == nil {
			ts = t
		}
	}
	periodo := ts.Format("2006-01")
	desc := body.Observaciones
	if desc == "" {
		desc = "Lectura manual via AppRegistro"
	}
	// Si vienen lectura_actual_m3 + lectura_anterior_m3, usar el diferencial; si no, usar lectura_m3.
	lecAct := body.LecturaActualM3
	lecAnt := body.LecturaAnteriorM3
	consumoM3 := body.LecturaM3
	if lecAct > 0 || lecAnt > 0 {
		consumoM3 = lecAct - lecAnt
		if consumoM3 < 0 {
			consumoM3 = 0
		}
	}
	if err := s.Query(
		`INSERT INTO lecturas_por_medidor_mes (numero_serie, periodo, fecha_hora, mac, radiobase, lectura_m3, lectura_litros, lectura_anterior_m3, lectura_actual_m3, status, descripcion_status, distrito, zona, origen) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
		codigo, periodo, ts, mac, radiobase, consumoM3, consumoM3*1000, lecAnt, lecAct, 1, desc, distrito, zona, "app_movil",
	).Exec(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	claims, _ := c.Get("user")
	user := ""
	if cl, ok := claims.(*middleware.Claims); ok {
		user = cl.Username
	}
	c.JSON(http.StatusCreated, gin.H{
		"ok": true, "codigo_medidor": codigo, "mac": mac, "periodo": periodo,
		"fecha_hora": ts.Format(time.RFC3339), "consumo_m3": consumoM3,
		"lectura_anterior_m3": lecAnt, "lectura_actual_m3": lecAct,
		"usuario": user, "origen": "app_movil",
	})
}

func HistorialLecturas(c *gin.Context) {
	codigo := c.Query("codigo_medidor")
	if codigo == "" {
		codigo = c.Query("codigo")
	}
	if codigo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "codigo_medidor requerido"})
		return
	}
	periodo := c.Query("periodo")
	s := db.Session()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DB no disponible"})
		return
	}
	var q string
	var args []interface{}
	if periodo != "" {
		q = "SELECT fecha_hora, lectura_m3, descripcion_status, periodo FROM lecturas_por_medidor_mes WHERE numero_serie = ? AND periodo = ?"
		args = []interface{}{codigo, periodo}
	} else {
		q = "SELECT fecha_hora, lectura_m3, descripcion_status, periodo FROM lecturas_por_medidor_mes WHERE numero_serie = ?"
		args = []interface{}{codigo}
	}
	iter := s.Query(q, args...).Iter()
	type row struct {
		fh   time.Time
		lec  float32
		desc string
		per  string
	}
	var rows []row
	var fh time.Time
	var lec float32
	var desc, per string
	for iter.Scan(&fh, &lec, &desc, &per) {
		rows = append(rows, row{fh, lec, desc, per})
	}
	_ = iter.Close()
	var hist []gin.H
	for i, r := range rows {
		actual := float64(r.lec)
		prev := actual
		if i+1 < len(rows) {
			prev = float64(rows[i+1].lec)
		}
		hist = append(hist, gin.H{
			"fechaHora": r.fh, "periodo": r.per, "lecturaM3": actual,
			"consumo": actual - prev, "observaciones": r.desc,
		})
	}
	c.JSON(http.StatusOK, gin.H{"codigo_medidor": codigo, "historial": hist})
}

func GetTarifas(c *gin.Context) {
	s := db.Session()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DB no disponible"})
		return
	}
	iter := s.Query("SELECT alias, categoria, descripcion, consumo_minimo_m3, cargo_fijo, rango_13_25, rango_26_50, rango_51_75, rango_76_100, rango_101_150, rango_151_mas, moneda FROM catalogo_tarifas").Iter()
	var out []gin.H
	var alias, cat, desc, moneda string
	var min, fijo, r1, r2, r3, r4, r5, r6 float32
	for iter.Scan(&alias, &cat, &desc, &min, &fijo, &r1, &r2, &r3, &r4, &r5, &r6, &moneda) {
		if c.Query("categoria") != "" && cat != c.Query("categoria") {
			continue
		}
		out = append(out, gin.H{
			"alias": alias, "categoria": cat, "descripcion": desc,
			"consumoMinimoM3": min, "cargoFijo": fijo,
			"rangos": gin.H{"r13_25": r1, "r26_50": r2, "r51_75": r3, "r76_100": r4, "r101_150": r5, "r151mas": r6},
			"moneda": moneda,
		})
	}
	_ = iter.Close()
	c.JSON(http.StatusOK, out)
}

func CalcularFactura(c *gin.Context) {
	var body struct {
		ConsumoM3      float64 `json:"consumo_m3"`
		TarifaAlias    string  `json:"tarifa_alias"`
		NumeroContrato string  `json:"numero_contrato"`
	}
	if c.BindJSON(&body) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "body inválido"})
		return
	}
	s := db.Session()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DB no disponible"})
		return
	}
	alias := body.TarifaAlias
	if alias == "" && body.NumeroContrato != "" {
		_ = s.Query("SELECT tarifa_alias FROM contratos_por_numero WHERE numero_contrato = ?", body.NumeroContrato).Scan(&alias)
	}
	if alias == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "tarifa_alias requerido"})
		return
	}
	var cat, desc string
	var min, fijo, r1, r2, r3, r4, r5, r6 float32
	err := s.Query(
		"SELECT categoria, descripcion, consumo_minimo_m3, cargo_fijo, rango_13_25, rango_26_50, rango_51_75, rango_76_100, rango_101_150, rango_151_mas FROM catalogo_tarifas WHERE alias = ?",
		alias,
	).Scan(&cat, &desc, &min, &fijo, &r1, &r2, &r3, &r4, &r5, &r6)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tarifa no encontrada"})
		return
	}
	res := services.CalcularMonto(body.ConsumoM3, services.TarifaRow{
		Alias: alias, Categoria: cat, ConsumoMinimoM3: float64(min), CargoFijo: float64(fijo),
		R13_25: float64(r1), R26_50: float64(r2), R51_75: float64(r3),
		R76_100: float64(r4), R101_150: float64(r5), R151Mas: float64(r6),
	})
	c.JSON(http.StatusOK, gin.H{
		"consumoM3": res.ConsumoM3, "montoBs": res.MontoBs, "cargoFijo": res.CargoFijo,
		"consumoMinimo": res.ConsumoMinimo, "categoria": res.Categoria, "alias": res.Alias,
		"excesoM3": res.ExcesoM3, "detalleBloques": res.DetalleBloques, "tarifaAlias": alias,
	})
}

func DashboardMobile(c *gin.Context) {
	s := db.Session()
	if s == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "DB no disponible"})
		return
	}
	hoy := time.Now()
	periodo := hoy.Format("2006-01")
	inicio := time.Date(hoy.Year(), hoy.Month(), hoy.Day(), 0, 0, 0, 0, hoy.Location())
	activos, pendientes := 0, 0
	iter := s.Query("SELECT estado FROM medidores_por_serie").Iter()
	var estado string
	for iter.Scan(&estado) {
		if estado == "activo" {
			activos++
		} else {
			pendientes++
		}
	}
	_ = iter.Close()
	c.JSON(http.StatusOK, gin.H{
		"fecha": hoy.Format("2006-01-02"), "periodo": periodo,
		"lecturasDelDia": 0, "medidoresActivos": activos, "medidoresPendientes": pendientes,
		"consumoPromedioM3": 0, "alertas": []string{},
		"sincronizacion": gin.H{"estado": "ok", "ultimaActualizacion": hoy.Format(time.RFC3339)},
		"_nota": "lecturasDelDia requiere scan por medidor; usar tras cargar datos",
	})
	_ = inicio
}

func SimularLorawan(c *gin.Context) {
	var body struct {
		CodigoMedidor string `json:"codigo_medidor"`
		Perfil        string `json:"perfil"`
		Fecha         string `json:"fecha"`
	}
	_ = c.BindJSON(&body)
	codigo := body.CodigoMedidor
	if codigo == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "codigo_medidor requerido"})
		return
	}
	rand.Seed(time.Now().UnixNano())
	consumoDia := 0.5 + rand.Float64()*2
	c.JSON(http.StatusOK, gin.H{
		"codigo_medidor": codigo, "fecha": body.Fecha,
		"consumo_dia": math.Round(consumoDia*100) / 100,
		"consumo_acumulado": 15400 + consumoDia,
		"perfil": body.Perfil, "tecnologia": "LoRaWAN",
		"rssi": -90 + rand.Intn(30), "snr": 5 + rand.Float64()*7,
	})
}
