package main

import (
	"log"
	"os"
	"strings"

	"semapa/backend-go/internal/db"
	"semapa/backend-go/internal/routes"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := db.Init(); err != nil {
		log.Printf("cassandra: %v", err)
	} else {
		log.Println("Cassandra conectada")
	}
	defer db.Close()

	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(corsMiddleware())

	routes.Register(r)

	port := os.Getenv("APP_PORT")
	if port == "" {
		port = "8090"
	}
	addr := ":" + port
	log.Printf("SEMAPA API Go (móvil) en http://localhost%s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allowed := []string{"http://localhost:8081", "http://localhost:19006"}
		ok := origin == ""
		for _, a := range allowed {
			if origin == a || strings.HasPrefix(origin, "exp://") {
				ok = true
				break
			}
		}
		if ok {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		}
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}
