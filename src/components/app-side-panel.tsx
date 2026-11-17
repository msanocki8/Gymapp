import { SymbolView } from 'expo-symbols';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type AppSidePanelProps = {
  visible: boolean;
  onClose: () => void;
};

export function AppSidePanel({ visible, onClose }: AppSidePanelProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Zamknij menu"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
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
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={16} tintColor="#E8F0E7" />
            </Pressable>
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuIcon}>
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                size={18}
                tintColor="#A3E635"
              />
            </View>
            <Text style={styles.menuItemLabel}>Udostępnij plan</Text>
          </View>
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
  pressed: {
    opacity: 0.7,
  },
});
