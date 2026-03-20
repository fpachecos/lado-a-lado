---
name: expo-start
version: 1.0.0
description: "Expo: Sobe o servidor de desenvolvimento local do Lado a Lado."
---

# expo-start

Sobe o servidor de desenvolvimento local da aplicação Lado a Lado com o Expo.

## Comportamento

Quando o usuário invocar `/expo-start`:

1. Inicie o servidor em background a partir de `/Users/fipacheco/lado-a-lado`:

```bash
cd /Users/fipacheco/lado-a-lado && npx expo start
```

2. Aguarde alguns segundos e confirme que o servidor subiu (porta 8081).
3. Informe o usuário que o servidor está rodando em **http://localhost:8081** e que pode escanear o QR code com o Expo Go ou o dev client.

## Para derrubar o servidor

```bash
kill $(lsof -ti:8081)
```
