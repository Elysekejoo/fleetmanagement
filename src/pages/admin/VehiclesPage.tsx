import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { fetchVehicles, createVehicle, updateVehicle, deleteVehicle, assignVehicleDriver } from '@/services/vehicles';
import { fetchDrivers } from '@/services/profiles';
import { DataTable, FilterSelect, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { Field, FieldError, FormRow, Input, Label, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { fmtNumber } from '@/lib/utils';
import type { Vehicle } from '@/types/domain';

const vehicleSchema = z.object({
  registrationNumber: z.string().min(2, 'Registration number is required'),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().int().min(1990, 'Invalid year').max(2035, 'Invalid year'),
  vehicleType: z.string().min(1, 'Vehicle type is required'),
  color: z.string().optional(),
  gpsDeviceId: z.string().optional(),
  odometer: z.coerce.number().min(0, 'Odometer cannot be negative'),
  nextServiceKm: z.coerce.number().min(1, 'Next service is required'),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

const blankForm: VehicleFormValues = {
  registrationNumber: '',
  make: '',
  model: '',
  year: new Date().getFullYear(),
  vehicleType: '4WD / SUV',
  color: '',
  gpsDeviceId: '',
  odometer: 0,
  nextServiceKm: 10000,
};

const vehicleTypes = ['4WD / SUV', 'Sedan', 'Pickup / Truck', 'Minibus', 'Motorcycle', 'Van'];

const statusTone: Record<Vehicle['status'], StatusTone> = {
  available: 'available',
  assigned: 'assigned',
  on_trip: 'on_trip',
  maintenance: 'maintenance',
  inactive: 'inactive',
};

export default function VehiclesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);

  const { data: vehicles = [], isLoading, error, refetch } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    void queryClient.invalidateQueries({ queryKey: ['gps-locations'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: VehicleFormValues) =>
      editing
        ? updateVehicle(editing.id, values)
        : createVehicle(values).then(() => undefined),
    onSuccess: () => {
      toast.show('success', editing ? `Vehicle ${editing.registration_number} updated` : 'Vehicle registered');
      setEditing(null);
      setCreating(false);
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to complete this action. Please try again.')),
  });

  const assignMutation = useMutation({
    mutationFn: ({ vehicleId, driverId }: { vehicleId: string; driverId: string }) =>
      assignVehicleDriver(vehicleId, driverId || null),
    onSuccess: () => {
      toast.show('success', 'Vehicle assignment updated');
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to complete this action. Please try again.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteVehicle(deleting!.id),
    onSuccess: () => {
      toast.show('success', 'Vehicle removed');
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to complete this action. Please try again.')),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return vehicles.filter((v) => {
      const matchesSearch =
        !q ||
        v.registration_number.toLowerCase().includes(q) ||
        `${v.make} ${v.model}`.toLowerCase().includes(q) ||
        (v.gps_device_id ?? '').toLowerCase().includes(q);
      return matchesSearch && (!statusFilter || v.status === statusFilter);
    });
  }, [vehicles, search, statusFilter]);

  const columns: Column<Vehicle>[] = [
    { key: 'plate', header: 'Registration', render: (v) => <span className="font-bold text-ink">{v.registration_number}</span> },
    { key: 'vehicle', header: 'Make / Model', render: (v) => `${v.make} ${v.model}` },
    { key: 'year', header: 'Year', render: (v) => v.year },
    { key: 'type', header: 'Type', render: (v) => v.vehicle_type },
    { key: 'gps', header: 'GPS Device', render: (v) => <span className="font-mono text-xs">{v.gps_device_id ?? '—'}</span> },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge tone={statusTone[v.status]} /> },
    {
      key: 'driver',
      header: 'Driver',
      render: (v) => {
        const current = drivers.find((d) => d.id === v.current_driver_id);
        return (
          <div className="flex items-center gap-2">
            <span className={current ? 'text-ink' : 'text-ink-3'}>{current?.full_name ?? 'Unassigned'}</span>
            <Select
              aria-label={`Assign driver to ${v.registration_number}`}
              value={v.current_driver_id ?? ''}
              onChange={(e) => assignMutation.mutate({ vehicleId: v.id, driverId: e.target.value })}
              className="max-w-[150px] py-1 text-xs"
            >
              <option value="">— Unassigned —</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </Select>
          </div>
        );
      },
    },
    {
      key: 'odometer',
      header: 'Odometer',
      render: (v) => {
        const due = v.odometer >= v.next_service_km;
        return (
          <div>
            <div className="font-mono text-xs">{fmtNumber(v.odometer)} km</div>
            {due && <div className="text-[10px] font-bold uppercase text-danger">Service due</div>}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (v) => (
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-ink"
            title="Edit vehicle"
            aria-label={`Edit vehicle ${v.registration_number}`}
            onClick={() => setEditing(v)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-danger"
            title="Delete vehicle"
            aria-label={`Delete vehicle ${v.registration_number}`}
            onClick={() => setDeleting(v)}
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
        title="Vehicle Registry"
        description="Fleet inventory and assignment"
        actions={
          <Button
            variant="navy"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            Register Vehicle
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
          searchPlaceholder="Search registration, model, GPS…"
          searchValue={search}
          onSearchChange={setSearch}
          rowKey={(v) => v.id}
          emptyTitle="No vehicles found"
          filters={
            <FilterSelect
              label="All Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'on_trip', label: 'On Trip' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          }
        />
      </PageBody>

      {(creating || editing) && (
        <VehicleFormModal
          vehicle={editing}
          submitting={saveMutation.isPending}
          onSubmit={(values) => saveMutation.mutate(values)}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Vehicle"
        message={`Remove ${deleting?.registration_number} — ${deleting?.make} ${deleting?.model} from the fleet registry? Associated history is preserved.`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function VehicleFormModal({
  vehicle,
  submitting,
  onSubmit,
  onClose,
}: {
  vehicle: Vehicle | null;
  submitting: boolean;
  onSubmit: (values: VehicleFormValues) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle
      ? {
          registrationNumber: vehicle.registration_number,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          vehicleType: vehicle.vehicle_type,
          color: vehicle.color ?? '',
          gpsDeviceId: vehicle.gps_device_id ?? '',
          odometer: vehicle.odometer,
          nextServiceKm: vehicle.next_service_km,
        }
      : blankForm,
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={vehicle ? `Edit Vehicle — ${vehicle.registration_number}` : 'Register New Vehicle'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="navy" onClick={handleSubmit(onSubmit)} loading={submitting}>
            Save Vehicle
          </Button>
        </>
      }
    >
      <form noValidate onSubmit={handleSubmit(onSubmit)}>
        <FormRow>
          <Field>
            <Label required>Registration Number</Label>
            <Input placeholder="e.g. RAB 123 A" {...register('registrationNumber')} />
            <FieldError message={errors.registrationNumber?.message} />
          </Field>
          <Field>
            <Label required>Make (Brand)</Label>
            <Input placeholder="e.g. Toyota" {...register('make')} />
            <FieldError message={errors.make?.message} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label required>Model</Label>
            <Input placeholder="e.g. Land Cruiser 200" {...register('model')} />
            <FieldError message={errors.model?.message} />
          </Field>
          <Field>
            <Label required>Year</Label>
            <Input type="number" placeholder="2023" {...register('year')} />
            <FieldError message={errors.year?.message} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label required>Vehicle Type</Label>
            <Select {...register('vehicleType')}>
              {vehicleTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label>Color</Label>
            <Input placeholder="e.g. White" {...register('color')} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label required>Current Mileage (km)</Label>
            <Input type="number" placeholder="45000" {...register('odometer')} />
            <FieldError message={errors.odometer?.message} />
          </Field>
          <Field>
            <Label required>Next Service (km)</Label>
            <Input type="number" placeholder="50000" {...register('nextServiceKm')} />
            <FieldError message={errors.nextServiceKm?.message} />
          </Field>
        </FormRow>
        <Field>
          <Label>GPS Tracker ID</Label>
          <Input placeholder="e.g. TRK-001" {...register('gpsDeviceId')} />
          <p className="mt-1 text-[11px] text-ink-3">Device identifier of the installed GPS tracker.</p>
        </Field>
      </form>
    </Modal>
  );
}