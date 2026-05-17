import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { KpiCard } from '../../src/components/KpiCard';
import { Card } from '../../src/components/ui/Card';
import { Screen } from '../../src/components/ui/Screen';
import { dashboardApi } from '../../src/api/endpoints';
import { useAppStore } from '../../src/store/appStore';
import { useAuthStore } from '../../src/store/authStore';

export default function DashboardScreen() {
  const user = useAuthStore((s) => s.user);
  const isOnline = useAppStore((s) => s.isOnline);
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get, refetchInterval: 60000 });

  return (
    <Screen title={`Hola, ${user?.nombre || 'Lector'}`} subtitle="Dashboard operativo SEMAPA">
      <View className="flex-row flex-wrap gap-2 mb-2">
        <KpiCard label="Lecturas hoy" value={isLoading ? '…' : data?.lecturasDelDia ?? 0} />
        <KpiCard label="Pendientes" value={data?.medidoresPendientes ?? 0} />
        <KpiCard label="Activos" value={data?.medidoresActivos ?? 0} />
        <KpiCard label="Promedio m³" value={data?.consumoPromedioM3?.toFixed(2) ?? '0'} />
      </View>

      <Card title="Estado de conexión">
        <Text className="text-white">
          {isOnline ? '🟢 Online — API sincronizada' : '🔴 Offline — cola local activa'}
        </Text>
        <Text className="text-slate-400 text-xs mt-2">
          Periodo: {data?.periodo || '—'} · Rol: {user?.role}
        </Text>
      </Card>

      {data?.alertas?.length ? (
        <Card title="Alertas">
          {data.alertas.map((a, i) => (
            <Text key={i} className="text-semapa-warning text-sm">
              ⚠ {a}
            </Text>
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}
