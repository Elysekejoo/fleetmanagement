import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Field, FieldError, Input, Label } from '@/components/ui/Field';
import { useI18n } from '@/lib/i18n';
import { useSettings } from '@/lib/settings';
import { requestPasswordReset } from '@/services/passwordResets';
import { friendlyError } from '@/lib/errors';
import { cn } from '@/lib/utils';

const resetSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    lastUsedPassword: z.string().min(1, 'Enter the password you last used'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type ResetValues = z.infer<typeof resetSchema>;
type ResetErrors = Partial<Record<keyof ResetValues | 'form', string>>;

function mapResetError(err: unknown): ResetErrors {
  const msg = friendlyError(err, 'Unable to submit your reset request. Please try again.');
  const text = msg.toLowerCase();
  if (/(no active account)|(no .* found with this email)|(is not registered)|(email.* does not exist)/i.test(text)) {
    return { email: msg };
  }
  if (/(does not match|last used password|recent password|wrong password|incorrect password)/i.test(text)) {
    return { lastUsedPassword: msg };
  }
  if (/(at least 6|too short|must be at least)/i.test(text)) {
    return { newPassword: msg };
  }
  return { form: msg };
}

export default function ForgotPasswordPage() {
  const { t } = useI18n();
  const { settings } = useSettings();
  const [values, setValues] = useState<ResetValues>({
    email: '',
    lastUsedPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<ResetErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function set<K extends keyof ResetValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  }

  async function validate(): Promise<void> {
    const parsed = resetSchema.safeParse(values);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({
        email: flat.email?.[0],
        lastUsedPassword: flat.lastUsedPassword?.[0],
        newPassword: flat.newPassword?.[0],
        confirmPassword: flat.confirmPassword?.[0],
      });
      return;
    }
    if (errors.form || Object.values(errors).some(Boolean)) setErrors({});
    setSubmitting(true);
    try {
      await requestPasswordReset(values.email, values.lastUsedPassword, values.newPassword);
      setSubmitted(true);
    } catch (err) {
      setErrors(mapResetError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await validate();
  }

  return (
    <div className="login-viewport login-desktop-fixed flex min-h-full flex-col bg-bg">
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
                    {t('resetPasswordTitle')}
                  </div>
                  <div className="truncate text-[11px] text-ink-3 sm:text-xs">{settings.system_name}</div>
                </div>
              </div>
            </header>

            <div className="px-6 py-5 sm:px-8 sm:py-6">
              {submitted ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ok-bg">
                    <CheckCircle2 className="h-6 w-6 text-ok" aria-hidden="true" />
                  </span>
                  <p className="max-w-sm text-sm leading-relaxed text-ink">{t('resetSubmitted')}</p>
                </div>
              ) : (
                <>
                  <p className="mb-4 text-xs leading-relaxed text-ink-2">{t('resetPasswordIntro')}</p>
                  <form noValidate onSubmit={handleSubmit}>
                    <Field>
                      <Label htmlFor="reset-email" required>
                        {t('resetEmailLabel')}
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="username"
                        value={values.email}
                        onChange={(e) => set('email', e.target.value)}
                        placeholder="yourname@msh.rw"
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'reset-email-error' : undefined}
                        className={cn(errors.email && 'border-danger focus:border-danger focus:ring-danger/10')}
                      />
                      <FieldError id="reset-email-error" message={errors.email} />
                    </Field>

                    <Field>
                      <Label htmlFor="reset-last" required>
                        {t('resetLastUsedLabel')}
                      </Label>
                      <Input
                        id="reset-last"
                        type="password"
                        autoComplete="current-password"
                        value={values.lastUsedPassword}
                        onChange={(e) => set('lastUsedPassword', e.target.value)}
                        aria-invalid={Boolean(errors.lastUsedPassword)}
                        aria-describedby={errors.lastUsedPassword ? 'reset-last-error' : undefined}
                        className={cn(
                          errors.lastUsedPassword && 'border-danger focus:border-danger focus:ring-danger/10',
                        )}
                      />
                      <FieldError id="reset-last-error" message={errors.lastUsedPassword} />
                      <p className="mt-1.5 text-[11px] leading-snug text-ink-3">{t('resetLastUsedHint')}</p>
                    </Field>

                    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
                      <Field>
                        <Label htmlFor="reset-new" required>
                          {t('resetNewLabel')}
                        </Label>
                        <Input
                          id="reset-new"
                          type="password"
                          autoComplete="new-password"
                          value={values.newPassword}
                          onChange={(e) => set('newPassword', e.target.value)}
                          aria-invalid={Boolean(errors.newPassword)}
                          aria-describedby={errors.newPassword ? 'reset-new-error' : undefined}
                          className={cn(
                            errors.newPassword && 'border-danger focus:border-danger focus:ring-danger/10',
                          )}
                        />
                        <FieldError id="reset-new-error" message={errors.newPassword} />
                      </Field>
                      <Field>
                        <Label htmlFor="reset-confirm" required>
                          {t('resetConfirmLabel')}
                        </Label>
                        <Input
                          id="reset-confirm"
                          type="password"
                          autoComplete="new-password"
                          value={values.confirmPassword}
                          onChange={(e) => set('confirmPassword', e.target.value)}
                          aria-invalid={Boolean(errors.confirmPassword)}
                          aria-describedby={errors.confirmPassword ? 'reset-confirm-error' : undefined}
                          className={cn(
                            errors.confirmPassword && 'border-danger focus:border-danger focus:ring-danger/10',
                          )}
                        />
                        <FieldError id="reset-confirm-error" message={errors.confirmPassword} />
                      </Field>
                    </div>
                    <p className="mb-3 text-[11px] text-ink-3">{t('resetNotifyHint')}</p>

                    {errors.form && (
                      <p role="alert" className="rounded-md border border-danger-border bg-danger-bg px-3 py-2 text-xs text-danger">
                        {errors.form}
                      </p>
                    )}

                    <Button
                      type="submit"
                      variant="navy"
                      loading={submitting}
                      className="mt-2 h-12 w-full rounded-lg text-sm"
                      icon={<KeyRound className="h-4 w-4" />}
                    >
                      {t('resetSubmit')}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-blue transition-colors hover:text-blue-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('resetBack')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
