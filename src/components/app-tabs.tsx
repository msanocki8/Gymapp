import { router, Tabs, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBottomBar, type AppTabName } from '@/components/app-bottom-bar';

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  return (
    <Tabs
      tabBar={(props) => {
        const activeRoute = props.state.routes[props.state.index];
        const segment = segments.find(
          (name): name is AppTabName =>
            name === 'training' || name === 'history' || name === 'diet' || name === 'account',
        );
        const activeTab: AppTabName =
          segment ?? (activeRoute.name === 'training/index' ? 'training' : (activeRoute.name as AppTabName));

        const navigate = (tab: AppTabName) => {
          const routeName = tab === 'training' ? 'training/index' : tab;
          const route = props.state.routes.find((item) => item.name === routeName);
          if (!route) return;

          const event = props.emitter.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!event.defaultPrevented && route.key !== activeRoute.key) {
            router.navigate(`/(tabs)/${tab}`);
          }
        };

        return (
          <AppBottomBar
            activeTab={activeTab}
            bottomInset={props.insets.bottom}
            onNavigate={navigate}
            onStart={() => router.push('/workout-flow')}
            onDiet={() => navigate('diet')}
          />
        );
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 85 + insets.bottom,
          position: 'absolute',
        },
        sceneStyle: { backgroundColor: '#0A0D0B' },
      }}>
      <Tabs.Screen
        name="training/index"
        options={{ title: 'Treningi' }}
      />
      <Tabs.Screen name="history" options={{ title: 'Historia' }} />
      <Tabs.Screen name="diet" options={{ title: 'Dieta' }} />
      <Tabs.Screen name="account" options={{ title: 'Konto' }} />
    </Tabs>
  );
}
