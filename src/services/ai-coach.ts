import type { WorkoutPlan } from '@/hooks/use-gym-app';
import { getAiCoachApiKey } from '@/services/ai-coach-key-storage';
import { Platform } from 'react-native';

export type AiCoachMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type AiCoachPlanContext = {
  name: string;
  focus: string;
  exercises: {
    name: string;
    sets: { reps: string; weight?: string }[];
  }[];
};

export class AiCoachRequestError extends Error {}

export function serializeWorkoutPlans(plans: WorkoutPlan[]): AiCoachPlanContext[] {
  return plans.map((plan) => ({
    name: plan.name,
    focus: plan.focus,
    exercises: plan.exercises.map((exerciseName) => {
      const config = plan.exerciseConfigs?.find((exercise) => exercise.name === exerciseName);
      return {
        name: exerciseName,
        sets: config?.sets.map((set) => ({
          reps: set.reps,
          ...(set.weight.trim() ? { weight: set.weight } : {}),
        })) ?? [],
      };
    }),
  }));
}

export async function requestAiCoachReply(
  messages: AiCoachMessage[],
  plans: AiCoachPlanContext[],
  accessToken: string | null,
  userId: string | null,
): Promise<string> {
  if (!accessToken) throw new AiCoachRequestError('Zaloguj się ponownie, aby porozmawiać z Trenerem AI.');

  let apiKeyOverride: string | null;
  try {
    apiKeyOverride = userId ? await getAiCoachApiKey(userId) : null;
  } catch {
    throw new AiCoachRequestError('Nie udało się odczytać zapisanego klucza API Trenera AI.');
  }

  let response: Response;
  try {
    const coachApiUrl = process.env.EXPO_PUBLIC_COACH_API_URL?.trim()
      || (Platform.OS === 'web'
        ? '/api/coach'
        : 'https://gymapp-one-lemon.vercel.app/api/coach');
    response = await fetch(coachApiUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        plansContext: plans,
        ...(apiKeyOverride ? { apiKeyOverride } : {}),
      }),
    });
  } catch {
    throw new AiCoachRequestError('Nie można połączyć się z Trenerem AI. Sprawdź połączenie z internetem i spróbuj ponownie.');
  }

  const result = await response.json().catch(() => null) as { reply?: unknown; error?: unknown } | null;
  if (!response.ok) {
    const serverMessage = typeof result?.error === 'string' ? result.error : null;
    if (response.status === 401) {
      throw new AiCoachRequestError(serverMessage ?? 'Sesja wygasła. Zaloguj się ponownie.');
    }
    if (response.status === 429) {
      throw new AiCoachRequestError(serverMessage ?? 'Limit zapytań do Trenera AI został osiągnięty. Spróbuj ponownie później.');
    }
    if (response.status === 503) {
      throw new AiCoachRequestError(serverMessage ?? 'Trener AI nie jest jeszcze skonfigurowany na serwerze.');
    }
    if (response.status === 400 || response.status === 403) {
      throw new AiCoachRequestError(serverMessage ?? 'Konfiguracja Google Gemini jest nieprawidłowa.');
    }
    throw new AiCoachRequestError(serverMessage ?? 'Trener AI nie może teraz odpowiedzieć. Spróbuj ponownie później.');
  }

  if (typeof result?.reply !== 'string' || !result.reply.trim()) {
    throw new AiCoachRequestError('Trener AI zwrócił pustą odpowiedź. Spróbuj zadać pytanie ponownie.');
  }

  return result.reply;
}
