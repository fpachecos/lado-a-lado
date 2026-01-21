'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Schedule {
  id: string;
  custom_message: string | null;
  start_date: string;
  end_date: string;
}

interface Slot {
  id: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  max_people: number;
  is_skipped: boolean | null;
}

interface Booking {
  id: string;
  slot_id: string;
  visitor_name: string;
  number_of_people: number;
}

interface Props {
  schedule: Schedule;
  slots: Slot[];
  bookings: Booking[];
}

interface SlotWithStats extends Slot {
  total_people: number;
  remaining_spots: number;
}

function formatTime(time: string) {
  return time.slice(0, 5); // HH:MM
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ScheduleClient({ schedule, slots, bookings }: Props) {
  const router = useRouter();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [people, setPeople] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [needsReplaceConfirmation, setNeedsReplaceConfirmation] = useState(false);
  const [cachedBooking, setCachedBooking] = useState<{
    slotId: string;
    visitorName: string;
    numberOfPeople: number;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const slotsWithStats: SlotWithStats[] = useMemo(() => {
    const peopleBySlot = new Map<string, number>();
    for (const booking of bookings) {
      peopleBySlot.set(
        booking.slot_id,
        (peopleBySlot.get(booking.slot_id) ?? 0) + booking.number_of_people
      );
    }

    return slots.map((slot) => {
      const totalPeople = peopleBySlot.get(slot.id) ?? 0;
      const remaining = Math.max(0, slot.max_people - totalPeople);
      return {
        ...slot,
        total_people: totalPeople,
        remaining_spots: remaining,
      };
    });
  }, [slots, bookings]);

  // Carrega agendamento salvo no cache do navegador, se existir
  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;
    const key = `ladoalado_schedule_booking_${schedule.id}`;
    const raw = globalThis.window.localStorage.getItem(key);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as {
        slotId: string;
        visitorName: string;
        numberOfPeople: number;
      };

      setCachedBooking(parsed);
      setSelectedSlotId(parsed.slotId);
      setName(parsed.visitorName);
      setPeople(parsed.numberOfPeople);
    } catch {
      // ignore parse errors
    }
  }, [schedule.id]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedSlotId) {
      setError('Selecione um horário para agendar.');
      return;
    }
    if (!name.trim()) {
      setError('Informe seu nome.');
      return;
    }
    if (people < 1) {
      setError('O número de pessoas deve ser pelo menos 1.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: selectedSlotId,
          visitorName: name.trim(),
          numberOfPeople: people,
          // Se já temos um agendamento em cache, substituímos direto sem pedir confirmação
          replaceExisting: needsReplaceConfirmation || !!cachedBooking,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'ALREADY_BOOKED') {
          setNeedsReplaceConfirmation(true);
          setError(
            'Você já possui um agendamento nesta agenda. Clique em "Mudar agendamento" para substituir pelo novo horário.'
          );
        } else {
          setError(data.message ?? 'Não foi possível realizar o agendamento.');
        }
        return;
      }

      if (typeof globalThis.window !== 'undefined') {
        const bookingToCache = {
          slotId: selectedSlotId,
          visitorName: name.trim(),
          numberOfPeople: people,
        };
        globalThis.window.localStorage.setItem(
          `ladoalado_schedule_booking_${schedule.id}`,
          JSON.stringify(bookingToCache)
        );
        setCachedBooking(bookingToCache);
      }

      // Volta para o modo de visualização, escondendo lista e formulário
      setIsEditing(false);
      setNeedsReplaceConfirmation(false);
      setSuccess('Agendamento realizado com sucesso!');

      // Recarrega os dados da agenda para atualizar números de vagas
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao se comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!cachedBooking) return;

    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: cachedBooking.slotId,
          visitorName: cachedBooking.visitorName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message ?? 'Não foi possível cancelar o agendamento.');
        return;
      }

      // Remove do localStorage
      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.localStorage.removeItem(`ladoalado_schedule_booking_${schedule.id}`);
      }

      // Limpa o estado
      setCachedBooking(null);
      setSelectedSlotId(null);
      setName('');
      setPeople(1);
      setIsEditing(false);
      setSuccess('Agendamento cancelado com sucesso!');

      // Recarrega os dados da agenda para atualizar números de vagas
      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao se comunicar com o servidor.');
    } finally {
      setIsCancelling(false);
    }
  };

  const selectedSlot = slotsWithStats.find(
    (slot) => slot.id === (selectedSlotId ?? '')
  );

  return (
    <main className="flex flex-1 flex-col gap-6">
      <header className="space-y-2">
        <span className="pill">Lado a Lado</span>
        <h1 className="text-2xl font-semibold" style={{ color: '#333333' }}>
          Agendamento de Visitas
        </h1>
        <p className="text-sm" style={{ color: '#666666' }}>
          Escolha um horário disponível na agenda para realizar sua visita.
        </p>
        {schedule.custom_message ? (
          <p
            className="card"
            style={{
              padding: 10,
              fontSize: 12,
              background:
                'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(168,213,186,0.9))',
              borderColor: 'rgba(168,213,186,0.9)',
            }}
          >
            {schedule.custom_message}
          </p>
        ) : null}
        <p className="text-xs" style={{ color: '#666666' }}>
          Período da agenda: {formatDate(schedule.start_date)} até{' '}
          {formatDate(schedule.end_date)}
        </p>
      </header>

      {cachedBooking && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Seu agendamento nesta agenda</h2>
          <div
            className="card"
            style={{
              padding: 16,
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            {(() => {
              const bookedSlot = slotsWithStats.find(
                (s) => s.id === cachedBooking.slotId
              );
              if (!bookedSlot) {
                return <p style={{ color: '#666666' }}>Horário não encontrado.</p>;
              }
              return (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <p style={{ color: '#333333', fontSize: 15, fontWeight: 600 }}>
                      {cachedBooking.visitorName}
                    </p>
                  </div>
                  
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      paddingTop: 8,
                      borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: '#999999', fontSize: 11, fontWeight: 500 }}>
                        Data e horário
                      </span>
                      <p style={{ color: '#333333', fontSize: 13 }}>
                        {formatDate(bookedSlot.date)} às {formatTime(bookedSlot.start_time)}
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: '#999999', fontSize: 11, fontWeight: 500 }}>
                        Duração
                      </span>
                      <p style={{ color: '#333333', fontSize: 13 }}>
                        {bookedSlot.duration_minutes} minutos
                      </p>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ color: '#999999', fontSize: 11, fontWeight: 500 }}>
                        Número de pessoas
                      </span>
                      <p style={{ color: '#333333', fontSize: 13 }}>
                        {cachedBooking.numberOfPeople} {cachedBooking.numberOfPeople === 1 ? 'pessoa' : 'pessoas'}
                      </p>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>

          {!isEditing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => setIsEditing(true)}
              >
                Mudar agendamento
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
                style={{
                  padding: '10px 18px',
                  borderRadius: 999,
                  border: '1px solid rgba(255, 59, 48, 0.3)',
                  background: 'rgba(255, 59, 48, 0.08)',
                  color: '#ff3b30',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  opacity: isCancelling ? 0.6 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (!isCancelling) {
                    e.currentTarget.style.background = 'rgba(255, 59, 48, 0.15)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCancelling) {
                    e.currentTarget.style.background = 'rgba(255, 59, 48, 0.08)';
                  }
                }}
              >
                {isCancelling ? 'Cancelando...' : 'Cancelar agendamento'}
              </button>
            </div>
          )}
        </section>
      )}

      {(!cachedBooking || isEditing) && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Horários disponíveis</h2>
          {slotsWithStats.length === 0 ? (
            <p className="text-sm" style={{ color: '#666666' }}>
              Nenhum horário disponível nesta agenda no momento.
            </p>
          ) : (
            <div
              className="card"
              style={{
                maxHeight: 320,
                padding: 8,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                overflowY: 'auto',
              }}
            >
              {slotsWithStats.map((slot) => {
                const isFull = slot.remaining_spots <= 0;
                const isSelected = slot.id === selectedSlotId;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    disabled={isFull}
                    className={`flex items-center justify-between px-3 py-2 text-left text-xs card ${
                      isFull ? 'opacity-60' : ''
                    }`}
                    style={{
                      background: isSelected
                        ? 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,111,97,0.12))'
                        : 'rgba(255,255,255,0.8)',
                      borderColor: isSelected ? '#ff6f61' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: '#333333' }}>
                        {formatDate(slot.date)} às {formatTime(slot.start_time)}
                      </div>
                      <div className="mt-0.5 text-[11px]" style={{ color: '#666666' }}>
                        Duração aproximada: {slot.duration_minutes} minutos
                      </div>
                    </div>
                    <div className="text-right text-[11px]" style={{ color: '#666666' }}>
                      {isFull
                        ? 'Lotado'
                        : `${slot.remaining_spots} vaga(s) restante(s) de ${slot.max_people}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {(!cachedBooking || isEditing) && (
      <section className="space-y-3">
        <h2 className="text-sm font-medium">Dados do visitante</h2>
        <form onSubmit={handleSubmit} className="flex flex-col" style={{ gap: 56 }}>
          <div className="flex flex-col" style={{ gap: 12 }}>
            <label className="text-xs font-medium" htmlFor="name" style={{ marginBottom: 8 }}>
              Seu nome completo
            </label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="Ex: Maria Silva"
            />
          </div>

          <div className="flex flex-col" style={{ gap: 12 }}>
            <label className="text-xs font-medium" htmlFor="people" style={{ marginBottom: 8 }}>
              Número total de pessoas na visita
            </label>
            <input
              id="people"
              type="number"
              min={1}
              value={people}
              onChange={(e) => setPeople(Number(e.target.value) || 1)}
              className="input"
              style={{ width: 120 }}
            />
          </div>

          {selectedSlot ? (
            <p className="text-[11px]" style={{ color: '#666666', marginTop: 8 }}>
              Você selecionou:{' '}
              <span className="font-medium">
                {formatDate(selectedSlot.date)} às {formatTime(selectedSlot.start_time)}
              </span>
              .
            </p>
          ) : (
            <p className="text-[11px]" style={{ color: '#666666', marginTop: 8 }}>
              Selecione um horário na lista acima para continuar.
            </p>
          )}

          {error && (
            <p
              className="card"
              style={{
                padding: 8,
                fontSize: 12,
                color: '#ff3b30',
                borderColor: '#ff3b30',
                background: 'rgba(255, 59, 48, 0.08)',
              }}
            >
              {error}
            </p>
          )}

          {success && (
            <p
              className="card"
              style={{
                padding: 8,
                fontSize: 12,
                color: '#34c759',
                borderColor: '#34c759',
                background: 'rgba(52, 199, 89, 0.08)',
              }}
            >
              {success}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="primary-button"
            >
              {needsReplaceConfirmation ? 'Mudar agendamento' : 'Agendar visita'}
            </button>

            {needsReplaceConfirmation && (
              <p className="text-[11px]" style={{ color: '#666666' }}>
                Ao confirmar, seu agendamento anterior será apagado e substituído pelo novo
                horário.
              </p>
            )}
          </div>
        </form>
      </section>
      )}
    </main>
  );
}


