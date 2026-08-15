import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Info, MapPinned, Navigation } from 'lucide-react';
import type { VehicleLocation } from '@/types/domain';
import { fmtDateTime, timeAgo } from '@/lib/utils';
import { cn } from '@/lib/utils';

const STATUS_COLORS = {
  moving: '#15803D',
  idle: '#155EEF',
  stopped: '#B7791F',
} as const;

// Small, simple, widely-recognized car icon (lucide "car"). Not an emoji.
const CAR_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="#334155" stroke="#334155" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;

function createVehicleIcon(color: string, heading = 0): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:30px;height:30px;border-radius:9999px;background:#fff;border:2px solid ${color};box-shadow:0 1px 3px rgba(11,22,40,.4);display:flex;align-items:center;justify-content:center;"><span class="fleet-car" style="display:block;transform:rotate(${heading}deg);transform-origin:center;transition:transform 300ms linear;">${CAR_SVG}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function applyVehicleIcon(marker: L.Marker, color: string, heading: number): void {
  const el = marker.getElement();
  if (!el) return;
  const car = el.querySelector('.fleet-car') as HTMLElement | null;
  if (!car) return;
  car.style.transform = `rotate(${heading}deg)`;
  const ring = car.parentElement as HTMLElement | null;
  if (ring) ring.style.borderColor = color;
}

function normalizeHeading(heading: number | null, previous: number | undefined): number {
  if (heading == null) return previous ?? 0;
  let h = ((heading % 360) + 360) % 360;
  if (previous != null) {
    let delta = h - previous;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    h = previous + delta;
  }
  return h;
}

function popupHtml(v: VehicleLocation): string {
  const driver = v.driver?.full_name ?? '—';
  const speed = v.speed != null ? `${Math.round(v.speed)} km/h` : '—';
  return `
    <div style="font-family:Inter,system-ui,sans-serif;font-size:12px;min-width:190px">
      <div style="font-weight:600;font-size:13px;margin-bottom:6px;color:#101828">${v.vehicle.registration_number}</div>
      <div style="display:flex;justify-content:space-between;gap:14px;padding:2px 0;color:#475467">
        <span style="color:#667085">Make / Model</span><b>${v.vehicle.make} ${v.vehicle.model}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:14px;padding:2px 0;color:#475467">
        <span style="color:#667085">Driver</span><b>${driver}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:14px;padding:2px 0;color:#475467">
        <span style="color:#667085">Status</span><b>${v.status}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:14px;padding:2px 0;color:#475467">
        <span style="color:#667085">Speed</span><b>${speed}</b>
      </div>
      <div style="display:flex;justify-content:space-between;gap:14px;padding:2px 0;color:#475467">
        <span style="color:#667085">Last update</span><b>${fmtDateTime(v.recordedAt)}</b>
      </div>
    </div>`;
}

interface FleetMapProps {
  locations: VehicleLocation[];
  isDemo?: boolean;
  center?: [number, number];
  zoom?: number;
}

export function FleetMap({ locations, isDemo = false, center = [-1.9706, 29.8739], zoom = 8 }: FleetMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const simRef = useRef<Map<string, { prev: [number, number]; next: [number, number]; t: number }>>(new Map());
  const headingsRef = useRef<Map<string, number>>(new Map());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: false }).setView(center, zoom);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 18,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
      simRef.current.clear();
      headingsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Place / update markers whenever live locations change.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const wasEmptyBefore = markersRef.current.size === 0;
    const seen = new Set<string>();

    locations.forEach((loc) => {
      const point: [number, number] = [loc.latitude, loc.longitude];
      const marker = markersRef.current.get(loc.vehicle.id);
      const heading = normalizeHeading(loc.heading, headingsRef.current.get(loc.vehicle.id));
      headingsRef.current.set(loc.vehicle.id, heading);

      if (marker) {
        const prev = marker.getLatLng();
        simRef.current.set(loc.vehicle.id, { prev: [prev.lat, prev.lng], next: point, t: 0 });
        applyVehicleIcon(marker, loc.status, heading);
        marker.bindPopup(popupHtml(loc));
      } else {
        const m = L.marker(point, { icon: createVehicleIcon(STATUS_COLORS[loc.status], heading) })
          .addTo(map)
          .bindPopup(popupHtml(loc));
        markersRef.current.set(loc.vehicle.id, m);
        simRef.current.set(loc.vehicle.id, { prev: point, next: point, t: 1 });
      }
      seen.add(loc.vehicle.id);
    });

    markersRef.current.forEach((marker, id) => {
      if (seen.has(id)) return;
      map.removeLayer(marker);
      markersRef.current.delete(id);
      simRef.current.delete(id);
      headingsRef.current.delete(id);
    });

    if (wasEmptyBefore && locations.length > 0) {
      const bounds = L.latLngBounds(locations.map((l) => [l.latitude, l.longitude] as [number, number]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }
  }, [locations]);

  // Smooth glide between recorded positions (animated, car keeps moving on screen).
  useEffect(() => {
    let raf: number | null = null;
    const tick = () => {
      let changed = false;
      simRef.current.forEach((sim, id) => {
        sim.t = Math.min(1, sim.t + (16 / 1000) / 4.5);
        const marker = markersRef.current.get(id);
        if (!marker) return;
        const lat = sim.prev[0] + (sim.next[0] - sim.prev[0]) * sim.t;
        const lng = sim.prev[1] + (sim.next[1] - sim.prev[1]) * sim.t;
        marker.setLatLng([lat, lng]);
        changed = true;
      });
      if (changed) raf = window.requestAnimationFrame(tick);
      else raf = null;
    };
    if (simRef.current.size > 0 && raf == null) raf = window.requestAnimationFrame(tick);
    return () => {
      if (raf != null) window.cancelAnimationFrame(raf);
      raf = null;
    };
  }, [locations]);

  function handleSelect(loc: VehicleLocation) {
    const map = mapRef.current;
    const marker = markersRef.current.get(loc.vehicle.id);
    setSelectedId(loc.vehicle.id);
    if (!map || !marker) return;
    map.flyTo([loc.latitude, loc.longitude], Math.max(map.getZoom() || zoom, 13), { duration: 0.6 });
    window.setTimeout(() => marker.openPopup(), 700);
  }

  return (
    <div className="relative z-0 isolate grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="relative min-w-0">
        <div
          ref={containerRef}
          className="h-[320px] w-full sm:h-[380px] lg:h-[440px]"
          role="region"
          aria-label="Fleet vehicle map"
        />
        {isDemo && <DemoTrackingBadge />}
        <MapLegend />
      </div>
      <VehicleList locations={locations} selectedId={selectedId} onSelect={handleSelect} />
    </div>
  );
}

