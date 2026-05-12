package db

import (
	"fmt"
	"os"

	"github.com/gocql/gocql"
)

var Session *gocql.Session

func Connect() error {
	host := os.Getenv("CASSANDRA_HOST")
	if host == "" {
		host = "localhost"
	}
	keyspace := os.Getenv("CASSANDRA_KEYSPACE")
	if keyspace == "" {
		keyspace = "semapa"
	}

	cluster := gocql.NewCluster(host)
	cluster.Keyspace = keyspace
	cluster.Consistency = gocql.Quorum

	var err error
	Session, err = cluster.CreateSession()
	if err != nil {
		return fmt.Errorf("error conectando a Cassandra: %w", err)
	}
	fmt.Println("✅ Cassandra conectada")
	return nil
}

func Close() {
	if Session != nil {
		Session.Close()
	}
}
