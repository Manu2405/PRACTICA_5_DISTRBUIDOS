package db

import (
	"fmt"
	"sync"

	"github.com/gocql/gocql"
)

var consultaCQL = map[string]string{}
var prepOnce sync.Once

func registerCQL() {
	prepOnce.Do(func() {
		placeholder := "SELECT release_version FROM system.local"
		for i := 1; i <= 25; i++ {
			consultaCQL[fmt.Sprintf("q%d", i)] = placeholder
		}
	})
}

func PrepareAll(s *gocql.Session) error {
	if s == nil {
		return nil
	}
	registerCQL()
	return nil
}

func Query(id string, args ...any) (*gocql.Query, error) {
	registerCQL()
	mu.RLock()
	s := session
	mu.RUnlock()
	if s == nil {
		return nil, fmt.Errorf("sesión Cassandra no inicializada")
	}
	cql, ok := consultaCQL[id]
	if !ok {
		return nil, fmt.Errorf("consulta %q desconocida", id)
	}
	return s.Query(cql, args...), nil
}
