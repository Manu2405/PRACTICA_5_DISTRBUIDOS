package db

import (
	"os"
	"strconv"
	"strings"
	"sync"

	"github.com/gocql/gocql"
)

var (
	mu      sync.RWMutex
	session *gocql.Session
)

func Init() error {
	host := strings.TrimSpace(os.Getenv("CASSANDRA_HOST"))
	if host == "" {
		host = "localhost"
	}
	port := 9042
	if p := os.Getenv("CASSANDRA_PORT"); p != "" {
		if n, err := strconv.Atoi(p); err == nil {
			port = n
		}
	}
	keyspace := strings.TrimSpace(os.Getenv("CASSANDRA_KEYSPACE"))
	if keyspace == "" {
		keyspace = "semapa"
	}

	cluster := gocql.NewCluster(host)
	cluster.Port = port
	cluster.Keyspace = keyspace
	cluster.Consistency = gocql.Quorum

	s, err := cluster.CreateSession()
	if err != nil {
		return err
	}
	mu.Lock()
	session = s
	mu.Unlock()
	return nil
}

func Session() *gocql.Session {
	mu.RLock()
	defer mu.RUnlock()
	return session
}

func Close() {
	mu.Lock()
	defer mu.Unlock()
	if session != nil {
		session.Close()
		session = nil
	}
}
