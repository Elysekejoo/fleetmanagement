import { Loader2 } from 'lucide-react';

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-3" role="status">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}…
    </div>
  );
}

export function SkeletonRows({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="border-b border-line bg-bg px-3.5 py-2.5 text-left">
                <div className="h-2 w-16 rounded bg-line/70" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r} className="border-b border-line/50">
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-3.5 py-3">
                  <div className="h-3 w-20 rounded bg-bg-2" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}