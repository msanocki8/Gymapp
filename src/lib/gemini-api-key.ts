export type GeminiApiKeySelection =
  | { apiKey: string }
  | { error: 'invalid-override' | 'missing' };

export function selectGeminiApiKey(
  override: unknown,
  defaultKey: string | undefined,
): GeminiApiKeySelection {
  if (override !== undefined) {
    if (typeof override !== 'string') return { error: 'invalid-override' };
    const apiKey = override.trim();
    if (!apiKey || apiKey.length > 512) return { error: 'invalid-override' };
    return { apiKey };
  }

  const apiKey = defaultKey?.trim();
  return apiKey ? { apiKey } : { error: 'missing' };
}