function DemoTrackingBadge() {
  return (
    <div className="pointer-events-none absolute right-2 top-2 z-[1050] flex items-center gap-1.5 rounded-md border border-warn-border bg-warn-bg px-2.5 py-1 text-[11px] font-semibold text-warn shadow-sm">
      <Info className="h-3.5 w-3.5" aria-hidden="true" />
      Demo tracking · simulated positions
    </div>
  );
}

function MapLegend() {
  const items = [
    { color: STATUS_COLORS.moving, label: 'Moving' },
    { color: STATUS_COLORS.idle, label: 'Idle' },
    { color: STATUS_COLORS.stopped, label: 'Stopped' },
  ];
  return (
    <div className="pointer-events-none absolute bottom-2 left-2 z-[1050] flex gap-3 rounded-md border border-line bg-white/95 px-3 py-1.5 text-[11px] text-ink-2 shadow-sm">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function VehicleList({
  locations,
  selectedId,
  onSelect,
}: {
  locations: VehicleLocation[];
  selectedId: string | null;
  onSelect: (loc: VehicleLocation) => void;
}) {
  return (
    <div className="flex min-h-0 flex-col border-t border-line bg-white lg:border-l lg:border-t-0">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <h3 className="text-[13px] font-semibold text-ink">Tracked vehicles</h3>
        <span className="rounded-md bg-bg-2 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-ink-2">
          {locations.length} {locations.length === 1 ? 'unit' : 'units'}
        </span>
      </div>
      <div className="max-h-56 flex-1 overflow-y-auto lg:max-h-none">
        {locations.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 px-4 py-8 text-center">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-2" aria-hidden="true">
              <MapPinned className="h-[18px] w-[18px] text-ink-3" />
            </span>
            <p className="text-xs font-medium text-ink-2">No vehicle positions available.</p>
            <p className="text-[11px] text-ink-3">Units appear here once GPS positions are received.</p>
          </div>
        ) : (
          <ul>
            {locations.map((loc) => {
              const selected = loc.vehicle.id === selectedId;
              return (
                <li key={loc.vehicle.id}>
                  <button
                    onClick={() => onSelect(loc)}
                    className={cn(
                      'flex w-full items-center gap-2.5 border-b border-line/60 px-4 py-2.5 text-left transition-colors last:border-b-0 hover:bg-bg-2',
                      selected && 'bg-blue-lt',
                    )}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: STATUS_COLORS[loc.status] }}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-xs font-semibold text-ink">
                        {loc.vehicle.registration_number}
                      </span>
                      <span className="block truncate text-[11px] text-ink-2">
                        {loc.driver?.full_name ?? `${loc.vehicle.make} ${loc.vehicle.model}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="flex items-center justify-end gap-1 text-[11px] font-medium text-ink-2">
                        <Navigation className="h-3 w-3" aria-hidden="true" />
                        {loc.speed != null ? `${Math.round(loc.speed)} km/h` : '—'}
                      </span>
                      <span className="block text-[10px] text-ink-3">{timeAgo(loc.recordedAt)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}