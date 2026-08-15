import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Pencil, Plus, Trash2 } from 'lucide-react';
import { createDepartment, deleteDepartment, fetchDepartments, updateDepartment } from '@/services/departments';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { PageBody, PageHeader } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field, FieldError, Input, Label, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { fmtDate } from '@/lib/utils';
import type { Department } from '@/types/domain';

const departmentSchema = z.object({
  name: z.string().min(2, 'Department name is required'),
  description: z.string().optional(),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

export default function DepartmentsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Department | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const { data: departments = [], isLoading, error, refetch } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['departments'] });
    void queryClient.invalidateQueries({ queryKey: ['users'] });
    void queryClient.invalidateQueries({ queryKey: ['drivers'] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: DepartmentFormValues) => {
      if (editing) {
        await updateDepartment(editing.id, { name: values.name, description: values.description || null });
      } else {
        await createDepartment({ name: values.name, description: values.description || null });
      }
    },
    onSuccess: () => {
      toast.show('success', editing ? 'Department updated' : 'Department created');
      setEditing(null);
      setCreating(false);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Operation failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteDepartment(deleting!.id),
    onSuccess: () => {
      toast.show('success', 'Department deleted');
      setDeleting(null);
      invalidate();
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Delete failed'),
  });

  const columns: Column<Department>[] = [
    {
      key: 'name',
      header: 'Department',
      render: (d) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-lt text-blue">
            <Building2 className="h-4 w-4" />
          </div>
          <div>
            <div className="font-semibold text-ink">{d.name}</div>
          </div>
        </div>
      ),
    },
    { key: 'description', header: 'Description', render: (d) => d.description ?? '—' },
    { key: 'created', header: 'Created', render: (d) => fmtDate(d.created_at) },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) => (
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-blue"
            title="Edit department"
            aria-label={`Edit ${d.name}`}
            onClick={() => {
              setEditing(d);
              setCreating(false);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded p-1.5 text-ink-3 hover:bg-bg-2 hover:text-danger"
            title="Delete department"
            aria-label={`Delete ${d.name}`}
            onClick={() => setDeleting(d)}
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
        title="Departments"
        description="Manage organizational departments used across staff records"
        actions={
          <Button variant="navy" icon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Add Department
          </Button>
        }
      />
      <PageBody>
        <DataTable
          columns={columns}
          rows={departments}
          loading={isLoading}
          error={error?.message ?? null}
          onRetry={() => refetch()}
          searchPlaceholder="Search departments…"
          rowKey={(d) => d.id}
          emptyTitle="No departments yet"
          emptyMessage="Create the first department to organize staff records."
        />
      </PageBody>

      {(creating || editing) && (
        <DepartmentModal
          department={editing}
          submitting={saveMutation.isPending}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(values) => saveMutation.mutate(values)}
        />
      )}

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete department?"
        message={`Delete ${deleting?.name}? Staff assigned to this department will be left without a department.`}
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}

function DepartmentModal({
  department,
  submitting,
  onClose,
  onSubmit,
}: {
  department: Department | null;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: DepartmentFormValues) => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DepartmentFormValues>({
    resolver: zodResolver(departmentSchema),
    defaultValues: {
      name: department?.name ?? '',
      description: department?.description ?? '',
    },
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={department ? 'Edit Department' : 'Add Department'}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="navy" onClick={handleSubmit(onSubmit)} loading={submitting}>
            {department ? 'Save Changes' : 'Create Department'}
          </Button>
        </>
      }
    >
      <form noValidate>
        <Field>
          <Label htmlFor="dept-name" required>
            Department Name
          </Label>
          <Input id="dept-name" placeholder="e.g. Procurement" {...register('name')} />
          <FieldError message={errors.name?.message} />
        </Field>
        <Field>
          <Label htmlFor="dept-desc">Description</Label>
          <Textarea id="dept-desc" placeholder="What this department is responsible for…" {...register('description')} />
          <FieldError message={errors.description?.message} />
        </Field>
      </form>
    </Modal>
  );
}