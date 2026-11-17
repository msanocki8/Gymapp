import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function getWorkoutPlanShareUrl(token: string) {
  const nativeHostUri = Constants.expoConfig?.hostUri;
  const nativeDevelopmentOrigin = nativeHostUri
    ? new URL(nativeHostUri.includes('://') ? nativeHostUri : `http://${nativeHostUri}`).origin
    : null;
  const origin = Platform.OS === 'web'
    ? typeof window !== 'undefined' ? window.location.origin : process.env.EXPO_PUBLIC_APP_URL
    : process.env.EXPO_PUBLIC_APP_URL ?? nativeDevelopmentOrigin;
  if (!origin) throw new Error('Nie można ustalić adresu aplikacji do udostępnienia.');
  return `${origin.replace(/\/+$/, '')}/share/${encodeURIComponent(token)}`;
}

export async function copyWorkoutPlanShareUrl(url: string) {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Schowek jest niedostępny w tej przeglądarce.');
  }
  await navigator.clipboard.writeText(url);
}
