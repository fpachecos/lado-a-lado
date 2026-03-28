# CLAUDE.md

**Lado a Lado** — app React Native / Expo para gerenciar agendas de visitas ao bebê. Expo Router para navegação, Supabase para backend (auth + PostgreSQL com RLS).

> Regras detalhadas por área estão nos subdiretórios:
> - `web/CLAUDE.md` — Web app (Next.js) + design system
> - `database/CLAUDE.md` — Banco de dados, migrations
> - `app/CLAUDE.md` — App mobile, design system mobile

## Commands

```bash
# Mobile (raiz)
npx expo start
npm run ios
npm run android
npm run web

# Web (cd web/)
npm run dev
npm run build
npm run lint
```

## Architecture

### Routing (Expo Router)
- `app/index.tsx` — Entry point: verifica auth, redireciona
- `app/(auth)/` — Login, signup, forgot-password
- `app/(tabs)/` — Navegação por tabs (home, baby, visits, schedules)
- `app/(tabs)/schedules/[id].tsx` — Rota dinâmica de agenda

### Backend (Supabase)
- Client: `lib/supabase.ts` | Schema: `ladoalado` | Ver `database/schema.sql`
- Tabelas: `babies`, `visit_schedules`, `visit_slots`, `visit_bookings`, `companions`
- RLS ativo — usuário vê só seus próprios dados
- `visit_schedules` tem policy SELECT pública (`USING (true)`) — usado pela web sem login

### State & Data
- Sem gerenciador global — Supabase direto em cada tela
- `@react-native-async-storage/async-storage` para persistência local
- `date-fns` para manipulação de datas

### Monetização
- `lib/revenuecat.ts` — tier gratuito: agendas de 1 dia; premium: múltiplos dias

### TypeScript
- Strict mode | Path alias `@/*` → raiz do repo | Tipos em `types/database.ts`

### Environment Variables (`.env`)
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=
```

## Caveats — Expo Web

### `Alert.alert()` é no-op na web
Sempre usar `Platform.OS` para diferenciar:

```ts
if (Platform.OS === 'web') {
  if (window.confirm('Mensagem?')) { /* ação */ }
} else {
  Alert.alert('Título', 'Mensagem', [{ text: 'OK', onPress: () => {} }]);
}
```

Pós-ação na web: chamar `router.replace(...)` diretamente, nunca dentro de callback de `Alert`.

### Modais com `TextInput` devem usar `KeyboardAvoidingView`
Todo `Modal` que contenha um `TextInput` deve envolver seu conteúdo com `KeyboardAvoidingView` para evitar que o teclado virtual sobreponha o campo no celular:

```tsx
import { KeyboardAvoidingView, Platform } from 'react-native';

<Modal visible={...} transparent animationType="fade">
  <KeyboardAvoidingView
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    style={{ flex: 1 }}
  >
    {/* overlay + conteúdo do modal */}
  </KeyboardAvoidingView>
</Modal>
```

### `router.back()` não funciona sem histórico na web
`router.back()` usa `window.history.back()` — falha silenciosamente se não há histórico (ex: URL aberta diretamente). Usar sempre:

```ts
router.canGoBack() ? router.back() : router.replace('/rota-pai')
```
