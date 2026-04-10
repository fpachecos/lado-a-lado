import { NativeModules, Platform } from 'react-native';

const { SessionSyncModule } = NativeModules;

/**
 * Grava token + IDs no UserDefaults nativo para que o App Intent da Siri
 * consiga registrar mamadas sem abrir o app.
 *
 * Só executa em iOS — no-op em Android/Web.
 */
export function saveSessionForSiri(
  token: string,
  userId: string,
  babyId: string
): void {
  if (Platform.OS !== 'ios' || !SessionSyncModule) return;

  SessionSyncModule.saveSession(
    token,
    userId,
    babyId,
    process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''
  );
}

/**
 * Remove os dados de sessão do UserDefaults (chamar no logout).
 */
export function clearSessionForSiri(): void {
  if (Platform.OS !== 'ios' || !SessionSyncModule) return;
  SessionSyncModule.clearSession();
}
