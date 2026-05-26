package routes

import (
	"semapa/backend-go/internal/handlers"
	"semapa/backend-go/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Register(r *gin.Engine) {
	r.GET("/health", handlers.Health)

	api := r.Group("/api")
	{
		api.POST("/auth/login", handlers.Login)
		api.POST("/auth/refresh", handlers.Refresh)

		auth := api.Group("")
		auth.Use(middleware.RequireAuth())
		{
			auth.GET("/mobile/dashboard", handlers.DashboardMobile)
			auth.GET("/medidores", handlers.ListMedidores)
			auth.GET("/medidores/:codigo", handlers.GetMedidor)
			auth.GET("/lecturas/historial", handlers.HistorialLecturas)
			auth.GET("/tarifas", handlers.GetTarifas)
			auth.POST("/calcular-factura", handlers.CalcularFactura)
			auth.POST("/lorawan/simular", handlers.SimularLorawan)
		}

		lectores := api.Group("")
		lectores.Use(middleware.RequireAuth("lector", "administrador"))
		lectores.POST("/lecturas", handlers.RegistrarLectura)
	}
}
