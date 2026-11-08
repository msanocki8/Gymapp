import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';

export type AppTabName = 'training' | 'history' | 'account';

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
  return (
    <View style={[styles.bar, { height: 62 + bottomInset, paddingBottom: bottomInset }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.name;
        const color = isActive ? '#BEF264' : '#8F9A93';

        return (
          <Pressable
            key={tab.name}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: isActive }}
            onPress={() => onNavigate(tab.name)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <View style={[styles.iconContainer, isActive && styles.iconContainerActive]}>
              <SymbolView name={tab.icon} size={20} tintColor={color} />
            </View>
            <Text style={[styles.label, isActive && styles.activeLabel, { color }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    backgroundColor: '#050706',
    borderTopColor: 'rgba(255,255,255,0.10)',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 4,
    width: '100%',
  },
  tab: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flex: 1,
    gap: 1,
    justifyContent: 'center',
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
  },
  activeLabel: {
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.75,
  },
});
