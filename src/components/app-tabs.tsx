import { Tabs, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppBottomBar, type AppTabName } from '@/components/app-bottom-bar';

export default function AppTabs() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  return (
    <Tabs
      tabBar={(props) => {
        const segment = segments.find(
          (name): name is AppTabName =>
            name === 'training' || name === 'history' || name === 'account',
        );
        const activeTab = segment ?? props.state.routes[props.state.index].name as AppTabName;
        const activeRoute = props.state.routes[props.state.index];

        return (
          <AppBottomBar
            activeTab={activeTab}
            bottomInset={props.insets.bottom}
            onNavigate={(tab) => {
              const route = props.state.routes.find((item) => item.name === tab);
              if (!route) return;

              const event = props.emitter.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented && route.key !== activeRoute.key) {
                props.navigateToTab(route.key);
              }
            }}
          />
        );
      }}
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#080B09',
          borderTopWidth: 0,
          elevation: 0,
          height: 62 + insets.bottom,
        },
        sceneStyle: { backgroundColor: '#080B09' },
      }}>
      <Tabs.Screen
        name="training"
        options={{ title: 'Treningi' }}
      />
      <Tabs.Screen name="history" options={{ title: 'Historia' }} />
      <Tabs.Screen name="account" options={{ title: 'Konto' }} />
    </Tabs>
  );
}
