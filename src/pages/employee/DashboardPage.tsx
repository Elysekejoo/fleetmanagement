import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Info } from 'lucide-react';
import { fetchMyRequests } from '@/services/requests';
import { PageBody, PageHeader, Panel, StatCard } from '@/components/ui/Page';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { SkeletonRows } from '@/components/ui/Loading';
import { useAuth } from '@/features/auth/AuthContext';
import { fmtDate } from '@/lib/utils';
import { useRealtimeInvalidation } from '@/hooks/useRealtimeInvalidation';
import { requestTone } from '@/pages/admin/DashboardPage';

export default function EmployeeDashboardPage() {
  const { profile } = useAuth();
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['my-requests', profile?.id],
    queryFn: () => fetchMyRequests(profile!.id),
    enabled: Boolean(profile),
  });
  useRealtimeInvalidation();

  const pending = requests.filter((r) => r.status === 'pending').length;
  const approved = requests.filter((r) => ['approved', 'assigned'].includes(r.status)).length;
  const recent = requests.slice(0, 5);

  return (
    <>
      <PageHeader
        title="My Dashboard"
        description={
          profile
            ? `Welcome, ${profile.full_name} — ${new Date().toLocaleDateString('en-RW', { weekday: 'long', month: 'long', day: 'numeric' })}`
            : undefined
        }
        actions={
          <Link to="/employee/requests/new">
            <Button variant="navy" icon={<Plus className="h-4 w-4" />}>
              New Request
            </Button>
          </Link>
        }
      />
      <PageBody>
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total Requests" value={requests.length} sub="submitted by me" tone="blue" />
          <StatCard label="Pending" value={pending} sub="awaiting approval" tone="gold" />
          <StatCard label="Approved" value={approved} sub="trips confirmed" tone="green" />
        </div>

        <Panel title="My Recent Requests" bodyClassName="p-0">
          {isLoading ? (
            <SkeletonRows rows={3} cols={4} />
          ) : recent.length === 0 ? (
            <div className="py-10 text-center text-ink-3">
              <p className="text-sm">No requests yet.</p>
              <Link to="/employee/requests/new" className="mt-2 inline-block text-xs font-semibold text-blue hover:underline">
                Create your first travel request
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line bg-bg text-left text-[10px] font-bold uppercase tracking-wider text-ink-3">
                    <th className="px-3.5 py-2.5">Ref</th>
                    <th className="px-3.5 py-2.5">Destination</th>
                    <th className="px-3.5 py-2.5">Travel Date</th>
                    <th className="px-3.5 py-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-b border-line/60 last:border-b-0 hover:bg-bg-2/60">
                      <td className="px-3.5 py-2.5 font-mono text-xs font-semibold">{r.ref_code}</td>
                      <td className="px-3.5 py-2.5 text-[13px] font-semibold text-ink">{r.destination}</td>
                      <td className="px-3.5 py-2.5 text-[13px]">{fmtDate(r.travel_date)}</td>
                      <td className="px-3.5 py-2.5">
                        <StatusBadge tone={requestTone(r.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <div className="mt-4 flex items-start gap-2 rounded-md border-l-4 border-blue bg-blue-lt px-4 py-3 text-[13px] text-blue-md">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Requests must be submitted at least 24 hours before the trip date. You will be notified when your request
            is approved, rejected, or scheduled.
          </span>
        </div>
      </PageBody>
    </>
  );
}