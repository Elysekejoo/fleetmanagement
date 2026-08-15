import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fuel, Trash2 } from 'lucide-react';
import { fetchFuelRecords, createFuelRecord, deleteFuelRecord } from '@/services/fuel';
import { fetchVehicles } from '@/services/vehicles';
import { DataTable, FilterSelect, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader, StatCard } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, FieldError, FormRow, Input, Label, Select } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { fmtDate, fmtRwf, monthStartIso, todayIso } from '@/lib/utils';
import type { FuelRecordWithRelations } from '@/types/domain';

const fuelSchema = z.object({
  vehicleId: z.string().min(1, 'Select a vehicle'),
  date: z.string().min(1, 'Date is required'),
  fuelType: z.string().min(1, 'Fuel type is required'),
  quantity: z.coerce.number().min(1, 'Quantity is required'),
  unitPrice: z.coerce.number().min(1, 'Unit price is required'),
  odometer: z.coerce.number().min(0, 'Odometer is required'),
  station: z.string().min(2, 'Station is required'),
  receiptNumber: z.string().optional(),
});

type FuelFormValues = z.infer<typeof fuelSchema>;

export default function FuelPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<FuelRecordWithRelations | null>(null);

  const { data: records = [], isLoading, error, refetch } = useQuery({ queryKey: ['fuel'], queryFn: fetchFuelRecords });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['fuel'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const saveMutation = useMutation({
    mutationFn: (values: FuelFormValues) => createFuelRecord(values, profile!.id),
    onSuccess: () => {
      toast.show('success', 'Fuel record saved');
      setOpen(false);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Operation failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteFuelRecord(deleting!.id),
    onSuccess: () => {
      toast.show('success', 'Fuel record deleted');
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Operation failed'),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return records.filter((r) => {
      const matchesSearch =
        !q ||
        (r.vehicle?.registration_number ?? '').toLowerCase().includes(q) ||
        r.station.toLowerCase().includes(q) ||
        (r.receipt_number ?? '').toLowerCase().includes(q);
      return matchesSearch && (!vehicleFilter || r.vehicle_id === vehicleFilter);
    });
  }, [records, search, vehicleFilter]);

  const monthStart = monthStartIso();
  const thisMonth = records.filter((r) => r.date >= monthStart);
  const monthLitres = thisMonth.reduce((acc, r) => acc + r.quantity, 0);
  const monthCost = thisMonth.reduce((acc, r) => acc + r.total_cost, 0);
  const totalCost = records.reduce((acc, r) => acc + r.total_cost, 0);

  const columns: Column<FuelRecordWithRelations>[] = [
    { key: 'date', header: 'Date', render: (r) => fmtDate(r.date) },
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (r) => <span className="font-mono text-xs font-semibold">{r.vehicle?.registration_number ?? '—'}</span>,
    },
    { key: 'fuel', header: 'Fuel', render: (r) => <span className="uppercase">{r.fuel_type}</span> },
    { key: 'quantity', header: 'Litres', render: (r) => <span className="font-mono text-xs">{r.quantity} L</span> },
    { key: 'cost', header: 'Total Cost', render: (r) => <span className="font-mono text-xs">{fmtRwf(r.total_cost)}</span> },
    { key: 'odometer', header: 'Odometer', render: (r) => <span className="font-mono text-xs">{r.odometer.toLocaleString()} km</span> },
    { key: 'station', header: 'Station', render: (r) => r.station },
    { key: 'by', header: 'Recorded By', render: (r) => r.recordedByProfile?.full_name ?? '—' },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <button
          className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-danger"
          title="Delete record"
          aria-label="Delete fuel record"
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
        title="Fuel Management"
        description="Track operational fuel costs per vehicle"
        actions={
          <Button variant="navy" icon={<Fuel className="h-4 w-4" />} onClick={() => setOpen(true)}>
            Log Fuel
          </Button>
        }
      />
      <PageBody>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Fuel This Month" value={`${monthLitres.toLocaleString()} L`} sub="all vehicles" tone="blue" />
          <StatCard label="Fuel Cost (RWF)" value={fmtRwf(monthCost)} sub={`since ${monthStart}`} tone="gold" />
          <StatCard label="All-Time Fuel Cost" value={fmtRwf(totalCost)} sub={`${records.length} records`} />
          <StatCard label="Avg. Price / Litre" value={fmtRwf(records.length ? totalCost / records.reduce((a, r) => a + r.quantity, 0) : 0)} sub="across all records" tone="green" />
        </div>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          searchPlaceholder="Search vehicle, station, receipt…"
          searchValue={search}
          onSearchChange={setSearch}
          rowKey={(r) => r.id}
          emptyTitle="No fuel records"
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
        <FuelModal
          vehicles={vehicles.map((v) => ({ id: v.id, label: `${v.registration_number} — ${v.make} ${v.model}` }))}
          submitting={saveMutation.isPending}
          onSubmit={(values) => saveMutation.mutate(values)}
          onClose={() => setOpen(false)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete Fuel Record"
        message={`Delete the fuel record from ${fmtDate(deleting?.date)} for ${deleting?.vehicle?.registration_number}?`}
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}

function FuelModal({
  vehicles,
  submitting,
  onSubmit,
  onClose,
}: {
  vehicles: Array<{ id: string; label: string }>;
  submitting: boolean;
  onSubmit: (values: FuelFormValues) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FuelFormValues>({
    resolver: zodResolver(fuelSchema),
    defaultValues: { vehicleId: vehicles[0]?.id ?? '', date: todayIso(), fuelType: 'Diesel', quantity: 0, unitPrice: 1500, odometer: 0, station: '', receiptNumber: '' },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title="Log Fuel Consumption"
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
            <Label required>Date</Label>
            <Input type="date" {...register('date')} />
            <FieldError message={errors.date?.message} />
          </Field>
        </FormRow>
        <FormRow>
          <Field>
            <Label required>Fuel Type</Label>
            <Select {...register('fuelType')}>
              <option>Diesel</option>
              <option>Petrol</option>
            </Select>
          </Field>
          <Field>
            <Label required>Station / Location</Label>
            <Input placeholder="e.g. Total — Nyabugogo" {...register('station')} />
            <FieldError message={errors.station?.message} />
          </Field>
        </FormRow>
        <FormRow cols={3}>
          <Field>
            <Label required>Litres</Label>
            <Input type="number" min={1} placeholder="50" {...register('quantity')} />
            <FieldError message={errors.quantity?.message} />
          </Field>
          <Field>
            <Label required>Unit Price (RWF)</Label>
            <Input type="number" min={1} placeholder="1500" {...register('unitPrice')} />
            <FieldError message={errors.unitPrice?.message} />
          </Field>
          <Field>
            <Label>Odometer (km)</Label>
            <Input type="number" min={0} placeholder="47500" {...register('odometer')} />
            <FieldError message={errors.odometer?.message} />
          </Field>
        </FormRow>
        <Field>
          <Label>Receipt / Reference Number</Label>
          <Input placeholder="e.g. INV-2026-0147" {...register('receiptNumber')} />
        </Field>
        <p className="text-[11px] text-ink-3">Total cost is calculated as quantity × unit price.</p>
      </form>
    </Modal>
  );
}