package routes

import (
	"semapa-backend/internal/handlers"

	"github.com/gin-gonic/gin"
)

func Setup(r *gin.Engine) {
	// Health
	r.GET("/health", handlers.Health)

	// Dashboard Operacional
	r.GET("/api/operacional/resumen", handlers.ResumenOperacional)
	r.GET("/api/operacional/consumo-distrito", handlers.ConsumoDistritoHandler)
	r.GET("/api/operacional/mapa-medidores", handlers.MapaMedidores)
	r.GET("/api/operacional/medidores-estado", handlers.MedidoresEstado)

	// Dashboard Contabilidad
	r.GET("/api/contabilidad/ingresos-tarifa", handlers.IngresosTarifa)
	r.GET("/api/contabilidad/top-consumidores", handlers.TopConsumidores)

	// Dashboard Administración
	r.GET("/api/administracion/errores-modelo", handlers.ErroresModelo)
	r.GET("/api/administracion/errores-distrito", handlers.ErroresDistrito)

	// Consultas
	r.GET("/api/consultas/contrato/:numero", handlers.BuscarContrato)
	r.GET("/api/consultas/medidor/:serie", handlers.BuscarMedidor)
	r.GET("/api/consultas/consumo/:contrato", handlers.ConsumoContrato)

	// Catálogos
	r.GET("/api/catalogos/distritos", handlers.Distritos)
	r.GET("/api/catalogos/tarifas", handlers.Tarifas)
	r.GET("/api/catalogos/gateways", handlers.Gateways)
	r.GET("/api/catalogos/contratos", handlers.Contratos)

	// Facturación
	r.POST("/api/factura/generar", handlers.GenerarFactura)

	// Notificación
	r.POST("/api/notificacion/simular", handlers.SimularNotificacion)

	// Servir PDFs estáticos
	r.Static("/recibos", "./recibos")
}
