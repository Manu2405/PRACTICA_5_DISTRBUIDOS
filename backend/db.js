import cassandra from 'cassandra-driver';
const CASS_HOST = process.env.CASSANDRA_HOST || 'cassandra';
const client = new cassandra.Client({
  contactPoints: [CASS_HOST],
  localDataCenter: 'datacenter1',
  keyspace: 'semapa',
  protocolOptions: { port: 9042 },
  socketOptions: { connectTimeout: 30000 },
});
export default client;
