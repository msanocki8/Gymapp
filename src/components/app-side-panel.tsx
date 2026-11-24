import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { WorkoutPlan } from '@/hooks/use-gym-app';
import { copyWorkoutPlanShareUrl, getWorkoutPlanShareUrl } from '@/lib/workout-plan-share';

type AppSidePanelProps = {
  visible: boolean;
  onClose: () => void;
  plans: WorkoutPlan[];
  plansLoading?: boolean;
  plansError?: string | null;
};

export function AppSidePanel({ visible, onClose, plans, plansLoading = false, plansError = null }: AppSidePanelProps) {
  const insets = useSafeAreaInsets();
  const [choosingPlan, setChoosingPlan] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const shareablePlans = plans.filter((plan) => Boolean(plan.shareToken));

  function closePanel() {
    setChoosingPlan(false);
    setFeedback(null);
    onClose();
  }

  async function copyLink(url: string) {
    try {
      await copyWorkoutPlanShareUrl(url);
      setFeedback('Link skopiowany');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Nie udało się skopiować linku.');
    }
  }

  function sharePlan(plan: WorkoutPlan) {
    if (!plan.shareToken) {
      setFeedback('Tego planu nie można jeszcze udostępnić.');
      return;
    }

    let url: string;
    try {
      url = getWorkoutPlanShareUrl(plan.shareToken);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Nie udało się utworzyć linku.');
      return;
    }

    if (Platform.OS !== 'web') {
      void Share.share(
        { message: url },
        { dialogTitle: 'Udostępnij link' },
      ).then((result) => {
        if (result.action === Share.sharedAction || result.action === Share.dismissedAction) closePanel();
      }).catch((error: unknown) => {
        Alert.alert(
          'Nie udało się udostępnić planu',
          error instanceof Error ? `${error.message}\n\n${url}` : url,
        );
      });
      return;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        const sharePromise = navigator.share({
          url,
        });
        void sharePromise.then(closePanel).catch((error: unknown) => {
          if (error instanceof Error && error.name === 'AbortError') {
            closePanel();
            return;
          }
          void copyLink(url);
        });
      } catch {
        void copyLink(url);
      }
      return;
    }

    void copyLink(url);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closePanel} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={choosingPlan ? 'Wróć do menu' : 'Zamknij menu'}
          onPress={closePanel}
          style={StyleSheet.absoluteFill}
        />
        <View
          nativeID="app-side-panel"
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              paddingTop: Math.max(insets.top, 24),
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>GYM LOG</Text>
              <Text style={styles.title}>Menu</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zamknij menu"
              onPress={() => choosingPlan ? setChoosingPlan(false) : closePanel()}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: choosingPlan ? 'chevron.left' : 'xmark', android: choosingPlan ? 'arrow_back' : 'close', web: choosingPlan ? 'arrow_back' : 'close' }}
                size={16}
                tintColor="#E8F0E7"
              />
            </Pressable>
          </View>

          {feedback ? <Text accessibilityRole="alert" style={styles.feedback}>{feedback}</Text> : null}

          {choosingPlan ? (
            <View style={styles.planPicker}>
              <Text style={styles.sectionTitle}>Wybierz plan do udostępnienia</Text>
              {plansLoading ? (
                <View style={styles.loading}>
                  <ActivityIndicator color="#A3E635" />
                  <Text style={styles.emptyText}>Wczytywanie planów…</Text>
                </View>
              ) : plansError ? (
                <Text accessibilityRole="alert" style={styles.emptyText}>Nie udało się wczytać planów. {plansError}</Text>
              ) : shareablePlans.length ? (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.planList}>
                  {shareablePlans.map((plan) => (
                    <Pressable
                      key={plan.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Udostępnij plan ${plan.name}`}
                      onPress={() => sharePlan(plan)}
                      style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
                      <View style={styles.menuIcon}>
                        <SymbolView
                          name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                          size={18}
                          tintColor="#A3E635"
                        />
                      </View>
                      <View style={styles.planCopy}>
                        <Text numberOfLines={1} style={styles.menuItemLabel}>{plan.name}</Text>
                        <Text numberOfLines={1} style={styles.planMeta}>
                          {plan.duration} min · {plan.exercises.length} ćw.
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.emptyText}>
                  Nie masz zapisanych planów do udostępnienia. Najpierw utwórz i zapisz plan.
                </Text>
              )}
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Udostępnij plan"
              onPress={() => {
                setFeedback(null);
                setChoosingPlan(true);
              }}
              style={({ pressed }) => [styles.menuItem, pressed && styles.pressed]}>
              <View style={styles.menuIcon}>
                <SymbolView
                  name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                  size={18}
                  tintColor="#A3E635"
                />
              </View>
              <Text style={styles.menuItemLabel}>Udostępnij plan</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.66)',
    flex: 1,
  },
  panel: {
    alignSelf: 'flex-end',
    backgroundColor: '#101610',
    borderLeftColor: 'rgba(163, 230, 53, 0.18)',
    borderLeftWidth: 1,
    flex: 1,
    maxWidth: 380,
    paddingHorizontal: 22,
    width: '86%',
  },
  header: {
    alignItems: 'center',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  eyebrow: {
    color: '#A3E635',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  title: {
    color: '#F3F4F6',
    fontSize: 25,
    fontWeight: '900',
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 13,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  menuItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.045)',
    borderColor: 'rgba(163, 230, 53, 0.14)',
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 13,
    marginTop: 22,
    minHeight: 62,
    paddingHorizontal: 14,
  },
  menuIcon: {
    alignItems: 'center',
    backgroundColor: 'rgba(163, 230, 53, 0.1)',
    borderRadius: 12,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  menuItemLabel: {
    color: '#F3F4F6',
    fontSize: 14,
    fontWeight: '700',
  },
  planPicker: {
    flex: 1,
  },
  sectionTitle: {
    color: 'rgba(243, 244, 246, 0.6)',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 20,
  },
  planList: {
    gap: 10,
    paddingBottom: 20,
    paddingTop: 14,
  },
  planCopy: {
    flex: 1,
    gap: 4,
  },
  planMeta: {
    color: 'rgba(243, 244, 246, 0.42)',
    fontSize: 11,
  },
  loading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 24,
  },
  emptyText: {
    color: 'rgba(243, 244, 246, 0.5)',
    fontSize: 12,
    lineHeight: 18,
    paddingTop: 14,
  },
  feedback: {
    backgroundColor: 'rgba(163, 230, 53, 0.1)',
    borderRadius: 12,
    color: '#D9F99D',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pressed: {
    opacity: 0.7,
  },
});
