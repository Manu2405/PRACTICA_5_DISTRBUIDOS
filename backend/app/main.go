package main

import (
	"log"
	"os"

	"semapa/backend/app/db"
	"semapa/backend/app/routers"
	"semapa/backend/app/storage"

	"github.com/gin-gonic/gin"
)

func main() {
	if err := db.Init(); err != nil {
		log.Printf("db: %v", err)
	}
	defer db.Close()

	if err := storage.InitMinio(); err != nil {
		log.Printf("minio: %v", err)
	}

	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	routers.Register(r)

	addr := ":8000"
	if p := os.Getenv("PORT"); p != "" {
		addr = ":" + p
	}
	log.Printf("listening %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatal(err)
	}
}
