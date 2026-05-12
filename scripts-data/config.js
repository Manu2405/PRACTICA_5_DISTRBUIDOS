// ============================================================
// Configuración de conexión a Cassandra
// ============================================================
import cassandra from 'cassandra-driver';

const CASSANDRA_HOST = process.env.CASSANDRA_HOST || 'localhost';
const CASSANDRA_PORT = parseInt(process.env.CASSANDRA_PORT || '9042');
const CASSANDRA_KEYSPACE = process.env.CASSANDRA_KEYSPACE || 'semapa';

export function createClient(useKeyspace = true) {
  const opts = {
    contactPoints: [CASSANDRA_HOST],
    localDataCenter: 'datacenter1',
    protocolOptions: { port: CASSANDRA_PORT },
  };
  if (useKeyspace) {
    opts.keyspace = CASSANDRA_KEYSPACE;
  }
  return new cassandra.Client(opts);
}

export const types = cassandra.types;
