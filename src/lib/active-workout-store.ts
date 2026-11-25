import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

/**
 * Globalny stan aktywnego treningu („działanie w tle”).
 *
 * Mały zewnętrzny store zamiast Contextu: komponenty subskrybują tylko to, czego potrzebują,
 * więc zmiana serii nie przerysowuje całej aplikacji. Czas NIE jest tu tykany – liczy się go
 * zawsze jako Date.now() - startTime tam, gdzie jest wyświetlany.
 */
export type ActiveWorkoutState = {
  isActive: boolean;
  isMinimized: boolean;
  planId: string | null;
  isQuickStart: boolean;
  planName: string;
  startTime: number | null;
  doneExercises: number;
  totalExercises: number;
};

const STORAGE_KEY = 'gymapp:active-workout';

const INITIAL_STATE: ActiveWorkoutState = {
  isActive: false,
  isMinimized: false,
  planId: null,
  isQuickStart: false,
  planName: '',
  startTime: null,
  doneExercises: 0,
  totalExercises: 0,
};

function readPersisted(): ActiveWorkoutState {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return INITIAL_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_STATE;
    const parsed = JSON.parse(raw) as Partial<ActiveWorkoutState>;
    if (typeof parsed.isActive !== 'boolean' || typeof parsed.startTime !== 'number') {
      console.warn('Zapis aktywnego treningu ma nieprawidłowy format; pomijam go.');
      return INITIAL_STATE;
    }
    return { ...INITIAL_STATE, ...parsed };
  } catch (error) {
    console.warn('Nie udało się odczytać aktywnego treningu z localStorage.', error);
    return INITIAL_STATE;
  }
}

let state: ActiveWorkoutState = readPersisted();
// Szkice serii trzymane w pamięci (także dla „Szybkiego startu”, którego szkic nie trafia do storage).
const drafts = new Map<string, unknown>();
const listeners = new Set<() => void>();

function setState(patch: Partial<ActiveWorkoutState>) {
  const next = { ...state, ...patch };
  const changed = (Object.keys(next) as (keyof ActiveWorkoutState)[]).some((key) => next[key] !== state[key]);
  if (!changed) return;
  state = next;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      if (state.isActive) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Nie udało się zapisać aktywnego treningu w localStorage.', error);
    }
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const activeWorkout = {
  getState: () => state,

  /** Ekran treningu jest otwarty: trening aktywny i rozwinięty. */
  open(params: { planId: string | null; isQuickStart: boolean; planName: string; startTime: number }) {
    setState({
      isActive: true,
      isMinimized: false,
      planId: params.planId,
      isQuickStart: params.isQuickStart,
      planName: params.planName,
      startTime: params.startTime,
    });
  },

  setProgress(doneExercises: number, totalExercises: number) {
    if (!state.isActive) return;
    setState({ doneExercises, totalExercises });
  },

  minimize() {
    if (state.isActive) setState({ isMinimized: true });
  },

  restore() {
    setState({ isMinimized: false });
  },

  /** Trening zapisany albo porzucony. */
  end(draftId?: string) {
    if (draftId) drafts.delete(draftId);
    setState(INITIAL_STATE);
  },

  saveDraft(draftId: string, draft: unknown) {
    drafts.set(draftId, draft);
  },

  getDraft<T>(draftId: string): T | undefined {
    return drafts.get(draftId) as T | undefined;
  },
};

/** Subskrypcja wybranego kawałka stanu (selektor musi zwracać wartość prostą, nie nowy obiekt). */
export function useActiveWorkout<T>(selector: (current: ActiveWorkoutState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(INITIAL_STATE),
  );
}
