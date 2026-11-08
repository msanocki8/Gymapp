import type { ComponentRef, PropsWithChildren } from 'react';
import { useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pressable,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';

import { GlassBlurTargetContext } from '@/components/glass-blur-context';
import { AmbientBackground } from '@/components/ambient-background';
import '@/lib/nativewind-interop';

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
type CrossPlatformShadowStyle = ViewStyle & { boxShadow?: string };

const cardGlowStyle = Platform.select<CrossPlatformShadowStyle>({
  web: { boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)' },
  default: {
    shadowColor: '#10b981',
    shadowOpacity: 0.16,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 4,
  },
});

const buttonGlowStyle: ViewStyle & { boxShadow?: string } = Platform.OS === 'web'
  ? { boxShadow: '0 0 24px rgba(34, 197, 94, 0.48), 0 8px 18px rgba(34, 197, 94, 0.24)' }
  : {
      shadowColor: '#22c55e',
      shadowOpacity: 0.48,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 0 },
      elevation: 8,
    };

export function WorkoutScreen({
  children,
  maxWidth = 560,
  edges = ['top', 'bottom'],
}: PropsWithChildren<{ maxWidth?: number; edges?: SafeAreaViewProps['edges'] }>) {
  const blurTarget = useRef<ComponentRef<typeof View>>(null);

  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <GlassBlurTargetContext.Provider value={blurTarget}>
        <AmbientBackground blurTarget={blurTarget} />
        <View style={styles.blurTarget}>
          <View className="w-full min-w-0 flex-1 overflow-hidden" style={[styles.content, { maxWidth }]}>
            {children}
          </View>
        </View>
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
        style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}>
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
      style={({ pressed }) => [
        styles.actionButton,
        !disabled && buttonGlowStyle,
        disabled && styles.disabledButton,
        pressed && !disabled && styles.actionButtonPressed,
      ]}>
      <LinearGradient
        colors={disabled ? ['#26332a', '#1b241e'] : ['#22C55E', '#A3E635']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.actionButtonGradient}>
        <Text
          style={[
            styles.actionButtonText,
            disabled && styles.disabledButtonText,
          ]}>
          {label}
        </Text>
        <View style={[styles.actionArrowContainer, disabled && styles.disabledArrowContainer]}>
          <Text style={[styles.actionArrow, disabled && styles.disabledButtonText]}>›</Text>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

type WorkoutCardProps = PropsWithChildren<{
  className?: string;
  gradientColors?: readonly [string, string, ...string[]];
  glow?: boolean;
  animationDelay?: number;
  animationDuration?: number;
  animationOffset?: number;
  style?: StyleProp<ViewStyle>;
}>;

export function WorkoutCard({
  children,
  className,
  gradientColors,
  glow = false,
  animationDelay = 0,
  animationDuration = 380,
  animationOffset = 18,
  style,
}: WorkoutCardProps) {
  return (
    <Animated.View
      entering={FadeInDown
        .delay(animationDelay)
        .duration(animationDuration)
        .withInitialValues({ opacity: 0, translateY: animationOffset })
        .reduceMotion(ReduceMotion.System)}
      className={`min-w-0 overflow-hidden ${className ?? ''}`}
      style={[styles.card, glow && cardGlowStyle, style]}>
      {gradientColors ? (
        <LinearGradient
          colors={gradientColors}
          style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}
        />
      ) : null}
      <View style={styles.cardContent}>{children}</View>
    </Animated.View>
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
  buttonPressed: {
    transform: [{ scale: 0.97 }],
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
    borderColor: 'rgba(190, 242, 100, 0.4)',
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 64,
    overflow: 'hidden',
    width: '100%',
  },
  actionButtonGradient: {
    alignItems: 'center',
    borderRadius: 19,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: 62,
    overflow: 'hidden',
    paddingHorizontal: 20,
    position: 'relative',
    width: '100%',
  },
  actionButtonText: {
    color: '#11160C',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.15,
    textAlign: 'center',
  },
  actionArrowContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(4, 33, 15, 0.12)',
    borderColor: 'rgba(4, 33, 15, 0.14)',
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: 'center',
    position: 'absolute',
    right: 14,
    width: 34,
  },
  disabledArrowContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  actionArrow: {
    color: '#11160C',
    fontSize: 26,
    lineHeight: 30,
    marginTop: -3,
  },
  disabledButton: {
    borderColor: 'rgba(255,255,255,0.07)',
  },
  disabledButtonText: {
    color: '#697267',
  },
  actionButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  card: {
    backgroundColor: 'rgba(17, 23, 19, 0.96)',
    borderColor: workoutColors.border,
    borderRadius: 23,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 17,
  },
  cardContent: {
    position: 'relative',
    zIndex: 1,
  },
});
