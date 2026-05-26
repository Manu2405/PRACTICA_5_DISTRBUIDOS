import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { FlatList, Text } from 'react-native';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Screen } from '../../src/components/ui/Screen';
import { lorawanApi } from '../../src/api/endpoints';
import { simularMultiplesMedidores } from '../../src/modules/lorawan/simulator';
import type { LorawanReading } from '../../src/types';

const PERFILES = ['bajo', 'medio', 'alto', 'industrial'] as const;

export default function LorawanScreen() {
  const [codigo, setCodigo] = useState('');
  const [perfil, setPerfil] = useState<(typeof PERFILES)[number]>('medio');
  const [local, setLocal] = useState<LorawanReading[]>([]);

  const simular = useMutation({
    mutationFn: () => lorawanApi.simular({ codigo_medidor: codigo, perfil }),
    onSuccess: (d) => setLocal((p) => [d, ...p].slice(0, 20)),
  });

  const simularLocal = () => {
    const data = simularMultiplesMedidores(
      codigo ? [codigo] : ['MED-SIM-1', 'MED-SIM-2'],
      perfil
    );
    setLocal((p) => [...data, ...p].slice(0, 20));
  };

  return (
    <Screen title="Simulación LoRaWAN" subtitle="IoT — consumo diario acumulado" scroll={false}>
      <Input label="Código medidor" value={codigo} onChangeText={setCodigo} placeholder="Opcional" />
      <Text className="text-semapa-light mb-2">Perfil: {perfil}</Text>
      <Button label="Perfil bajo" onPress={() => setPerfil('bajo')} variant="secondary" />
      <Button label="Simular vía API" onPress={() => codigo && simular.mutate()} loading={simular.isPending} />
      <Button label="Simular local" onPress={simularLocal} variant="secondary" />

      <FlatList
        data={local}
        keyExtractor={(item, i) => `${item.codigo_medidor}-${i}`}
        className="mt-4"
        renderItem={({ item }) => (
          <Card>
            <Text className="text-white font-bold">{item.codigo_medidor}</Text>
            <Text className="text-slate-300">
              Día: {item.consumo_dia} m³ · Acum: {item.consumo_acumulado} m³
            </Text>
            <Text className="text-slate-500 text-xs">
              RSSI {item.rssi} · SNR {item.snr} · {item.fecha}
            </Text>
          </Card>
        )}
      />
    </Screen>
  );
}
