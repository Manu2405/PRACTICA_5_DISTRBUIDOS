package routers

import (
	"fmt"
	"net/http"
	"strconv"

	"semapa/backend/app/db"
	"semapa/backend/app/schemas"
	"semapa/backend/app/services/factura"

	"github.com/gin-gonic/gin"
)

func consultaHandler(qid string) gin.HandlerFunc {
	return func(c *gin.Context) {
		q, err := db.Query(qid)
		if err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"error": err.Error()})
			return
		}
		var release string
		if err := q.Scan(&release); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, schemas.ConsultaResponse{
			ConsultaID: qid,
			Rows:       []any{gin.H{"release_version": release}},
		})
	}
}

func registerConsultas(g *gin.RouterGroup, from, to int) {
	for i := from; i <= to; i++ {
		n := i
		g.GET(fmt.Sprintf("/consulta/%d", n), consultaHandler("q"+strconv.Itoa(n)))
	}
}

func Register(r *gin.Engine) {
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, schemas.HealthResponse{Status: "ok"})
	})

	op := r.Group("/api/operacional")
	registerConsultas(op, OperacionalConsultaDesde, OperacionalConsultaHasta)

	co := r.Group("/api/contabilidad")
	registerConsultas(co, ContabilidadConsultaDesde, ContabilidadConsultaHasta)

	ad := r.Group("/api/administracion")
	registerConsultas(ad, AdministracionConsultaDesde, AdministracionConsultaHasta)

	fa := r.Group("/api/factura")
	registerConsultas(fa, FacturaConsultaDesde, FacturaConsultaHasta)

	fa.GET("/:numero/pdf/ticket", func(c *gin.Context) {
		meta := schemas.FacturaMeta{
			Numero:   c.Param("numero"),
			Cliente:  c.Query("cliente"),
			Periodo:  c.Query("periodo"),
			Importe:  c.Query("importe"),
			Currency: defaultStr(c.DefaultQuery("currency", "Bs"), "Bs"),
		}
		b, err := factura.TicketRollo(meta)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.Data(http.StatusOK, "application/pdf", b)
	})

	fa.GET("/:numero/pdf/mediacarta", func(c *gin.Context) {
		meta := schemas.FacturaMeta{
			Numero:   c.Param("numero"),
			Cliente:  c.Query("cliente"),
			Periodo:  c.Query("periodo"),
			Importe:  c.Query("importe"),
			Currency: defaultStr(c.DefaultQuery("currency", "Bs"), "Bs"),
		}
		b, err := factura.HojaMediaCarta(meta)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.Data(http.StatusOK, "application/pdf", b)
	})
}

func defaultStr(v, def string) string {
	if v == "" {
		return def
	}
	return v
}
