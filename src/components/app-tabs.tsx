import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

const accent = '#34D399';
const muted = '#879284';

function TabIcon({ name, size, color }: { name: ComponentProps<typeof SymbolView>['name']; size: number; color: ColorValue }) {
  const active = String(color) === accent;
  return (
    <View style={active ? { borderRadius: size, boxShadow: `0 0 14px ${accent}66` } : undefined}>
      <SymbolView name={name} size={size} tintColor={color} />
    </View>
  );
}

export default function AppTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: '#101510',
          borderTopColor: 'rgba(255, 255, 255, 0.08)',
          height: 64,
          paddingTop: 7,
          paddingBottom: 7,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          flex: 1,
          justifyContent: 'center',
          minWidth: 0,
        },
        tabBarIconStyle: {
          alignItems: 'center',
          justifyContent: 'center',
        },
      }}>
      <Tabs.Screen
        name="training"
        options={{
          title: 'Treningi',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historia',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name={{ ios: 'chart.bar.xaxis', android: 'monitoring', web: 'monitoring' }} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Konto',
          tabBarIcon: ({ color, size }) => (
            <TabIcon name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
