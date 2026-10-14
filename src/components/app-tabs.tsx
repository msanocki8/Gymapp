import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

const accent = '#22C55E';
const muted = '#879284';

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
      }}>
      <Tabs.Screen
        name="training"
        options={{
          title: 'Treningi',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: 'dumbbell.fill', android: 'fitness_center', web: 'fitness_center' }} size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historia',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: 'chart.bar.xaxis', android: 'monitoring', web: 'monitoring' }} size={size} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Konto',
          tabBarIcon: ({ color, size }) => (
            <SymbolView name={{ ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' }} size={size} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
