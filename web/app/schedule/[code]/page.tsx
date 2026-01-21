import { supabase } from '@/lib/supabase';
import ScheduleClient from './schedule-client';

type SchedulePageProps = {
  params: Promise<{ code: string }>;
};

export default async function SchedulePage({ params }: SchedulePageProps) {
  const { code } = await params;
  const scheduleId = code;

  // Busca diretamente os slots desta agenda
  const { data: slots, error: slotsError } = await supabase
    .from('visit_slots')
    .select('id, date, start_time, duration_minutes, max_people, is_skipped')
    .eq('schedule_id', scheduleId)
    .eq('is_skipped', false)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true });

  if (slotsError) {
    console.error(slotsError);
  }

  console.log('Slots fetched:', scheduleId);

  if (!slots || slots.length === 0) {
    return (
      <main className="flex flex-1 flex-col justify-center gap-4">
        <h1 className="text-2xl font-semibold">Agenda não encontrada</h1>
        <p className="text-sm text-slate-300">
          Verifique se o código da agenda está correto ou peça um novo link no aplicativo.
        </p>
      </main>
    );
  }

  const slotIds = slots.map((slot) => slot.id);

  const { data: bookings, error: bookingsError } = await supabase
    .from('visit_bookings')
    .select('id, slot_id, visitor_name, number_of_people')
    .in('slot_id', slotIds);

  if (bookingsError) {
    console.error(bookingsError);
  }

  // Como a web não pode acessar visit_schedules, montamos um "resumo" da agenda
  const dates = slots.map((s) => s.date);
  const startDate = dates.reduce((min, d) => (d < min ? d : min), dates[0]);
  const endDate = dates.reduce((max, d) => (d > max ? d : max), dates[0]);

  const scheduleSummary = {
    id: scheduleId,
    custom_message: null as string | null,
    start_date: startDate,
    end_date: endDate,
  };

  return (
    <ScheduleClient
      schedule={scheduleSummary}
      slots={slots}
      bookings={bookings ?? []}
    />
  );
}


