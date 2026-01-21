# Solução para Erro "getDevServer is not a function"

Este erro geralmente ocorre devido a problemas de cache ou incompatibilidade de versões do Expo.

## Soluções Aplicadas

1. ✅ Cache limpo (`.expo`, `node_modules/.cache`)
2. ✅ Dependências reinstaladas
3. ✅ Servidor iniciado com `--clear`

## Se o Erro Persistir

### Opção 1: Limpar Tudo e Reinstalar

```bash
# Parar o servidor (Ctrl+C)
rm -rf node_modules
rm -rf .expo
rm package-lock.json
npm install --legacy-peer-deps
npx expo start --clear
```

### Opção 2: Usar iOS Simulator Diretamente

O erro pode não ocorrer no simulador:

```bash
npm run ios
```

### Opção 3: Verificar Versão do Expo Go

Certifique-se de que o Expo Go no dispositivo está atualizado para SDK 54.

### Opção 4: Criar Development Build

Se o problema persistir com Expo Go, considere criar um development build:

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Configurar
eas build:configure

# Criar build de desenvolvimento
eas build --profile development --platform ios
```

### Opção 5: Verificar Configuração do Metro

Crie um arquivo `metro.config.js` na raiz:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

module.exports = config;
```

## Status Atual

- ✅ Dependências instaladas
- ✅ Cache limpo
- ✅ Servidor iniciado com `--clear`

O servidor deve estar rodando. Tente acessar novamente. Se o erro persistir, use uma das opções acima.

