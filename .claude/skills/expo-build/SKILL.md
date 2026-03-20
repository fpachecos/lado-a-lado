---
name: expo-build
version: 1.0.0
description: "Expo / EAS: Build the Lado a Lado app via EAS Build."
---

# expo-build

Build the Lado a Lado React Native app using EAS Build.

## Profiles disponíveis

| Profile | Distribuição | Uso |
|---------|-------------|-----|
| `development` | Internal (TestFlight/link) | Build com devClient para desenvolvimento |
| `preview` | Internal (TestFlight/link) | Build de preview para testes internos |
| `production` | App Store / Play Store | Build de produção |

## Plataformas disponíveis

- `ios` — apenas iOS
- `android` — apenas Android
- `all` — ambas as plataformas

## Comportamento

Quando o usuário invocar `/expo-build`:

1. Se o usuário não especificou **profile**, pergunte qual deseja (`development`, `preview` ou `production`).
2. Se o usuário não especificou **plataforma**, pergunte qual deseja (`ios`, `android` ou `all`).
3. Confirme os parâmetros antes de executar.
4. Execute o comando a partir do diretório `/Users/fipacheco/lado-a-lado`:

```bash
cd /Users/fipacheco/lado-a-lado && eas build --profile <profile> --platform <platform>
```

5. Após iniciar, informe o usuário que o build foi enfileirado no EAS e que pode acompanhar o status em https://expo.dev.

## Exemplos de comandos gerados

```bash
# Preview para iOS
eas build --profile preview --platform ios

# Produção para ambas as plataformas
eas build --profile production --platform all

# Development para iOS
eas build --profile development --platform ios
```

## Notas

- O EAS CLI (`eas`) precisa estar instalado e o usuário precisa estar logado (`eas whoami`).
- Builds são executados remotamente nos servidores da Expo — não requer Xcode local para iOS.
- Para submeter à App Store após o build de produção, use `eas submit --platform ios`.
