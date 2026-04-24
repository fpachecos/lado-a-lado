---
name: remotion-video
version: 1.0.0
description: "Cria e renderiza vídeos do app Lado a Lado com Remotion. Usa prints reais do app, ícones nas cores do app (sem emojis) e segue a identidade visual do projeto."
---

# remotion-video

Cria, atualiza e renderiza vídeos do **Lado a Lado** usando Remotion. Os vídeos usam prints de tela reais do app, ícones nas cores da identidade visual (nunca emojis), e seguem a paleta e estrutura de componentes existentes.

## Uso

```
/remotion-video                        → novo vídeo (pergunta propósito e formato)
/remotion-video --render <id>          → renderiza composição existente
/remotion-video --render all           → renderiza todas as composições
/remotion-video --list                 → lista composições existentes
```

---

## Passo 1 — Perguntar propósito e formato (OBRIGATÓRIO)

Antes de qualquer ação, fazer as seguintes perguntas ao usuário:

> **1. Qual é o propósito do vídeo?**
> Ex: "Mostrar a funcionalidade de agendas", "Vídeo para o Instagram Stories explicando mamadas", "Preview para a App Store"

> **2. Onde será publicado / qual o formato?**
> - **Story / Reels (Instagram, TikTok)** → 1080×1920, vertical
> - **Feed quadrado (Instagram)** → 1080×1080, quadrado
> - **Landscape (YouTube, Web, App Store preview landscape)** → 1920×1080, horizontal
> - **App Store Preview (portrait)** → 886×1920, vertical

> **3. Duração desejada?**
> Se o usuário não souber, sugerir com base no formato:
> - Story/Reels: 15s (padrão) ou até 30s
> - Feed: 30–60s
> - Landscape/YouTube: 60s+
> - App Store Preview: 15–30s (recomendado pela Apple: 15–30s)

Com essas respostas, determinar:
- `width` e `height` da composição
- `durationInFrames` = duração × 30 (fps fixo = 30)
- ID e nome do arquivo de saída

---

## Passo 2 — Screenshots reais do app

**Todo vídeo deve usar prints reais do app.** Nunca usar placeholders, imagens de stock ou mockups sem conteúdo real.

### 2a. Pedir credenciais

Solicitar e-mail e senha da conta do app ao usuário (se não fornecidos na sessão).

### 2b. Verificar servidor Expo

```bash
curl -s http://localhost:8081 -o /dev/null -w "%{http_code}"
```

Se não retornar `200`, subir o servidor:
```bash
cd /Users/fipacheco/lado-a-lado && npx expo start --web --port 8081 &
```
Aguardar o servidor responder antes de continuar.

### 2c. Capturar screenshots relevantes

Rodar a skill `app-screenshots` com `--screen <rota>` para cada tela que aparecer no vídeo. Exemplos:

```bash
SCREENSHOT_EMAIL="<email>" SCREENSHOT_PASSWORD="<senha>" \
  node /Users/fipacheco/lado-a-lado/take-screenshots.mjs --screen schedules
```

Rotas disponíveis (principais):
| Rota | Tela |
|---|---|
| `/` | Home |
| `schedules` | Lista de agendas |
| `schedules/new` | Nova agenda |
| `feedings` | Mamadas |
| `feedings-report` | Relatório de mamadas |
| `weight` | Peso |
| `companion` | Acompanhantes |

### 2d. Validar screenshots antes de continuar

Abrir cada screenshot gerado e analisar visualmente:
- Se **vazia** (empty state, sem dados): parar e avisar o usuário antes de continuar. Pedir que cadastre dados reais no app.
- Se **com dados reais**: prosseguir.

### 2e. Copiar screenshots para o Remotion

```bash
cd /Users/fipacheco/lado-a-lado/remotion && node copy-screenshots.mjs
```

Verificar no output que os arquivos foram copiados para `public/screenshots/`. Se alguma tela não tiver mapeamento em `copy-screenshots.mjs`, adicionar a entrada correspondente antes de rodar.

---

## Passo 3 — Criar ou atualizar a composição

### Estrutura do projeto Remotion

```
remotion/
  src/
    Root.tsx                     ← registrar nova composição aqui
    compositions/                ← um arquivo por vídeo
    components/
      AppIcon.tsx                ← ícones vetoriais (Ionicons + MaterialCommunityIcons)
      HeroSlide.tsx              ← slide de abertura
      ProblemSlide.tsx           ← slide de problema
      DemoSlide.tsx              ← slide com telas do app
      BenefitSlide.tsx           ← slide de benefícios
      CTASlide.tsx               ← slide final de chamada
    constants/
      colors.ts                  ← paleta oficial do app
      timing.ts                  ← FPS, durações, sequências
  public/
    screenshots/                 ← prints do app (copiados via copy-screenshots.mjs)
    app-icon.png
    lado-a-lado-(single).mp3
  render-all.mjs
```

### Identidade visual obrigatória

**Paleta (de `src/constants/colors.ts`):**

