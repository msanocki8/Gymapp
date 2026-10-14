import { Href, Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { AuthShell } from '@/components/auth-shell';
import { isValidNick, useAuth } from '@/hooks/use-auth';

export default function RegisterScreen() {
  const { signUp, isLoading, configurationError } = useAuth();
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting || isLoading || configurationError) return;
    setError(null);
    const normalizedNick = nick.trim();
    if (!isValidNick(normalizedNick)) {
      setError('Nick musi mieć od 3 do 24 znaków: litery bez polskich znaków, cyfry, „_” lub „-”.');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setError('Hasło musi mieć od 8 do 128 znaków.');
      return;
    }

    setSubmitting(true);
    try {
      await signUp(normalizedNick, password, accessKey);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Nie udało się utworzyć konta.');
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = submitting || isLoading || Boolean(configurationError) || !nick.trim() || !password || !accessKey;

  return (
    <AuthShell>
      <Text className="text-[10px] font-bold tracking-[2px] text-neon">ZACZNIJ TRENINGI Z NAMI</Text>
      <Text className="mb-5 mt-2 text-2xl font-black text-white">Utwórz konto</Text>

      <Text className="mb-2 text-xs font-bold text-white/70">Nick</Text>
      <TextInput
        accessibilityLabel="Nick"
        value={nick}
        onChangeText={setNick}
        placeholder="3–24 znaki"
        placeholderTextColor="#737E70"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="next"
        maxLength={24}
        className="mb-4 min-h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white"
      />

      <Text className="mb-2 text-xs font-bold text-white/70">Hasło</Text>
      <TextInput
        accessibilityLabel="Hasło"
        value={password}
        onChangeText={setPassword}
        placeholder="Co najmniej 8 znaków"
        placeholderTextColor="#737E70"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        returnKeyType="next"
        maxLength={128}
        className="mb-4 min-h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white"
      />

      <Text className="mb-2 text-xs font-bold text-white/70">Klucz dostępu</Text>
      <TextInput
        accessibilityLabel="Klucz dostępu"
        value={accessKey}
        onChangeText={setAccessKey}
        placeholder="Wpisz klucz"
        placeholderTextColor="#737E70"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={() => { void submit(); }}
        className="mb-4 min-h-14 rounded-2xl border border-white/10 bg-black/30 px-4 text-base text-white"
      />

      {error ? (
        <View className="mb-4 rounded-2xl border border-red-400/25 bg-red-400/[0.08] p-3">
          <Text accessibilityRole="alert" className="text-sm leading-5 text-red-200">{error}</Text>
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => { void submit(); }}
        className={`min-h-14 flex-row items-center justify-center rounded-2xl px-4 ${disabled ? 'bg-white/10' : 'bg-neon active:opacity-80'}`}>
        {submitting ? <ActivityIndicator color="#07110A" /> : null}
        <Text className={`text-sm font-extrabold ${disabled ? 'text-white/40' : 'text-[#07110A]'}`}>
          {submitting ? 'Tworzenie konta…' : 'Utwórz konto'}
        </Text>
      </Pressable>

      <View className="mt-5 flex-row flex-wrap justify-center gap-1">
        <Text className="text-sm text-white/50">Masz już konto?</Text>
        <Link href={'/(auth)/login' as Href} className="text-sm font-bold text-neon">Zaloguj się</Link>
      </View>
    </AuthShell>
  );
}
