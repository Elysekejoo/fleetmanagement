import { readFileSync } from 'node:fs';

const envText = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const get = (k) => envText.match(new RegExp(`^${k}\\s*=\\s*(.+)$`, 'm'))?.[1].trim();

const anon = get('VITE_SUPABASE_ANON_KEY');
const base = get('VITE_SUPABASE_URL');

const tokenRes = await fetch(`${base}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: anon, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@msh.rw', password: 'admin123' }),
});
const { access_token } = await tokenRes.json();
const headers = { apikey: anon, Authorization: `Bearer ${access_token}` };

const checks = [
  ['profiles', `${base}/rest/v1/profiles?select=id,email,role,is_active&limit=5`],
  ['vehicles', `${base}/rest/v1/vehicles?select=id,registration_number,status&limit=5`],
  ['requests', `${base}/rest/v1/travel_requests?select=id,ref_code,status&limit=5`],
  ['trips', `${base}/rest/v1/trips?select=id,status&limit=5`],
  ['gps', `${base}/rest/v1/gps_locations?select=vehicle_id,latitude,longitude&limit=3`],
  ['fuel', `${base}/rest/v1/fuel_records?select=id&limit=3`],
  ['maintenance', `${base}/rest/v1/maintenance_records?select=id&limit=3`],
  ['stats rpc', `${base}/rest/v1/rpc/get_dashboard_stats`],
];

for (const [name, url] of checks) {
  const res = await fetch(url, { headers });
  const ok = res.status === 200;
  const body = await res.text();
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${ok ? '' : ` — ${res.status} ${body.slice(0, 140)}`}`);
}