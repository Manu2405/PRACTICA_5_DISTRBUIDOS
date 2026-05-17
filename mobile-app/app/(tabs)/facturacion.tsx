import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Screen } from '../../src/components/ui/Screen';
import { tarifasApi } from '../../src/api/endpoints';

export default function FacturacionScreen() {
  const [consumo, setConsumo] = useState('25');
  const [tarifa, setTarifa] = useState('R2');

  const tarifas = useQuery({ queryKey: ['tarifas'], queryFn: () => tarifasApi.list('Residencial') });

  const calcular = useMutation({
    mutationFn: () => tarifasApi.calcular({ consumo_m3: parseFloat(consumo), tarifa_alias: tarifa }),
    onSuccess: (d) =>
      Alert.alert(
        'Cálculo SEMAPA',
        `Monto: Bs ${d.montoBs}\nCategoría: ${d.categoria}\nExceso: ${d.excesoM3} m³`
      ),
    onError: (e: Error & { response?: { data?: { error?: string } } }) =>
      Alert.alert('Error', e.response?.data?.error || e.message),
  });

  return (
    <Screen title="Tarifas SEMAPA" subtitle="R1 · R2 · R3 — bloques progresivos">
      <Input label="Consumo (m³)" value={consumo} onChangeText={setConsumo} keyboardType="decimal-pad" />
      <Input label="Tarifa (alias)" value={tarifa} onChangeText={setTarifa} placeholder="R1, R2, R3" />
      <Button label="Calcular factura" onPress={() => calcular.mutate()} loading={calcular.isPending} />

      <Card title="Tarifas residenciales">
        {tarifas.data?.slice(0, 4).map((t) => (
          <Text key={t.alias} className="text-slate-300 text-sm mb-1">
            {t.alias}: {t.descripcion?.slice(0, 50)}… — fijo Bs {t.cargoFijo}
          </Text>
        ))}
      </Card>

      <Text className="text-slate-500 text-xs">
        Basado en Reglamento de Política Tarifaria SEMAPA. El cálculo detallado se realiza en el backend.
      </Text>
    </Screen>
  );
}
