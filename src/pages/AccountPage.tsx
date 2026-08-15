import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Save } from 'lucide-react';
import { supabase } from '@/config/supabase';
import { PageBody, PageHeader, Panel } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Field, FieldError, FormRow, Input, Label } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { updateOwnProfile } from '@/services/profiles';
import { fetchDepartments } from '@/services/departments';
import type { Profile } from '@/types/domain';
import { useState } from 'react';

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(6, 'New password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your new password'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });

type PasswordValues = z.infer<typeof passwordSchema>;

export function ProfileBlock({ profile, departmentName }: { profile: Profile; departmentName?: string | null }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
      <Detail label="Full Name" value={profile.full_name} />
      <Detail label="Email" value={profile.email} />
      <Detail label="Department" value={departmentName ?? '—'} />
      <Detail label="Position" value={profile.position ?? '—'} />
      <Detail label="Employee Number" value={profile.employee_number ?? '—'} />
      <Detail label="Role" value={profile.role} />
      {profile.role === 'driver' && (
        <>
          <Detail label="License Number" value={profile.license_number ?? '—'} />
          <Detail label="License Expiry" value={profile.license_expiry ?? '—'} />
        </>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-ink-3">{label}</div>
      <div className="font-semibold text-ink">{value}</div>
    </div>
  );
}

export default function AccountPage() {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });
  const departmentName = departments.find((d) => d.id === profile?.department_id)?.name ?? null;

  const ownProfileMutation = useMutation({
    mutationFn: () => updateOwnProfile(profile!.id, { phone: phone || null }),
    onSuccess: async () => {
      await refreshProfile();
      toast.show('success', 'Profile updated');
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Update failed'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: PasswordValues) => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profile!.email,
        password: values.currentPassword,
      });
      if (signInError) throw new Error('Current password is incorrect');
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) throw error;
    },
    onSuccess: () => toast.show('success', 'Password updated successfully'),
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Password change failed'),
  });

  if (!profile) return null;

  return (
    <>
      <PageHeader title="My Account" description="Manage your profile and security settings" />
      <PageBody>
        <div className="max-w-xl space-y-5">
          <Panel title="My Profile" bodyClassName="p-5">
            <div className="mb-5">
              <ProfileBlock profile={profile} departmentName={departmentName} />
            </div>
            <Field>
              <Label htmlFor="account-phone">Phone</Label>
              <Input id="account-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+250 7XX XXX XXX" />
            </Field>
            <Button
              variant="navy"
              icon={<Save className="h-4 w-4" />}
              onClick={() => ownProfileMutation.mutate()}
              loading={ownProfileMutation.isPending}
            >
              Save Phone
            </Button>
          </Panel>

          <Panel title="Change Password" bodyClassName="p-5">
            <form noValidate onSubmit={handleSubmit((v) => changePasswordMutation.mutate(v))}>
              <Field>
                <Label htmlFor="current-password" required>
                  Current Password
                </Label>
                <Input id="current-password" type="password" autoComplete="current-password" {...register('currentPassword')} />
                <FieldError message={errors.currentPassword?.message} />
              </Field>
              <FormRow>
                <Field>
                  <Label htmlFor="new-password" required>
                    New Password
                  </Label>
                  <Input id="new-password" type="password" autoComplete="new-password" {...register('newPassword')} />
                  <FieldError message={errors.newPassword?.message} />
                </Field>
                <Field>
                  <Label htmlFor="confirm-password" required>
                    Confirm Password
                  </Label>
                  <Input id="confirm-password" type="password" autoComplete="new-password" {...register('confirmPassword')} />
                  <FieldError message={errors.confirmPassword?.message} />
                </Field>
              </FormRow>
              <Button
                type="submit"
                variant="navy"
                icon={<KeyRound className="h-4 w-4" />}
                loading={changePasswordMutation.isPending}
              >
                Update Password
              </Button>
            </form>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}