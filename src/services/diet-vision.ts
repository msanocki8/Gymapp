import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { parseDietVisionItems, type DietVisionItem } from '@/lib/diet-vision';

export async function compressMealPhoto(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri, { maxWidth: 800 }).renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
  if (!result.base64) throw new Error('Nie udało się przygotować zdjęcia do analizy.');
  return result.base64;
}

export async function analyzeMealPhoto(base64: string, accessToken: string | null): Promise<DietVisionItem[]> {
  if (!accessToken) throw new Error('Zaloguj się ponownie, aby analizować posiłki.');

  const apiUrl = process.env.EXPO_PUBLIC_DIET_VISION_API_URL?.trim()
    || (Platform.OS === 'web' ? '/api/diet-vision' : 'https://gymapp-one-lemon.vercel.app/api/diet-vision');

  let response: Response;
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64, mimeType: 'image/jpeg' }),
    });
  } catch {
    throw new Error('Nie można połączyć się z analizą zdjęcia. Sprawdź połączenie internetowe.');
  }

  const result = await response.json().catch(() => null) as unknown;
  if (!response.ok) {
    const message = typeof result === 'object' && result !== null && 'error' in result && typeof result.error === 'string'
      ? result.error
      : 'Nie udało się przeanalizować zdjęcia.';
    throw new Error(message);
  }

  const items = parseDietVisionItems(result);
  if (!items) throw new Error('Analiza zdjęcia zwróciła nieprawidłowy wynik.');
  return items;
}
