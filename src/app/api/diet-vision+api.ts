import { parseDietVisionItems } from '@/lib/diet-vision';

const maxRequestBytes = 3_500_000;
const maxImageLength = 3_400_000;
const maxDescriptionLength = 500;
const geminiTimeoutMs = 50_000;

function jsonResponse(body: Record<string, unknown>, status: number) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function authenticateRequest(request: Request): Promise<boolean> {
  const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return false;

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/+$/, '')}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  if (!await authenticateRequest(request)) {
    return jsonResponse({ error: 'Sesja wygasła lub jest nieprawidłowa. Zaloguj się ponownie.' }, 401);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > maxRequestBytes) {
    return jsonResponse({ error: 'Zdjęcie jest zbyt duże. Spróbuj wybrać mniejsze.' }, 413);
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > maxRequestBytes) {
      return jsonResponse({ error: 'Zdjęcie jest zbyt duże. Spróbuj wybrać mniejsze.' }, 413);
    }
    body = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Nieprawidłowy format danych. Oczekiwano JSON.' }, 400);
  }

  if (
    !isRecord(body)
    || typeof body.image !== 'string'
    || body.image.length > maxImageLength
    || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.image)
    || !['image/jpeg', 'image/png', 'image/webp'].includes(String(body.mimeType))
    || (body.description !== undefined
      && (typeof body.description !== 'string' || body.description.length > maxDescriptionLength))
  ) {
    return jsonResponse({ error: 'Nieprawidłowe lub zbyt duże zdjęcie.' }, 400);
  }

  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return jsonResponse({ error: 'Analiza zdjęć nie jest skonfigurowana na serwerze. Brakuje klucza API Gemini.' }, 503);
  }

  const prompt = `Rozpoznaj widoczne na zdjęciu składniki jedzenia i oszacuj ich porcje. Odpowiedz wyłącznie poprawnym JSON-em zgodnym ze schematem. Wszystkie nazwy podaj po polsku. Dla każdego składnika podaj gramaturę porcji oraz kalorie, białko, węglowodany i tłuszcz dla tej porcji. Jeśli użytkownik doprecyzował markę lub nazwę dania, uwzględnij tę informację i użyj wiarygodnych znanych wartości odżywczych, jeśli je znasz; nie przedstawiaj niepewnych danych jako dokładnych. Nie dodawaj sztućców, naczyń ani niepewnych składników. Jeśli nie widać jedzenia, zwróć {"items":[]}.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), geminiTimeoutMs);
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              ...(description ? [{ text: `Doprecyzowanie dania przez użytkownika: ${description}` }] : []),
              { inline_data: { mime_type: body.mimeType, data: body.image } },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1800,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'OBJECT',
              properties: {
                items: {
                  type: 'ARRAY',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      name: { type: 'STRING' },
                      estimated_grams: { type: 'NUMBER' },
                      calories: { type: 'NUMBER' },
                      protein: { type: 'NUMBER' },
                      carbs: { type: 'NUMBER' },
                      fat: { type: 'NUMBER' },
                    },
                    required: ['name', 'estimated_grams', 'calories', 'protein', 'carbs', 'fat'],
                  },
                },
              },
              required: ['items'],
            },
          },
        }),
      },
    );
  } catch {
    if (controller.signal.aborted) {
      return jsonResponse({ error: 'Analiza zdjęcia przekroczyła limit czasu. Spróbuj ponownie.' }, 504);
    }
    return jsonResponse({ error: 'Nie udało się połączyć z Gemini. Sprawdź połączenie i spróbuj ponownie.' }, 502);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    if (response.status === 429) {
      return jsonResponse({ error: 'Limit zapytań Gemini został osiągnięty. Spróbuj ponownie później.' }, 429);
    }
    if ([401, 403].includes(response.status)) {
      return jsonResponse({ error: 'Klucz Gemini jest nieprawidłowy lub nie ma uprawnień do tego modelu.' }, 502);
    }
    if (response.status === 400) {
      return jsonResponse({ error: 'Gemini odrzucił żądanie analizy zdjęcia (HTTP 400).' }, 502);
    }
    if (response.status === 404) {
      return jsonResponse({ error: 'Model Gemini 3.5 Flash-Lite nie jest dostępny dla tego klucza API.' }, 502);
    }
    return jsonResponse({ error: `Gemini chwilowo nie odpowiada (HTTP ${response.status}). Spróbuj ponownie.` }, 502);
  }

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    return jsonResponse({ error: 'Gemini zwrócił odpowiedź w nieprawidłowym formacie.' }, 502);
  }
  if (!isRecord(result) || !Array.isArray(result.candidates)) {
    return jsonResponse({ error: 'Usługa Gemini zwróciła nieprawidłową odpowiedź.' }, 502);
  }
  const candidate = result.candidates[0];
  if (!isRecord(candidate) || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) {
    return jsonResponse({ error: 'Gemini nie rozpoznał składników na zdjęciu.' }, 502);
  }
  const text = candidate.content.parts
    .filter((part): part is Record<string, unknown> => isRecord(part) && typeof part.text === 'string')
    .map((part) => part.text)
    .join('')
    .trim();
  if (!text) return jsonResponse({ error: 'Gemini zwrócił pustą odpowiedź. Spróbuj ponownie.' }, 502);

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return jsonResponse({ error: 'Gemini zwrócił nieprawidłowy format danych.' }, 502);
  }
  const items = parseDietVisionItems(parsed);
  if (!items) return jsonResponse({ error: 'Gemini zwrócił nieprawidłowe dane składników.' }, 502);
  return jsonResponse({ items }, 200);
}
