---
name: instagram-publisher
version: 4.0.0
description: "Executa o plano do instagram-planner na íntegra: gera imagens via Gemini API (gemini-3.1-flash-image-preview), hospeda no litterbox.catbox.moe, publica (ou agenda) via Meta Graph API."
---

# instagram-publisher

Executa o plano editorial gerado pelo `instagram-planner`: gera imagens via Gemini API, faz upload e publica no Instagram do **Lado a Lado** via Meta Graph API.

## Uso

```
/instagram-publisher <mês> [--post <número>] [--dry-run] [--agendar]
```

Exemplos:
- `/instagram-publisher abril 2026` — publica todos os posts do mês
- `/instagram-publisher maio --post 3` — publica só o post 3
- `/instagram-publisher abril --dry-run` — gera imagens mas não publica
- `/instagram-publisher abril --agendar` — agenda posts nas datas/horários do plano

---

## Pré-requisitos

### Variáveis de ambiente necessárias

```bash
source ~/.zshrc
echo "META_ACCESS_TOKEN: $([ -n "$META_ACCESS_TOKEN" ] && echo OK || echo FALTANDO)"
echo "GEMINI_API_KEY:     $([ -n "$GEMINI_API_KEY" ] && echo OK || echo FALTANDO)"
```

imgbb não é mais usado — hospedagem feita via catbox.moe (anônimo, sem cadastro).

Se `GEMINI_API_KEY` estiver faltando:
> "Preciso de uma chave da Gemini API para gerar as imagens. Crie em https://aistudio.google.com/apikey (requer billing ativo). Depois: `echo 'export GEMINI_API_KEY=\"sua_chave\"' >> ~/.zshrc && source ~/.zshrc`"

Se `META_ACCESS_TOKEN` estiver faltando, ver seção "Como configurar o token Meta API" no `instagram-planner`.

---

## O que fazer ao executar

### 1. Carregar configuração e plano

```bash
# Carregar config
cat ~/.claude/instagram-planner-config.json 2>/dev/null
```

Defaults do Lado a Lado (usar se config não existir):
```json
{
  "ig_user_id": "17841434375697785",
  "page_id":    "1092052980657649"
}
```

Determinar `YYYY-MM` a partir do mês informado (ex: "abril 2026" → `2026-04`).

Ler o plano:
```bash
cat ~/instagram-planner/<YYYY-MM>/plano.md
```

Se o arquivo não existir:
> "Plano não encontrado em ~/instagram-planner/<YYYY-MM>/plano.md. Execute primeiro: `/instagram-planner <mês>`"

Parsear os posts do plano (extrair: número, data, horário, formato, legenda, descrição da imagem, slides se carrossel).

Se `--post <N>` fornecido: processar apenas esse post. Senão: processar todos.

### 2. Gerar imagens via Gemini API (Nano Banana 2)

Criar diretório de output:
```bash
mkdir -p ~/instagram-planner/<YYYY-MM>/images
```

Para **cada post** a ser processado, usar o script Python abaixo. O prompt deve ser em **inglês** — traduzir a `descricao_imagem` do plano antes de enviar.

#### Script de geração

Salvar como `/tmp/hf_gen.py`:

```python
#!/usr/bin/env python3
import os, sys, urllib.request, urllib.error, time, json

HF_TOKEN = os.environ["HF_TOKEN"]
PROMPT   = sys.argv[1]
OUTPUT   = sys.argv[2]

# Modelos em ordem de preferência (gratuitos no free tier)
MODELS = [
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
]

headers = {
    "Authorization": f"Bearer {HF_TOKEN}",
    "Content-Type": "application/json",
    "x-wait-for-model": "true",
}

payload = json.dumps({"inputs": PROMPT}).encode()

for model in MODELS:
    url = f"https://api-inference.huggingface.co/models/{model}"
    req = urllib.request.Request(url, data=payload, headers=headers)
    for attempt in range(3):
        try:
            resp = urllib.request.urlopen(req, timeout=120)
            img_bytes = resp.read()
            if img_bytes[:4] in (b'\x89PNG', b'\xff\xd8\xff', b'RIFF'):
                with open(OUTPUT, "wb") as f:
                    f.write(img_bytes)
                print(f"OK: {OUTPUT} (modelo: {model})")
                sys.exit(0)
            else:
                err = json.loads(img_bytes)
                if "estimated_time" in err:
                    wait = int(err["estimated_time"]) + 2
                    print(f"Modelo carregando, aguardando {wait}s...", file=sys.stderr)
                    time.sleep(wait)
                    continue
                print(f"Modelo {model} erro: {err}", file=sys.stderr)
                break
        except urllib.error.HTTPError as e:
            body = e.read().decode()
            print(f"Modelo {model} HTTP {e.code}: {body[:200]}", file=sys.stderr)
            if e.code == 503:
                time.sleep(20)
                continue
            break
        except Exception as e:
            print(f"Modelo {model} falhou: {e}", file=sys.stderr)
            break

print("ERRO: nenhum modelo gerou imagem", file=sys.stderr)
sys.exit(1)
```

