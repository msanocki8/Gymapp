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

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  configurationError: string | null;
  sessionError: string | null;
  signIn: (nick: string, password: string) => Promise<void>;
  signUp: (nick: string, password: string, accessKey: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateNick: (nick: string) => Promise<void>;
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
    signIn,
    signUp,
    signOut,
    updateNick,
  }), [session, isLoading, configurationError, sessionError, signIn, signUp, signOut, updateNick]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
