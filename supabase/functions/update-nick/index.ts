import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, message: string) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return respond(405, 'Ta metoda nie jest obsługiwana.');
  }

  const authorization = request.headers.get('Authorization');
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return respond(401, 'Zaloguj się ponownie.');

  let inputValue: unknown;
  try {
    inputValue = await request.json();
  } catch {
    return respond(400, 'Nieprawidłowe dane formularza.');
  }
  if (typeof inputValue !== 'object' || inputValue === null || Array.isArray(inputValue)) {
    return respond(400, 'Nieprawidłowe dane formularza.');
  }
  const nick = (inputValue as { nick?: unknown }).nick;
  if (typeof nick !== 'string' || !/^[A-Za-z0-9_-]{3,24}$/.test(nick)) {
    return respond(400, 'Nick musi mieć od 3 do 24 znaków: litery bez polskich znaków, cyfry, „_” lub „-”.');
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return respond(500, 'Usługa zmiany nicku nie ma poprawnej konfiguracji Supabase.');
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !user) return respond(401, 'Twoja sesja wygasła. Zaloguj się ponownie.');

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    email: `nick.${nick.toLowerCase()}@accounts.gymlog.invalid`,
    email_confirm: true,
    user_metadata: { ...user.user_metadata, nick },
  });

  if (error) {
    if (/already (registered|exists)|duplicate key/i.test(error.message)) {
      return respond(409, 'Ten nick jest już zajęty.');
    }
    return respond(400, 'Nie udało się zmienić nicku. Spróbuj ponownie.');
  }

  return new Response(JSON.stringify({ message: 'Nick został zmieniony.' }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
