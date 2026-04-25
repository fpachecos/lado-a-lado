# CLAUDE.md

**Lado a Lado** — app React Native / Expo para gerenciar agendas de visitas ao bebê. Expo Router para navegação, Supabase para backend (auth + PostgreSQL com RLS).

> Regras detalhadas por área estão nos subdiretórios:
> - `web/CLAUDE.md` — Web app (Next.js) + design system
> - `database/CLAUDE.md` — Banco de dados, migrations
> - `app/CLAUDE.md` — App mobile, design system mobile

## Build iOS local — Provisioning Profile

Antes de arquivar, verificar se o UUID `8a29fc14-d295-4dcc-9709-d8e18ab6094a` está instalado. Se o build falhar com "Provisioning profile doesn't include the Push Notifications capability", o profile correto está em `~/Downloads/`, não em `~/Library/MobileDevice/Provisioning Profiles/`:

```bash
cp ~/Downloads/"[expo]_comladoaladoapp_AppStore_20260121T165956793Z (1).mobileprovision" \
  ~/Library/MobileDevice/Provisioning\ Profiles/
```

Não remover `aps-environment` do entitlements como workaround — usar o profile correto.

---

## Nova feature ou atualização significativa — Checklist obrigatório

Sempre que uma nova funcionalidade for desenvolvida ou uma existente for significativamente alterada, atualizar **antes de considerar a tarefa concluída**:

1. **`README.md`** (raiz) — seção "Funcionalidades" correspondente + tabela de banco de dados (se nova tabela) + comentário `<!-- nicho: ... -->` se a descrição do app mudar

O `README.md` é a **fonte única de verdade** sobre o app. Todas as skills de Instagram (`/instagram-planner`, `/instagram-comment`, `/instagram-growth`) leem dele automaticamente via `grep "CONTEXTO DE MARKETING"`. Não há mais campos duplicados em outros arquivos.

---

## Versionamento — Padrão obrigatório

O app usa versionamento **x.y.z** com a seguinte semântica:

| Segmento | Quando incrementar |
|---|---|
| **x** (major) | Mudança estrutural incompatível (raro) |
| **y** (minor) | Nova funcionalidade visível ao usuário |
| **z** (patch) | Correção de bug ou ajuste sem nova funcionalidade |

**Regra de bump:**
- Ao fazer um novo build, incrementar **y** (minor) se houver pelo menos uma nova feature desde a última versão `x.(y-1).z`. Caso contrário, incrementar **z** (patch).
- O `buildNumber` em `app.json` deve sempre espelhar a versão: `"buildNumber": "<x.y.z>"`.
- O commit de bump deve ter a mensagem: `chore: bump versão para <x.y.z>`.

**Marcador de referência:** o commit `chore: bump versão para <versão>` é o ponto de corte para análise de mudanças. Para saber o que mudou em uma versão `x.y.z`, fazer `git log` desde o commit de bump da versão anterior (`x.(y-1).z` ou `x.y.(z-1)`).

**Geração do "O que há de novo":**

Ao preparar o texto para a App Store, analisar os commits desde o último bump e seguir estas regras:

1. Commits `feat:` / `feat(...):`  → descrever como **nova funcionalidade**, na perspectiva do usuário final, em linguagem simples e não técnica. Ex: `feat(feedings): adicionar relatório semanal` → "Agora você pode ver um resumo semanal das mamadas do seu bebê."
2. Commits `fix:` / `fix(...):` → **não listar individualmente**; agrupar em uma linha genérica no final: "Melhorias de estabilidade e correções de problemas."
3. Commits `chore:`, `docs:`, `refactor:`, `test:`, `ci:` → **ignorar** (não aparecem para o usuário).
4. Escrever em português, tom informal e caloroso — o público é pais e mães com bebê recém-nascido.

---

## Geração de imagens — Escopo restrito

Nunca usar geração de imagens (Gemini, Pollinations, HF ou qualquer outra IA) para criar assets do app (icon, splash, favicon, ilustrações, etc.) sem confirmação explícita do usuário. Geração de imagem é exclusiva para posts do Instagram (`/instagram-publisher`, `/instagram-planner`). Para qualquer outro uso, perguntar antes.

---

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
