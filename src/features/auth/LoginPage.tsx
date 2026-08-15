import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { BarChart3, ChevronDown, ClipboardList, Eye, EyeOff, Fuel, Lock, LogIn, Mail, MapPinned } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/components/ui/Button';
import { Field, FieldError, Input, Label } from '@/components/ui/Field';
import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { friendlyError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import rwandaMural from '@/assets/rwanda-mural.jpg';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const FEATURES = [
  { icon: MapPinned, key: 'featTracking' },
  { icon: ClipboardList, key: 'featRequests' },
  { icon: Fuel, key: 'featRecords' },
  { icon: BarChart3, key: 'featReports' },
] as const;

export default function LoginPage() {
  const { profile, loading, signIn } = useAuth();
  const { t, lang, setLang } = useI18n();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      setErrors({ form: friendlyError(err, 'Invalid email or password') });
    } finally {
      setSubmitting(false);
    }
  }

  const heroParts = (() => {
    const idx = settings.hero_title.indexOf('&');
    if (idx < 0) return [settings.hero_title, false] as const;
    return [settings.hero_title.slice(0, idx), settings.hero_title.slice(idx + 1)] as const;
  })();

  return (
    <div className="login-viewport login-desktop-fixed grid grid-cols-1 overflow-x-hidden bg-navy md:grid-cols-[45fr_55fr] lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-navy md:block" aria-hidden="true">
        <img
          src={rwandaMural}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[rgba(11,22,40,0.76)]" />

        <div className="relative z-10 flex min-h-full flex-col gap-6 px-6 py-6 sm:px-10 lg:px-12 xl:px-14">
          <div className="flex items-center gap-3.5">
            <img
              src="/favicon.png"
              alt="MSH Rwanda logo"
              className="h-11 w-11 shrink-0 rounded-md object-contain"
            />
            <div>
              <div className="text-sm font-semibold text-white">{settings.org_name}</div>
              <div className="text-xs text-slate-400">{settings.org_line}</div>
            </div>
          </div>

          <div className="my-auto flex flex-col justify-center py-4">
            <h2 className="max-w-md text-[clamp(1.375rem,1.15rem+1vw,1.875rem)] font-semibold leading-snug text-white">
              {heroParts[0]}
              {heroParts[1] === false ? null : <span className="text-gold-light">{heroParts[1]}</span>}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">{settings.hero_subtitle}</p>

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

          <div>
            <div className="rounded-lg border border-white/10 bg-white/[0.06] p-3.5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-light">
                {settings.mission_title}
              </div>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-200">{settings.mission_text}</p>
            </div>

            <div className="mt-4 text-right text-[10px] uppercase tracking-[0.2em] text-slate-400/80">
              {settings.footer_line_2}
            </div>
          </div>
        </div>
      </aside>

      <main className="login-viewport flex min-h-0 flex-col bg-bg">
        <div className="flex flex-1 flex-col px-4 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-8">
          <section className="mx-auto my-auto w-full max-w-[420px] py-2 sm:py-6">
            <div className="login-card overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
              <header className="flex items-center justify-between gap-3 border-b border-line bg-white px-6 py-4 sm:px-8">
                <div className="flex min-w-0 items-center gap-3">
                  <img
                    src="/favicon.png"
                    alt="MSH Rwanda logo"
                    className="h-11 w-11 shrink-0 rounded-lg object-contain"
                  />
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-base font-bold tracking-tight text-ink sm:text-lg">
                      {settings.system_name}
                    </div>
                    <div className="truncate text-[11px] text-ink-3 sm:text-xs">{settings.location_line}</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLang(lang === 'en' ? 'rw' : 'en')}
                  className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[13px] font-semibold text-ink transition-colors hover:bg-bg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                  aria-label={lang === 'en' ? 'Switch to Kinyarwanda' : 'Switch to English'}
                  title={lang === 'en' ? 'Switch to Kinyarwanda' : 'Switch to English'}
                >
                  {lang === 'en' ? 'EN' : 'RW'}
                  <ChevronDown className="h-3.5 w-3.5 text-ink-3" aria-hidden="true" />
                </button>
              </header>

              <div className="px-6 py-6 sm:px-8 sm:py-8">
                <h1 className="text-center text-[clamp(1.5rem,1.3rem+0.8vw,2rem)] font-bold tracking-tight text-ink">
                  {t('signIn')}
                </h1>
                <p className="mt-2 text-center text-sm leading-relaxed text-ink-2">{t('signInSubtitle')}</p>

                <form onSubmit={handleSubmit} noValidate className="mt-6">    
                  <Field>
                    <Label htmlFor="login-email" required>
                      {t('emailLabel')}
                    </Label>
                    <div className="relative">
                      <Mail
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                        aria-hidden="true"
                      />
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t('emailPlaceholder')}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'login-email-error' : undefined}
                        className={cn(
                          'h-12 pl-10',
                          errors.email && 'border-danger focus:border-danger focus:ring-danger/10',
                        )}
                      />
                    </div>
                    <FieldError id="login-email-error" message={errors.email} />
                  </Field>

                  <Field>
                    <Label htmlFor="login-password" required>
                      {t('passwordLabel')}
                    </Label>
                    <div className="relative">
                      <Lock
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-3"
                        aria-hidden="true"
                      />
                      <Input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={t('passwordPlaceholder')}
                        aria-invalid={Boolean(errors.password)}
                        aria-describedby={errors.password ? 'login-password-error' : undefined}
                        className={cn(
                          'h-12 pl-10 pr-12',
                          errors.password && 'border-danger focus:border-danger focus:ring-danger/10',
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-ink-3 transition-colors hover:bg-bg hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FieldError id="login-password-error" message={errors.password} />
                    {errors.form && (
                      <p
                        role="alert"
                        className="mt-2 rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger"
                      >
                        {errors.form}
                      </p>
                    )}
                  </Field>

                  <div className="mt-1 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => navigate('/forgot-password')}
                      className="-mb-2 -mr-2 px-2 py-2 text-[13px] font-semibold text-blue transition-colors hover:text-blue-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
                    >
                      {t('forgotPassword')}
                    </button>
                  </div>

                  <Button
                    type="submit"
                    variant="navy"
                    loading={submitting}
                    className="mt-3 h-12 w-full rounded-lg text-sm"
                    icon={<LogIn className="h-4 w-4" />}
                  >
                    {submitting ? t('signingIn') : t('signIn')}
                  </Button>
                </form>
              </div>
            </div>

            <footer className="mt-6 text-center">
              <p className="text-[clamp(0.5625rem,0.5rem+0.3vw,0.6875rem)] font-semibold uppercase tracking-[0.18em] text-ink-3">
                {settings.footer_line_1}
              </p>
              <p className="mt-1 text-[clamp(0.5625rem,0.5rem+0.3vw,0.6875rem)] font-medium uppercase tracking-[0.18em] text-ink-3">
                {settings.footer_line_2}
              </p>
            </footer>
          </section>
        </div>
      </main>
    </div>
  );
}
