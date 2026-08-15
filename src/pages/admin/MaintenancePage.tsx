import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2, Wrench } from 'lucide-react';
import { fetchMaintenanceRecords, createMaintenanceRecord, deleteMaintenanceRecord } from '@/services/maintenance';
import { fetchVehicles } from '@/services/vehicles';
import { DataTable, FilterSelect, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader, StatCard } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Field, FieldError, FormRow, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useAuth } from '@/features/auth/AuthContext';
import { fmtDate, fmtRwf, monthStartIso, todayIso } from '@/lib/utils';
import type { MaintenanceRecordWithRelations } from '@/types/domain';

const maintSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  serviceType: z.string().min(1, 'Service type is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  odometer: z.coerce.number().min(0, 'Odometer is required'),
  cost: z.coerce.number().min(0, 'Cost is required'),
  provider: z.string().optional(),
  nextServiceDate: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed']),
  notes: z.string().optional(),
});

type MaintFormValues = z.infer<typeof maintSchema>;

const serviceTypes = [
  'Oil Change',
  'Tyre Replacement',
  'Brake Service',
  'Full Service',
  'Electrical Repair',
  'Bodywork',
  'Battery Replacement',
  'Engine Repair',
  'Other',
];

export default function MaintenancePage() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<MaintenanceRecordWithRelations | null>(null);

  const { data: records = [], isLoading, error, refetch } = useQuery({
    queryKey: ['maintenance'],
    queryFn: fetchMaintenanceRecords,
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: MaintFormValues) => createMaintenanceRecord(values, profile!.id),
    onSuccess: () => {
      toast.show('success', 'Maintenance record saved and vehicle marked for service');
      setOpen(false);
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to save the maintenance record. Please try again.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMaintenanceRecord(deleting!.id),
    onSuccess: () => {
      toast.show('success', 'Maintenance record deleted');
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to save the maintenance record. Please try again.')),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      const matchesSearch =
        !q ||
        (r.vehicle?.registration_number ?? '').toLowerCase().includes(q) ||
        r.service_type.toLowerCase().includes(q) ||
        (r.provider ?? '').toLowerCase().includes(q);
      return matchesSearch && (!vehicleFilter || r.vehicle_id === vehicleFilter);
    });
  }, [records, search, vehicleFilter]);

  const monthStart = monthStartIso();
  const quarterCost = records.filter((r) => r.date >= monthStart).reduce((acc, r) => acc + r.cost, 0);
  const totalCost = records.reduce((acc, r) => acc + r.cost, 0);
  const overdue = vehicles.filter((v) => v.status === 'maintenance').length;

  const columns: Column<MaintenanceRecordWithRelations>[] = [
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (r) => <span className="font-mono text-xs font-semibold">{r.vehicle?.registration_number ?? '—'}</span>,
    },
    { key: 'service', header: 'Service Type', render: (r) => r.service_type },
    { key: 'cost', header: 'Cost (RWF)', render: (r) => <span className="font-mono text-xs">{fmtRwf(r.cost)}</span> },
    { key: 'provider', header: 'Provider', render: (r) => r.provider ?? '—' },
    { key: 'next', header: 'Next Due', render: (r) => fmtDate(r.next_service_date) },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge tone={r.status as 'in_progress'} label={r.status.replace('_', ' ')} /> },
    { key: 'notes', header: 'Notes', render: (r) => <span className="text-xs">{r.notes ?? '—'}</span> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-danger"
          title="Delete record"
          aria-label="Delete maintenance record"
          onClick={() => setDeleting(r)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Maintenance Management"
        description="Track service records per vehicle"
        actions={
          <Button variant="navy" icon={<Wrench className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Log Service
          </Button>
        }
      />
      <PageBody>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Maintenance This Month" value={fmtRwf(quarterCost)} sub="all vehicles" tone="gold" />
          <StatCard label="All-Time Cost" value={fmtRwf(totalCost)} sub={`${records.length} records`} tone="blue" />
          <StatCard label="Vehicles in Service" value={overdue} sub="under maintenance" tone="red" />
          <StatCard label="Records" value={records.length} sub="logged services" tone="green" />
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          searchPlaceholder="Search vehicle, service, provider…"
          searchValue={search}
          onSearchChange={setSearch}
          rowKey={(r) => r.id}
          emptyTitle="No maintenance records"
          filters={
            <FilterSelect
              label="All Vehicles"
              value={vehicleFilter}
              onChange={setVehicleFilter}
              options={vehicles.map((v) => ({ value: v.id, label: v.registration_number }))}
            />
          }
        />
      </PageBody>

      {open && (
        <MaintModal
          vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.registration_number} — ${v.make} ${v.model}` }))}
          submitting={saveMutation.isPending}
          onSubmit={(values) => saveMutation.mutate(values)}
          onClose={() => setOpen(false)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Maintenance Record"
        message={`Delete the ${deleting?.service_type} record for ${deleting?.vehicle?.registration_number}?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function MaintModal({
  vehicles,
  submitting,
  onSubmit,
  onClose,
}: {
  vehicles: Array<{ id: string; label: string }>;
  submitting: boolean;
  onSubmit: (values: MaintFormValues) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MaintFormValues>({
    resolver: zodResolver(maintSchema),
    defaultValues: {
      vehicleId: vehicles[0]?.id ?? '',
      serviceType: 'Full Service',
      description: '',
      date: todayIso(),
      odometer: 0,
      cost: 0,
      provider: '',
      nextServiceDate: '',
      status: 'completed',
      notes: '',
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Log Maintenance / Service"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="navy" onClick={handleSubmit(onSubmit)} loading={submitting}>
            Save Record
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormRow>
          <Field>
            <Label required>Vehicle</Label>
            <Select {...register('vehicleId')}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </Select>
            <FieldError message={errors.vehicleId?.message} />
          </Field>
          <Field>
            <Label required>Service Date</Label>
            <Input type="date" {...register('date')} />
            <FieldError message={errors.date?.message} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label required>Service Type</Label>
            <Select {...register('serviceType')}>
              {serviceTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label required>Cost (RWF)</Label>
            <Input type="number" min={0} placeholder="120000" {...register('cost')} />
            <FieldError message={errors.cost?.message} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label>Odometer (km)</Label>
            <Input type="number" min={0} placeholder="47500" {...register('odometer')} />
            <FieldError message={errors.odometer?.message} />
          </Field>
          <Field>
            <Label>Service Provider</Label>
            <Input placeholder="e.g. Kigali Auto Centre" {...register('provider')} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label>Next Service Due</Label>
            <Input type="date" {...register('nextServiceDate')} />
          </Field>
          <Field>
            <Label>Work Status</Label>
            <Select {...register('status')}>
              <option value="scheduled">Scheduled</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </Select>
          </Field>
        </FormRow>
        <Field>
          <Label>Description</Label>
          <Textarea rows={2} placeholder="Describe the work performed…" {...register('description')} />
        </Field>
        <Field>
          <Label>Notes</Label>
          <Textarea rows={2} {...register('notes')} />
        </Field>
      </form>
    </Modal>
  );
}