# Solução para Incompatibilidade do Expo Go

## Problema
O projeto está usando Expo SDK 51, mas o Expo Go instalado no dispositivo é para SDK 54.

## Soluções

### Opção 1: Usar iOS Simulator (Recomendado para desenvolvimento)

O iOS Simulator permite usar qualquer versão do Expo Go. Execute:

```bash
npm start
# Depois pressione 'i' para abrir no iOS Simulator
```

Ou diretamente:
```bash
npm run ios
```

### Opção 2: Atualizar para SDK 54 (Recomendado para produção)

Para usar o Expo Go mais recente no dispositivo físico, atualize o projeto:

```bash
# Atualizar Expo CLI
npm install -g expo-cli@latest

# Atualizar o projeto para SDK 54
npx expo install expo@latest

# Instalar dependências compatíveis
npx expo install --fix
```

**Nota:** Isso pode requerer ajustes no código se houver breaking changes.

### Opção 3: Criar Development Build

Para ter controle total sobre a versão, crie um development build:

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Configurar EAS
eas build:configure

# Criar build de desenvolvimento
eas build --profile development --platform ios
```

## Status Atual

✅ **Assets criados:** splash.png, adaptive-icon.png, favicon.png
✅ **Dependências instaladas:** Compatíveis com SDK 51
✅ **Projeto pronto para:** iOS Simulator ou atualização para SDK 54

## Próximos Passos

1. **Para desenvolvimento rápido:** Use `npm run ios` (iOS Simulator)
2. **Para testar no dispositivo:** Atualize para SDK 54 ou crie development build
3. **Para produção:** Atualize para SDK 54 e teste completamente

