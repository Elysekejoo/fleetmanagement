import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Send } from 'lucide-react';
import { createRequest } from '@/services/requests';
import { PageBody, PageHeader, Panel } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { Field, FieldError, FormRow, Input, Label, Select, Textarea } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/features/auth/AuthContext';
import { addDaysIso } from '@/lib/utils';

const tomorrow = addDaysIso(1);

const requestSchema = z
  .object({
    origin: z.string().min(2, 'Origin is required'),
    destination: z.string().min(2, 'Destination is required'),
    purpose: z.string().min(10, 'Describe the purpose of travel (min 10 characters)'),
    travelDate: z.string().min(1, 'Departure date is required'),
    returnDate: z.string().min(1, 'Return date is required'),
    departureTime: z.string().min(1, 'Departure time is required'),
    passengerCount: z.coerce.number().int().min(1, 'At least one passenger').max(10, 'Maximum 10 passengers'),
    priority: z.enum(['low', 'normal', 'high']),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.travelDate && values.travelDate < tomorrow) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['travelDate'],
        message: 'Travel requests must be submitted at least 24 hours in advance',
      });
    }
    if (values.returnDate && values.travelDate && values.returnDate < values.travelDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['returnDate'],
        message: 'Return date cannot be before the departure date',
      });
    }
  });

type RequestFormValues = z.infer<typeof requestSchema>;

export default function NewRequestPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: RequestFormValues) =>
      createRequest({
        requesterId: profile!.id,
        origin: values.origin,
        destination: values.destination,
        purpose: values.purpose,
        travelDate: values.travelDate,
        returnDate: values.returnDate,
        departureTime: values.departureTime,
        passengerCount: values.passengerCount,
        priority: values.priority,
        notes: values.notes,
      }),
    onSuccess: () => {
      toast.show('success', 'Request submitted. You will be notified when it is reviewed.');
      void queryClient.invalidateQueries({ queryKey: ['my-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['requests'] });
      navigate('/employee/requests');
    },
    onError: (err) => toast.show('error', err instanceof Error ? err.message : 'Submission failed'),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      origin: 'Kigali — MSH HQ, Kacyiru',
      destination: '',
      purpose: '',
      travelDate: tomorrow,
      returnDate: tomorrow,
      departureTime: '08:00',
      passengerCount: 1,
      priority: 'normal',
      notes: '',
    },
  });

  return (
    <>
      <PageHeader title="New Travel Request" description="Submit a vehicle request for official travel" />
      <PageBody>
        <div className="max-w-xl">
          <Panel title="Travel Request Form" bodyClassName="p-5">
            <form noValidate onSubmit={handleSubmit((v) => mutation.mutate(v))}>
              <FormRow>
                <Field>
                  <Label required>Origin / Departure</Label>
                  <Input {...register('origin')} />
                  <FieldError message={errors.origin?.message} />
                </Field>
                <Field>
                  <Label required>Destination</Label>
                  <Input placeholder="e.g. Rusizi District" {...register('destination')} />
                  <FieldError message={errors.destination?.message} />
                </Field>
              </FormRow>
              <Field>
                <Label required>Purpose of Travel</Label>
                <Textarea rows={2} placeholder="Describe the official purpose…" {...register('purpose')} />
                <FieldError message={errors.purpose?.message} />
              </Field>
              <FormRow>
                <Field>
                  <Label required>Departure Date</Label>
                  <Input type="date" min={tomorrow} {...register('travelDate')} />
                  <FieldError message={errors.travelDate?.message} />
                </Field>
                <Field>
                  <Label required>Departure Time</Label>
                  <Input type="time" {...register('departureTime')} />
                  <FieldError message={errors.departureTime?.message} />
                </Field>
              </FormRow>
              <FormRow>
                <Field>
                  <Label required>Expected Return Date</Label>
                  <Input type="date" {...register('returnDate')} />
                  <FieldError message={errors.returnDate?.message} />
                </Field>
                <Field>
                  <Label required>No. of Passengers</Label>
                  <Input type="number" min={1} max={10} {...register('passengerCount')} />
                  <FieldError message={errors.passengerCount?.message} />
                </Field>
              </FormRow>
              <Field>
                <Label required>Priority</Label>
                <Select {...register('priority')}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </Select>
              </Field>
              <Field>
                <Label>Additional Notes</Label>
                <Textarea rows={2} placeholder="Special requirements…" {...register('notes')} />
              </Field>
              <div className="mb-4 flex items-start gap-2 rounded border-l-4 border-gold bg-warn-bg px-3 py-2.5 text-[13px] text-warn">
                <span>
                  Submit at least 24 hours in advance. Requests submitted after 4:00 PM may be processed the next
                  business day.
                </span>
              </div>
              <div className="flex gap-2">
                <Button type="submit" variant="navy" icon={<Send className="h-4 w-4" />} loading={mutation.isPending}>
                  Submit Request
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/employee/requests')}>
                  Cancel
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </PageBody>
    </>
  );
}