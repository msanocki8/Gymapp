import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function getStorageKey(userId: string) {
  if (!userId) throw new Error('Zaloguj się, aby zarządzać kluczem API Trenera AI.');
  return `gymapp.ai-coach.gemini-key.${encodeURIComponent(userId)}`;
}

function getBrowserStorage() {
  if (typeof localStorage === 'undefined') {
    throw new Error('Pamięć przeglądarki jest niedostępna.');
  }
  return localStorage;
}

export async function getAiCoachApiKey(userId: string): Promise<string | null> {
  const key = getStorageKey(userId);
  return Platform.OS === 'web'
    ? getBrowserStorage().getItem(key)
    : SecureStore.getItemAsync(key);
}

export async function saveAiCoachApiKey(userId: string, value: string): Promise<void> {
  const key = getStorageKey(userId);
  const apiKey = value.trim();
  if (!apiKey || apiKey.length > 512) {
    throw new Error('Wpisz prawidłowy klucz API Gemini (maksymalnie 512 znaków).');
  }

  if (Platform.OS === 'web') {
    getBrowserStorage().setItem(key, apiKey);
    return;
  }
  await SecureStore.setItemAsync(key, apiKey);
}

export async function removeAiCoachApiKey(userId: string): Promise<void> {
  const key = getStorageKey(userId);
  if (Platform.OS === 'web') {
    getBrowserStorage().removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
