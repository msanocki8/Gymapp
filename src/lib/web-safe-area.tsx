import { useEffect, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';
import { SafeAreaInsetsContext, type EdgeInsets } from 'react-native-safe-area-context';

const ZERO: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

function measureCssInsets(): EdgeInsets {
  if (typeof document === 'undefined') return ZERO;
  const probe = document.createElement('div');
  probe.style.cssText = [
    'position:fixed', 'top:0', 'left:0', 'width:0', 'height:0', 'visibility:hidden', 'pointer-events:none',
    'padding-top:env(safe-area-inset-top,0px)', 'padding-right:env(safe-area-inset-right,0px)',
    'padding-bottom:env(safe-area-inset-bottom,0px)', 'padding-left:env(safe-area-inset-left,0px)',
  ].join(';');
  document.body.appendChild(probe);
  const style = window.getComputedStyle(probe);
  const insets = {
    top: parseFloat(style.paddingTop) || 0,
    right: parseFloat(style.paddingRight) || 0,
    bottom: parseFloat(style.paddingBottom) || 0,
    left: parseFloat(style.paddingLeft) || 0,
  };
  probe.remove();
  return insets;
}

/**
 * Na webie (PWA w Safari) SafeAreaProvider Expo Routera zwraca zera. Mierzymy env(safe-area-inset-*)
 * sami i podajemy wynik wszystkim SafeAreaView / useSafeAreaInsets w aplikacji.
 * Dzięki temu tło idzie na cały ekran (pod godzinę i pasek na dole), a treść nadal omija te miejsca.
 */
export function WebSafeAreaInsets({ children }: PropsWithChildren) {
  const [insets, setInsets] = useState<EdgeInsets>(ZERO);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const update = () => {
      const next = measureCssInsets();
      setInsets((current) =>
        current.top === next.top && current.right === next.right
          && current.bottom === next.bottom && current.left === next.left ? current : next);
    };
    update();
    // iOS potrafi podać wartości dopiero po pierwszej klatce.
    const frame = window.requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  if (Platform.OS !== 'web') return <>{children}</>;
  return <SafeAreaInsetsContext.Provider value={insets}>{children}</SafeAreaInsetsContext.Provider>;
}
