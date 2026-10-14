import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native';

import { GlassPanel } from '@/components/glass-panel';
import { GlassScreen } from '@/components/glass-screen';
import { NeonText } from '@/components/neon-text';
import { useAuth } from '@/hooks/use-auth';
import { useGymApp } from '@/hooks/use-gym-app';

export default function AccountScreen() {
  const { userName, setUserName } = useGymApp();
  const { signOut } = useAuth();
  const [nickDraft, setNickDraft] = useState(userName);
  const [remindersEnabled, setRemindersEnabled] = useState(true);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [savingNick, setSavingNick] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  async function saveNick() {
    const nextNick = nickDraft.trim();
    if (!nextNick || nextNick === userName || savingNick) return;
    setAccountError(null);
    setSavingNick(true);
    try {
      await setUserName(nextNick);
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Nie udało się zapisać nicku.');
      setNickDraft(userName);
    } finally {
      setSavingNick(false);
    }
  }

  async function handleSignOut() {
    if (signingOut) return;
    setAccountError(null);
    setSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      setAccountError(error instanceof Error ? error.message : 'Nie udało się wylogować.');
      setSigningOut(false);
    }
  }

  return (
    <GlassScreen edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="mx-auto w-full max-w-[560px] px-5 pb-10 pt-6">
          <Text className="text-[10px] font-bold tracking-[2px] text-neon">TWOJE MIEJSCE</Text>
          <Text className="mb-6 mt-2 text-[32px] font-black tracking-tight text-white">Konto</Text>

          <GlassPanel className="mb-8 rounded-[26px] p-5" delay={70} contentClassName="flex-row items-center gap-4">
            <View className="h-16 w-16 items-center justify-center rounded-[22px] border border-neon/35 bg-neon/10">
              <Text className="text-[25px] font-black text-neon">{nickDraft.trim().slice(0, 1).toLocaleUpperCase() || 'T'}</Text>
            </View>
            <View className="min-w-0 flex-1 gap-2">
              <Text className="text-[9px] font-extrabold tracking-[1.5px] text-white/40">WYŚWIETLANA NAZWA</Text>
              <TextInput
                accessibilityLabel="Nazwa użytkownika"
                value={nickDraft}
                onChangeText={setNickDraft}
                onEndEditing={() => { void saveNick(); }}
                placeholder="Twój nick"
                placeholderTextColor="#737E70"
                selectionColor="#22C55E"
                returnKeyType="done"
                maxLength={24}
                className="p-0 text-base font-bold text-white"
              />
            </View>
            {savingNick
              ? <ActivityIndicator color="#22C55E" />
              : <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={17} tintColor="#929D8D" />}
          </GlassPanel>

          <Text className="mb-6 -mt-5 text-[10px] leading-4 text-white/35">
            Nick zapisuje się po zatwierdzeniu klawiaturą. Dozwolone: 3–24 litery bez polskich znaków, cyfry, „_” i „-”.
          </Text>

          {accountError ? (
            <View className="mb-5 rounded-2xl border border-red-400/25 bg-red-400/[0.08] p-3">
              <Text accessibilityRole="alert" className="text-sm leading-5 text-red-200">{accountError}</Text>
            </View>
          ) : null}

          <View className="mb-3 flex-row items-end justify-between">
            <Text className="text-[20px] font-extrabold text-white">Preferencje</Text>
            <Text className="text-[10px] font-bold tracking-[1px] text-white/35">DOPASUJ POD SIEBIE</Text>
          </View>

          <GlassPanel className="overflow-hidden rounded-[24px] px-4" delay={140}>
            <View className="min-h-[76px] flex-row items-center gap-3 border-b border-white/[0.08]">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-neon/10">
                <SymbolView name={{ ios: 'scalemass', android: 'monitor_weight', web: 'monitor_weight' }} size={18} tintColor="#22C55E" />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-bold text-white">Jednostki</Text>
                <Text className="text-[11px] text-white/45">Waga i obciążenie</Text>
              </View>
              <Text className="mr-1 text-xs font-bold text-neon">kg</Text>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={14} tintColor="#6C786A" />
            </View>
            <View className="min-h-[76px] flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-2xl bg-mint/10">
                <SymbolView name={{ ios: 'bell.badge', android: 'notifications', web: 'notifications' }} size={18} tintColor="#83F3C0" />
              </View>
              <View className="flex-1 gap-1">
                <Text className="text-sm font-bold text-white">Przypomnienia</Text>
                <Text className="text-[11px] text-white/45">Czas na kolejny trening</Text>
              </View>
              <Switch
                accessibilityLabel="Przypomnienia o treningu"
                value={remindersEnabled}
                onValueChange={setRemindersEnabled}
                trackColor={{ false: '#303A32', true: '#506828' }}
                thumbColor={remindersEnabled ? '#22C55E' : '#AAB3BD'}
              />
            </View>
          </GlassPanel>

          <GlassPanel tone="mint" className="mt-6 rounded-[26px] p-5" delay={220}>
            <View className="flex-row items-center justify-between">
              <View>
                <NeonText color="#83F3C0" className="text-[10px] font-extrabold tracking-[1.5px]">TWÓJ CEL</NeonText>
                <Text className="mt-2 text-base font-extrabold text-white">3 treningi w tygodniu</Text>
              </View>
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-mint/10">
                <SymbolView name={{ ios: 'scope', android: 'my_location', web: 'my_location' }} size={22} tintColor="#83F3C0" />
              </View>
            </View>
            <Text className="mt-3 text-xs leading-5 text-white/55">Małe kroki, które z czasem robią wielką różnicę.</Text>
            <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
              <View className="h-full w-2/3 rounded-full bg-mint" />
            </View>
          </GlassPanel>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: signingOut }}
            disabled={signingOut}
            onPress={() => { void handleSignOut(); }}
            className="mt-6 min-h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-red-300/15 bg-red-400/[0.06] active:opacity-75">
            {signingOut ? <ActivityIndicator color="#FCA5A5" /> : null}
            <Text className="text-sm font-bold text-red-200">{signingOut ? 'Wylogowywanie…' : 'Wyloguj się'}</Text>
          </Pressable>
          <Text className="mt-10 text-center text-[10px] font-bold tracking-[2px] text-white/25">GYM LOG · 1.0</Text>
        </View>
      </ScrollView>
    </GlassScreen>
  );
}
