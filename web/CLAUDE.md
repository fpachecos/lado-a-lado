# Web App — Lado a Lado

Next.js 15 (App Router), portal público de agendamento. Sem login — acesso anônimo via Supabase.

## Commands

```bash
npm run dev      # Dev server
npm run build    # Build de produção
npm run lint     # ESLint
```

## Routing

| Rota | Descrição |
|---|---|
| `/` | Formulário de código → redireciona para `/schedule/[code]` |
| `/schedule/[code]` | `page.tsx` (server, SSR) + `schedule-client.tsx` (client, interativo) |
| `/api/bookings` | `POST` cria/atualiza agendamento, `DELETE` cancela |
| `/privacy` | Política de privacidade (LGPD, pt-BR) |

## Architecture

- `lib/supabase.ts` — client anônimo, sem auth
- Acessa apenas `visit_slots` e `visit_bookings` do schema `ladoalado`
- Sem código compartilhado com o app mobile — só o banco é compartilhado
- Agendamentos são cacheados em `localStorage` para o visitante gerenciar entre sessões

## Environment Variables (`web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

---

## Design System

### Identidade Visual

| Elemento | Valor |
|---|---|
| Cor primária (Coral) | `#ff6f61` |
| Background (Bege) | `#f4e4bc` |
| Secundária (Mint) | `#a8d5ba` |
| Texto principal | `#2d2018` (marrom escuro quente) |
| Texto secundário | `#7a6050` |
| Texto terciário | `#a09080` |
| Erro | `#e03428` |
| Sucesso | `#18854a` |

### Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Display / Headings | `Fraunces` (serif orgânico, variável) | Títulos de página (`schedule-title`, `home-title`, `booking-name`) |
| Body / UI | `Nunito` (sans-serif arredondado) | Todo o restante |

Fontes carregadas via Google Fonts em `layout.tsx` com `preconnect`.

```css
font-family: var(--font-display); /* Fraunces */
font-family: var(--font-body);    /* Nunito */
```

### CSS Variables (globals.css)

**Cores e gradientes:**
```css
--primary           /* #ff6f61 */
--primary-light     /* #ff8a73 */
--primary-dark      /* #e85d50 */
--primary-gradient  /* linear-gradient coral */
--primary-focus     /* rgba coral, 0.22 — usado em focus rings */
--bg                /* gradiente multi-camadas warm beige */
--mint              /* #a8d5ba */
--mint-bg           /* rgba mint, 0.20 */
--mint-border       /* rgba mint, 0.50 */
```

**Texto:**
```css
--text              /* #2d2018 */
--text-secondary    /* #7a6050 */
--text-tertiary     /* #a09080 */
--text-footer       /* #8a7060 */
```

**Cards e sombras:**
```css
--card-bg           /* rgba branco, 0.74 */
--card-border       /* rgba warm, 0.28 */
--card-shadow       /* sombra quente sutil */
--btn-shadow        /* sombra coral para botões primários */
```

**Inputs:**
```css
--input-bg          /* rgba branco, 0.92 */
--input-border      /* rgba warm, 0.45 */
--input-focus-ring  /* rgba coral, 0.22 */
```

**Border-radius:**
```css
--radius-sm   /* 10px — inputs */
--radius-md   /* 14px — cards internos, slot cards */
--radius-lg   /* 22px — card principal */
--radius-xl   /* 28px — modais */
--radius-pill /* 999px — botões, pills */
```

### Classes de Componentes

**Containers:**
```css
.card           /* glass morphism: blur, border warm, shadow quente */
.pill           /* badge uppercase com cor primária */
```

**Botões:**
```css
.primary-button  /* gradiente coral, shadow, hover com lift */
.ghost-button    /* transparente com borda, hover sutil */
.danger-button   /* vermelho suave, sem fill — para ações destrutivas */
```

**Inputs:**
```css
.input           /* border 1.5px, focus ring coral */
```

**Layout de página (padrão):**
```css
.schedule-page / .home-page   /* flex column, animação fadeIn */
.schedule-header / .home-header  /* padding 30px 28px 22px, border-bottom */
.schedule-section / .home-section  /* padding 22px 28px, border-bottom */
.section-label   /* 10.5px, uppercase, letterSpacing 1.3px, tertiary */
```

**Slots de horário:**
```css
.slot-list         /* overflow scroll, gap 8px, scrollbar thin */
.slot-card         /* botão com border 1.5px, transition completa */
.slot-card--selected  /* glow coral + gradiente suave */
.slot-card--full      /* opacity 0.45, cursor not-allowed */
.slot-time         /* 14px bold */
.slot-duration     /* 11.5px secondary */
.slot-spots        /* 11.5px bold */
.slot-spots--available  /* verde #18854a */
.slot-spots--full       /* vermelho #c82020 */
```

**Booking card:**
```css
.booking-card          /* borda mint, fundo mint suave */
.booking-name          /* Fraunces 22px — nome do visitante */
.booking-details       /* flex column, gap 10px, border-top mint */
.booking-detail-label  /* 10px, uppercase, letterSpacing 0.9px */
.booking-detail-value  /* 13.5px, medium */
```

**Formulário:**
```css
.form-stack   /* flex column, gap 18px */
.form-field   /* flex column, gap 8px */
.form-label   /* 10.5px, uppercase, bold — rótulo do campo */
.form-hint    /* 12px, tertiary — texto auxiliar abaixo do campo */
```

**Status:**
```css
.status-error    /* fundo e borda vermelho suave */
.status-success  /* fundo e borda verde suave */
.action-row      /* flex column, gap 10px */
```

### Layout Padrão de Página

Toda página segue estrutura de **seções com divisores** — não usar padding/gap genérico no container:

```tsx
<main className="schedule-page">
  <header className="schedule-header">
    <span className="pill">Lado a Lado</span>
    <h1 className="schedule-title">Título</h1>
    <p className="schedule-subtitle">Descrição</p>
  </header>

  <section className="schedule-section">
    <p className="section-label">Rótulo da seção</p>
    {/* conteúdo */}
  </section>
</main>
```

O card externo (em `layout.tsx`) tem `padding: 0` e `overflow: hidden` — as seções controlam o próprio padding.

### Dark Mode e Acessibilidade

- Dark mode via `[data-theme="dark"]` no `<html>` — todas as variáveis CSS têm variante dark
- Modos de daltonismo via `[data-colorblind="protanopia|deuteranopia|tritanopia"]` — sobrescrevem apenas `--primary` e derivadas
- Estado persistido em `localStorage` e aplicado inline antes da hidratação (sem flash)
- Toggle de tema em `theme-toggle.tsx`, contexto em `theme-provider.tsx`

### Convenções

- **Cores hardcoded são proibidas** — usar sempre `var(--nome)` ou as classes CSS
- **Inline styles** apenas para overrides pontuais de dimensão/posição (`maxWidth`, `marginTop`)
- **Não usar Tailwind** — projeto usa CSS puro em `globals.css`
- Seções sempre com `.section-label` antes do conteúdo
- Botões destrutivos sempre como `.danger-button`, nunca inline style vermelho
