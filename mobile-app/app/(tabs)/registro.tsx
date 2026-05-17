import * as Location from 'expo-location';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Input } from '../../src/components/ui/Input';
import { Screen } from '../../src/components/ui/Screen';
import { lecturasApi, medidoresApi } from '../../src/api/endpoints';
import { addToQueue } from '../../src/offline/syncQueue';
import { useAppStore } from '../../src/store/appStore';
import { useAuthStore } from '../../src/store/authStore';

type Form = { codigo: string; lectura: string; observaciones: string };

export default function RegistroScreen() {
  const [codigoBuscar, setCodigoBuscar] = useState('');
  const isOnline = useAppStore((s) => s.isOnline);
  const user = useAuthStore((s) => s.user);
  const { control, handleSubmit, setValue } = useForm<Form>({
    defaultValues: { codigo: '', lectura: '', observaciones: '' },
  });

  const medidor = useQuery({
    queryKey: ['medidor', codigoBuscar],
    queryFn: () => medidoresApi.get(codigoBuscar),
    enabled: codigoBuscar.length >= 3,
  });

  const guardar = useMutation({
    mutationFn: async (f: Form) => {
      let lat: number | undefined;
      let lon: number | undefined;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          lat = loc.coords.latitude;
          lon = loc.coords.longitude;
        }
      } catch {
        /* GPS opcional */
      }

      const body = {
        codigo_medidor: f.codigo,
        lectura_m3: parseFloat(f.lectura),
        observaciones: f.observaciones,
        lat,
        lon,
        fecha_hora: new Date().toISOString(),
      };

      if (!isOnline) {
        await addToQueue({
          id: `${Date.now()}`,
          ...body,
          codigo_medidor: body.codigo_medidor,
          lectura_m3: body.lectura_m3,
          usuario: user?.username,
        });
        return { offline: true };
      }
      return lecturasApi.registrar(body);
    },
    onSuccess: (res) => {
      Alert.alert('Éxito', (res as { offline?: boolean })?.offline ? 'Guardado en cola offline' : 'Lectura registrada');
      setValue('lectura', '');
    },
    onError: (e: Error & { response?: { data?: { error?: string } } }) =>
      Alert.alert('Error', e.response?.data?.error || e.message),
  });

  return (
    <Screen title="Registro de lectura" subtitle="Buscar medidor e ingresar lectura actual">
      <Input
        label="Código medidor"
        value={codigoBuscar}
        onChangeText={setCodigoBuscar}
        onSubmitEditing={() => setValue('codigo', codigoBuscar)}
        placeholder="Ej: MED-00001"
      />
      <Button label="Buscar medidor" onPress={() => setValue('codigo', codigoBuscar)} />

      {medidor.data ? (
        <Card title="Cliente / Medidor">
          <Text className="text-white">Serie: {medidor.data.numeroSerie}</Text>
          <Text className="text-slate-300">Titular: {medidor.data.contrato?.titular || '—'}</Text>
          <Text className="text-slate-300">Tarifa: {medidor.data.tarifaAlias}</Text>
          <Text className="text-semapa-accent mt-2">
            Lectura anterior: {medidor.data.lecturaAnterior} m³ · Parcial: {medidor.data.consumoParcial} m³
          </Text>
        </Card>
      ) : null}

      <Controller
        control={control}
        name="codigo"
        render={({ field: { value, onChange } }) => (
          <Input label="Código confirmado" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="lectura"
        render={({ field: { value, onChange } }) => (
          <Input label="Lectura actual (m³)" value={value} onChangeText={onChange} keyboardType="decimal-pad" />
        )}
      />
      <Controller
        control={control}
        name="observaciones"
        render={({ field: { value, onChange } }) => (
          <Input label="Observaciones" value={value} onChangeText={onChange} multiline />
        )}
      />

      <Button label="Guardar lectura" onPress={handleSubmit((f) => guardar.mutate(f))} loading={guardar.isPending} />
    </Screen>
  );
}
