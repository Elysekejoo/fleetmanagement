import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, Pencil, Plus, Trash2 } from 'lucide-react';
import { adminResetPassword, createUser, fetchDrivers, setUserActive, updateUser } from '@/services/profiles';
import { fetchVehicles, assignVehicleDriver } from '@/services/vehicles';
import { fetchDepartments } from '@/services/departments';
import { DataTable, FilterSelect, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Field, FieldError, FormRow, Input, Label, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { fmtDate } from '@/lib/utils';
import type { Profile } from '@/types/domain';

const driverBaseSchema = z.object({
  fullName: z.string().min(2, 'Full name is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().optional(),
  employeeNumber: z.string().optional(),
  position: z.string().optional(),
  departmentId: z.string().min(1, 'Select a department'),
  licenseNumber: z.string().min(3, 'License number is required'),
  licenseCategory: z.string().min(1, 'License category is required'),
  licenseExpiry: z.string().min(1, 'License expiry is required'),
});

const driverSchema = driverBaseSchema.superRefine((v, ctx) => {
    if (v.licenseExpiry) {
      const date = new Date(v.licenseExpiry);
      if (!Number.isNaN(date.getTime()) && date < new Date()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['licenseExpiry'], message: 'License has already expired' });
      }
    }
  });

function driverFormSchema(isEdit: boolean) {
  return isEdit ? driverBaseSchema.omit({ email: true, password: true }) : driverSchema;
}

