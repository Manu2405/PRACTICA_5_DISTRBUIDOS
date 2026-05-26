import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { useLogin } from '../src/hooks/useAuth';

export default function LoginScreen() {
  const [username, setUsername] = useState('lector1');
  const [password, setPassword] = useState('lector123');
  const login = useLogin();

  const onSubmit = () => {
    login.mutate(
      { username, password },
      {
        onSuccess: () => router.replace('/(tabs)'),
        onError: (e: Error & { response?: { data?: { error?: string } } }) =>
          Alert.alert('Error', e.response?.data?.error || 'No se pudo iniciar sesión'),
      }
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-semapa-dark justify-center px-6">
      <View className="items-center mb-8">
        <View className="w-24 h-24 bg-semapa-primary rounded-full items-center justify-center mb-4 border-2 border-semapa-accent">
          <Text className="text-3xl font-bold text-semapa-accent">S</Text>
        </View>
        <Text className="text-white text-3xl font-bold">AppRegistro</Text>
        <Text className="text-semapa-accent mt-1">SEMAPA — Lecturas de campo</Text>
      </View>

      <Input label="Usuario" value={username} onChangeText={setUsername} autoCapitalize="none" />
      <Input label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry />
      <Button label="Iniciar sesión" onPress={onSubmit} loading={login.isPending} />

      <Text className="text-slate-500 text-xs text-center mt-6">
        Demo: lector1 / lector123 · admin / admin123
      </Text>
    </SafeAreaView>
  );
}