#### Executar para cada imagem

```bash
source ~/.zshrc
python3 /tmp/hf_gen.py \
  "<prompt_em_ingles>" \
  ~/instagram-planner/<YYYY-MM>/images/post-<N>-img-<slide>.png
```

Para **carrossel**: gerar uma imagem por slide, traduzindo a descrição de cada slide.

#### Dicas de prompt

- Traduzir para inglês e condensar em ~60 palavras
- Estrutura: `[subject], [style], [lighting], [mood], photorealistic, high quality, no text, no watermark`
- Para slides textuais de carrossel: pedir fundo temático liso/desfocado para receber texto sobreposto

### 3. Hospedar imagens no catbox.moe (anônimo, sem cadastro)

Para cada imagem gerada:

```bash
IMG_PATH=~/instagram-planner/<YYYY-MM>/images/post-<N>-img-<slide>.png

IMG_URL=$(curl -s -F "reqtype=fileupload" \
  -F "fileToUpload=@$IMG_PATH" \
  https://catbox.moe/user.php)

echo "URL: $IMG_URL"
```

`catbox.moe` retorna diretamente a URL pública (ex: `https://files.catbox.moe/abc123.png`). Guardar para o passo seguinte.

Se o upload falhar (timeout ou erro), tentar novamente — o serviço é gratuito e pode ter instabilidade ocasional.

Se `--dry-run`: parar aqui. Exibir lista de imagens geradas + URLs e não publicar.

### 4. Publicar via Meta Graph API

Carregar variáveis:
```bash
source ~/.zshrc
IG_USER_ID="17841434375697785"  # ou do config
```

#### 4a. Imagem única

```bash
# 1. Criar container
CONTAINER_ID=$(curl -s -X POST \
  "https://graph.facebook.com/v19.0/$IG_USER_ID/media" \
  -d "image_url=<URL_PUBLICA>" \
  -d "caption=<LEGENDA_URL_ENCODED>" \
  -d "access_token=$META_ACCESS_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

echo "Container: $CONTAINER_ID"

# 2. Verificar status (aguardar FINISHED)
for i in $(seq 1 10); do
  STATUS=$(curl -s "https://graph.facebook.com/v19.0/$CONTAINER_ID?fields=status_code&access_token=$META_ACCESS_TOKEN" \
    | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_code',''))")
  echo "Status: $STATUS"
  [ "$STATUS" = "FINISHED" ] && break
  sleep 3
done

# 3. Publicar
curl -s -X POST \
  "https://graph.facebook.com/v19.0/$IG_USER_ID/media_publish" \
  -d "creation_id=$CONTAINER_ID" \
  -d "access_token=$META_ACCESS_TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Publicado! ID:', d.get('id','ERRO'), d)"
```

#### 4b. Carrossel

