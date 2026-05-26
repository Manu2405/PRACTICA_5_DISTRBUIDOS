import AsyncStorage from '@react-native-async-storage/async-storage';
import { lecturasApi } from '../api/endpoints';
import type { PendingLectura } from '../types';

const QUEUE_KEY = 'semapa-offline-queue';

export async function loadQueue(): Promise<PendingLectura[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function saveQueue(queue: PendingLectura[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function addToQueue(item: PendingLectura) {
  const q = await loadQueue();
  q.push(item);
  await saveQueue(q);
  return q;
}

export async function syncQueue(): Promise<{ ok: number; fail: number }> {
  const queue = await loadQueue();
  let ok = 0;
  let fail = 0;
  const remaining: PendingLectura[] = [];

  for (const item of queue) {
    try {
      await lecturasApi.registrar({
        codigo_medidor: item.codigo_medidor,
        lectura_m3: item.lectura_m3,
        observaciones: item.observaciones,
        lat: item.lat,
        lon: item.lon,
        fecha_hora: item.fecha_hora,
      });
      ok++;
    } catch {
      remaining.push(item);
      fail++;
    }
  }

  await saveQueue(remaining);
  return { ok, fail };
}
