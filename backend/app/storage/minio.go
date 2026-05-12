package storage

import (
	"context"
	"log"
	"os"
	"strings"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

var minioClient *minio.Client

// InitMinio crea el cliente y asegura el bucket (MINIO_BUCKET, por defecto semapa).
func InitMinio() error {
	ep := strings.TrimSpace(os.Getenv("MINIO_ENDPOINT"))
	if ep == "" {
		log.Print("MINIO_ENDPOINT vacío: se omite MinIO")
		return nil
	}
	secure := strings.HasPrefix(ep, "https://")
	endpoint := strings.TrimPrefix(ep, "http://")
	endpoint = strings.TrimPrefix(endpoint, "https://")

	access := os.Getenv("MINIO_ACCESS_KEY")
	secret := os.Getenv("MINIO_SECRET_KEY")
	bucket := strings.TrimSpace(os.Getenv("MINIO_BUCKET"))
	if bucket == "" {
		bucket = "semapa"
	}

	cli, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(access, secret, ""),
		Secure: secure,
	})
	if err != nil {
		return err
	}
	minioClient = cli

	ctx := context.Background()
	exists, err := cli.BucketExists(ctx, bucket)
	if err != nil {
		return err
	}
	if !exists {
		if err := cli.MakeBucket(ctx, bucket, minio.MakeBucketOptions{}); err != nil {
			return err
		}
		log.Printf("MinIO: bucket creado %s", bucket)
	} else {
		log.Printf("MinIO: bucket ya existe %s", bucket)
	}
	return nil
}

// Client devuelve el cliente MinIO inicializado o nil.
func Client() *minio.Client {
	return minioClient
}