```bash
# 1. Criar containers filhos (um por imagem)
CHILD_IDS=()
for URL in <url1> <url2> ...; do
  CHILD_ID=$(curl -s -X POST \
    "https://graph.facebook.com/v19.0/$IG_USER_ID/media" \
    -d "image_url=$URL" \
    -d "is_carousel_item=true" \
    -d "access_token=$META_ACCESS_TOKEN" \
    | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")
  CHILD_IDS+=("$CHILD_ID")
  sleep 2
done

# Aguardar todos FINISHED
for CID in "${CHILD_IDS[@]}"; do
  for i in $(seq 1 10); do
    STATUS=$(curl -s "https://graph.facebook.com/v19.0/$CID?fields=status_code&access_token=$META_ACCESS_TOKEN" \
      | python3 -c "import sys,json; print(json.load(sys.stdin).get('status_code',''))")
    [ "$STATUS" = "FINISHED" ] && break
    sleep 3
  done
done

# 2. Criar container do carrossel
CHILDREN_PARAM=$(IFS=,; echo "${CHILD_IDS[*]}")
CAROUSEL_ID=$(curl -s -X POST \
  "https://graph.facebook.com/v19.0/$IG_USER_ID/media" \
  -d "media_type=CAROUSEL" \
  -d "children=$CHILDREN_PARAM" \
  -d "caption=<LEGENDA_URL_ENCODED>" \
  -d "access_token=$META_ACCESS_TOKEN" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 3. Publicar
curl -s -X POST \
  "https://graph.facebook.com/v19.0/$IG_USER_ID/media_publish" \
  -d "creation_id=$CAROUSEL_ID" \
  -d "access_token=$META_ACCESS_TOKEN" \
  | python3 -c "import sys,json; d=json.load(sys.stdin); print('Carrossel publicado! ID:', d.get('id','ERRO'), d)"
```

#### 4c. Agendamento (`--agendar`)

A API do Instagram suporta agendamento via `published=false` + `scheduled_publish_time` (Unix timestamp). Requer conta Creator ou Business com permissão `instagram_content_publish`.

```bash
# Converter data/hora do post para Unix timestamp (macOS)
PUBLISH_TIME=$(date -j -f "%d/%m/%Y %H:%M" "<DATA> <HORA>" +%s)

curl -s -X POST \
  "https://graph.facebook.com/v19.0/$IG_USER_ID/media" \
  -d "image_url=<URL>" \
  -d "caption=<LEGENDA_URL_ENCODED>" \
  -d "published=false" \
  -d "scheduled_publish_time=$PUBLISH_TIME" \
  -d "access_token=$META_ACCESS_TOKEN"
```

Então publicar com `media_publish` normalmente.

Se a API retornar erro de permissão no agendamento: publicar imediatamente e avisar o usuário.

### 5. Logar resultados

Salvar log em `~/instagram-planner/<YYYY-MM>/publicados.md`:

```markdown
# Log de Publicações — <Mês Ano>

| Post | Data | Formato | Instagram ID | Status | Publicado em |
|------|------|---------|--------------|--------|--------------|
| 1    | 01/04 | imagem_unica | 123456789 | OK | 2026-04-01 12:35 |
| 2    | 03/04 | carrossel    | 987654321 | OK | 2026-04-03 18:02 |
```

### 6. Relatório final

Exibir:
- Total de posts publicados / com erro
- IDs dos posts no Instagram
- Avisos (tokens expirando, posts pulados, etc.)
- Próximo post agendado (se `--agendar`)

---

## Legendas e encoding

Legendas podem ter emojis e caracteres especiais. Usar `python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.stdin.read()))"` para URL-encode ao passar para `curl -d`.

Exemplo:
```bash
LEGENDA_ENC=$(echo "<legenda>" | python3 -c "import sys, urllib.parse; print(urllib.parse.quote(sys.stdin.read().strip()))")
```

---

## Tratamento de erros

| Erro | Causa | Ação |
|------|-------|------|
| `OAuthException` code 190 | Token expirado | Executar `/instagram-planner` para renovar token |
| `status_code: ERROR` no container | Imagem inacessível ou formato inválido | Verificar URL do imgbb, re-hospedar |
| Gemini `RESOURCE_EXHAUSTED` | Limite de quota gratuita atingido | Aguardar reset (cota diária) ou verificar limites em aistudio.google.com |
| Gemini `400 INVALID_ARGUMENT` | Modelo não suporta geração de imagem | Tentar próximo modelo na lista do script |
| Gemini sem imagem na resposta | Modelo retornou só texto | O script tenta automaticamente o próximo modelo |
| imgbb erro 400 | Imagem muito grande ou formato inválido | Converter para JPEG: `sips -s format jpeg input.png --out output.jpg` |

---

## Notas

- Formatos suportados pela API Meta: JPEG, PNG (máx 8MB por imagem)
- Carrossel: mínimo 2, máximo 10 itens
- Reels: não suportado nesta skill — requer upload de vídeo (fluxo diferente)
- Gemini API gratuita: ~1.500 req/dia, sem necessidade de GPU ou servidor local
- O script `/tmp/gemini_gen.py` tenta modelos em ordem — adapte a lista `MODELS` se novos modelos forem lançados
- imgbb links são permanentes no plano gratuito (sem expiração)
