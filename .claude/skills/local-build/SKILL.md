---
name: local-build
version: 1.0.0
description: "Build local do Lado a Lado para iOS usando xcodebuild — gera IPA sem usar o EAS cloud."
---

# local-build

Faz o build local do Lado a Lado para iOS usando `xcodebuild`, produzindo um IPA pronto para envio ao TestFlight.

## Pré-requisitos

- Xcode instalado e configurado (`xcode-select`)
- CocoaPods (`gem install cocoapods`)
- Certificado de distribuição importado no Keychain: `iPhone Distribution: Filipe Pacheco (3C5K4JRZHX)` (fingerprint `D438217E2D1F4CF73491DA06BA75D0F1AF4F32AF`)
- Provisioning profile instalado em `~/Library/MobileDevice/Provisioning Profiles/`
- Plataforma iOS instalada no Xcode (`xcodebuild -downloadPlatform iOS` se necessário)

## Comportamento

Quando o usuário invocar `/local-build`:

1. Rodar `expo prebuild` para gerar/atualizar a pasta `ios/`:

```bash
cd /Users/fipacheco/lado-a-lado && unset NODE_OPTIONS && npx expo prebuild --platform ios --clean
```

2. Instalar pods:

```bash
cd /Users/fipacheco/lado-a-lado/ios && unset NODE_OPTIONS && pod install
```

3. Incrementar o `buildNumber` no `app.json` antes de arquivar — a App Store Connect rejeita builds com versão igual ou inferior à última enviada. Ler o valor atual, incrementar o último componente e salvar:

```bash
node -e "
const fs = require('fs');
const path = '/Users/fipacheco/lado-a-lado/app.json';
const json = JSON.parse(fs.readFileSync(path, 'utf8'));
const current = json.expo.ios.buildNumber;
const parts = current.split('.');
parts[parts.length - 1] = String(Number(parts[parts.length - 1]) + 1);
json.expo.ios.buildNumber = parts.join('.');
fs.writeFileSync(path, JSON.stringify(json, null, 2) + '\n');
console.log('buildNumber:', current, '->', json.expo.ios.buildNumber);
"
```

4. Obter o UUID do provisioning profile mais recente:

```bash
security cms -D -i "$HOME/Library/MobileDevice/Provisioning Profiles/c84f35bb-d964-4178-b4c0-b78dbc855d01.mobileprovision" | grep -A1 "<key>UUID" | grep "<string>" | sed 's/.*<string>\(.*\)<\/string>.*/\1/'
```

   > O profile correto é o mais recente: `*[expo] com.ladoalado.app AppStore` com UUID `d584b4c2-d3d4-4ded-bf59-478d269b5adf`.

5. Arquivar o app:

```bash
cd /Users/fipacheco/lado-a-lado && xcodebuild \
  -workspace ios/ladoalado.xcworkspace \
  -scheme LadoaLado \
  -configuration Release \
  -destination 'generic/platform=iOS' \
  CODE_SIGN_IDENTITY="iPhone Distribution" \
  DEVELOPMENT_TEAM="3C5K4JRZHX" \
  CODE_SIGN_STYLE="Manual" \
  PROVISIONING_PROFILE="d584b4c2-d3d4-4ded-bf59-478d269b5adf" \
  archive -archivePath /tmp/ladoalado.xcarchive
```

6. Exportar o IPA:

```bash
xcodebuild -exportArchive \
  -archivePath /tmp/ladoalado.xcarchive \
  -exportOptionsPlist /tmp/ExportOptions.plist \
  -exportPath /tmp/ladoalado-export
```

   O arquivo `/tmp/ExportOptions.plist` deve conter:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store-connect</string>
    <key>teamID</key>
    <string>3C5K4JRZHX</string>
    <key>signingStyle</key>
    <string>manual</string>
    <key>provisioningProfiles</key>
    <dict>
        <key>com.ladoalado.app</key>
        <string>d584b4c2-d3d4-4ded-bf59-478d269b5adf</string>
    </dict>
    <key>uploadBitcode</key>
    <false/>
    <key>uploadSymbols</key>
    <true/>
    <key>destination</key>
    <string>export</string>
</dict>
</plist>
```

7. Informar que o IPA foi gerado em `/tmp/ladoalado-export/LadoaLado.ipa` e abrir a pasta:

```bash
open /tmp/ladoalado-export/
```

8. Abrir um PR com a alteração do `app.json` (novo `buildNumber`):

```bash
cd /Users/fipacheco/lado-a-lado
NEW_BUILD=$(node -e "const j=require('./app.json');console.log(j.expo.ios.buildNumber)")
git checkout -b "chore/bump-build-number-${NEW_BUILD}"
git add app.json
git commit -m "chore: bump iOS buildNumber para ${NEW_BUILD}"
git push -u origin "chore/bump-build-number-${NEW_BUILD}"
gh pr create \
  --title "chore: bump iOS buildNumber para ${NEW_BUILD}" \
  --body "Atualiza o \`buildNumber\` do \`app.json\` após build local de produção."
```

## Notas importantes

- **`unset NODE_OPTIONS`** é obrigatório antes de `expo prebuild` e `pod install`. O VS Code injeta `--require .../bootloader.js` na variável `NODE_OPTIONS`, o que corrompe o `require.resolve` nos podspecs do React Native e faz o pod install falhar.
- O scheme correto no workspace é `LadoaLado` (com L maiúsculo), não `ladoalado`.
- O provisioning profile UUID `d584b4c2-d3d4-4ded-bf59-478d269b5adf` é o mais recente (criado em 2026-03-22). Se expirar ou for renovado, obter o novo UUID com `security cms -D -i "$HOME/Library/MobileDevice/Provisioning Profiles/<arquivo>.mobileprovision"`.
- O upload para TestFlight deve ser feito manualmente via Transporter ou com `xcrun altool --upload-app --type ios --file /tmp/ladoalado-export/LadoaLado.ipa --username <apple-id> --password <app-specific-password>`.
- Este fluxo **não** usa `expo prebuild --clean` se apenas quiser recompilar sem regenerar o projeto nativo — omita o passo 1 nesse caso.
