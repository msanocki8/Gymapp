import '../../global.css';

import { DarkTheme, Redirect, Stack, ThemeProvider, useGlobalSearchParams, useSegments } from 'expo-router';
import type { Href } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Text, View } from 'react-native';

import { LaunchScreen } from '@/components/launch-screen';
import { WorkoutDynamicIsland } from '@/components/workout-dynamic-island';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { GymAppProvider } from '@/hooks/use-gym-app';
import { getSafeShareReturnTo } from '@/lib/auth-return-to';
import { WebSafeAreaInsets } from '@/lib/web-safe-area';

void SplashScreen.preventAutoHideAsync().catch((error: unknown) => {
  console.error('Nie udało się zatrzymać natywnego ekranu startowego.', error);
});

function hideNativeSplash() {
  void SplashScreen.hideAsync().catch((error: unknown) => {
    console.error('Nie udało się ukryć natywnego ekranu startowego.', error);
  });
}

function LaunchGate() {
  const { isLoading } = useAuth();
  return <LaunchScreen ready={!isLoading} onShown={hideNativeSplash} />;
}

function AppNavigator() {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const searchParams = useGlobalSearchParams<{ returnTo?: string | string[] }>();
  const rootSegment: string = segments[0] ?? '';
  const isPublicShareRoute = rootSegment === 'share';
  const routeIsAllowed = isPublicShareRoute || (session
    ? rootSegment !== '(auth)' && rootSegment !== 'index'
    : rootSegment === '(auth)');

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink-950">
        <ActivityIndicator color="#22C55E" />
        <Text className="mt-3 text-sm text-white/60">Sprawdzanie sesji…</Text>
      </View>
    );
  }

  if (!routeIsAllowed) {
    const shareReturnTo = getSafeShareReturnTo(searchParams.returnTo);
    return (
      <Redirect
        href={
          session
            ? rootSegment === '(auth)' && shareReturnTo
              ? shareReturnTo as Href
              : '/(tabs)/training'
            : '/(auth)/login'
        }
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#050706' },
      }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="(tabs)"
        options={{
          contentStyle: { backgroundColor: 'transparent' },
          statusBarTranslucent: true,
        }}
      />
      <Stack.Screen name="index" />
      <Stack.Screen name="workout-flow" />
      <Stack.Screen name="create-workout" />
      <Stack.Screen name="workout-session" />
      <Stack.Screen name="ai-coach" />
      <Stack.Screen name="share/[token]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <WebSafeAreaInsets>
        <AuthProvider>
          <GymAppProvider>
            <StatusBar style="light" />
            <View style={{ flex: 1 }}>
              <AppNavigator />
              <WorkoutDynamicIsland />
              <LaunchGate />
            </View>
          </GymAppProvider>
        </AuthProvider>
      </WebSafeAreaInsets>
    </ThemeProvider>
  );
}
