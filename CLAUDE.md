# CLAUDE.md

**Lado a Lado** — app React Native / Expo para gerenciar agendas de visitas ao bebê. Expo Router para navegação, Supabase para backend (auth + PostgreSQL com RLS).

> Regras detalhadas por área estão nos subdiretórios:
> - `web/CLAUDE.md` — Web app (Next.js) + design system
> - `database/CLAUDE.md` — Banco de dados, migrations
> - `app/CLAUDE.md` — App mobile, design system mobile

## Migrations — Regras obrigatórias

Sempre que criar um arquivo `database/migration_*.sql`:

1. **Executar imediatamente** no banco remoto via CLI (não deixar para o usuário fazer manualmente):
   ```bash
   SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN .env | cut -d= -f2-) \
   npx supabase db query --linked -f database/<arquivo>.sql --agent=yes 2>&1
   ```
2. **Atualizar `README.md`** (raiz) adicionando o novo arquivo no final da lista de ordem de execução (seção "Execute os scripts de `database/`").

Essas duas ações fazem parte da criação de toda migration e devem ser feitas sem aguardar instrução do usuário.

---

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
- `app/convite.tsx` — Rota pública de aceite de convite (sem auth)
- `app/(auth)/` — Login, signup, forgot-password
- `app/(tabs)/` — Telas principais (Stack, sem tab bar visível)
  - `index.tsx` — Home
  - `baby.tsx` — Dados do bebê
  - `visits.tsx` — Visitas confirmadas
  - `schedules/` — Lista, nova agenda, detalhe `[id].tsx`
  - `companion/[id].tsx` — Detalhe do acompanhante
  - `companion-activities/[id].tsx` — Atividades do acompanhante
  - `profile.tsx` — Perfil e configurações
  - `weight.tsx` — Registro de peso do bebê
  - `feedings.tsx` — Registro de alimentações
  - `feedings-report.tsx` — Relatório de alimentações

### Backend (Supabase)
- Client: `lib/supabase.ts` | Schema: `ladoalado` | Ver `database/schema.sql`
- Tabelas: `babies`, `visit_schedules`, `visit_slots`, `visit_bookings`, `companions`, `companion_activities`, `user_invites`, `baby_weights`, `baby_heights`, `baby_feedings`
- RLS ativo — usuário vê só seus próprios dados
- `visit_schedules` e `visit_slots` têm policy SELECT pública (`USING (true)`) — usados pela web sem login

### State & Data
- `lib/user-context.tsx` — único contexto global; provê `effectiveUserId` (uid real do dono dos dados — pode ser o do convidante quando o usuário logado é um convidado) e `isInvited`. Todas as queries com `user_id` devem usar `effectiveUserId`.
- Demais dados: Supabase direto em cada tela, sem gerenciador global
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
