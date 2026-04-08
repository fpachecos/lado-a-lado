# Erro "getDevServer is not a function"

Geralmente causado por cache corrompido. Solução:

```bash
rm -rf node_modules .expo package-lock.json
npm install
npx expo start --clear
```

Se persistir, use o iOS Simulator diretamente:
```bash
npm run ios
```
