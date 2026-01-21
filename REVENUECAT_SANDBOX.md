# Configuração do RevenueCat Sandbox

## Como o RevenueCat detecta Sandbox

O RevenueCat **detecta automaticamente** quando você está usando o ambiente sandbox baseado na conta do App Store usada no dispositivo. Não é necessário configurar uma chave de API separada.

## Passos para usar Sandbox

### 1. Criar Conta Sandbox no App Store Connect

1. Acesse [App Store Connect](https://appstoreconnect.apple.com)
2. Vá em **Users and Access** > **Sandbox Testers**
3. Clique em **+** para criar um novo usuário sandbox
4. Preencha:
   - Email (não precisa ser real, mas deve ser único)
   - Senha
   - País/Região
   - Respostas de segurança

### 2. Configurar no Dispositivo iOS

1. No seu iPhone/iPad, vá em **Settings** > **App Store**
2. Faça logout da sua conta Apple atual (se houver)
3. **NÃO faça login** com a conta sandbox aqui
4. Quando você tentar fazer uma compra no app, o iOS pedirá para fazer login
5. Use a conta sandbox criada no passo 1

### 3. Verificar no Dashboard do RevenueCat

1. Acesse o [Dashboard do RevenueCat](https://app.revenuecat.com)
2. No menu superior, ative o toggle **"View Sandbox Data"**
3. Agora você verá apenas eventos e compras do ambiente sandbox

### 4. Configurações do Projeto no RevenueCat

1. No Dashboard do RevenueCat, vá em **Project Settings** > **General**
2. Certifique-se de que **"Sandbox Testing Access"** está **ATIVADO**
   - Isso permite que compras sandbox concedam entitlements (acesso premium)
   - Se estiver desativado, o app não reconhecerá compras sandbox como válidas

## Como Verificar se está usando Sandbox

### No Código

O código já está configurado para mostrar logs em desenvolvimento:

```typescript
// Em desenvolvimento, os logs mostrarão:
// "RevenueCat initialized in SANDBOX mode"
```

### No Dashboard

- Compras sandbox aparecem com um indicador especial
- Ative "View Sandbox Data" para ver apenas dados sandbox
- Compras sandbox têm um timestamp diferente e são marcadas como "Sandbox"

### No App

- Quando você fizer uma compra usando uma conta sandbox, o RevenueCat detecta automaticamente
- O entitlement será concedido normalmente
- Você verá logs no console indicando que é uma compra sandbox

## Variáveis de Ambiente

Você pode adicionar ao `.env` (opcional):

```env
# Força o uso de sandbox (já é automático em __DEV__)
EXPO_PUBLIC_REVENUECAT_USE_SANDBOX=true
```

**Nota:** O RevenueCat detecta automaticamente o sandbox baseado na conta usada. Esta variável é apenas para logs e não é necessária.

## Troubleshooting

### Compras sandbox não estão funcionando

1. ✅ Verifique se criou a conta sandbox no App Store Connect
2. ✅ Certifique-se de que "Sandbox Testing Access" está ativado no RevenueCat
3. ✅ Use a conta sandbox quando o iOS pedir login durante a compra
4. ✅ Verifique os logs no console do app
5. ✅ Ative "View Sandbox Data" no dashboard do RevenueCat

### Não consigo ver ofertas

1. Verifique se as ofertas estão configuradas no RevenueCat Dashboard
2. Verifique se o entitlement "premium" está configurado
3. Verifique se os produtos estão configurados no App Store Connect
4. Verifique os logs no console para erros

## Diferença entre Preview e Sandbox

- **Preview**: Ambiente de desenvolvimento no RevenueCat Dashboard (para testar configurações)
- **Sandbox**: Ambiente de teste real usando contas sandbox do App Store (para testar compras reais)

Para testar compras, você **deve usar Sandbox**, não Preview.

