import { Text, View } from 'react-native';

interface Props {
  label: string;
  value: string | number;
  hint?: string;
}

export function KpiCard({ label, value, hint }: Props) {
  return (
    <View className="bg-semapa-primary rounded-xl p-3 flex-1 min-w-[45%] border border-semapa-secondary/40">
      <Text className="text-semapa-accent text-xs uppercase">{label}</Text>
      <Text className="text-white text-xl font-bold mt-1">{value}</Text>
      {hint ? <Text className="text-slate-400 text-xs mt-1">{hint}</Text> : null}
    </View>
  );
}
