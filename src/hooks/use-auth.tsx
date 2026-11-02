import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';

import { requireSupabase, supabaseConfigured } from '@/lib/supabase';
import {
  DEFAULT_WEEKLY_WORKOUT_GOAL,
  isValidWeeklyWorkoutGoal,
  MAX_WEEKLY_WORKOUT_GOAL,
  MIN_WEEKLY_WORKOUT_GOAL,
} from '@/lib/workout-goal';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  configurationError: string | null;
  sessionError: string | null;
  weeklyWorkoutGoal: number;
  signIn: (nick: string, password: string) => Promise<void>;
  signUp: (nick: string, password: string, accessKey: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateNick: (nick: string) => Promise<void>;
  setWeeklyWorkoutGoal: (goal: number) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function nickToEmail(nick: string) {
  return `nick.${nick.toLowerCase()}@accounts.gymlog.invalid`;
}

export function isValidNick(nick: string) {
  return /^[A-Za-z0-9_-]{3,24}$/.test(nick);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(supabaseConfigured);
  const [configurationError] = useState<string | null>(
    supabaseConfigured ? null : 'Uzupełnij adres URL i klucz publiczny projektu Supabase w pliku .env.',
  );
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;

    const client = requireSupabase();
    let isMounted = true;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (isMounted) {
        setSession(nextSession);
        setSessionError(null);
        setIsLoading(false);
      }
    });

    void client.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) {
        setSessionError(`Nie udało się odczytać zapisanej sesji: ${error.message}`);
      }
      setSession(data.session);
      setIsLoading(false);
    }).catch((error: unknown) => {
      if (!isMounted) return;
      setSessionError(error instanceof Error ? error.message : 'Nie udało się odczytać zapisanej sesji.');
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (nick: string, password: string) => {
    const client = requireSupabase();
    const { error } = await client.auth.signInWithPassword({ email: nickToEmail(nick), password });
    if (error) throw new Error('Nieprawidłowy nick lub hasło.');
  }, []);

  const signUp = useCallback(async (nick: string, password: string, accessKey: string) => {
    const client = requireSupabase();
    const { error } = await client.functions.invoke<{ message?: string }>('register', {
      body: { nick, password, accessKey },
    });

    if (error) {
      if (error.context instanceof Response) {
        const result = await error.context.json().catch(() => null) as { message?: string } | null;
        throw new Error(result?.message ?? 'Nie udało się utworzyć konta. Sprawdź konfigurację Supabase.');
      }
      throw new Error(error.message || 'Nie udało się połączyć z usługą rejestracji.');
    }

    const { error: signInError } = await client.auth.signInWithPassword({
      email: nickToEmail(nick),
      password,
    });
    if (signInError) {
      throw new Error('Konto utworzono, ale automatyczne logowanie się nie powiodło. Zaloguj się podanym nickiem i hasłem.');
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await requireSupabase().auth.signOut();
    if (error) throw new Error(`Nie udało się wylogować: ${error.message}`);
  }, []);

  const weeklyWorkoutGoal = isValidWeeklyWorkoutGoal(session?.user.user_metadata.weekly_workout_goal)
    ? session.user.user_metadata.weekly_workout_goal
    : DEFAULT_WEEKLY_WORKOUT_GOAL;

  const setWeeklyWorkoutGoal = useCallback(async (goal: number) => {
    if (!isValidWeeklyWorkoutGoal(goal)) {
      throw new Error(`Cel treningowy musi wynosić od ${MIN_WEEKLY_WORKOUT_GOAL} do ${MAX_WEEKLY_WORKOUT_GOAL} treningów tygodniowo.`);
    }

    const currentUserId = session?.user.id;
    if (!currentUserId) throw new Error('Zaloguj się, aby zapisać cel treningowy.');

    const { data, error } = await requireSupabase().auth.updateUser({
      data: { weekly_workout_goal: goal },
    });
    if (error) throw new Error(`Nie udało się zapisać celu treningowego: ${error.message}`);
    if (!data.user) throw new Error('Nie udało się odczytać zaktualizowanego celu treningowego.');

    setSession((current) => current?.user.id === currentUserId
      ? { ...current, user: data.user }
      : current);
  }, [session?.user.id]);

  const updateNick = useCallback(async (nick: string) => {
    if (!isValidNick(nick)) {
      throw new Error('Nick musi mieć od 3 do 24 znaków: litery bez polskich znaków, cyfry, „_” lub „-”.');
    }
    const client = requireSupabase();
    const { error } = await client.functions.invoke<{ message?: string }>('update-nick', {
      body: { nick },
    });
    if (error) {
      if (error.context instanceof Response) {
        const result = await error.context.json().catch(() => null) as { message?: string } | null;
        throw new Error(result?.message ?? 'Nie udało się zmienić nicku.');
      }
      throw new Error(error.message || 'Nie udało się połączyć z usługą zmiany nicku.');
    }
    const { error: refreshError } = await client.auth.refreshSession();
    if (refreshError) {
      throw new Error('Nick został zmieniony, ale nie udało się odświeżyć sesji. Zaloguj się ponownie nowym nickiem.');
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    isLoading,
    configurationError,
    sessionError,
    weeklyWorkoutGoal,
    signIn,
    signUp,
    signOut,
    updateNick,
    setWeeklyWorkoutGoal,
  }), [session, isLoading, configurationError, sessionError, weeklyWorkoutGoal, signIn, signUp, signOut, updateNick, setWeeklyWorkoutGoal]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
