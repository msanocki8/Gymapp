import '../../global.css';

import { DarkTheme, Redirect, Stack, ThemeProvider, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { GymAppProvider } from '@/hooks/use-gym-app';

function AppNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const rootSegment: string = segments[0] ?? '';
  const routeIsAllowed = session
    ? rootSegment !== '(auth)' && rootSegment !== 'index'
    : rootSegment === '(auth)';

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-950">
        <ActivityIndicator color="#22C55E" />
        <Text className="mt-3 text-sm text-white/60">Sprawdzanie sesji…</Text>
      </View>
    );
  }

  if (!routeIsAllowed) {
    return <Redirect href={session ? '/(tabs)/training' : '/(auth)/login'} />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#050706' },
      }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="index" />
      <Stack.Screen name="workout-flow" />
      <Stack.Screen name="create-workout" />
      <Stack.Screen name="workout-session" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AuthProvider>
        <GymAppProvider>
          <StatusBar style="light" />
          <AppNavigator />
        </GymAppProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
