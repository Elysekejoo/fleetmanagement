import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { ArrowRight, Flag, Play } from 'lucide-react';
import { fetchDriverTrips, startTrip, endTrip } from '@/services/trips';
import { fetchVehicles } from '@/services/vehicles';
import { PageBody, PageHeader, Panel, StatCard } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { Field, FieldError, FormRow, Input, Label } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { friendlyError } from '@/lib/errors';
import { useAuth } from '@/features/auth/AuthContext';
import { fmtDate, fmtTime, todayIso } from '@/lib/utils';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import type { TripWithRelations } from '@/types/domain';

const tripTone: Record<string, StatusTone> = {
  scheduled: 'scheduled',
  active: 'active',
  completed: 'completed',
  cancelled: 'cancelled',
};

export default function DriverDashboardPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: trips = [] } = useQuery({
    queryKey: ['driver-trips', profile?.id],
    queryFn: () => fetchDriverTrips(profile!.id),
    enabled: Boolean(profile),
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: fetchVehicles });
  useRealtimeInvalidation();

  const myVehicle = vehicles.find((v) => v.current_driver_id === profile?.id);
  const upcoming = trips.filter((t) => t.status === 'scheduled');
  const distanceThisMonth = trips
    .filter((t) => t.status === 'completed' && t.start_time && t.start_time >= todayIso())
    .reduce((acc, t) => acc + (t.distance_km ?? 0), 0);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
    void queryClient.invalidateQueries({ queryKey: ['trips'] });
    void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const startMutation = useMutation({
    mutationFn: (tripId: string) => startTrip(tripId, 'Current GPS position'),
    onSuccess: () => {
      toast.show('success', 'Trip started — GPS tracking active');
      invalidate();
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to start the trip. Please try again.')),
  });

  return (
    <>
      <PageHeader title="Driver Dashboard" description={profile ? `Welcome, ${profile.full_name}` : undefined} />
      <PageBody>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total Trips" value={trips.length} sub="all time" tone="blue" />
          <StatCard label="Distance (km)" value={Math.round(distanceThisMonth)} sub="this month" tone="gold" />
          <StatCard label="Upcoming Trips" value={upcoming.length} sub="scheduled" tone="green" />
        </div>

        <div className="section-title">Current & Upcoming Assignments</div>
        <div className="space-y-2.5">
          {upcoming.length === 0 ? (
            <div className="rounded border border-line bg-white px-4 py-8 text-center text-sm text-ink-3">
              No upcoming trips assigned to you.
            </div>
          ) : (
            upcoming.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white px-4 py-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-navy text-white">
                  <ArrowRight className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-navy">{t.request?.destination ?? '—'}</div>
                  <div className="text-xs text-ink-3">
                    {t.request?.purpose} · {fmtDate(t.request?.travel_date)} at {fmtTime(`${t.request?.travel_date}T${t.request?.departure_time ?? '08:00'}`)} · {t.request?.requester_id ? 'Staff travel' : '—'}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right text-xs text-ink-3">
                    <div className="font-mono">{t.vehicle?.registration_number}</div>
                    <div>{t.vehicle?.make} {t.vehicle?.model}</div>
                  </div>
                  <StatusBadge tone={tripTone[t.status]} />
                  <Button
                    size="sm"
                    variant="success"
                    icon={<Play className="h-3.5 w-3.5" />}
                    loading={startMutation.isPending}
                    onClick={() => startMutation.mutate(t.id)}
                  >
                    Start Trip
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="section-title mt-5">Active Trip</div>
        {trips.filter((t) => t.status === 'active').length > 0 ? (
          <ActiveTripCard trip={trips.find((t) => t.status === 'active')!} />
        ) : (
          <div className="rounded border border-line bg-white px-4 py-8 text-center text-sm text-ink-3">
            No trip currently in progress.
          </div>
        )}

        <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <Panel title="My Vehicle" bodyClassName="p-4">
            {myVehicle ? (
              <div className="grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                <Detail label="Plate Number" value={myVehicle.registration_number} />
                <Detail label="Make / Model" value={`${myVehicle.make} ${myVehicle.model}`} />
                <Detail label="Year" value={String(myVehicle.year)} />
                <Detail label="Vehicle Type" value={myVehicle.vehicle_type} />
                <Detail label="GPS Device" value={myVehicle.gps_device_id ?? '—'} />
                <Detail label="Current Mileage" value={`${myVehicle.odometer.toLocaleString()} km`} />
              </div>
            ) : (
              <p className="text-[13px] text-ink-3">No vehicle currently assigned to you.</p>
            )}
          </Panel>
          <Panel title="Reminders" bodyClassName="p-4">
            <div className="mb-3 flex items-start gap-2 rounded border-l-4 border-gold bg-warn-bg px-3 py-2.5 text-[13px] text-warn">
              <span>Always complete the pre-departure vehicle check before starting a trip.</span>
            </div>
            <div className="flex items-start gap-2 rounded-md border-l-4 border-blue bg-blue-lt px-3 py-2.5 text-[13px] text-blue-md">
              <span>Report any vehicle damage or issues immediately to the Fleet Manager.</span>
            </div>
            <Link to="/driver/trips" className="mt-4 inline-block text-xs font-semibold text-blue hover:underline">
              View all assigned trips →
            </Link>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}

function ActiveTripCard({ trip }: { trip: TripWithRelations }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const endMutation = useMutation({
    mutationFn: (values: { endLocation: string; distanceKm: number | null; fuelUsedLitres: number | null }) =>
      endTrip({ tripId: trip.id, ...values }),
    onSuccess: () => {
      toast.show('success', 'Trip completed');
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['driver-trips'] });
      void queryClient.invalidateQueries({ queryKey: ['trips'] });
      void queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err) => toast.show('error', friendlyError(err, 'Unable to end the trip. Please try again.')),
  });

  return (
    <div className="rounded-lg border-2 border-ok bg-white px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-ok" />
            <span className="text-sm font-bold text-ink">Trip in progress — {trip.request?.destination ?? '—'}</span>
          </div>
          <p className="mt-1 text-xs text-ink-3">
            Vehicle {trip.vehicle?.registration_number} · Started at {fmtTime(trip.start_time)}
          </p>
        </div>
        <Button variant="success" icon={<Flag className="h-4 w-4" />} onClick={() => setOpen(true)}>
          End Trip
        </Button>
      </div>

      {open && (
        <EndTripModal
          submitting={endMutation.isPending}
          onSubmit={(values) => endMutation.mutate(values)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

const endTripSchema = z.object({
  endLocation: z.string().min(2, 'End location is required'),
  distanceKm: z.string().optional(),
  fuelUsedLitres: z.string().optional(),
});

type EndTripValues = z.infer<typeof endTripSchema>;

function EndTripModal({
  submitting,
  onSubmit,
  onClose,
}: {
  submitting: boolean;
  onSubmit: (values: { endLocation: string; distanceKm: number | null; fuelUsedLitres: number | null }) => void;
  onClose: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EndTripValues>({ resolver: zodResolver(endTripSchema) });

  return (
    <Modal
      open
      onClose={onClose}
      title="Complete Trip"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSubmit((v) =>
              onSubmit({
                endLocation: v.endLocation,
                distanceKm: v.distanceKm ? Number(v.distanceKm) : null,
                fuelUsedLitres: v.fuelUsedLitres ? Number(v.fuelUsedLitres) : null,
              }),
            )}
            loading={submitting}
          >
            Complete Trip
          </Button>
        </>
      }
    >
      <form noValidate>
        <Field>
          <Label required>End Location</Label>
          <Input placeholder="e.g. MSH HQ, Kacyiru" {...register('endLocation')} />
          <FieldError message={errors.endLocation?.message} />
        </Field>
        <FormRow>
          <Field>
            <Label>Distance (km)</Label>
            <Input type="number" min={0} placeholder="e.g. 472" {...register('distanceKm')} />
          </Field>
          <Field>
            <Label>Fuel Used (litres)</Label>
            <Input type="number" min={0} placeholder="e.g. 42" {...register('fuelUsedLitres')} />
          </Field>
        </FormRow>
      </form>
    </Modal>
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