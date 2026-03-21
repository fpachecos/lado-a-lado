# App Mobile — Lado a Lado

React Native / Expo com Expo Router. Telas em `app/(tabs)/`, componentes compartilhados em `components/`.

## Design System Mobile

### Paleta (`constants/Colors.ts`)

**Cores base:**
```ts
Colors.primary      // '#FF6F61' — Coral (cor de ação principal)
Colors.background   // '#F4E4BC' — Bege quente (fundo de tela)
Colors.secondary    // '#A8D5BA' — Mint (acento, acompanhantes)
Colors.text         // '#2D2018' — Marrom escuro quente
Colors.textSecondary // '#7A6050'
Colors.textTertiary  // '#A09080' — rótulos uppercase, labels
Colors.error        // '#E03428'
Colors.success      // '#18854A'
Colors.white        // '#FAFAFA'
Colors.neutral      // '#E8E0D8' — divisores, bordas de menu
```

**Glass effects:**
```ts
Colors.glass            // rgba branco 0.30 — fundo de cards leves
Colors.glassDark        // rgba branco 0.45 — fundo de modais
Colors.glassBorder      // rgba branco 0.22 — bordas glass
Colors.glassBackground  // rgba branco 0.18 — cards sutis
```

**Cards temáticos:**
```ts
Colors.cardWarm     // rgba warm 0.85 — card principal (baby)
Colors.cardMint     // rgba mint 0.15 — card de acompanhante
Colors.cardPrimary  // rgba coral 0.08 — destaque primário
```

**Bordas:**
```ts
Colors.borderWarm    // rgba warm 0.35
Colors.borderMint    // rgba mint 0.50
Colors.borderPrimary // rgba coral 0.30
```

**Sombras (iOS):**
```ts
Colors.shadowWarm      // rgba warm 0.12 — sombra principal de cards
Colors.shadowWarmLight // rgba warm 0.06 — sombra sutil
```

**Search:**
```ts
Colors.searchGlass  // rgba branco 0.92 — barra de busca
Colors.searchBorder // rgba warm 0.35
```

### Padrões de Card

**Card principal (ex: baby card):**
```ts
{
  backgroundColor: Colors.cardWarm,
  borderRadius: 24,
  padding: 20,
  borderWidth: 1,
  borderColor: Colors.borderWarm,
  shadowColor: Colors.shadowWarm,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 1,
  shadowRadius: 16,
  elevation: 3,
}
```

**Card secundário (ex: companion card):**
```ts
{
  backgroundColor: Colors.cardMint,
  borderRadius: 20,
  padding: 16,
  borderWidth: 1,
  borderColor: Colors.borderMint,
  shadowColor: Colors.shadowWarmLight,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 1,
  shadowRadius: 8,
  elevation: 2,
}
```

**Card glass (ex: premium, modais):**
```ts
{
  backgroundColor: Colors.glassBackground,
  borderRadius: 24,
  padding: 20,
  borderWidth: 1,
  borderColor: Colors.glassBorder,
}
```

### Tipografia

Sem fontes customizadas — usar pesos e tamanhos do sistema:

| Papel | fontSize | fontWeight | Cor |
|---|---|---|---|
| Título de tela | 34 | '800' | `Colors.text` |
| Eyebrow / subtítulo | 13 | '600' | `Colors.textSecondary` |
| Nome principal (card) | 22 | '700' | `Colors.primary` |
| Nome secundário | 16 | '700' | `Colors.text` |
| Label uppercase | 11 | '800' | `Colors.textTertiary` |
| Body | 14–15 | '500' | `Colors.textSecondary` |
| Botão | 15 | '700' | branco |

Labels uppercase sempre com `letterSpacing: 1` e `textTransform: 'uppercase'`.

### Botão Primário

```ts
{
  backgroundColor: Colors.primary,
  borderRadius: 99,           // pill
  paddingVertical: 13,
  paddingHorizontal: 28,
  shadowColor: Colors.primary,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.30,
  shadowRadius: 10,
  elevation: 4,
}
```

### Botão Dashed "Adicionar"

```ts
{
  borderRadius: 20,
  paddingVertical: 13,
  borderWidth: 1.5,
  borderColor: Colors.secondary,
  borderStyle: 'dashed',
  // texto: Colors.secondary, fontWeight '700'
}
```

### Avatar de Inicial

```ts
// Container
{ width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.secondary }
// Texto
{ fontSize: 18, fontWeight: '700', color: '#fff' }
// Inicial: companion.name.charAt(0).toUpperCase()
```

### Modal com BlurView

```ts
// Overlay
{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' }
// Conteúdo (BlurView)
{ backgroundColor: Colors.glassDark, borderRadius: 28, padding: 8,
  minWidth: 290, borderWidth: 1, borderColor: Colors.glassBorder, overflow: 'hidden' }
// Handle visual no topo
{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.neutral, alignSelf: 'center' }
// Menu item
{ paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.neutral }
```

### Componentes Compartilhados

| Componente | Arquivo | Descrição |
|---|---|---|
| `DatePicker` | `components/DatePicker.tsx` | Seletor de data com modal e BlurView |
| `TimePicker` | `components/TimePicker.tsx` | Seletor de hora HH:MM |
| `MarkdownEditor` | `components/MarkdownEditor.tsx` | Editor com toolbar Bold/Italic/Lista |
| `MarkdownRenderer` | `components/MarkdownRenderer.tsx` | Renderizador de markdown em RN |
