---
name: local-build
version: 2.1.0
description: "Build local do Lado a Lado para iOS usando xcodebuild + envio automático para a Apple via altool. Submissão para revisão requer pedido explícito."
---

# local-build

Faz o build local do Lado a Lado para iOS usando `xcodebuild` e envia o IPA para a Apple (App Store Connect / TestFlight) ao final. **A submissão para revisão nunca é feita automaticamente — requer pedido explícito do usuário.**

## Pré-requisitos

- Xcode instalado e configurado (`xcode-select`)
- CocoaPods (`gem install cocoapods`)
- Certificado de distribuição no Keychain: `iPhone Distribution: Filipe Pacheco (3C5K4JRZHX)`
- Provisioning profile UUID `8a29fc14-d295-4dcc-9709-d8e18ab6094a` instalado em `~/Library/MobileDevice/Provisioning Profiles/`
- App Store Connect API Key em `~/.appstoreconnect/private_keys/AuthKey_T99JTPPJP3.p8`

## Comportamento

Quando o usuário invocar `/local-build`, executar todos os passos abaixo em sequência, sem pedir confirmação entre eles — **exceto o passo 7 (submissão para revisão)**, que requer confirmação explícita.

---

### 1. Verificar / instalar o provisioning profile correto

```bash
for f in ~/Library/MobileDevice/Provisioning\ Profiles/*.mobileprovision; do
  uuid=$(security cms -D -i "$f" 2>/dev/null | python3 -c "import sys,plistlib; d=plistlib.loads(sys.stdin.buffer.read()); print(d.get('UUID',''))" 2>/dev/null)
  echo "$uuid — $(basename $f)"
done
```

Se `8a29fc14-d295-4dcc-9709-d8e18ab6094a` não aparecer, copiar do Downloads:

```bash
cp ~/Downloads/"[expo]_comladoaladoapp_AppStore_20260121T165956793Z (1).mobileprovision" \
  ~/Library/MobileDevice/Provisioning\ Profiles/
```

---

### 2. Instalar pods (se necessário)

```bash
cd /Users/fipacheco/lado-a-lado/ios && unset NODE_OPTIONS && pod install
```

> Pular se `Podfile.lock` não tiver mudado desde o último build.

---

### 3. Arquivar o app

```bash
mkdir -p /tmp/ladoalado-build

xcodebuild archive \
  -workspace /Users/fipacheco/lado-a-lado/ios/LadoaLado.xcworkspace \
  -scheme LadoaLado \
  -configuration Release \
  -archivePath /tmp/ladoalado-build/LadoaLado.xcarchive \
  -destination "generic/platform=iOS" \
  CODE_SIGN_STYLE=Manual \
  CODE_SIGN_IDENTITY="iPhone Distribution: Filipe Pacheco (3C5K4JRZHX)" \
  PROVISIONING_PROFILE="8a29fc14-d295-4dcc-9709-d8e18ab6094a" \
  DEVELOPMENT_TEAM=3C5K4JRZHX \
  2>&1
```

---

### 4. Exportar IPA

Criar `/tmp/ladoalado-build/ExportOptions.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>3C5K4JRZHX</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>com.ladoalado.app</key>
    <string>8a29fc14-d295-4dcc-9709-d8e18ab6094a</string>
  </dict>
  <key>uploadBitcode</key>
  <false/>
  <key>uploadSymbols</key>
  <true/>
</dict>
</plist>
```

Exportar:

```bash
xcodebuild -exportArchive \
  -archivePath /tmp/ladoalado-build/LadoaLado.xcarchive \
  -exportPath /tmp/ladoalado-build/export \
  -exportOptionsPlist /tmp/ladoalado-build/ExportOptions.plist \
  2>&1
```

---

### 5. Enviar para a Apple (automático)

```bash
xcrun altool --upload-app \
  -f /tmp/ladoalado-build/export/LadoaLado.ipa \
  -t ios \
  --apiKey T99JTPPJP3 \
  --apiIssuer 69a6de94-b937-47e3-e053-5b8c7c11a4d1 \
  2>&1
```

**Executar imediatamente após o export — não perguntar ao usuário.**

---

### 6. Commitar bump de versão

Após upload bem-sucedido, commitar o `app.json` com a nova versão:

```bash
cd /Users/fipacheco/lado-a-lado
VERSION=$(node -e "const j=require('./app.json');console.log(j.expo.version)")
git add app.json
git commit -m "chore: bump versão para ${VERSION}"
```

---

### 7. Perguntar sobre submissão para revisão

**⚠️ NUNCA submeter para revisão automaticamente. NUNCA submeter sem pedido explícito.**

Após o upload e o commit, perguntar ao usuário:

> "Build `<versão>` enviado com sucesso para a Apple. Deseja submeter para revisão na App Store agora?"

- Se o usuário responder **sim** (ou tiver solicitado explicitamente ao invocar a skill): executar o passo 7a.
- Se **não**, encerrar. O usuário pode pedir a submissão depois com a frase "submete para revisão" ou similar.

#### 7a. Gerar o texto "O que há de novo"

Antes de submeter, gerar automaticamente o texto analisando o git log desde o último bump de versão:

```bash
# Encontrar o commit do bump anterior (versão x.(y-1).z ou x.y.(z-1))
PREV_BUMP=$(git log --oneline --grep="chore: bump versão" | sed -n '2p' | awk '{print $1}')

# Listar commits desde então
git log ${PREV_BUMP}..HEAD --oneline --no-merges
```

