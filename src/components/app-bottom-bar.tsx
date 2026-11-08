import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

export type AppTabName = 'training' | 'history' | 'account';

const blurMethod = Platform.OS === 'android' ? 'dimezisBlurViewSdk31Plus' : undefined;

const tabs: {
  name: AppTabName;
  label: string;
  icon: ComponentProps<typeof SymbolView>['name'];
}[] = [
  {
    name: 'training',
    label: 'Treningi',
    icon: { ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' },
  },
  {
    name: 'history',
    label: 'Historia',
    icon: { ios: 'chart.bar.xaxis', android: 'monitoring', web: 'monitoring' },
  },
  {
    name: 'account',
    label: 'Konto',
    icon: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  },
];

export function AppBottomBar({
  activeTab,
  bottomInset,
  onNavigate,
}: {
  activeTab: AppTabName;
  bottomInset: number;
  onNavigate: (tab: AppTabName) => void;
}) {
  const tabItems = tabs.map((tab) => {
    const isActive = activeTab === tab.name;
    const color = isActive ? '#BEF264' : '#8F9A93';

    return (
      <Pressable
        key={tab.name}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isActive }}
        onPress={() => onNavigate(tab.name)}
        className="flex-1 items-center justify-center"
        style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
        <View className="w-full flex-1 items-center justify-center gap-1">
          <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
            <SymbolView name={tab.icon} size={20} tintColor={color} />
          </View>
          <Text
            className="w-full text-center"
            style={[
              styles.label,
              { color },
              isActive && styles.activeLabel,
              isActive && activeTab === 'training' && styles.trainingActiveLabel,
            ]}>
            {tab.label}
          </Text>
        </View>
      </Pressable>
    );
  });

  return (
    <View
      style={[
        styles.bar,
        {
          height: 62 + bottomInset,
          paddingBottom: Platform.OS === 'web' ? 0 : bottomInset,
        },
        styles.trainingBar,
      ]}>
      <View accessibilityRole="tablist" style={styles.floatingBar}>
        <BlurView
          pointerEvents="none"
          blurMethod={blurMethod}
          intensity={30}
          tint="dark"
          style={styles.floatingBarBlur}
        />
        {tabItems}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    left: 0,
    paddingTop: 4,
    position: 'absolute',
    width: '100%',
    zIndex: 10,
  },
  trainingBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    alignItems: 'center',
    paddingTop: 0,
    justifyContent: 'center',
  },
  floatingBar: {
    alignSelf: 'center',
    backgroundColor: 'rgba(8,11,9,0.08)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 26,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    height: 58,
    justifyContent: 'space-around',
    overflow: 'hidden',
    width: '90%',
    maxWidth: 500,
  },
  floatingBarBlur: {
    bottom: 0,
    left: 0,
    position: 'absolute',
    borderRadius: 26,
    right: 0,
    top: 0,
    zIndex: 0,
  },
  tab: {
    alignSelf: 'stretch',
    zIndex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 44,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(190,242,100,0.12)',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  activeLabel: {
    fontWeight: '800',
  },
  trainingActiveLabel: {
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.75,
  },
});
