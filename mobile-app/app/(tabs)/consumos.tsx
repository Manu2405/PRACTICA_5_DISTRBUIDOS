import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { Text } from 'react-native';
import { ConsumoChart } from '../../src/components/ConsumoChart';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { lecturasApi, medidoresApi } from '../../src/api/endpoints';

export default function ConsumosScreen() {
  const [codigo, setCodigo] = useState('');
  const [buscar, setBuscar] = useState('');

  const medidor = useQuery({
    queryKey: ['medidor-cons', buscar],
    queryFn: () => medidoresApi.get(buscar),
    enabled: buscar.length >= 3,
  });

  const historial = useQuery({
    queryKey: ['hist-cons', buscar],
    queryFn: () => lecturasApi.historial({ codigo_medidor: buscar }),
    enabled: buscar.length >= 3,
  });

  const chartData = useMemo(() => {
    const h = historial.data?.historial?.slice(0, 8).reverse() || [];
    return h.map((x, i) => ({
      x: `#${i + 1}`,
      y: x.consumo,
    }));
  }, [historial.data]);

  const total = historial.data?.historial?.reduce((s, h) => s + h.consumo, 0) ?? 0;
  const promedio = historial.data?.historial?.length ? total / historial.data.historial.length : 0;

  return (
    <Screen title="Consumos" subtitle="Diario, mensual y acumulado">
      <Input label="Código medidor" value={codigo} onChangeText={setCodigo} />
      <Button label="Analizar" onPress={() => setBuscar(codigo)} />

      {medidor.data ? (
        <Card title="Resumen">
          <Text className="text-white">Parcial: {medidor.data.consumoParcial} m³</Text>
          <Text className="text-slate-300">Lectura actual: {medidor.data.lecturaActual} m³</Text>
          <Text className="text-slate-300">Acumulado histórico: {total.toFixed(2)} m³</Text>
          <Text className="text-semapa-accent">Promedio por lectura: {promedio.toFixed(2)} m³</Text>
        </Card>
      ) : null}

      <ConsumoChart data={chartData} />
    </Screen>
  );
}
