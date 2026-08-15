import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, UserRound, UserRoundX } from 'lucide-react';
import { fetchProfiles, createUser, updateUser, setUserActive, adminChangeUserEmail } from '@/services/profiles';
import { fetchDepartments } from '@/services/departments';
import { DataTable, FilterSelect, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Field, FieldError, FormRow, Input, Label, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useAuth } from '@/features/auth/AuthContext';
import type { Profile, UserRole } from '@/types/domain';

const userSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  role: z.enum(['admin', 'employee', 'driver']),
  departmentId: z.string().optional(),
  position: z.string().optional(),
  employeeNumber: z.string().optional(),
  licenseNumber: z.string().optional(),
  licenseCategory: z.string().optional(),
  licenseExpiry: z.string().optional(),
});

function userFormSchema(isEdit: boolean) {
  return isEdit ? userSchema.omit({ password: true }) : userSchema;
}

type UserFormValues = z.infer<typeof userSchema>;

const roleOptions: Array<{ value: UserRole; label: string }> = [
  { value: 'admin', label: 'Administrator' },
  { value: 'employee', label: 'Employee' },
  { value: 'driver', label: 'Driver' },
];

export default function UsersPage() {
  const { profile: currentUser } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<Profile | null>(null);

  const { data: users = [], isLoading, error, refetch } = useQuery({ queryKey: ['users'], queryFn: fetchProfiles });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });

  const departmentName = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of departments) map.set(d.id, d.name);
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [departments]);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['users'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['drivers'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (editing) {
        const emailChanged = values.email.trim().toLowerCase() !== editing.email.trim().toLowerCase();
        if (emailChanged) {
          await adminChangeUserEmail(editing.id, values.email.trim());
        }
        await updateUser(editing.id, {
          fullName: values.fullName,
          phone: values.phone || null,
          role: values.role,
          departmentId: values.departmentId || null,
          position: values.position || null,
          employeeNumber: values.employeeNumber || null,
          licenseNumber: values.licenseNumber || null,
          licenseCategory: values.licenseCategory || null,
          licenseExpiry: values.licenseExpiry || null,
        });
      } else {
        await createUser({
          fullName: values.fullName,
          email: values.email!,
          password: values.password!,
          phone: values.phone,
          role: values.role,
          departmentId: values.departmentId || null,
          position: values.position,
          employeeNumber: values.employeeNumber,
          licenseNumber: values.licenseNumber,
          licenseCategory: values.licenseCategory,
          licenseExpiry: values.licenseExpiry,
        });
      }
    },
    onSuccess: () => {
      toast.show('success', editing ? 'User details updated' : 'User account created');
      setEditing(null);
      setCreating(false);
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to save the user. Please try again.')),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: () => setUserActive(deactivating!.id, !deactivating!.is_active),
    onSuccess: () => {
      toast.show('success', deactivating?.is_active ? 'User deactivated' : 'User activated');
      setDeactivating(null);
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to update this user. Please try again.')),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        u.full_name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (departmentName(u.department_id) ?? '').toLowerCase().includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter, departmentName]);

  const columns: Column<Profile>[] = [
    { key: 'id', header: 'ID', render: (u) => <span className="font-mono text-xs">{u.id.slice(0, 8)}</span> },
    {
      key: 'name',
      header: 'Name',
      render: (u) => (
        <div>
          <div className="font-semibold text-ink">{u.full_name}</div>
          <div className="text-[11px] text-ink-3">{u.position ?? '—'}</div>
        </div>
      ),
    },
    { key: 'email', header: 'Email', render: (u) => <span className="font-mono text-xs">{u.email}</span> },
    { key: 'department', header: 'Department', render: (u) => departmentName(u.department_id) ?? '—' },
    {
      key: 'role',
      header: 'Role',
      render: (u) => <StatusBadge tone={u.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => <StatusBadge tone={u.is_active ? 'available' : 'inactive'} label={u.is_active ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (u) => (
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-ink"
            title="Edit user"
            aria-label={`Edit ${u.full_name}`}
            onClick={() => setEditing(u)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {u.id !== currentUser?.id && (
            <button
              className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-danger"
              title={u.is_active ? 'Deactivate user' : 'Activate user'}
              aria-label={`${u.is_active ? 'Deactivate' : 'Activate'} ${u.full_name}`}
              onClick={() => setDeactivating(u)}
            >
              {u.is_active ? <UserRoundX className="h-3.5 w-3.5" /> : <UserRound className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="User Management"
        description="Employees and system users"
        actions={
          <Button
            variant="navy"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            Add User
          </Button>
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          searchPlaceholder="Search name, email, department…"
          searchValue={search}
          onSearchChange={setSearch}
          rowKey={(u) => u.id}
          emptyTitle="No users found"
          filters={
            <FilterSelect label="All Roles" value={roleFilter} onChange={setRoleFilter} options={roleOptions} />
          }
        />
      </PageBody>

      {(creating || editing) && (
        <UserFormModal
          user={editing}
          departments={departments}
          submitting={saveMutation.isPending}
          onSubmit={(values) => saveMutation.mutate(values)}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deactivating)}
        title={deactivating?.is_active ? 'Deactivate User' : 'Activate User'}
        message={
          deactivating?.is_active
            ? `${deactivating.full_name} will no longer be able to sign in. Operational history is preserved.`
            : `${deactivating?.full_name} will regain access to the system.`
        }
        confirmLabel={deactivating?.is_active ? 'Deactivate' : 'Activate'}
        danger={Boolean(deactivating?.is_active)}
        loading={toggleActiveMutation.isPending}
        onConfirm={() => toggleActiveMutation.mutate()}
        onClose={() => setDeactivating(null)}
      />
    </>
  );
}

const emptyForm: UserFormValues = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  role: 'employee',
  departmentId: '',
  position: '',
  employeeNumber: '',
  licenseNumber: '',
  licenseCategory: '',
  licenseExpiry: '',
};

function UserFormModal({
  user,
  departments,
  submitting,
  onSubmit,
  onClose,
}: {
  user: Profile | null;
  departments: Array<{ id: string; name: string }>;
  submitting: boolean;
  onSubmit: (values: UserFormValues) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema(Boolean(user))),
    defaultValues: user
      ? {
          fullName: user.full_name,
          email: user.email,
          password: '',
          phone: user.phone ?? '',
          role: user.role,
          departmentId: user.department_id ?? '',
          position: user.position ?? '',
          employeeNumber: user.employee_number ?? '',
          licenseNumber: user.license_number ?? '',
          licenseCategory: user.license_category ?? '',
          licenseExpiry: user.license_expiry ?? '',
        }
      : emptyForm,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={user ? `Edit User — ${user.full_name}` : 'Add User / Employee'}
      subtitle={user ? undefined : 'Set login credentials — the user can change their password after signing in'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="navy" onClick={handleSubmit(onSubmit)} loading={submitting}>
            {user ? 'Save Changes' : 'Create Account'}
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormRow>
          <Field>
            <Label required>Full Name</Label>
            <Input placeholder="Full name" {...register('fullName')} />
            <FieldError message={errors.fullName?.message} />
          </Field>
          <Field>
            <Label required>Email Address</Label>
            <Input type="email" placeholder="name@msh.rw" {...register('email')} />
            <FieldError message={errors.email?.message} />
            {user && (
              <p className="mt-1.5 text-[11px] leading-snug text-ink-3">
                Changing the email also updates the sign-in address for this user.
              </p>
            )}
          </Field>
        </FormRow>
        {!user && (
          <Field>
            <Label required>Password</Label>
            <Input type="password" placeholder="Min 6 characters" {...register('password')} />
            <FieldError message={errors.password?.message} />
          </Field>
        )}
        <FormRow>
          <Field>
            <Label>Department</Label>
            <Select {...register('departmentId')}>
              <option value="">— Select —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Position / Title</Label>
            <Input placeholder="e.g. Field Officer" {...register('position')} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label required>System Role</Label>
            <Select {...register('role')}>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Phone</Label>
            <Input placeholder="+250 7XX XXX XXX" {...register('phone')} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label>Employee Number</Label>
            <Input placeholder="e.g. EMP-0012" {...register('employeeNumber')} />
          </Field>
          <Field>
            <Label>License Number</Label>
            <Input placeholder="RW-DL-XXXXX" {...register('licenseNumber')} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label>License Category</Label>
            <Select {...register('licenseCategory')}>
              <option value="">— None —</option>
              <option>B — Light vehicles</option>
              <option>C — Heavy vehicles</option>
              <option>D — Passenger transport</option>
              <option>E — Articulated vehicles</option>
            </Select>
          </Field>
          <Field>
            <Label>License Expiry</Label>
            <Input type="date" {...register('licenseExpiry')} />
          </Field>
        </FormRow>
      </form>
    </Modal>
  );
}