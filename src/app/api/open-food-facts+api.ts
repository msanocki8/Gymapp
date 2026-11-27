const OFF_BASE = 'https://world.openfoodfacts.org';
const OFF_FIELDS = 'code,product_name,product_name_pl,generic_name_pl,brands,nutriments,image_front_small_url';
const OFF_USER_AGENT = 'GymApp/1.0 (https://github.com/msanocki8/Gymapp)';
const CACHE_CONTROL = 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400';
const REQUEST_TIMEOUT_MS = 9000;

function jsonResponse(body: Record<string, unknown>, status: number, headers?: HeadersInit) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      ...headers,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query')?.trim() ?? '';
  const barcode = searchParams.get('barcode')?.trim() ?? '';

  if ((!query && !barcode) || (query && barcode)) {
    return jsonResponse({ error: 'Podaj frazę wyszukiwania albo kod kreskowy.' }, 400);
  }
  if (query && (query.length < 3 || query.length > 100)) {
    return jsonResponse({ error: 'Wpisz od 3 do 100 znaków.' }, 400);
  }
  if (barcode && !/^[0-9]{8,14}$/.test(barcode)) {
    return jsonResponse({ error: 'Kod kreskowy musi mieć od 8 do 14 cyfr.' }, 400);
  }

  let upstreamUrl: string;
  if (barcode) {
    upstreamUrl = `${OFF_BASE}/api/v2/product/${barcode}?fields=${OFF_FIELDS}`;
  } else {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '24',
      sort_by: 'unique_scans_n',
      fields: OFF_FIELDS,
      lc: 'pl',
      cc: 'pl',
    });
    upstreamUrl = `${OFF_BASE}/cgi/search.pl?${params}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const abortUpstream = () => controller.abort();
  request.signal.addEventListener('abort', abortUpstream, { once: true });

  try {
    const response = await fetch(upstreamUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': OFF_USER_AGENT,
      },
    });

    if (response.status === 429) {
      return jsonResponse(
        { error: 'Open Food Facts ograniczyło liczbę zapytań. Spróbuj ponownie za minutę.' },
        429,
        { 'Retry-After': '60' },
      );
    }
    if (response.status === 503 || response.status >= 500) {
      return jsonResponse(
        { error: 'Open Food Facts jest chwilowo niedostępny. Spróbuj ponownie za chwilę.' },
        503,
        { 'Retry-After': '60' },
      );
    }
    if (!response.ok) {
      return jsonResponse({ error: `Open Food Facts nie odpowiada (${response.status}).` }, 502);
    }

    const data: unknown = await response.json();
    return Response.json(data, {
      headers: { 'Cache-Control': CACHE_CONTROL },
    });
  } catch (reason) {
    const message = reason instanceof Error && reason.name === 'AbortError'
      ? 'Open Food Facts nie odpowiedziało na czas. Spróbuj ponownie.'
      : 'Nie udało się połączyć z Open Food Facts. Sprawdź połączenie internetowe.';
    return jsonResponse({ error: message }, 502);
  } finally {
    clearTimeout(timer);
    request.signal.removeEventListener('abort', abortUpstream);
  }
}