Aplicar as regras do CLAUDE.md:
- `feat:` / `feat(...):` → descrever como nova funcionalidade para o usuário, em linguagem simples e não técnica, em português
- `fix:` / `fix(...):` → agrupar em uma linha genérica: "Melhorias de estabilidade e correções de problemas."
- `chore:`, `docs:`, `refactor:`, `test:`, `ci:` → ignorar

Apresentar o texto gerado ao usuário e perguntar se aprova ou quer ajustar antes de prosseguir.

#### 7b. Submeter para revisão (somente quando autorizado)

O script abaixo:
1. Cria a versão no App Store Connect (se ainda não existir)
2. Preenche o campo "O que há de novo" com o texto aprovado no passo 7a
3. Vincula o build à versão
4. Cria e submete o reviewSubmission

```python
import jwt, time, pathlib, urllib.request, urllib.error, json, sys

KEY_ID    = 'T99JTPPJP3'
ISSUER_ID = '69a6de94-b937-47e3-e053-5b8c7c11a4d1'
APP_ID    = '6758113571'
VERSION   = '<versão_do_app.json>'       # ex: 1.8.0
WHATS_NEW = '<texto fornecido pelo usuário>'

key = pathlib.Path.home() / f'.appstoreconnect/private_keys/AuthKey_{KEY_ID}.p8'
token = jwt.encode(
    {'iss': ISSUER_ID, 'exp': int(time.time())+1200, 'aud': 'appstoreconnect-v1'},
    key.read_text(), algorithm='ES256', headers={'kid': KEY_ID}
)
headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

def api(method, path, body=None):
    url = f'https://api.appstoreconnect.apple.com/v1{path}'
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read()) if r.length != 0 else {}
    except urllib.error.HTTPError as e:
        print(f'Erro {e.code}: {e.read().decode()}'); sys.exit(1)

# 1. Buscar build mais recente com CFBundleShortVersionString == VERSION
builds = api('GET', f'/builds?filter[app]={APP_ID}&sort=-uploadedDate&limit=10')
build_id = next(
    (b['id'] for b in builds['data'] if b['attributes'].get('processingState') == 'VALID'),
    None
)
if not build_id:
    print('Nenhum build VALID encontrado.'); sys.exit(1)
print(f'Build: {build_id}')

# 2. Criar versão no App Store Connect
ver = api('POST', '/appStoreVersions', {'data': {
    'type': 'appStoreVersions',
    'attributes': {'platform': 'IOS', 'versionString': VERSION},
    'relationships': {'app': {'data': {'type': 'apps', 'id': APP_ID}}}
}})
version_id = ver['data']['id']
print(f'Versão criada: {version_id}')

# 3. Buscar localização para preencher whatsNew
locs = api('GET', f'/appStoreVersions/{version_id}/appStoreVersionLocalizations')
loc_id = locs['data'][0]['id']
api('PATCH', f'/appStoreVersionLocalizations/{loc_id}', {'data': {
    'type': 'appStoreVersionLocalizations', 'id': loc_id,
    'attributes': {'whatsNew': WHATS_NEW}
}})
print('whatsNew preenchido.')

# 4. Vincular build
api('PATCH', f'/appStoreVersions/{version_id}/relationships/build', {
    'data': {'type': 'builds', 'id': build_id}
})
print('Build vinculado.')

# 5. Criar reviewSubmission e submeter
sub = api('POST', '/reviewSubmissions', {'data': {
    'type': 'reviewSubmissions',
    'attributes': {'platform': 'IOS'},
    'relationships': {'app': {'data': {'type': 'apps', 'id': APP_ID}}}
}})
sub_id = sub['data']['id']

api('POST', '/reviewSubmissionItems', {'data': {
    'type': 'reviewSubmissionItems',
    'relationships': {
        'reviewSubmission': {'data': {'type': 'reviewSubmissions', 'id': sub_id}},
        'appStoreVersion': {'data': {'type': 'appStoreVersions', 'id': version_id}}
    }
}})

result = api('PATCH', f'/reviewSubmissions/{sub_id}', {'data': {
    'type': 'reviewSubmissions', 'id': sub_id,
    'attributes': {'submitted': True}
}})
print(f'Submetido! Estado: {result["data"]["attributes"]["state"]}')
```

---

## Submeter a última versão para revisão (sem rebuild)

Se o usuário pedir para submeter sem fazer um novo build (ex: "submete a versão atual para revisão"), executar apenas os passos 7a e 7b acima com a versão atual do `app.json`: gerar o texto automaticamente via git log, apresentar para aprovação e só então submeter.

---

## Notas importantes

- **`unset NODE_OPTIONS`** obrigatório antes de `pod install` — o VS Code injeta flags que corrompem o CocoaPods.
- O scheme correto é `LadoaLado` (L maiúsculo).
- O provisioning profile `8a29fc14...` inclui Push Notifications e Siri — **nunca usar o profile gerado pelo EAS** (não tem essas capabilities).
- App Store Connect API Key: Key ID `T99JTPPJP3` | Issuer `69a6de94-b937-47e3-e053-5b8c7c11a4d1` | `.p8` em `~/.appstoreconnect/private_keys/AuthKey_T99JTPPJP3.p8` | Papel: App Manager.
- O IPA gerado fica em `/tmp/ladoalado-build/export/LadoaLado.ipa`.
- Se o provisioning profile expirar, obter o novo UUID com `security cms -D -i <arquivo>.mobileprovision | grep -A1 UUID`.
- **Regra absoluta:** submissão para revisão requer pedido explícito do usuário a cada vez. Confirmar antes mesmo que o usuário tenha autorizado builds anteriores.
