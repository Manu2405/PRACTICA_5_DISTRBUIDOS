import { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Screen } from '../../src/components/ui/Screen';
import { loadQueue, syncQueue } from '../../src/offline/syncQueue';
import { useAppStore } from '../../src/store/appStore';
import type { PendingLectura } from '../../src/types';

export default function SyncScreen() {
  const isOnline = useAppStore((s) => s.isOnline);
  const [queue, setQueue] = useState<PendingLectura[]>([]);
  const [syncing, setSyncing] = useState(false);

  const refresh = async () => setQueue(await loadQueue());

  useEffect(() => {
    refresh();
  }, []);

  const onSync = async () => {
    setSyncing(true);
    const result = await syncQueue();
    await refresh();
    setSyncing(false);
    Alert.alert('Sincronización', `OK: ${result.ok} · Fallos: ${result.fail}`);
  };

  return (
    <Screen title="Sincronización" subtitle="Cola offline y reintentos automáticos">
      <Card title="Estado">
        <Text className="text-white">{isOnline ? 'Conectado a la API' : 'Sin conexión'}</Text>
        <Text className="text-semapa-accent mt-2">Pendientes: {queue.length}</Text>
      </Card>

      <Button label="Sincronizar ahora" onPress={onSync} loading={syncing} />
      <Button label="Actualizar cola" onPress={refresh} variant="secondary" />

      {queue.map((q) => (
        <Card key={q.id}>
          <Text className="text-white">{q.codigo_medidor}</Text>
          <Text className="text-slate-400">
            {q.lectura_m3} m³ — {new Date(q.fecha_hora).toLocaleString()}
          </Text>
        </Card>
      ))}
    </Screen>
  );
}
