import { router } from 'expo-router';
import { Alert, Text } from 'react-native';
import Constants from 'expo-constants';
import { Button } from '../../src/components/ui/Button';
import { Card } from '../../src/components/ui/Card';
import { Screen } from '../../src/components/ui/Screen';
import { API_URL } from '../../src/config/api';
import { useAuthStore } from '../../src/store/authStore';

export default function ConfigScreen() {
  const { user, logout } = useAuthStore();

  const salir = () => {
    logout();
    router.replace('/login');
  };

  return (
    <Screen title="Configuración">
      <Card title="Usuario">
        <Text className="text-white">{user?.nombre}</Text>
        <Text className="text-slate-400">@{user?.username} · {user?.role}</Text>
      </Card>

      <Card title="API">
        <Text className="text-slate-300 text-xs">{API_URL}</Text>
        <Text className="text-slate-500 text-xs mt-2">
          Versión app: {Constants.expoConfig?.version || '1.0.0'}
        </Text>
      </Card>

      <Card title="Modo de ejecución">
        <Text className="text-slate-400 text-sm">
          Esta app está pensada solo para Expo Go. Escanea el QR con `npm start` en mobile-app.
        </Text>
      </Card>

      <Button label="Cerrar sesión" onPress={salir} variant="danger" />
    </Screen>
  );
}
