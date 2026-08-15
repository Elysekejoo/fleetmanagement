import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/config/supabase';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { fmtDateTime } from '@/lib/utils';
import type { AuditLogRow } from '@/types/database';

export default function AuditLogsPage() {
  const { data: logs = [], isLoading, error, refetch } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const columns: Column<AuditLogRow & { actor?: string }>[] = [
    { key: 'time', header: 'Timestamp', render: (l) => <span className="text-xs">{fmtDateTime(l.created_at)}</span> },
    { key: 'action', header: 'Action', render: (l) => <span className="font-mono text-xs font-semibold">{l.action}</span> },
    { key: 'entity', header: 'Entity', render: (l) => <span className="uppercase">{l.entity}</span> },
    { key: 'entity_id', header: 'Record', render: (l) => <span className="font-mono text-xs">{l.entity_id ? l.entity_id.slice(0, 12) : '—'}</span> },
    {
      key: 'metadata',
      header: 'Details',
      render: (l) => <span className="block max-w-[300px] truncate text-xs text-ink-3">{l.metadata ? JSON.stringify(l.metadata) : '—'}</span>,
    },
  ];

  return (
    <>
      <PageHeader title="Audit Logs" description="A secure trail of administrative operations" />
      <PageBody>
        <DataTable
          columns={columns}
          rows={logs}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          rowKey={(l) => l.id}
          emptyTitle="No audit records yet"
          pageSize={15}
        />
      </PageBody>
    </>
  );
}