# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lado a Lado** is a React Native / Expo app for managing baby visit schedules. It uses Expo Router for file-based navigation and Supabase as the backend (auth + PostgreSQL database with RLS).

## Commands

```bash
npx expo start      # Start Expo dev server
npm run ios         # Run on iOS simulator
npm run android     # Run on Android emulator
npm run web         # Run web version
```

No lint or test scripts are configured — Expo's defaults apply.

## Architecture

### Routing (Expo Router)
File-based routing under `app/`:
- `app/index.tsx` — Auth check entry point (redirects to login or tabs)
- `app/(auth)/` — Login, signup, forgot-password (unauthenticated routes)
- `app/(tabs)/` — Main app with tab navigation (home, baby profile, visits, schedules)
- `app/(tabs)/schedules/[id].tsx` — Dynamic route for schedule details

### Backend (Supabase)
- Client configured in `lib/supabase.ts`
- Database schema in `database/schema.sql` — schema name is `ladoalado`
- Tables: `profiles`, `babies`, `visit_schedules`, `visit_slots`, `visit_bookings`
- Row Level Security (RLS) enforced — users only access their own data
- Shared schedules use a GUID (`shared_id`) for public access without auth

### Monetization
- `lib/revenuecat.ts` — RevenueCat integration for in-app purchases
- Free tier: 1-day schedules only; premium unlocks multi-day schedules

### State & Data
- No global state manager — data fetching via direct Supabase calls in each screen
- `@react-native-async-storage/async-storage` for local persistence
- `date-fns` for date manipulation

### UI
- Colors defined in `constants/Colors.ts` — Coral (`#FF6F61`), Beige (`#F4E4BC`), Mint (`#A8D5BA`)
- `components/DatePicker.tsx` and `components/TimePicker.tsx` are shared UI components
- Animations via `react-native-reanimated`

### Environment Variables
Required in `.env`:
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=
```

### TypeScript
- Strict mode enabled
- Path alias `@/*` maps to the repo root
- Database entity types in `types/database.ts`

## Web App (`web/`)

Separate Next.js 15 app — the public-facing booking portal for visitors (no login required).

### Commands

```bash
cd web
npm run dev     # Start dev server
npm run build   # Build for production
npm run lint    # Run ESLint
```

### Routing (Next.js App Router)

- `/` — Home: code input form, redirects to `/schedule/[code]`
- `/schedule/[code]` — Schedule page: server component fetches data, `schedule-client.tsx` handles interactive booking UI
- `/api/bookings` — REST endpoint: `POST` to create/update a booking, `DELETE` to cancel
- `/privacy` — Privacy policy (LGPD, pt-BR)

### Architecture

- `web/lib/supabase.ts` — Supabase client (anonymous key, no auth — public access only)
- Accesses the same `ladoalado` schema as the mobile app, but only `visit_slots` and `visit_bookings`
- No shared code between `web/` and the root app — just shared database
- `schedule/[code]/page.tsx` is a server component for SSR data fetching; `schedule-client.tsx` is the interactive client component
- Bookings are cached in `localStorage` so visitors can manage them across sessions

### Environment Variables

Required in `web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Styling
- Plain CSS in `web/app/globals.css` (no Tailwind)
- Glass morphism cards, warm peach gradient background
- Accent color matches mobile app: `#ff6f61` (Coral)
