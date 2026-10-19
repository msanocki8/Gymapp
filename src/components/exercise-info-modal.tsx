import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { Animated, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Exercise } from '@/constants/exercise-library';
import { GymColors as C } from '@/constants/gym-theme';

type ExerciseInfoModalProps = {
  exercise: Exercise | null;
  onClose: () => void;
};

export function ExerciseInfoModal({ exercise, onClose }: ExerciseInfoModalProps) {
  if (!exercise) return null;
  return <ExerciseDetails key={exercise.id} exercise={exercise} onClose={onClose} />;
}

function ExerciseDetails({ exercise, onClose }: { exercise: Exercise; onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [movement] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(movement, { toValue: 1, duration: 950, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(movement, { toValue: 0, duration: 950, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [movement]);

  const translateY = movement.interpolate({ inputRange: [0, 1], outputRange: [8, -8] });

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.scrim}>
        <Pressable accessibilityRole="button" accessibilityLabel="Zamknij szczegóły" onPress={onClose} style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalHeading}>
              <Text style={styles.eyebrow}>{exercise.category.toLocaleUpperCase('pl-PL')} · {exercise.level.toLocaleUpperCase('pl-PL')}</Text>
              <Text style={styles.title}>{exercise.name}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Zamknij" onPress={onClose} style={styles.closeButton}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={15} tintColor={C.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.heroImageWrap}>
              <Image
                source={typeof exercise.image === 'string' ? { uri: exercise.image } : exercise.image}
                contentFit="cover"
                transition={180}
                accessibilityLabel={`Ilustracja: ${exercise.name}`}
                style={styles.heroImage}
              />
              <View style={styles.imageScrim} />
              <View style={styles.equipmentPill}><Text style={styles.equipmentText}>{exercise.equipment}</Text></View>
            </View>

            <Text style={styles.description}>{exercise.description}</Text>

            <View style={styles.motionPanel}>
              <View style={styles.motionHeader}>
                <View><Text style={styles.panelEyebrow}>PODGLĄD RUCHU</Text><Text style={styles.panelTitle}>Prowadź ciężar płynnie</Text></View>
                <View style={styles.motionBadge}><View style={styles.liveDot} /><Text style={styles.liveLabel}>ANIMACJA</Text></View>
              </View>
              <View style={styles.motionStage}>
                <View style={styles.motionLine} />
                <Animated.View style={[styles.motionWeight, { transform: [{ translateY }] }]}>
                  <View style={styles.weightPlate} /><View style={styles.weightBar} /><View style={styles.weightPlate} />
                </Animated.View>
                <View style={styles.motionFloor} />
              </View>
            </View>

            <View style={styles.stepsHeading}>
              <Text style={styles.panelEyebrow}>TECHNIKA</Text>
              <Text style={styles.stepCount}>{String(step + 1).padStart(2, '0')} / {String(exercise.steps.length).padStart(2, '0')}</Text>
            </View>
            <View style={styles.stepCard}>
              <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{String(step + 1).padStart(2, '0')}</Text></View>
              <Text style={styles.stepText}>{exercise.steps[step]}</Text>
            </View>
            <View style={styles.stepControls}>
              <View style={styles.stepDots}>
                {exercise.steps.map((item, index) => <View key={item} style={[styles.stepDot, index === step && styles.stepDotActive]} />)}
              </View>
              <View style={styles.stepArrows}>
                <Pressable accessibilityRole="button" accessibilityLabel="Poprzedni krok" disabled={step === 0} onPress={() => setStep((current) => Math.max(0, current - 1))} style={[styles.stepArrow, step === 0 && styles.stepArrowDisabled]}>
                  <SymbolView name={{ ios: 'arrow.left', android: 'arrow_back', web: 'arrow_back' }} size={15} tintColor={step === 0 ? '#4E5A66' : C.text} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Następny krok" onPress={() => setStep((current) => (current + 1) % exercise.steps.length)} style={[styles.stepArrow, styles.stepArrowNext]}>
                  <SymbolView name={{ ios: 'arrow.right', android: 'arrow_forward', web: 'arrow_forward' }} size={15} tintColor={C.background} />
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.72)' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '92%', alignSelf: 'center', backgroundColor: C.background, borderTopLeftRadius: 13, borderTopRightRadius: 13, borderWidth: 1, borderColor: C.border, paddingTop: 9 },
  handle: { width: 34, height: 3, borderRadius: 2, backgroundColor: '#536170', alignSelf: 'center', marginBottom: 15 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, gap: 10 },
  modalHeading: { flex: 1, gap: 5 },
  eyebrow: { color: C.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  title: { color: C.text, fontSize: 21, lineHeight: 26, fontWeight: '800' },
  closeButton: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface, justifyContent: 'center', alignItems: 'center' },
  modalContent: { paddingHorizontal: 20, paddingBottom: 28 },
  heroImageWrap: { height: 164, overflow: 'hidden', borderRadius: 7, backgroundColor: C.elevated, marginBottom: 14 },
  heroImage: { width: '100%', height: '100%' },
  imageScrim: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5, 10, 15, 0.18)' },
  equipmentPill: { position: 'absolute', bottom: 10, left: 10, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 4, backgroundColor: 'rgba(10, 13, 18, 0.82)' },
  equipmentText: { color: '#E5EEF6', fontSize: 10, fontWeight: '600' },
  description: { color: '#AAB5C0', fontSize: 12, lineHeight: 18, marginBottom: 16 },
  motionPanel: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 7, padding: 13, marginBottom: 19 },
  motionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelEyebrow: { color: C.muted, fontSize: 8, fontWeight: '700', letterSpacing: 1.1 },
  panelTitle: { color: C.text, fontSize: 12, fontWeight: '700', marginTop: 5 },
  motionBadge: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.green },
  liveLabel: { color: C.green, fontSize: 8, fontWeight: '700', letterSpacing: 0.8 },
  motionStage: { height: 73, alignItems: 'center', justifyContent: 'center', marginTop: 8, overflow: 'hidden' },
  motionLine: { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderColor: '#253744' },
  motionWeight: { flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  weightPlate: { width: 7, height: 26, borderRadius: 2, backgroundColor: C.accent },
  weightBar: { width: 47, height: 4, borderRadius: 2, backgroundColor: '#D3E7F7' },
  motionFloor: { position: 'absolute', bottom: 9, width: 112, height: 1, backgroundColor: '#354351' },
  stepsHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  stepCount: { color: C.accent, fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  stepCard: { minHeight: 72, backgroundColor: '#122334', borderColor: '#244768', borderWidth: 1, borderRadius: 6, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },
  stepNumber: { width: 30, height: 30, borderRadius: 5, backgroundColor: '#1B3851', alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: C.accent, fontSize: 10, fontWeight: '800' },
  stepText: { flex: 1, color: '#DFE8F0', fontSize: 11, lineHeight: 17 },
  stepControls: { minHeight: 45, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepDots: { flexDirection: 'row', gap: 5 },
  stepDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#3B4855' },
  stepDotActive: { width: 15, backgroundColor: C.accent },
  stepArrows: { flexDirection: 'row', gap: 7 },
  stepArrow: { width: 32, height: 32, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  stepArrowDisabled: { opacity: 0.45 },
  stepArrowNext: { backgroundColor: C.accent, borderColor: C.accent },
});
