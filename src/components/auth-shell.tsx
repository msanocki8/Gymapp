import { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/use-auth';

export function AuthShell({ children }: PropsWithChildren) {
  const { configurationError, sessionError } = useAuth();

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={['top', 'bottom']}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="mx-auto w-full max-w-[480px] flex-grow justify-center px-5 py-10"
          keyboardShouldPersistTaps="handled">
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-[22px] border border-neon/30 bg-neon/10">
              <Text className="text-[30px] font-black text-neon">G</Text>
            </View>
            <Text className="text-[10px] font-bold tracking-[3px] text-neon">GYM LOG</Text>
            <Text className="mt-2 text-center text-3xl font-black text-white">Twój trening. Twoje konto.</Text>
            <Text className="mt-2 text-center text-sm leading-5 text-white/50">
              Plany zapisane bezpiecznie i dostępne na każdym urządzeniu.
            </Text>
          </View>

          {configurationError ? (
            <View className="mb-5 rounded-2xl border border-amber-300/25 bg-amber-300/[0.08] p-4">
              <Text className="text-sm font-bold text-amber-100">Wymagana konfiguracja Supabase</Text>
              <Text className="mt-1 text-xs leading-5 text-amber-100/75">{configurationError}</Text>
            </View>
          ) : null}

          {sessionError ? (
            <View className="mb-5 rounded-2xl border border-red-300/20 bg-red-300/[0.06] p-4">
              <Text className="text-xs leading-5 text-red-100">{sessionError}</Text>
            </View>
          ) : null}

          <View className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5">
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
