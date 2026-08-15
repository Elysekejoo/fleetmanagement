import { readFileSync } from 'node:fs';

const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const url = 'https://yiwxsvbuibhnnxequjra.supabase.co/auth/v1/token?grant_type=password';
const accounts = [
  ['admin@msh.rw', 'admin123'],
  ['employee@msh.rw', 'emp123'],
  ['driver@msh.rw', 'driver123'],
];

for (const [email, password] of accounts) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  console.log(`${res.status === 200 ? 'OK  ' : 'FAIL'} ${email} — ${body.user?.email ?? body.msg ?? res.status}`);
}

const usersRes = await fetch(
  'https://yiwxsvbuibhnnxequjra.supabase.co/auth/v1/admin/users?per_page=10',
  { headers: { apikey: anonKey, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } },
);
const users = await usersRes.json();
console.log(`total auth users: ${users.length ?? '?'}`);
void readFileSync;