| Variável | Cor | Hex |
|---|---|---|
| `C.coral` | Coral Suave | `#FF6F61` |
| `C.mint` | Verde-Menta | `#A8D5BA` |
| `C.mintDark` | Verde-Menta Escuro | `#7DB89A` |
| `C.beige` | Bege Quente | `#F4E4BC` |
| `C.peach` | Pêssego | `#FFD4BF` |
| `C.cream` | Creme | `#FCE8C4` |
| `C.amber` | Dourado Âmbar | `#F0C87A` |
| `C.brown` | Marrom Escuro | `#2D2018` |
| `C.white` | Branco Off | `#FAFAFA` |

Gradientes disponíveis: `GRADIENT_BG` (bege → âmbar, para fundos) e `GRADIENT_HERO` (coral, para slides de destaque).

**Ícones — regra obrigatória:**
- **Nunca usar emojis** em composições Remotion.
- Usar sempre o componente `<AppIcon name="..." size={N} color={C.coral} />`.
- Ícones disponíveis atualmente: `home-outline`, `trending-up-outline`, `people-outline`, `heart-outline`, `happy-outline`, `baby-bottle-outline`, `diaper-outline`.
- Para adicionar um novo ícone: localizar o codepoint em [ionicons.com](https://ionic.io/ionicons) ou na fonte MaterialCommunityIcons e adicionar ao objeto `ICONS` em `AppIcon.tsx`.

### Criar nova composição

1. Criar `remotion/src/compositions/<NomeVideo>.tsx` baseado na estrutura existente:
   - Importar `{ AbsoluteFill, Sequence }` do remotion
   - Importar `{ SEQS }` de `../constants/timing` (ou criar constantes próprias se a duração for diferente)
   - Importar `{ C }` de `../constants/colors`
   - Usar os slides existentes ou criar novos mantendo o padrão visual

2. Registrar em `remotion/src/Root.tsx`:
```tsx
import { <NomeVideo> } from "./compositions/<NomeVideo>";

// Adicionar dentro do <>...</>:
<Composition
  id="<NomeVideo>"
  component={<NomeVideo>}
  width={<W>}
  height={<H>}
  fps={30}
  durationInFrames={<D>}
/>
```

3. Adicionar script de render em `remotion/package.json`:
```json
"render:<nome>": "npx remotion render <NomeVideo> out/<nome>.mp4"
```

4. Adicionar ao `render-all.mjs` se fizer parte do conjunto padrão.

### Formato das sequências

Para vídeos de 15s (450 frames) usar as sequências de `timing.ts`:
```ts
SEQS.hero    // 0–105    (3.5s) — abertura com ícone + título
SEQS.problem // 75–180   (3.5s) — problema que o app resolve
SEQS.demo    // 150–375  (7.5s) — demo das telas do app
SEQS.benefit // 345–435  (3s)   — benefícios
SEQS.cta     // 420–450  (1s)   — call to action
```

Para durações diferentes, criar constantes locais na composição seguindo o mesmo padrão (cross-fades de 15 frames entre sequências).

---

## Passo 4 — Renderizar

### Renderizar composição específica

```bash
cd /Users/fipacheco/lado-a-lado/remotion
npx remotion render <NomeVideo> out/<nome>.mp4 --log=verbose
```

### Renderizar todas

```bash
cd /Users/fipacheco/lado-a-lado/remotion && node render-all.mjs
```

Verificar o arquivo gerado:
```bash
ls -lh /Users/fipacheco/lado-a-lado/remotion/out/<nome>.mp4
```

---

## Passo 5 — Apresentar resultado

Após renderizar com sucesso:
1. Informar o caminho do arquivo gerado: `remotion/out/<nome>.mp4`
2. Informar duração e resolução
3. Perguntar se o usuário quer ajustes ou está pronto para publicar

---

## Tratamento de erros comuns

| Erro | Causa | Ação |
|---|---|---|
| `Cannot find module` | Dependências não instaladas | `cd remotion && npm install` |
| `Font not loaded` (ícone não aparece) | Fonte .ttf ausente em `public/fonts/` | Verificar se `Ionicons.ttf` e `MaterialCommunityIcons.ttf` estão em `remotion/public/fonts/` |
| Screenshot vazio no vídeo | Arquivo não copiado para `public/screenshots/` | Rodar `node copy-screenshots.mjs` e verificar mapeamento |
| `Composition not found` | ID errado no render | Verificar registro em `Root.tsx` e ID exato |
| Vídeo com fundo preto | Sequência fora do range de frames | Conferir `from` + `durationInFrames` da composição |

---

## Notas

- FPS sempre 30 — não alterar para manter consistência entre composições
- Áudio padrão disponível: `staticFile("lado-a-lado-(single).mp3")` — usar via `<Html5Audio>`
- Para novos formatos (Square, Landscape): criar constantes próprias de timing; não reutilizar `SEQS` de Story diretamente
- `public/screenshots/` é o diretório que o Remotion enxerga via `staticFile("screenshots/<arquivo>.png")`
- Nunca hardcodar caminhos absolutos dentro das composições — usar sempre `staticFile()`
