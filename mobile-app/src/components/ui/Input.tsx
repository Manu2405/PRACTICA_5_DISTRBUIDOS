import { Text, TextInput, TextInputProps, View } from 'react-native';

interface Props extends TextInputProps {
  label: string;
}

export function Input({ label, ...props }: Props) {
  return (
    <View className="mb-3">
      <Text className="text-semapa-light text-sm mb-1">{label}</Text>
      <TextInput
        className="bg-semapa-primary border border-semapa-secondary/50 rounded-xl px-4 py-3 text-white"
        placeholderTextColor="#94a3b8"
        {...props}
      />
    </View>
  );
}
