/**
 * UserContext — provê o "effective user ID" para todas as telas.
 *
 * Quando o usuário autenticado é um CONVIDADO (tem um user_invite aceito),
 * effectiveUserId == inviter_id (o dono real dos dados).
 * Quando é o próprio dono, effectiveUserId == auth.uid().
 *
 * Todas as telas que fazem queries com .eq('user_id', ...) ou
 * .insert({ user_id: ... }) devem usar effectiveUserId no lugar de user.id.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { clearSessionForSiri, saveSessionForSiri } from '@/lib/session-sync';
import { isPremiumUser } from '@/lib/revenuecat';

interface UserContextValue {
  /** uid do usuário autenticado */
  userId: string | null;
  /** uid a ser usado em todas as queries de dados (pode ser o do convidante) */
  effectiveUserId: string | null;
  /** true se este usuário está operando como convidado de outra conta */
  isInvited: boolean;
  /** status premium global — compartilhado por todas as telas */
  isPremium: boolean;
  /** força re-checagem do status premium (chamar após compra/restore) */
  refreshPremium: () => Promise<void>;
  /** recarrega o contexto (ex.: após aceitar um convite) */
  reload: () => void;
}

const UserCtx = createContext<UserContextValue>({
  userId: null,
  effectiveUserId: null,
  isInvited: false,
  isPremium: false,
  refreshPremium: async () => {},
  reload: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const [isInvited, setIsInvited] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [tick, setTick] = useState(0);
  const siriSessionRef = useRef<{ userId: string; babyId: string } | null>(null);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const refreshPremium = useCallback(async () => {
    const premium = await isPremiumUser();
    setIsPremium(premium);
  }, []);

  // Mantém a sessão da Siri sincronizada com o token atual
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        siriSessionRef.current = null;
        clearSessionForSiri();
      } else if (event === 'TOKEN_REFRESHED' && session?.access_token && siriSessionRef.current) {
        const { userId, babyId } = siriSessionRef.current;
        saveSessionForSiri(session.access_token, userId, babyId);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const [{ data: { user } }, { data: { session } }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.auth.getSession(),
      ]);
      if (!user || cancelled) return;

      setUserId(user.id);

      // Verifica se há um convite aceito para este usuário
      const { data: invite } = await supabase
        .from('user_invites')
        .select('inviter_id')
        .eq('invitee_id', user.id)
        .eq('status', 'accepted')
        .maybeSingle();

      if (cancelled) return;

      const ownerId = invite?.inviter_id ?? user.id;

      if (invite?.inviter_id) {
        setEffectiveUserId(invite.inviter_id);
        setIsInvited(true);
      } else {
        setEffectiveUserId(user.id);
        setIsInvited(false);
      }

      // Sincroniza sessão com o App Intent da Siri
      if (session?.access_token) {
        const { data: baby } = await supabase
          .from('babies')
          .select('id')
          .eq('user_id', ownerId)
          .maybeSingle();

        if (!cancelled && baby?.id) {
          siriSessionRef.current = { userId: user.id, babyId: baby.id };
          saveSessionForSiri(session.access_token, user.id, baby.id);
        }
      }

      if (!cancelled) {
        const premium = await isPremiumUser();
        if (!cancelled) setIsPremium(premium);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tick]);

  return (
    <UserCtx.Provider value={{ userId, effectiveUserId, isInvited, isPremium, refreshPremium, reload }}>
      {children}
    </UserCtx.Provider>
  );
}

export function useUserContext() {
  return useContext(UserCtx);
}
