# Expo Go — Compatibilidade de SDK

## Opções se o Expo Go não conectar

**Opção 1: iOS Simulator (mais simples)**
```bash
npm run ios
```

**Opção 2: Development Build via EAS**
```bash
eas build --profile development --platform ios
```

**Opção 3: Atualizar SDK do projeto**
```bash
npx expo install expo@latest
npx expo install --fix
```
