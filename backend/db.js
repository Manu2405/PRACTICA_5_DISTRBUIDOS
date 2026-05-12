import cassandra from 'cassandra-driver';
const client = new cassandra.Client({
  contactPoints: ['localhost'], localDataCenter: 'datacenter1',
  keyspace: 'semapa', protocolOptions: { port: 9042 },
});
export default client;
