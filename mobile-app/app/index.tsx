import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';

export default function Index() {
  const token = useAuthStore((s) => s.accessToken);
  if (token) return <Redirect href="/(tabs)" />;
  return <Redirect href="/login" />;
}
