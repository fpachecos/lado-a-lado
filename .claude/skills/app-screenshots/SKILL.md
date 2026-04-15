---
name: app-screenshots
version: 1.0.0
description: "Tira screenshots do app Lado a Lado nos tamanhos da App Store Connect (iPhone 6.5\" e iPad 13\")."
---

# app-screenshots

Captura 16 screenshots do app (8 por dispositivo) prontos para submissão no App Store Connect.

## Tamanhos gerados

| Dispositivo | Resolução final |
|---|---|
| iPhone 6.5" | 1242 × 2688 px |
| iPad 13" | 2048 × 2732 px |

## Comportamento

Quando o usuário invocar `/app-screenshots`:

1. **Perguntar credenciais** — solicitar ao usuário o e-mail e a senha da conta Supabase a usar para login no app web. Aguardar a resposta antes de continuar.

2. **Verificar servidor** — confirmar que o servidor Expo web está rodando em `http://localhost:8081`. Se não estiver, rodar:
   ```bash
   cd /Users/fipacheco/lado-a-lado && npx expo start --web --port 8081 &
   # aguardar ~10s e verificar com: curl -s http://localhost:8081 -o /dev/null -w "%{http_code}"
   ```

3. **Criar pasta de saída:**
   ```bash
   mkdir -p /Users/fipacheco/lado-a-lado/screenshots
   ```

4. **Rodar o script** passando as credenciais como variáveis de ambiente:
   ```bash
   cd /Users/fipacheco/lado-a-lado && \
   SCREENSHOT_EMAIL="<email_informado>" \
   SCREENSHOT_PASSWORD="<senha_informada>" \
   node take-screenshots.mjs
   ```
   Monitorar o output e reportar progresso ao usuário.

5. **Verificar dimensões** ao final:
   ```bash
   for f in screenshots/iphone65_01_home.png screenshots/ipad13_01_home.png; do
     sips -g pixelWidth -g pixelHeight "$f"
   done
   ```

6. **Exibir 2 previews** (iphone65_01_home.png e ipad13_01_home.png) usando o Read tool para confirmar que o conteúdo está correto.

7. Informar ao usuário o caminho `screenshots/` e que os arquivos estão prontos para upload no App Store Connect.

## Telas capturadas

1. Home (`/`)
2. Agendas de Visitas (`/schedules`)
3. Visitas confirmadas (`/visits`)
4. Bebê (`/baby`)
5. Mamadas (`/feedings`)
6. Relatório de Mamadas (`/feedings-report`)
7. Peso (`/weight`)
8. Perfil (`/profile`)

## Notas técnicas

- O script usa Playwright com `deviceScaleFactor` para gerar pixels corretos: viewport menor × escala = dimensão App Store.
- O botão "Entrar" é um `div` (React Native Web), não `<button>` — o seletor correto é `div[class*="r-cursor-1loqt21"]:has-text("Entrar")`.
- Credenciais **nunca** devem ser hardcoded no script; sempre passar via `SCREENSHOT_EMAIL` / `SCREENSHOT_PASSWORD`.
