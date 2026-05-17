import { Text, View } from 'react-native';

interface Point {
  x: string;
  y: number;
}

interface Props {
  data: Point[];
}

/** Gráfico simple compatible con Expo Go (sin Skia/Victory) */
export function ConsumoChart({ data }: Props) {
  if (!data.length) {
    return <Text className="text-slate-400">Sin datos para graficar</Text>;
  }
  const max = Math.max(...data.map((d) => d.y), 1);

  return (
    <View className="bg-semapa-primary/60 rounded-2xl p-4 mb-3">
      <Text className="text-semapa-accent text-sm mb-3">Consumo por lectura (m³)</Text>
      <View className="flex-row items-end justify-between h-32 gap-1">
        {data.map((d) => (
          <View key={d.x} className="flex-1 items-center">
            <View
              className="w-full bg-semapa-accent rounded-t"
              style={{ height: Math.max(8, (d.y / max) * 100) }}
            />
            <Text className="text-slate-500 text-[9px] mt-1">{d.x}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
