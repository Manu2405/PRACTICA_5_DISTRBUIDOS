package db

import (
	"log"
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

func cassandraPort() int {
	p := strings.TrimSpace(os.Getenv("CASSANDRA_PORT"))
	if p == "" {
		return 9042
	}
	n, err := strconv.Atoi(p)
	if err != nil || n <= 0 {
		return 9042
	}
	return n
}

// Init conecta a Cassandra usando CASSANDRA_CONTACT_POINTS (coma-separado).
func Init() error {
	hosts := strings.TrimSpace(os.Getenv("CASSANDRA_CONTACT_POINTS"))
	if hosts == "" {
		log.Print("CASSANDRA_CONTACT_POINTS vacío: consultas devolverán 503 hasta configurar DB")
		return nil
	}
	points := strings.Split(hosts, ",")
	for i := range points {
		points[i] = strings.TrimSpace(points[i])
	}
	cluster := gocql.NewCluster(points...)
	cluster.Port = cassandraPort()
	if ks := strings.TrimSpace(os.Getenv("CASSANDRA_KEYSPACE")); ks != "" {
		cluster.Keyspace = ks
	}
	cluster.Consistency = gocql.Quorum

	s, err := cluster.CreateSession()
	if err != nil {
		return err
	}
	mu.Lock()
	session = s
	mu.Unlock()
	return PrepareAll(s)
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
