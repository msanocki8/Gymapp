const fs = require('node:fs');

const requiredVariables = [
  'EXPO_PUBLIC_SUPABASE_URL',
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
];

if (fs.existsSync('.env')) {
  const fileValues = new Map(
    fs.readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .flatMap((line) => {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (!match) return [];
        return [[match[1], match[2].replace(/^(['"])(.*)\1$/, '$2')]];
      }),
  );

  for (const name of requiredVariables) {
    if (process.env[name] === undefined && fileValues.has(name)) {
      process.env[name] = fileValues.get(name);
    }
  }
}

const missingVariables = requiredVariables.filter((name) => {
  const value = process.env[name]?.trim();
  return !value || /your-project|your-supabase|placeholder/i.test(value);
});

if (missingVariables.length > 0) {
  console.error(
    `Missing or placeholder Supabase environment variable(s): ${missingVariables.join(', ')}.\n` +
      'Set them in Vercel: Project Settings → Environment Variables, then redeploy.',
  );
  process.exit(1);
}
