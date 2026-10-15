import '../../global.css';

import { DarkTheme, Href, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { GymAppProvider } from '@/hooks/use-gym-app';

function AppNavigator() {
  const { session, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const rootSegment: string = segments[0] ?? '';
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const routeIsAllowed = session
    ? rootSegment !== '(auth)' && rootSegment !== 'index'
    : rootSegment === '(auth)';

  const redirectToAllowedRoute = useCallback(() => {
    setNavigationError(null);
    try {
      router.replace((session ? '/(tabs)/training' : '/(auth)/login') as Href);
    } catch (error) {
      setNavigationError(error instanceof Error ? error.message : 'Nie udało się otworzyć właściwego ekranu.');
    }
  }, [router, session]);

  useEffect(() => {
    if (isLoading) return;
    if (!routeIsAllowed) queueMicrotask(redirectToAllowedRoute);
  }, [isLoading, routeIsAllowed, redirectToAllowedRoute]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-950">
        <ActivityIndicator color="#22C55E" />
        <Text className="mt-3 text-sm text-white/60">Sprawdzanie sesji…</Text>
      </View>
    );
  }

  if (navigationError) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-950 px-6">
        <Text accessibilityRole="alert" className="text-center text-sm leading-6 text-red-200">{navigationError}</Text>
        <Pressable onPress={redirectToAllowedRoute} className="mt-4 rounded-2xl bg-neon px-5 py-3">
          <Text className="font-bold text-[#07110A]">Spróbuj ponownie</Text>
        </Pressable>
      </View>
    );
  }

  if (!routeIsAllowed) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-950">
        <ActivityIndicator color="#22C55E" />
        <Text className="mt-3 text-sm text-white/60">Otwieranie aplikacji…</Text>
      </View>
    );
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
