# RevenueCat — Sandbox

O RevenueCat detecta automaticamente o ambiente sandbox pela conta do App Store usada no dispositivo. Não é necessária uma chave de API separada.

## Passos para testar compras sandbox

1. **Criar conta sandbox:** App Store Connect > Users and Access > Sandbox Testers > +
2. **No dispositivo:** Settings > App Store — faça logout da conta Apple pessoal. Durante a compra no app, o iOS pedirá login — use a conta sandbox criada.
3. **Ver dados sandbox no dashboard:** Ative o toggle "View Sandbox Data" em app.revenuecat.com
4. **Ativar sandbox testing:** Project Settings > General > "Sandbox Testing Access" deve estar ATIVADO

## Troubleshooting

- Compras não funcionam: verifique se "Sandbox Testing Access" está ativo no RevenueCat
- Ofertas não aparecem: confirme que os produtos e entitlement "premium" estão configurados no RevenueCat e no App Store Connect
