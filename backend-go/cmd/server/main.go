package main

import (
	"fmt"
	"os"

	"semapa-backend/internal/db"
	"semapa-backend/internal/routes"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8080"
	}
	frontendOrigin := os.Getenv("FRONTEND_ORIGIN")
	if frontendOrigin == "" {
		frontendOrigin = "http://localhost:5173"
	}

	// Conectar a Cassandra
	if err := db.Connect(); err != nil {
		fmt.Println("❌", err)
		os.Exit(1)
	}
	defer db.Close()

	// Gin
	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{frontendOrigin, "http://localhost:3000", "http://localhost:5173"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
	}))

	// Rutas
	routes.Setup(r)

	fmt.Printf("🚀 SEMAPA Backend (Go) corriendo en http://localhost:%s\n", port)
	fmt.Printf("   CORS: %s\n", frontendOrigin)
	r.Run(":" + port)
}
