# Setup — Lado a Lado

## 1. Instalar Dependências

```bash
npm install
```

## 2. Variáveis de Ambiente

Crie `.env` na raiz:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=sua_chave_revenuecat_ios
```

- **Supabase URL e Key**: Dashboard > Settings > API
- **RevenueCat Key**: Dashboard > API Keys

## 3. Banco de Dados

Execute os scripts em `database/` no SQL Editor do Supabase, na ordem descrita em `database/README.md`.

## 4. Executar

```bash
npm run ios       # iOS Simulator
npm run android   # Android
npm start         # Dev server (depois pressione 'i' ou 'a')
```

## Troubleshooting

**Erro: "Supabase URL ou chave não configurada"**
- Verifique se `.env` está na raiz e as variáveis começam com `EXPO_PUBLIC_`

**Erro ao executar SQL**
- Execute os scripts na ordem correta (ver `database/README.md`)
- Os scripts usam `IF NOT EXISTS`, são idempotentes

**Erro: "Slot sobrepõe outro slot"**
- Comportamento esperado — o sistema impede sobreposição de horários

**Erro de cache / `getDevServer is not a function`**
```bash
rm -rf node_modules .expo
npm install
npx expo start --clear
```
