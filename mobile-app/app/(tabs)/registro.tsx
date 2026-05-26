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

// Aplica máscara MAC (XX:XX:XX:XX:XX:XX) al input
function formatMAC(value: string): string {
  const hex = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 12);
  return hex.match(/.{1,2}/g)?.join(':') ?? hex;
}

export default function RegistroScreen() {
  const [codigoBuscar, setCodigoBuscar] = useState('');
  const isOnline = useAppStore((s) => s.isOnline);
  const user = useAuthStore((s) => s.user);
  const { control, handleSubmit, setValue } = useForm<Form>({
    defaultValues: { codigo: '', lectura: '', observaciones: '' },
  });

  // Backend acepta MAC con o sin ":" — normaliza removiendo ":" para la query
  const codigoQuery = codigoBuscar.replace(/:/g, '');
  const medidor = useQuery({
    queryKey: ['medidor', codigoQuery],
    queryFn: () => medidoresApi.get(codigoQuery),
    enabled: codigoQuery.length >= 6,
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

      // Lectura entera (formato CSV). Validar que sea >= lectura anterior
      const lecturaActual = parseInt(f.lectura, 10);
      const lecturaAnterior = medidor.data?.lecturaAnterior ?? 0;
      if (isNaN(lecturaActual)) throw new Error('Lectura inválida');
      if (lecturaActual < lecturaAnterior) {
        throw new Error(`Lectura (${lecturaActual}) menor a la anterior (${lecturaAnterior})`);
      }

      const consumoM3 = lecturaActual - lecturaAnterior;
      const body = {
        codigo_medidor: f.codigo.replace(/:/g, ''),
        lectura_m3: consumoM3,
        lectura_actual_m3: lecturaActual,
        lectura_anterior_m3: lecturaAnterior,
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
    <Screen title="Registro de lectura" subtitle="Ingrese MAC del medidor IoT y lectura actual">
      <Input
        label="MAC del medidor IoT"
        value={codigoBuscar}
        onChangeText={(t) => setCodigoBuscar(formatMAC(t))}
        onSubmitEditing={() => setValue('codigo', codigoBuscar)}
        placeholder="XX:XX:XX:XX:XX:XX"
        autoCapitalize="characters"
      />
      <Button label="Buscar medidor" onPress={() => setValue('codigo', codigoBuscar)} />

      {medidor.data ? (
        <Card title="Cliente / Medidor">
          <Text className="text-white">MAC: {medidor.data.mac}</Text>
          <Text className="text-slate-300">Modelo: {medidor.data.modelo}</Text>
          <Text className="text-slate-300">Distrito: {medidor.data.distrito} · Zona: {medidor.data.zona}</Text>
          <Text className="text-slate-300">Tarifa: {medidor.data.tarifaAlias}</Text>
          <Text className="text-semapa-accent mt-2">
            Lectura anterior: {medidor.data.lecturaAnterior} m³
          </Text>
        </Card>
      ) : null}

      <Controller
        control={control}
        name="codigo"
        render={({ field: { value, onChange } }) => (
          <Input label="MAC confirmada" value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="lectura"
        render={({ field: { value, onChange } }) => (
          <Input
            label="Lectura actual (m³ enteros)"
            value={value}
            onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder={medidor.data ? `> ${medidor.data.lecturaAnterior}` : '0'}
          />
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
