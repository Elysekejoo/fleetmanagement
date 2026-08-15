import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const envPath = new URL('../.env', import.meta.url);
let envText = '';
try {
  envText = readFileSync(envPath, 'utf8');
} catch {
  console.error('ERROR: .env not found. Copy .env.example to .env and fill in Supabase credentials, then run npm run db:demo');
  process.exit(1);
}

const getEnv = (key) => {
  const match = envText.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : undefined;
};

const url = getEnv('VITE_SUPABASE_URL');
const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!url || !serviceKey) {
  console.error('ERROR: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env (service-role key required to create users).');
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const demoUsers = [
  { email: 'admin@msh.rw', password: 'admin123', full_name: 'System Administrator', role: 'admin' },
  { email: 'employee@msh.rw', password: 'emp123', full_name: 'Jeanette Uwase', role: 'employee' },
  { email: 'driver@msh.rw', password: 'driver123', full_name: 'Patrick Habimana', role: 'driver' },
];

for (const user of demoUsers) {
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const found = existing.users?.find((u) => u.email === user.email);
  if (found) {
    console.log(`SKIP  ${user.email} (already exists)`);
    continue;
  }
  const { error } = await admin.auth.admin.createUser({
    email: user.email,
    password: user.password,
    email_confirm: true,
    user_metadata: { full_name: user.full_name },
  });
  if (error) {
    console.error(`FAIL  ${user.email}: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(`OK    ${user.email} created (${user.role})`);
  }
}

console.log('\nNext: open the Supabase dashboard → SQL Editor → run the profile/RLS migrations, or run `supabase db push`.');
console.log('Then assign roles in the profiles table (SQL Editor):');
console.log(`  update profiles set role = 'admin' where email = 'admin@msh.rw';`);
console.log(`  update profiles set role = 'employee' where email = 'employee@msh.rw';`);
console.log(`  update profiles set role = 'driver' where email = 'driver@msh.rw';`);