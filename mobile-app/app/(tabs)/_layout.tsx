import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';

export default function TabsLayout() {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: '#0B3D5C', borderTopColor: '#1A7FB5' },
        tabBarActiveTintColor: '#2EC4B6',
        tabBarInactiveTintColor: '#94a3b8',
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Inicio', tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} /> }} />
      <Tabs.Screen name="registro" options={{ title: 'Lectura', tabBarIcon: ({ color, size }) => <Ionicons name="create" size={size} color={color} /> }} />
      <Tabs.Screen name="historial" options={{ title: 'Historial', tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} /> }} />
      <Tabs.Screen name="consumos" options={{ title: 'Consumos', tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={size} color={color} /> }} />
      <Tabs.Screen name="facturacion" options={{ title: 'Tarifas', tabBarIcon: ({ color, size }) => <Ionicons name="cash" size={size} color={color} /> }} />
      <Tabs.Screen name="lorawan" options={{ title: 'LoRaWAN', tabBarIcon: ({ color, size }) => <Ionicons name="radio" size={size} color={color} /> }} />
      <Tabs.Screen name="sync" options={{ title: 'Sync', tabBarIcon: ({ color, size }) => <Ionicons name="cloud-upload" size={size} color={color} /> }} />
      <Tabs.Screen name="config" options={{ title: 'Config', tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} /> }} />
    </Tabs>
  );
}
