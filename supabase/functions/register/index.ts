import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(status: number, body: { message: string }) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return respond(405, { message: 'Ta metoda nie jest obsługiwana.' });
  }

  let inputValue: unknown;
  try {
    inputValue = await request.json();
  } catch {
    return respond(400, { message: 'Nieprawidłowe dane formularza.' });
  }
  if (typeof inputValue !== 'object' || inputValue === null || Array.isArray(inputValue)) {
    return respond(400, { message: 'Nieprawidłowe dane formularza.' });
  }
  const input = inputValue as { nick?: unknown; password?: unknown; accessKey?: unknown };

  const nick = typeof input.nick === 'string' ? input.nick : '';
  const password = typeof input.password === 'string' ? input.password : '';
  const accessKey = typeof input.accessKey === 'string' ? input.accessKey : '';
  const expectedAccessKey = Deno.env.get('REGISTRATION_ACCESS_KEY');
  if (!expectedAccessKey) {
    return respond(500, { message: 'Rejestracja nie jest skonfigurowana. Skontaktuj się z administratorem.' });
  }
  if (accessKey !== expectedAccessKey) {
    return respond(400, { message: 'Nieprawidłowy klucz dostępu' });
  }
  if (!/^[A-Za-z0-9_-]{3,24}$/.test(nick)) {
    return respond(400, { message: 'Nick musi mieć od 3 do 24 znaków: litery bez polskich znaków, cyfry, „_” lub „-”.' });
  }
  if (password.length < 8 || password.length > 128) {
    return respond(400, { message: 'Hasło musi mieć od 8 do 128 znaków.' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return respond(500, { message: 'Usługa rejestracji nie ma poprawnej konfiguracji Supabase.' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const email = `nick.${nick.toLowerCase()}@accounts.gymlog.invalid`;
  const { error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { nick },
  });

  if (error) {
    if (/already (registered|exists)|duplicate key/i.test(error.message)) {
      return respond(409, { message: 'Ten nick jest już zajęty.' });
    }
    return respond(400, { message: 'Nie udało się utworzyć konta. Sprawdź dane i spróbuj ponownie.' });
  }

  return respond(200, { message: 'Konto zostało utworzone.' });
});
