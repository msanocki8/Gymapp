import type { PropsWithChildren } from 'react';
import { useRef } from 'react';
import { BlurTargetView } from 'expo-blur';
import {
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GlassBlurTargetContext } from '@/components/glass-blur-context';

export const workoutColors = {
  background: '#080B09',
  surface: '#111713',
  surfaceRaised: '#172019',
  border: 'rgba(237, 247, 239, 0.1)',
  text: '#F5F7F2',
  muted: '#919B91',
  neon: '#22C55E',
  mint: '#83F3C0',
};

const APP_VERSION_LABEL = 'WERSJA 0.0.10';
const buttonGlowStyle: ViewStyle & { boxShadow?: string } = Platform.OS === 'web'
  ? { boxShadow: '0 4px 14px rgba(34, 197, 94, 0.2)' }
  : {
      shadowColor: '#22c55e',
      shadowOpacity: 0.2,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 3,
    };

export function WorkoutScreen({
  children,
  maxWidth = 560,
}: PropsWithChildren<{ maxWidth?: number }>) {
  const blurTarget = useRef<View>(null);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <GlassBlurTargetContext.Provider value={blurTarget}>
        <BlurTargetView ref={blurTarget} style={styles.blurTarget}>
          <View className="w-full min-w-0 flex-1 overflow-hidden" style={[styles.content, { maxWidth }]}>
            {children}
          </View>
        </BlurTargetView>
      </GlassBlurTargetContext.Provider>
    </SafeAreaView>
  );
}

type WorkoutHeaderProps = {
  eyebrow: string;
  onBack: () => void;
};

export function WorkoutHeader({ eyebrow, onBack }: WorkoutHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Wróć"
        onPress={onBack}
        hitSlop={8}
        className="active:opacity-75"
        style={styles.backButton}>
        <Text style={styles.backArrow}>‹</Text>
      </Pressable>
      <View style={styles.headerLabels}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.versionLabel}>{APP_VERSION_LABEL}</Text>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

type WorkoutButtonProps = {
  label: string;
  onPress: NonNullable<PressableProps['onPress']>;
  disabled?: boolean;
};

export function WorkoutButton({
  label,
  onPress,
  disabled = false,
}: WorkoutButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={disabled ? 'bg-zinc-800' : 'bg-neon active:opacity-85'}
      style={[
        styles.actionButton,
        !disabled && buttonGlowStyle,
        disabled && styles.disabledButton,
      ]}>
      <Text
        style={[
          styles.actionButtonText,
          disabled && styles.disabledButtonText,
        ]}>
        {label}
      </Text>
      <Text style={styles.actionArrow}>›</Text>
    </Pressable>
  );
}

type WorkoutCardProps = PropsWithChildren<{
  className?: string;
  style?: StyleProp<ViewStyle>;
}>;

export function WorkoutCard({ children, className, style }: WorkoutCardProps) {
  return (
    <View className={`min-w-0 overflow-hidden ${className ?? ''}`} style={[styles.card, style]}>
      {children}
    </View>
  );
}

export const workoutStyles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 36,
  },
  title: {
    color: workoutColors.text,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -1.1,
  },
  subtitle: {
    color: workoutColors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 7,
  },
  sectionLabel: {
    color: workoutColors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  fieldLabel: {
    color: workoutColors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 11,
    marginTop: 25,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: workoutColors.surface,
    borderColor: workoutColors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: workoutColors.text,
    fontSize: 16,
    minHeight: 58,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  multilineInput: {
    minHeight: 185,
    textAlignVertical: 'top',
  },
});

const styles = StyleSheet.create({
  screen: {
    backgroundColor: workoutColors.background,
    flex: 1,
    overflow: 'hidden',
  },
  blurTarget: {
    flex: 1,
  },
  content: {
    flex: 1,
    marginHorizontal: 'auto',
    maxWidth: 560,
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: 22,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: workoutColors.surface,
    borderColor: workoutColors.border,
    borderRadius: 16,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  backArrow: {
    color: workoutColors.text,
    fontSize: 30,
    lineHeight: 34,
    marginTop: -3,
  },
  eyebrow: {
    color: workoutColors.muted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  headerLabels: {
    alignItems: 'center',
    gap: 4,
  },
  versionLabel: {
    color: workoutColors.muted,
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1,
    opacity: 0.8,
  },
  headerSpacer: {
    height: 42,
    width: 42,
  },
  actionButton: {
    alignItems: 'center',
    backgroundColor: workoutColors.neon,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 20,
    width: '100%',
  },
  actionButtonText: {
    color: '#11160C',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
  actionArrow: {
    color: '#11160C',
    fontSize: 26,
    lineHeight: 28,
  },
  disabledButton: {
    backgroundColor: '#232A24',
  },
  disabledButtonText: {
    color: '#697267',
  },
  card: {
    backgroundColor: workoutColors.surface,
    borderColor: workoutColors.border,
    borderRadius: 23,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 17,
  },
});