type DriverFormValues = z.infer<typeof driverSchema>;

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function DriversPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Profile | null>(null);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState<Profile | null>(null);
  const [removing, setRemoving] = useState<Profile | null>(null);

  const { data: drivers = [], isLoading, error, refetch } = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });
  const { data: departments = [] } = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['drivers'] });
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    void queryClient.invalidateQueries({ queryKey: ['users'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: DriverFormValues) => {
      if (editing) {
        await updateUser(editing.id, {
          fullName: values.fullName,
          phone: values.phone || null,
          role: 'driver',
          departmentId: values.departmentId || null,
          position: values.position || null,
          employeeNumber: values.employeeNumber || null,
          licenseNumber: values.licenseNumber,
          licenseCategory: values.licenseCategory,
          licenseExpiry: values.licenseExpiry,
        });
      } else {
        await createUser({
          fullName: values.fullName,
          email: values.email!,
          password: values.password!,
          phone: values.phone,
          role: 'driver',
          departmentId: values.departmentId || null,
          position: values.position || null,
          employeeNumber: values.employeeNumber || null,
          licenseNumber: values.licenseNumber,
          licenseCategory: values.licenseCategory,
          licenseExpiry: values.licenseExpiry,
        });
      }
    },
    onSuccess: () => {
      toast.show('success', editing ? 'Driver updated' : 'Driver account created');
      setEditing(null);
      setCreating(false);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Operation failed'),
  });

  const assignMutation = useMutation({
    mutationFn: ({ driverId, vehicleId }: { driverId: string; vehicleId: string }) =>
      assignVehicleDriver(vehicleId, driverId),
    onSuccess: () => {
      toast.show('success', 'Vehicle assignment updated');
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Assignment failed'),
  });

  const resetMutation = useMutation({
    mutationFn: (values: ResetPasswordValues) => adminResetPassword(resetting!.id, values.newPassword),
    onSuccess: () => {
      toast.show('success', 'Password reset successfully');
      setResetting(null);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Password reset failed'),
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const assignedVehicle = removing ? driverVehicles.get(removing.id) : undefined;
      if (assignedVehicle) {
        await assignVehicleDriver(assignedVehicle.id, null);
      }
      await setUserActive(removing!.id, false);
    },
    onSuccess: () => {
      toast.show('success', removing?.is_active ? 'Driver deactivated and vehicle unassigned' : 'Driver re-activated');
      setRemoving(null);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Operation failed'),
  });

  const departmentName = useMemo(() => {
    const map = new Map(departments.map((d) => [d.id, d.name]));
    return (id: string | null | undefined) => (id ? map.get(id) ?? '—' : '—');
  }, [departments]);

  const driverVehicles = useMemo(() => {
    const map = new Map<string, (typeof vehicles)[number]>();
    for (const v of vehicles) {
      if (v.current_driver_id) map.set(v.current_driver_id, v);
    }
    return map;
  }, [vehicles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return drivers.filter(
      (d) =>
        (!statusFilter || (statusFilter === 'active' && d.is_active) || (statusFilter === 'inactive' && !d.is_active)) &&
        (!q ||
          d.full_name.toLowerCase().includes(q) ||
          (d.license_number ?? '').toLowerCase().includes(q) ||
          (d.employee_number ?? '').toLowerCase().includes(q)),
    );
  }, [drivers, search, statusFilter]);

  const columns: Column<Profile>[] = [
    {
      key: 'name',
      header: 'Driver',
      render: (d) => {
        const vehicle = driverVehicles.get(d.id);
        return (
          <div>
            <div className="font-semibold text-ink">{d.full_name}</div>
            <div className="text-[11px] text-ink-3">
              {d.employee_number ?? ''}
              {vehicle ? ` · ${vehicle.registration_number}` : ''}
            </div>
          </div>
        );
      },
    },
    { key: 'phone', header: 'Phone', render: (d) => <span className="font-mono text-xs">{d.phone ?? '—'}</span> },
    { key: 'license', header: 'License', render: (d) => <span className="font-mono text-xs">{d.license_number ?? '—'}</span> },
    {
      key: 'category',
      header: 'Category',
      render: (d) => d.license_category ?? '—',
    },
    {
      key: 'department',
      header: 'Department',
      render: (d) => <span className="text-xs">{departmentName(d.department_id)}</span>,
    },
    {
      key: 'expiry',
      header: 'License Expiry',
      render: (d) => {
        const expired = d.license_expiry ? new Date(d.license_expiry) < new Date() : false;
        return (
          <span className={expired ? 'font-semibold text-danger' : ''}>
            {d.license_expiry ? `${fmtDate(d.license_expiry)}${expired ? ' (expired)' : ''}` : '—'}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => <StatusBadge tone={d.is_active ? 'available' : 'inactive'} label={d.is_active ? 'Active' : 'Inactive'} />,
    },
    {
      key: 'vehicle',
      header: 'Assigned Vehicle',
      render: (d) => {
        const vehicle = driverVehicles.get(d.id);
        return (
          <select
            className="w-36 cursor-pointer rounded border-[1.5px] border-line bg-bg px-2 py-1 text-xs text-ink outline-none focus:border-blue"
            value={vehicle?.id ?? ''}
            disabled={!d.is_active}
            onChange={(e) => {
              if (!e.target.value) return;
              assignMutation.mutate({ driverId: d.id, vehicleId: e.target.value });
            }}
            aria-label={`Assign vehicle to ${d.full_name}`}
          >
            <option value="">— none —</option>
            {vehicles
              .filter((v) => !v.current_driver_id || v.current_driver_id === d.id || d.id === v.current_driver_id)
              .filter((v) => v.status !== 'inactive')
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration_number} — {v.make} {v.model}
                </option>
              ))}
          </select>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-blue"
            title="Edit driver"
            aria-label={`Edit ${d.full_name}`}
            onClick={() => {
              setEditing(d);
              setCreating(false);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-gold"
            title="Reset password"
            aria-label={`Reset password for ${d.full_name}`}
            onClick={() => setResetting(d)}
          >
            <KeyRound className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-danger"
            title={d.is_active ? 'Remove driver' : 'Re-activate driver'}
            aria-label={`${d.is_active ? 'Remove' : 'Re-activate'} ${d.full_name}`}
            onClick={() => setRemoving(d)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Driver Management"
        description="Register drivers, assign vehicles and manage licences"
        actions={
          <Button variant="navy" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Add Driver
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
          searchPlaceholder="Search driver, licence…"
          searchValue={search}
          onSearchChange={setSearch}
          filters={
            <FilterSelect
              label="All Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          }
          rowKey={(d) => d.id}
          emptyTitle="No drivers registered"
          emptyMessage="Add your first driver to start assigning trips."
        />

        {(creating || editing) && (
          <DriverModal
            driver={editing}
            departments={departments}
            submitting={saveMutation.isPending}
            onClose={() => {
              setCreating(false);
              setEditing(null);
            }}
            onSubmit={(values) => saveMutation.mutate(values)}
          />
        )}

        <ResetPasswordModal
          driver={resetting}
          submitting={resetMutation.isPending}
          onClose={() => setResetting(null)}
          onSubmit={(values) => resetMutation.mutate(values)}
        />

        <ConfirmDialog
          open={Boolean(removing)}
          title={removing?.is_active ? 'Remove driver?' : 'Re-activate driver?'}
          message={
            removing?.is_active
              ? `Deactivate ${removing?.full_name} and unassign their vehicle? They will not be able to sign in.`
              : `Re-activate ${removing?.full_name}? They will be able to sign in again.`
          }
          confirmLabel={removing?.is_active ? 'Remove Driver' : 'Re-activate'}
          danger={Boolean(removing?.is_active)}
          loading={removeMutation.isPending}
          onClose={() => setRemoving(null)}
          onConfirm={() => removeMutation.mutate()}
        />
      </PageBody>
    </>
  );
}

function DriverModal({
  driver,
  departments,
  submitting,
  onClose,
  onSubmit,
}: {
  driver: Profile | null;
  departments: Array<{ id: string; name: string }>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: DriverFormValues) => void;
}) {
  const isEdit = Boolean(driver);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema(isEdit)),
    defaultValues: {
      fullName: driver?.full_name ?? '',
      email: driver?.email ?? '',
      password: '',
      phone: driver?.phone ?? '',
      employeeNumber: driver?.employee_number ?? '',
      position: driver?.position ?? '',
      departmentId: driver?.department_id ?? departments[0]?.id ?? '',
      licenseNumber: driver?.license_number ?? '',
      licenseCategory: driver?.license_category ?? '',
      licenseExpiry: driver?.license_expiry ?? '',
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit Driver' : 'Add Driver'}
      subtitle={isEdit ? driver!.email : 'Creates a sign-in account for the driver'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="navy" onClick={handleSubmit(onSubmit)} loading={submitting}>
            {isEdit ? 'Save Changes' : 'Create Driver'}
          </Button>
        </>
      }
    >
      <form noValidate>
        <FormRow>
          <Field>
            <Label htmlFor="driver-name" required>
              Full Name
            </Label>
            <Input id="driver-name" placeholder="e.g. Patrick Habimana" {...register('fullName')} />
            <FieldError message={errors.fullName?.message} />
          </Field>
          <Field>
            <Label htmlFor="driver-email" required>
              Email
            </Label>
            <Input
              id="driver-email"
              type="email"
              placeholder="driver@msh.rw"
              disabled={isEdit}
              {...register('email')}
            />
            <FieldError message={errors.email?.message} />
          </Field>
        </FormRow>
        {!isEdit && (
          <Field>
            <Label htmlFor="driver-password" required>
              Temporary Password
            </Label>
            <Input id="driver-password" type="text" placeholder="Minimum 6 characters" {...register('password')} />
            <FieldError message={errors.password?.message} />
          </Field>
        )}
        <FormRow>
          <Field>
            <Label htmlFor="driver-phone">Phone</Label>
            <Input id="driver-phone" placeholder="+250 7XX XXX XXX" {...register('phone')} />
          </Field>
          <Field>
            <Label htmlFor="driver-employee-no">Employee Number</Label>
            <Input id="driver-employee-no" placeholder="e.g. MSH-007" {...register('employeeNumber')} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label htmlFor="driver-position">Position</Label>
            <Input id="driver-position" placeholder="e.g. Driver I" {...register('position')} />
          </Field>
          <Field>
            <Label htmlFor="driver-department" required>
              Department
            </Label>
            <Select id="driver-department" {...register('departmentId')}>
              <option value="">— select —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
            <FieldError message={errors.departmentId?.message} />
          </Field>
        </FormRow>
        <FormRow cols={3}>
          <Field>
            <Label htmlFor="driver-license-no" required>
              License Number
            </Label>
            <Input id="driver-license-no" placeholder="e.g. PC-2007-334512" {...register('licenseNumber')} />
            <FieldError message={errors.licenseNumber?.message} />
          </Field>
          <Field>
            <Label htmlFor="driver-license-cat" required>
              Category
            </Label>
            <Input id="driver-license-cat" placeholder="e.g. B, C1" {...register('licenseCategory')} />
            <FieldError message={errors.licenseCategory?.message} />
          </Field>
          <Field>
            <Label htmlFor="driver-license-exp" required>
              Expiry Date
            </Label>
            <Input id="driver-license-exp" type="date" {...register('licenseExpiry')} />
            <FieldError message={errors.licenseExpiry?.message} />
          </Field>
        </FormRow>
      </form>
    </Modal>
  );
}

function ResetPasswordModal({
  driver,
  submitting,
  onClose,
  onSubmit,
}: {
  driver: Profile | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: ResetPasswordValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema) });

  return (
    <Modal
      open={Boolean(driver)}
      onClose={onClose}
      title="Reset Password"
      subtitle={driver ? `New sign-in credentials for ${driver.full_name}` : undefined}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="gold" icon={<KeyRound className="h-4 w-4" />} onClick={handleSubmit(onSubmit)} loading={submitting}>
            Reset Password
          </Button>
        </>
      }
    >
      <form noValidate>
        <Field>
          <Label htmlFor="reset-password" required>
            New Password
          </Label>
          <Input id="reset-password" type="text" placeholder="Minimum 6 characters" {...register('newPassword')} />
          <FieldError message={errors.newPassword?.message} />
        </Field>
      </form>
    </Modal>
  );
}