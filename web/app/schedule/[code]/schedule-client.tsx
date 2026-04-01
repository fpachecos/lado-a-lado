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

function renderMarkdown(text: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li style="margin-left:16px;list-style:disc">$1</li>')
    .replace(/\n/g, '<br>');
}

function formatTime(time: string) {
  return time.slice(0, 5);
}

function formatDate(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateShort(date: string) {
  return new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ScheduleClient({ schedule, slots, bookings }: Props) {
  const router = useRouter();
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [people, setPeople] = useState<string>('1');
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
      setPeople(String(parsed.numberOfPeople));
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
    if (!people || Number(people) < 1) {
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
          numberOfPeople: Number(people),
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
          numberOfPeople: Number(people),
        };
        globalThis.window.localStorage.setItem(
          `ladoalado_schedule_booking_${schedule.id}`,
          JSON.stringify(bookingToCache)
        );
        setCachedBooking(bookingToCache);
      }

      setIsEditing(false);
      setNeedsReplaceConfirmation(false);
      setSuccess('Agendamento realizado com sucesso!');

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

      if (typeof globalThis.window !== 'undefined') {
        globalThis.window.localStorage.removeItem(`ladoalado_schedule_booking_${schedule.id}`);
      }

      setCachedBooking(null);
      setSelectedSlotId(null);
      setName('');
      setPeople('1');
      setIsEditing(false);
      setSuccess('Agendamento cancelado com sucesso!');

      router.refresh();
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao se comunicar com o servidor.');
    } finally {
      setIsCancelling(false);
    }
  };

  const selectedSlot = slotsWithStats.find((slot) => slot.id === (selectedSlotId ?? ''));

  return (
    <main className="schedule-page">

      {/* ── Header ── */}
      <header className="schedule-header">
        <span className="pill">Lado a Lado</span>
        <h1 className="schedule-title">Agendamento de Visitas</h1>
        <p className="schedule-subtitle">
          Escolha um horário disponível para realizar sua visita.
        </p>
        {schedule.custom_message ? (
          <div
            className="custom-message-box"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(schedule.custom_message) }}
          />
        ) : null}
        <p className="schedule-period">
          Período: {formatDateShort(schedule.start_date)} – {formatDateShort(schedule.end_date)}
        </p>
      </header>

      {/* ── Agendamento existente ── */}
      {cachedBooking && (
        <section className="schedule-section">
          <p className="section-label">Seu agendamento</p>

          {(() => {
            const bookedSlot = slotsWithStats.find((s) => s.id === cachedBooking.slotId);
            if (!bookedSlot) {
              return (
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  Horário não encontrado nesta agenda.
                </p>
              );
            }
            return (
              <div className="booking-card">
                <p className="booking-name">{cachedBooking.visitorName}</p>
                <div className="booking-details">
                  <div>
                    <p className="booking-detail-label">Data e horário</p>
                    <p className="booking-detail-value">
                      {formatDate(bookedSlot.date)} às {formatTime(bookedSlot.start_time)}
                    </p>
                  </div>
                  <div>
                    <p className="booking-detail-label">Duração</p>
                    <p className="booking-detail-value">{bookedSlot.duration_minutes} minutos</p>
                  </div>
                  <div>
                    <p className="booking-detail-label">Número de pessoas</p>
                    <p className="booking-detail-value">
                      {cachedBooking.numberOfPeople}{' '}
                      {cachedBooking.numberOfPeople === 1 ? 'pessoa' : 'pessoas'}
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {success && (
            <p className="status-success" style={{ marginTop: 12 }}>
              {success}
            </p>
          )}

          {!isEditing && (
            <div className="action-row" style={{ marginTop: 16 }}>
              <button
                type="button"
                className="primary-button"
                onClick={() => { setIsEditing(true); setSuccess(null); }}
              >
                Mudar agendamento
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={handleCancelBooking}
                disabled={isCancelling}
              >
                {isCancelling ? 'Cancelando...' : 'Cancelar agendamento'}
              </button>
            </div>
          )}
        </section>
      )}

      {/* ── Horários disponíveis ── */}
      {(!cachedBooking || isEditing) && (
        <section className="schedule-section">
          <p className="section-label">Horários disponíveis</p>

          {slotsWithStats.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Nenhum horário disponível nesta agenda no momento.
            </p>
          ) : (
            <div className="slot-list">
              {slotsWithStats.map((slot) => {
                const isFull = slot.remaining_spots <= 0;
                const isSelected = slot.id === selectedSlotId;
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSelectedSlotId(slot.id)}
                    disabled={isFull}
                    className={`slot-card${isSelected ? ' slot-card--selected' : ''}${isFull ? ' slot-card--full' : ''}`}
                  >
                    <div>
                      <p className="slot-time">
                        {formatDate(slot.date)} · {formatTime(slot.start_time)}
                      </p>
                      <p className="slot-duration">{slot.duration_minutes} min de duração</p>
                    </div>
                    <p className={`slot-spots${isFull ? ' slot-spots--full' : ' slot-spots--available'}`}>
                      {isFull
                        ? 'Lotado'
                        : `${slot.remaining_spots} de ${slot.max_people} vaga${slot.remaining_spots === 1 ? '' : 's'}`}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── Formulário ── */}
      {(!cachedBooking || isEditing) && (
        <section className="schedule-section">
          <p className="section-label">Dados do visitante</p>

          <form onSubmit={handleSubmit} className="form-stack">
            <div className="form-field">
              <label className="form-label" htmlFor="name">
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

            <div className="form-field">
              <label className="form-label" htmlFor="people">
                Número de pessoas na visita
              </label>
              <input
                id="people"
                type="number"
                min={1}
                value={people}
                onChange={(e) => setPeople(e.target.value)}
                onFocus={(e) => e.target.select()}
                className="input"
                style={{ maxWidth: 120 }}
              />
            </div>

            {selectedSlot ? (
              <p className="form-hint">
                Horário selecionado:{' '}
                <strong>
                  {formatDate(selectedSlot.date)} às {formatTime(selectedSlot.start_time)}
                </strong>
                .
              </p>
            ) : (
              <p className="form-hint">Selecione um horário na lista acima para continuar.</p>
            )}

            {error && <p className="status-error">{error}</p>}

            {!cachedBooking && success && <p className="status-success">{success}</p>}

            <div className="action-row">
              <button type="submit" disabled={loading} className="primary-button">
                {loading
                  ? 'Aguarde...'
                  : needsReplaceConfirmation
                  ? 'Confirmar mudança'
                  : 'Agendar visita'}
              </button>

              {needsReplaceConfirmation && (
                <p className="form-hint">
                  Ao confirmar, seu agendamento anterior será substituído pelo novo horário.
                </p>
              )}

              {isEditing && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => { setIsEditing(false); setError(null); }}
                >
                  Cancelar edição
                </button>
              )}
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
