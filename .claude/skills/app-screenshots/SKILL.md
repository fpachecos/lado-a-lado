---
name: app-screenshots
version: 2.0.0
description: "Tira screenshots do app Lado a Lado nos tamanhos da App Store Connect (iPhone 6.5\" e iPad 13\"). Descobre todas as telas automaticamente — basta rodar quando o app crescer."
---

# app-screenshots

Captura screenshots de **todas as telas** do app, prontos para submissão no App Store Connect. As telas são descobertas dinamicamente escaneando `app/(tabs)/` — nenhuma lista hardcoded.

## Tamanhos gerados

| Dispositivo | Resolução final |
|---|---|
| iPhone 6.5" | 1242 × 2688 px |
| iPad 13" | 2048 × 2732 px |

## Comportamento

Quando o usuário invocar `/app-screenshots`:

1. **Pedir credenciais** — solicitar e-mail e senha da conta a usar para login. Aguardar resposta.

2. **Verificar servidor Expo web** — confirmar que `http://localhost:8081` responde:
   ```bash
   curl -s http://localhost:8081 -o /dev/null -w "%{http_code}"
   ```
   Se retornar algo diferente de `200`, subir o servidor em background:
   ```bash
   cd /Users/fipacheco/lado-a-lado && npx expo start --web --port 8081 &
   ```
   Aguardar até o servidor responder antes de continuar.

3. **Rodar o script** com as credenciais:
   ```bash
   cd /Users/fipacheco/lado-a-lado && \
   SCREENSHOT_EMAIL="<email>" \
   SCREENSHOT_PASSWORD="<senha>" \
   node take-screenshots.mjs
   ```
   Monitorar o output com Monitor tool e reportar progresso em tempo real.

4. **Verificar dimensões** após conclusão:
   ```bash
   for f in screenshots/iphone65_01_home.png screenshots/ipad13_01_home.png; do
     sips -g pixelWidth -g pixelHeight "$f"
   done
   ```

5. **Exibir 2 previews** (iphone65 e ipad13 da tela home) via Read tool para confirmar visual.

6. Listar todos os arquivos gerados e informar o caminho `screenshots/`.

## Como o script descobre as telas

O script (`take-screenshots.mjs`) escaneia `app/(tabs)/` recursivamente:
- Ignora `_layout.tsx` e diretórios de grupo `(auth)`
- Converte cada arquivo em rota Expo Router (remove grupos `(tabs)`, converte `index` em `/`)
- Para **rotas dinâmicas** (`[id].tsx`): consulta o Supabase com a anon key do `.env` para obter um ID real. Mapeamento atual:

| Rota dinâmica | Tabela Supabase |
|---|---|
| `/companion/[id]` | `companions` |
| `/companion-activities/[id]` | `companions` |
| `/schedules/[id]` | `visit_schedules` |

Se nenhum dado for encontrado para uma rota dinâmica, ela é pulada com aviso.

## Quando adicionar novas rotas dinâmicas

Se uma nova tela `[id].tsx` for criada em um diretório ainda não mapeado, edite o objeto `DYNAMIC_RESOLVERS` em `take-screenshots.mjs`:

```js
const DYNAMIC_RESOLVERS = {
  'nome-do-diretorio': { table: 'tabela_supabase', col: 'id' },
  // ...
};
```

## Notas técnicas

- `deviceScaleFactor` garante as dimensões corretas: viewport menor × escala = pixel final
- O botão "Entrar" é um `div` (React Native Web), seletor: `div[class*="r-cursor-1loqt21"]:has-text("Entrar")`
- Credenciais **nunca** hardcoded — sempre via `SCREENSHOT_EMAIL` / `SCREENSHOT_PASSWORD`
- O script lê `.env` automaticamente para pegar `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`
