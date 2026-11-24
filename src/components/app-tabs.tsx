import { Tabs } from 'expo-router';

export default function AppTabs() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: '#080B09' },
      }}>
      <Tabs.Screen
        name="training/index"
        options={{ title: 'Treningi' }}
      />
      <Tabs.Screen name="history" options={{ title: 'Historia' }} />
      <Tabs.Screen name="account" options={{ title: 'Konto' }} />
    </Tabs>
  );
}
