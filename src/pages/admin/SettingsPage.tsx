import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, DatabaseBackup, Save, Settings2, ShieldAlert } from 'lucide-react';
import { PageBody, PageHeader, Panel } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { FieldError, Input, Label, Textarea } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { fetchSettings, updateSettings } from '@/services/settings';
import { resetSystemData } from '@/services/system';
import { friendlyError } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { AppSettings } from '@/types/domain';

const FIELD_LABELS: Array<{ key: keyof AppSettings; label: string; hint?: string; textarea?: boolean }> = [
  { key: 'system_name', label: 'Web / System name', hint: 'Shown next to the logo on the login page and top bar.' },
  { key: 'org_name', label: 'Organisation name' },
  { key: 'org_line', label: 'Organisation tagline', hint: 'e.g. MSH Rwanda · Fleet Management' },
  { key: 'location_line', label: 'Location line', hint: 'e.g. Kigali, Rwanda' },
  { key: 'footer_line_1', label: 'Footer line 1', hint: 'e.g. FMS v2.0 - MSH Rwanda' },
  { key: 'footer_line_2', label: 'Footer line 2', hint: 'e.g. MSH Rwanda · Kigali, Rwanda' },
  { key: 'hero_title', label: 'Login page title', hint: 'Text after the "&" is highlighted in gold.' },
  { key: 'hero_subtitle', label: 'Login page subtitle', textarea: true },
  { key: 'mission_title', label: 'Mission title', hint: 'e.g. Rwanda' },
  { key: 'mission_text', label: 'Mission text', textarea: true },
];

