import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { syncQueue } from '../offline/syncQueue';

export function useNetworkSync() {
  const setOnline = useAppStore((s) => s.setOnline);

  useEffect(() => {
    const unsub = NetInfo.addEventListener(async (state) => {
      const online = !!state.isConnected;
      setOnline(online);
      if (online) await syncQueue();
    });
    return () => unsub();
  }, [setOnline]);
}
