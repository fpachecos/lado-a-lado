import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// POST: cria/atualiza um agendamento em um slot específico
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      slotId,
      visitorName,
      numberOfPeople,
      replaceExisting,
    }: {
      slotId?: string;
      visitorName?: string;
      numberOfPeople?: number;
      replaceExisting?: boolean;
    } = body;

    if (!slotId || !visitorName || !numberOfPeople) {
      return NextResponse.json(
        { message: 'Dados incompletos para criar agendamento.' },
        { status: 400 }
      );
    }

    const cleanedName = String(visitorName).trim();
    const peopleCount = Number(numberOfPeople);

    if (!cleanedName) {
      return NextResponse.json({ message: 'Nome inválido.' }, { status: 400 });
    }

    if (!Number.isFinite(peopleCount) || peopleCount < 1) {
      return NextResponse.json(
        { message: 'Número de pessoas deve ser pelo menos 1.' },
        { status: 400 }
      );
    }

    // 1) Obter o slot e o schedule_id associado (sem tocar em visit_schedules)
    const { data: slot, error: slotError } = await supabase
      .from('visit_slots')
      .select('id, schedule_id, max_people')
      .eq('id', slotId)
      .maybeSingle();

    if (slotError) {
      console.error(slotError);
      return NextResponse.json(
        { message: 'Erro ao localizar o horário selecionado.' },
        { status: 500 }
      );
    }

    if (!slot) {
      return NextResponse.json(
        { message: 'Horário selecionado não foi encontrado.' },
        { status: 404 }
      );
    }

    // 2) Garantir apenas um agendamento por pessoa (nome) por agenda (schedule_id)
    const { data: slotsForSchedule, error: slotsError } = await supabase
      .from('visit_slots')
      .select('id')
      .eq('schedule_id', slot.schedule_id);

    if (slotsError) {
      console.error(slotsError);
      return NextResponse.json(
        { message: 'Erro ao verificar slots da agenda.' },
        { status: 500 }
      );
    }

    const slotIds = (slotsForSchedule ?? []).map((s) => s.id);

    const { data: personBookings, error: personBookingsError } = slotIds.length
      ? await supabase
          .from('visit_bookings')
          .select('id, slot_id, visitor_name')
          .in('slot_id', slotIds)
          .ilike('visitor_name', cleanedName)
      : { data: [], error: null };

    if (personBookingsError) {
      console.error(personBookingsError);
      return NextResponse.json(
        { message: 'Erro ao verificar agendamentos existentes.' },
        { status: 500 }
      );
    }

    const alreadyHasBooking = (personBookings ?? []).length > 0;

    if (alreadyHasBooking && !replaceExisting) {
      return NextResponse.json(
        {
          code: 'ALREADY_BOOKED',
          message:
            'Você já possui um agendamento nesta agenda. Confirme que deseja mudar o agendamento.',
        },
        { status: 409 }
      );
    }

    // 3) Verificar capacidade do slot
    const { data: slotBookings, error: slotBookingsError } = await supabase
      .from('visit_bookings')
      .select('number_of_people')
      .eq('slot_id', slotId);

    if (slotBookingsError) {
      console.error(slotBookingsError);
      return NextResponse.json(
        { message: 'Erro ao verificar ocupação do horário.' },
        { status: 500 }
      );
    }

    const currentPeople =
      slotBookings?.reduce((sum, b) => sum + (b.number_of_people ?? 0), 0) ?? 0;

    if (currentPeople + peopleCount > slot.max_people) {
      return NextResponse.json(
        {
          message:
            'Este horário não possui vagas suficientes para o número de pessoas informado.',
        },
        { status: 409 }
      );
    }

    // 4) Se já existe agendamento para a pessoa, apagamos antes de criar o novo
    if (alreadyHasBooking) {
      const idsToDelete = (personBookings ?? []).map((b) => b.id);
      if (idsToDelete.length) {
        const { error: deleteError } = await supabase
          .from('visit_bookings')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error(deleteError);
          return NextResponse.json(
            { message: 'Não foi possível atualizar seu agendamento anterior.' },
            { status: 500 }
          );
        }
      }
    }

    // 5) Criar o novo agendamento
    const { error: insertError } = await supabase.from('visit_bookings').insert({
      slot_id: slotId,
      visitor_name: cleanedName,
      number_of_people: peopleCount,
    });

    if (insertError) {
      console.error(insertError);
      return NextResponse.json(
        { message: 'Erro ao salvar seu agendamento.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Erro inesperado ao processar o agendamento.' },
      { status: 500 }
    );
  }
}

// DELETE: cancela um agendamento
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { slotId, visitorName }: { slotId?: string; visitorName?: string } = body;

    if (!slotId || !visitorName) {
      return NextResponse.json(
        { message: 'Dados incompletos para cancelar agendamento.' },
        { status: 400 }
      );
    }

    const cleanedName = String(visitorName).trim();

    if (!cleanedName) {
      return NextResponse.json({ message: 'Nome inválido.' }, { status: 400 });
    }

    // Buscar o agendamento específico pelo slot_id e visitor_name
    const { data: booking, error: findError } = await supabase
      .from('visit_bookings')
      .select('id')
      .eq('slot_id', slotId)
      .ilike('visitor_name', cleanedName)
      .maybeSingle();

    if (findError) {
      console.error(findError);
      return NextResponse.json(
        { message: 'Erro ao localizar o agendamento.' },
        { status: 500 }
      );
    }

    if (!booking) {
      return NextResponse.json(
        { message: 'Agendamento não encontrado.' },
        { status: 404 }
      );
    }

    // Deletar o agendamento
    const { error: deleteError } = await supabase
      .from('visit_bookings')
      .delete()
      .eq('id', booking.id);

    if (deleteError) {
      console.error(deleteError);
      return NextResponse.json(
        { message: 'Erro ao cancelar o agendamento.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: 'Erro inesperado ao cancelar o agendamento.' },
      { status: 500 }
    );
  }
}