export default function SettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: initial, isLoading } = useQuery({ queryKey: ['app-settings'], queryFn: fetchSettings });
  const [draft, setDraft] = useState<Partial<AppSettings>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof AppSettings, boolean>>>({});

  const settings = useMemo(() => ({ ...(initial ?? {}), ...draft }) as AppSettings, [initial, draft]);

  function set<K extends keyof AppSettings>(key: K, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setTouched((t) => ({ ...t, [key]: true }));
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const dirty = Object.keys(touched).filter(
        (k) => touched[k as keyof AppSettings],
      ) as Array<keyof AppSettings>;
      if (dirty.length === 0) {
        throw new Error('Nothing to save yet. Update a field first.');
      }
      const changes = dirty.reduce<Partial<AppSettings>>((acc, k) => {
        const v = settings[k];
        if (typeof v === 'string' && v.trim() === '') {
          throw new Error('All branding fields are required. Please fill in every field.');
        }
        acc[k] = v as never;
        return acc;
      }, {});
      return updateSettings(changes);
    },
    onSuccess: () => {
      toast.show('success', 'Settings saved');
      setDraft({});
      setTouched({});
      void queryClient.invalidateQueries({ queryKey: ['app-settings'] });
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to save settings. Please try again.')),
  });

  const dirtyCount = Object.values(touched).filter(Boolean).length;

  const [resetOpen, setResetOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const RESET_PHRASE = 'RESET';
  const canReset = confirmText.trim().toUpperCase() === RESET_PHRASE;

  const resetMutation = useMutation({
    mutationFn: () => resetSystemData(),
    onSuccess: () => {
      setResetOpen(false);
      setConfirmText('');
      toast.show('success', 'All system data has been reset.');
      void queryClient.invalidateQueries();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to reset the system. Please try again.')),
  });

  return (
    <>
      <PageHeader
        title="System Settings"
        description="Customize the branding and wording shown across the system"
        actions={
          <Button
            variant="navy"
            icon={<Save className="h-4 w-4" />}
            loading={saveMutation.isPending}
            disabled={dirtyCount === 0 || isLoading}
            onClick={() => saveMutation.mutate()}
          >
            Save changes
          </Button>
        }
      />
      <PageBody>
        <div className="mx-auto max-w-3xl space-y-5">
          <Panel
            title="Branding & wording"
            bodyClassName="p-5"
            actions={dirtyCount > 0 ? <span className="text-xs text-ink-3">{dirtyCount} unsaved change(s)</span> : undefined}
          >
            {isLoading ? (
              <p className="py-10 text-center text-sm text-ink-3">Loading settings…</p>
            ) : (
              <div className="space-y-4">
                {FIELD_LABELS.map((f) => (
                  <FieldBox
                    key={f.key}
                    label={f.label}
                    hint={f.hint}
                    touched={Boolean(touched[f.key])}
                    textarea={f.textarea}
                    value={settings[f.key] == null ? '' : String(settings[f.key])}
                    onChange={(v) => set(f.key, v)}
                  />
                ))}

                <div className="rounded-lg border border-line bg-bg p-4">
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink-2">
                    <Settings2 className="mr-1.5 inline h-3.5 w-3.5" />
                    Where these are used
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-ink-3">
                    These values replace the default branding on the sign-in screen, the sidebar footer, the top bar,
                    and the page footers. Saving here updates them instantly for the whole fleet system.
                  </p>
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="Danger Zone"
            bodyClassName="p-5"
            actions={<ShieldAlert className="h-4 w-4 text-danger" aria-hidden="true" />}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-danger-border bg-danger-bg">
                <DatabaseBackup className="h-5 w-5 text-danger" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-ink">Reset all system data</h3>
                <p className="mt-1 text-xs leading-relaxed text-ink-2">
                  Permanently delete <b>every user account, trip, travel request, fuel &amp; maintenance record, GPS
                  position, notification and audit log</b> in the system. Branding, vehicles and departments are
                  preserved. <span className="text-danger font-semibold">This action is irreversible</span> and cannot
                  be undone once confirmed.
                </p>
                <div className="mt-4">
                  <Button
                    type="button"
                    variant="danger"
                    icon={<AlertTriangle className="h-4 w-4" />}
                    onClick={() => setResetOpen(true)}
                  >
                    Reset all system data…
                  </Button>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      </PageBody>

      <Modal open={resetOpen} onClose={() => setResetOpen(false)} title="Reset all system data">
        <p className="mb-4 rounded-md border border-danger-border bg-danger-bg px-3 py-2.5 text-xs leading-relaxed text-danger">
          <b>Ugomba kwitondera  ikigikorwa cyangwa  ukabanza ukabaza system admin akagusobanurira   .</b> &nbsp;This action cannot be reversed. Before continuing, type{' '}
          <span className="font-mono font-bold">RESET</span> to confirm you understand that all users, data and audit
          logs will be permanently deleted.
        </p>
        <div>
          <Label htmlFor="reset-confirm-text" required>
            Type <span className="font-mono">RESET</span> to confirm
          </Label>
          <Input
            id="reset-confirm-text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type RESET to confirm"
            className={cn(canReset && 'ring-2 ring-danger/40')}
          />
          {confirmText.length > 0 && !canReset && (
            <FieldError message="Confirmation phrase does not match. Type RESET exactly." />
          )}
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="outline" onClick={() => setResetOpen(false)} disabled={resetMutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={!canReset}
            loading={resetMutation.isPending}
            icon={<AlertTriangle className="h-4 w-4" />}
            onClick={() => resetMutation.mutate()}
          >
            {resetMutation.isPending ? 'Resetting…' : 'Permanently delete everything'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

function FieldBox({
  label,
  hint,
  touched,
  textarea,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  touched: boolean;
  textarea?: boolean;
  value: string;
  onChange: (value: string) => void;
}) {
  const err = value.trim() === '' ? 'This field is required.' : textarea && value.length > 300 ? 'Too long.' : undefined;
  return (
    <div>
      <Label required>{label}</Label>
      {textarea ? (
        <Textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} />
      ) : (
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && !err && <p className="mt-1.5 text-[11px] leading-snug text-ink-3">{hint}</p>}
      {touched && err && <FieldError message={err} />}
    </div>
  );
}
