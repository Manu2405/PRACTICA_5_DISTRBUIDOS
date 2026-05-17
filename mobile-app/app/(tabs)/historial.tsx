import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Text } from 'react-native';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { lecturasApi } from '../../src/api/endpoints';

export default function HistorialScreen() {
  const [codigo, setCodigo] = useState('');
  const [buscar, setBuscar] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['historial', buscar],
    queryFn: () => lecturasApi.historial({ codigo_medidor: buscar }),
    enabled: buscar.length >= 3,
  });

  return (
    <Screen title="Historial" subtitle="Consumo = lectura actual − anterior" scroll={false}>
      <Input label="Código medidor" value={codigo} onChangeText={setCodigo} />
      <Button label="Consultar" onPress={() => setBuscar(codigo)} />

      <FlatList
        data={data?.historial || []}
        keyExtractor={(item, i) => `${item.fechaHora}-${i}`}
        refreshing={isLoading}
        onRefresh={refetch}
        ListEmptyComponent={<Text className="text-slate-400 mt-4">Sin datos</Text>}
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-semibold">{new Date(item.fechaHora).toLocaleString()}</Text>
            <Text className="text-slate-300">Lectura: {item.lecturaM3} m³</Text>
            <Text className="text-semapa-accent">Consumo: {item.consumo} m³</Text>
            {item.observaciones ? <Text className="text-slate-500 text-xs">{item.observaciones}</Text> : null}
          </Card>
        )}
      />
    </Screen>
  );
}
