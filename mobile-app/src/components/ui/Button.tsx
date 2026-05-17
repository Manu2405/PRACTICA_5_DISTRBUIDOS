import { ActivityIndicator, Pressable, Text } from 'react-native';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function Button({ label, onPress, loading, variant = 'primary', disabled }: Props) {
  const bg =
    variant === 'primary'
      ? 'bg-semapa-secondary'
      : variant === 'danger'
        ? 'bg-semapa-danger'
        : 'bg-semapa-accent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`${bg} rounded-xl py-3 px-4 items-center opacity-${disabled ? '50' : '100'}`}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text className="text-white font-bold text-center">{label}</Text>
      )}
    </Pressable>
  );
}
