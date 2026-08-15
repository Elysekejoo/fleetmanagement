import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { BarChart3, ChevronDown, ClipboardList, Eye, EyeOff, Fuel, LogIn, MapPinned } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field, FieldError, Input, Label } from '@/components/ui/Field';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import rwandaMural from '@/assets/rwanda-mural.jpg';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const DEMO_ACCOUNTS = [
  { role: 'ADMIN', email: 'admin@msh.rw', password: 'admin123' },
  { role: 'EMPLOYEE', email: 'employee@msh.rw', password: 'emp123' },
  { role: 'DRIVER', email: 'driver@msh.rw', password: 'driver123' },
] as const;

const FEATURES = [
  { icon: MapPinned, key: 'featTracking' },
  { icon: ClipboardList, key: 'featRequests' },
  { icon: Fuel, key: 'featRecords' },
  { icon: BarChart3, key: 'featReports' },
] as const;

export default function LoginPage() {
  const { profile, loading, signIn } = useAuth();
  const { t, lang, setLang } = useI18n();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@msh.rw');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  if (!loading && profile) {
    return <Navigate to={`/${profile.role}/dashboard`} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setErrors({});
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate('/', { replace: true });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Unable to sign in' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid h-[100dvh] grid-cols-1 overflow-hidden bg-white md:grid-cols-[45fr_55fr] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-navy md:flex md:flex-col" aria-hidden="true">
        <img
          src={rwandaMural}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[rgba(11,22,40,0.76)]" />

        <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden px-8 py-6 sm:px-10 lg:px-12 xl:px-14">
          <div className="flex items-center gap-3.5">
            <img
              src="/favicon.png"
              alt="MSH Rwanda logo"
              className="h-11 w-11 shrink-0 rounded-md object-contain"
            />
            <div>
              <div className="text-sm font-semibold text-white">{t('orgName')}</div>
              <div className="text-xs text-slate-400">{t('orgLine')}</div>
            </div>
          </div>

          <div className="my-auto flex min-h-0 flex-col justify-center py-4">
            <h1 className="max-w-md text-[26px] font-semibold leading-snug text-white xl:text-[30px]">
              Fleet Management &amp; <span className="text-gold-light">GPS Tracking System</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">{t('heroDescription')}</p>

            <ul className="mt-6 flex max-w-md flex-col gap-3.5 text-sm text-slate-200">
              {FEATURES.map(({ icon: Icon, key }) => (
                <li key={key} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                    <Icon className="h-4 w-4 text-gold-light" />
                  </span>
                  {t(key)}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">{t('missionTitle')}</div>
            <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-200">{t('missionText')}</p>
          </div>

          <div className="mt-4 text-right text-[10px] uppercase tracking-[0.2em] text-slate-400/80">
            Mural · Kigali, Rwanda · Kurema, Kureba, Kwiga
          </div>
        </div>
      </aside>

      <main className="flex min-h-0 flex-col overflow-hidden bg-white">
        <header className="flex shrink-0 items-center justify-between gap-4 px-6 pt-5 sm:px-10 lg:px-12">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/favicon.png"
              alt="MSH Rwanda logo"
              className="h-12 w-12 shrink-0 rounded-md object-contain"
            />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{t('shortOrg')}</div>
              <div className="truncate text-xs text-ink-3">{t('location')}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLang(lang === 'en' ? 'rw' : 'en')}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-2 text-xs font-semibold text-ink transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
            aria-label={lang === 'en' ? 'Switch to Kinyarwanda' : 'Switch to English'}
            title={lang === 'en' ? 'Switch to Kinyarwanda' : 'Switch to English'}
          >
            {lang === 'en' ? 'EN' : 'RW'}
            <ChevronDown className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
          </button>
        </header>

        <div className="flex min-h-full flex-col">
          <div className="m-auto w-full max-w-[496px] px-6 py-6 sm:px-10">
            <h2 className="text-3xl font-semibold tracking-tight text-ink">{t('signIn')}</h2>
            <p className="mt-1.5 text-sm text-ink-2">{t('signInSubtitle')}</p>

            <form onSubmit={handleSubmit} noValidate className="mt-6">
              <Field>
                <Label htmlFor="login-email" required>
                  {t('emailLabel')}
                </Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('emailPlaceholder')}
                  aria-invalid={Boolean(errors.email)}
                  className="h-12"
                />
                <FieldError message={errors.email} />
              </Field>

              <Field>
                <Label htmlFor="login-password" required>
                  {t('passwordLabel')}
                </Label>
                <div className="relative">
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('passwordPlaceholder')}
                    aria-invalid={Boolean(errors.password)}
                    className="h-12 pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-ink-3 transition-colors hover:text-ink"
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FieldError message={errors.password} />
                {errors.form && (
                  <p role="alert" className="mt-2 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger">
                    {errors.form}
                  </p>
                )}
              </Field>

              <Button
                type="submit"
                variant="navy"
                loading={submitting}
                className="mt-2 h-12 w-full rounded-lg"
                icon={<LogIn className="h-4 w-4" />}
              >
                {submitting ? t('signingIn') : t('signIn')}
              </Button>
            </form>

            <section className="mt-5 rounded-lg border border-line bg-bg p-3.5" aria-label={t('demoAccounts')}>
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-semibold text-ink-2">{t('demoAccounts')}</h3>
                <span className="text-[10px] text-ink-3">{t('demoAccountsHint')}</span>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                      setErrors({});
                    }}
                    className={cn(
                      'min-w-0 overflow-hidden rounded-md border border-line bg-white px-3 py-2.5 text-left transition-colors',
                      'hover:border-line-dark hover:bg-bg-2 focus-visible:outline-2 focus-visible:outline-blue',
                    )}
                  >
                    <span className="inline-flex rounded-sm border border-line-dark bg-bg-2 px-1.5 py-0.5 font-mono text-[9px] font-semibold tracking-wider text-ink-2">
                      {acc.role}
                    </span>
                    <div className="mt-1.5 truncate font-mono text-[11px] leading-tight text-ink">{acc.email}</div>
                    <div className="truncate font-mono text-[11px] leading-tight text-ink-3">{acc.password}</div>
                  </button>
                ))}
              </div>
            </section>

            <div className="mt-6 text-center text-[10px] uppercase tracking-wider text-ink-3">
              FMS V2.0 · MSH Rwanda · USAID-IREME · Kigali
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}