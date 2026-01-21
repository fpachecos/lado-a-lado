# Configuração de Ícones do Aplicativo

Os ícones do aplicativo estão localizados em `/Users/fipacheco/Downloads/IconKitchen-Output/ios/`.

## Passos para configurar os ícones:

1. **Copie o ícone principal:**
   ```bash
   cp /Users/fipacheco/Downloads/IconKitchen-Output/ios/AppIcon@2x.png /Users/fipacheco/lado-a-lado/assets/icon.png
   ```

2. **Crie o splash screen:**
   Você pode usar o mesmo ícone ou criar um splash screen personalizado. O arquivo deve ser salvo como:
   ```bash
   /Users/fipacheco/lado-a-lado/assets/splash.png
   ```

3. **Para iOS nativo (quando fizer build):**
   Os ícones em `/Users/fipacheco/Downloads/IconKitchen-Output/ios/` devem ser copiados para a pasta `ios/LadoALado/Images.xcassets/AppIcon.appiconset/` quando você fizer o build nativo.

## Tamanhos necessários:

- **icon.png**: 1024x1024px (para Expo)
- **splash.png**: 1242x2436px (para iPhone X e superiores)

## Nota:

Se você estiver usando EAS Build, os ícones serão processados automaticamente a partir do `app.json` quando você configurar o `icon` corretamente.

