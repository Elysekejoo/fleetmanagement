import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Download } from 'lucide-react';
import { buildReports, exportTripsCsv, exportFuelCsv } from '@/services/reports';
import { fetchVehicles } from '@/services/vehicles';
import { fetchDrivers } from '@/services/profiles';
import { PageBody, PageHeader, StatCard } from '@/components/ui/Page';
import { DataTable, FilterSelect, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input, Field } from '@/components/ui/Field';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { fmtDateTime, fmtNumber, fmtRwf, monthStartIso, todayIso } from '@/lib/utils';
import type { TripReportRow } from '@/types/domain';

export default function ReportsPage() {
  const toast = useToast();
  const [from, setFrom] = useState(monthStartIso());
  const [to, setTo] = useState(todayIso());
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');

  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });
  const { data: drivers = [] } = useQuery({ queryKey: ['drivers'], queryFn: fetchDrivers });

  const filters = useMemo(
    () => ({ from, to, vehicleId, driverId }),
    [from, to, vehicleId, driverId],
  );

  const reportQuery = useQuery({
    queryKey: ['reports', filters],
    queryFn: () => buildReports(filters),
    enabled: Boolean(from && to),
  });

  const data = reportQuery.data;

  const columns: Column<TripReportRow>[] = [
    { key: 'ref', header: 'Ref', render: (t) => <span className="font-mono text-xs font-semibold">{t.requestRef}</span> },
    { key: 'vehicle', header: 'Vehicle', render: (t) => <span className="font-mono text-xs">{t.vehicle}</span> },
    { key: 'driver', header: 'Driver', render: (t) => t.driver },
    { key: 'route', header: 'Route', render: (t) => t.route },
    { key: 'start', header: 'Departure', render: (t) => <span className="text-xs">{fmtDateTime(t.startTime)}</span> },
    { key: 'end', header: 'Return', render: (t) => <span className="text-xs">{fmtDateTime(t.endTime)}</span> },
    {
      key: 'dist',
      header: 'Distance (km)',
      render: (t) => <span className="font-mono text-xs">{t.distanceKm != null ? fmtNumber(t.distanceKm) : '—'}</span>,
    },
    {
      key: 'fuel',
      header: 'Fuel (L)',
      render: (t) => <span className="font-mono text-xs">{t.fuelLitres != null ? t.fuelLitres : '—'}</span>,
    },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge tone={t.status as 'active'} label={t.status} /> },
  ];

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Operational performance and usage statistics"
        actions={
          <>
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() => {
                if (!data) return;
                exportTripsCsv(data.trips);
                toast.show('success', 'Trip report exported');
              }}
              disabled={!data || data.trips.length === 0}
            >
              Export Trips CSV
            </Button>
            <Button
              variant="outline"
              icon={<Download className="h-4 w-4" />}
              onClick={() => {
                if (!data) return;
                exportFuelCsv(data.fuel);
                toast.show('success', 'Fuel report exported');
              }}
              disabled={!data || data.fuel.length === 0}
            >
              Export Fuel CSV
            </Button>
          </>
        }
      />
      <PageBody>
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-line bg-white p-4">
          <Field>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-3" htmlFor="filter-from">From</label>
            <Input id="filter-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          </Field>
          <Field>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-ink-3" htmlFor="filter-to">To</label>
            <Input id="filter-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </Field>
          <FilterSelect
            label="All Vehicles"
            value={vehicleId}
            onChange={setVehicleId}
            options={vehicles.map((v) => ({ value: v.id, label: v.registration_number }))}
          />
          <FilterSelect
            label="All Drivers"
            value={driverId}
            onChange={setDriverId}
            options={drivers.map((d) => ({ value: d.id, label: d.full_name }))}
          />
        </div>

        {reportQuery.isError ? (
          <p className="rounded border border-danger-border bg-danger-bg px-4 py-3 text-[13px] text-danger">{reportQuery.error.message}</p>
        ) : (
          <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
            <StatCard label="Trips" value={data?.totals.trips ?? '—'} sub="in selected range" tone="blue" />
            <StatCard label="Distance (km)" value={data ? fmtNumber(data.totals.distanceKm) : '—'} sub="total distance" tone="navy" />
            <StatCard label="Fuel Used (L)" value={data?.totals.fuelLitres ?? '—'} sub="in selected range" tone="green" />
            <StatCard label="Fuel Cost" value={data ? fmtRwf(data.totals.fuelCost) : '—'} sub="all vehicles" tone="gold" />
            <StatCard label="Maintenance Cost" value={data ? fmtRwf(data.totals.maintenanceCost) : '—'} sub="in selected range" tone="red" />
          </div>
        )}

        {data && data.trips.length > 0 && (
          <div className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ReportBar title="Trips by Vehicle" rows={tripsByVehicle(data.trips)} />
            <ReportBar title="Distance by Vehicle (km)" rows={distanceByVehicle(data.trips)} />
            <ReportBar title="Fuel by Vehicle (L)" rows={fuelByVehicle(data.trips)} />
          </div>
        )}

        <div className="mb-4 flex items-center gap-2 text-[13px] font-bold text-navy">
          <BarChart3 className="h-4 w-4" /> Complete Trip History
        </div>
        <DataTable
          columns={columns}
          rows={data?.trips ?? []}
          loading={reportQuery.isLoading}
          rowKey={(t) => t.id}
          emptyTitle="No trips in the selected range"
        />
      </PageBody>
    </>
  );
}

function tripsByVehicle(trips: TripReportRow[]): Array<{ label: string; value: number }> {
  const counts = new Map<string, number>();
  trips.forEach((t) => counts.set(t.vehicle, (counts.get(t.vehicle) ?? 0) + 1));
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function distanceByVehicle(trips: TripReportRow[]): Array<{ label: string; value: number }> {
  const totals = new Map<string, number>();
  trips.forEach((t) => totals.set(t.vehicle, (totals.get(t.vehicle) ?? 0) + (t.distanceKm ?? 0)));
  return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function fuelByVehicle(trips: TripReportRow[]): Array<{ label: string; value: number }> {
  const totals = new Map<string, number>();
  trips.forEach((t) => totals.set(t.vehicle, (totals.get(t.vehicle) ?? 0) + (t.fuelLitres ?? 0)));
  return [...totals.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

function ReportBar({ title, rows }: { title: string; rows: Array<{ label: string; value: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (rows.length === 0) return null;
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <h3 className="mb-3 text-[13px] font-bold text-navy">{title}</h3>
      <div className="space-y-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-2.5">
            <span className="w-24 truncate text-xs text-ink-2">{r.label}</span>
            <div className="h-5 flex-1 overflow-hidden rounded bg-bg-2">
              <div
                className="flex h-full items-center rounded bg-navy pl-2 text-[10px] font-bold text-white"
                style={{ width: `${Math.max(6, (r.value / max) * 100)}%` }}
              >
                {fmtNumber(r.value)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}