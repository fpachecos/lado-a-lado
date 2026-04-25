---
name: instagram-growth
version: 1.0.0
description: "Descobre contas relevantes do nicho que não são seguidas via hashtag search da Meta API, segue 5 delas via Chrome, e adiciona as acessíveis via Business Discovery API na rotação do /instagram-comment."
---

# instagram-growth

Expansão orgânica de seguidos: busca contas novas do nicho via hashtag search, segue 5 pelo Chrome e enriquece a rotação do `/instagram-comment` com as elegíveis.

## Uso

```
/instagram-growth
```

Sem argumentos. Executa o ciclo completo de descoberta → follow → rotação.

---

## O que fazer ao executar

### 1. Carregar configuração e estado atual

```bash
cat ~/.claude/instagram-planner-config.json
cat ~/.claude/instagram-accounts-rotation.json 2>/dev/null || echo "[]"
cat ~/.claude/instagram-growth-log.json 2>/dev/null || echo "[]"
```

Extrair:
- `meta_access_token_cached` → TOKEN
- `ig_user_id` → IG_USER_ID (default: `17841434375697785`)

Da rotação, coletar todos os handles já conhecidos (para evitar duplicatas):

```python
import json, os

rotation = json.load(open(os.path.expanduser("~/.claude/instagram-accounts-rotation.json")))
conhecidos = {c["handle"] for c in rotation}
```

Do growth log, coletar handles já seguidos anteriormente:

```python
try:
    growth_log = json.load(open(os.path.expanduser("~/.claude/instagram-growth-log.json")))
    ja_seguidos = {e["handle"] for e in growth_log}
except:
    ja_seguidos = set()

excluir = conhecidos | ja_seguidos
```

### 2. Descobrir contas via hashtag search

Buscar em múltiplas hashtags do nicho para coletar candidatos:

**Hashtags alvo:**
```
maternidadereal, puerperio, recemnascido, primeirosdiasemcasa,
maedeprimeiraviagem, amamentacao, dicasparamaes, maternidade
```

Para cada hashtag:

#### 2a. Obter ID da hashtag

```bash
curl -s -G "https://graph.facebook.com/v19.0/ig_hashtag_search" \
  --data-urlencode "user_id=${IG_USER_ID}" \
  --data-urlencode "q={hashtag}" \
  --data-urlencode "access_token=${TOKEN}"
# Retorna: {"data":[{"id":"HASHTAG_ID"}]}
```

#### 2b. Buscar top posts da hashtag

```bash
curl -s -G "https://graph.facebook.com/v19.0/{HASHTAG_ID}/top_media" \
  --data-urlencode "user_id=${IG_USER_ID}" \
  --data-urlencode "fields=permalink,like_count,comments_count,media_type,timestamp" \
  --data-urlencode "access_token=${TOKEN}"
```

#### 2c. Extrair handles dos permalinks

O campo `permalink` retorna URLs no formato `https://www.instagram.com/p/SHORTCODE/`. Não retorna o username diretamente. Extrair o handle a partir da Business Discovery **não** é possível direto.

**Alternativa: extrair via scraping leve do permalink**

Para cada permalink, abrir no Chrome (ou usar curl com user-agent) e extrair o username do meta tag ou título:

```bash
curl -sL -A "Mozilla/5.0" "{permalink}" \
  | grep -o '"owner":{"username":"[^"]*"' \
  | head -1 \
  | grep -o '"username":"[^"]*"' \
  | cut -d'"' -f4
```

Ou extrair do title da página HTML:
```bash
curl -sL -A "Mozilla/5.0" "{permalink}" \
  | grep -o '<title>[^<]*</title>' \
  | sed 's/<[^>]*>//g' \
  | sed 's/ on Instagram.*//' \
  | sed 's/^[^(]*(@//' \
  | sed 's/).*//'
```

Coletar no máximo 5 permalinks por hashtag. Processar até ter 20 handles candidatos únicos.

#### 2d. Filtrar candidatos

Remover handles que estão em `excluir` (já conhecidos ou já seguidos anteriormente).

Manter lista de candidatos únicos novos.

### 3. Pontuar e ranquear candidatos

Para cada candidato, verificar via Business Discovery API se é acessível e coletar dados:

```bash
curl -s -G "https://graph.facebook.com/v19.0/${IG_USER_ID}" \
  --data-urlencode "fields=business_discovery.username({handle}){username,followers_count,media_count}" \
  --data-urlencode "access_token=${TOKEN}"
```

Classificar cada conta:
- `acessivel_api: true` → Business/Creator account (preferível para rotação)
- `acessivel_api: false` → conta pessoal (pode seguir, mas não entra na rotação)

Pontuar candidatos preferindo:
1. Contas acessíveis via API (Business/Creator)
2. Seguidores entre 5k e 500k (micro/médio influenciador — mais engajamento relativo)
3. Conteúdo recente (conta ativa)

Selecionar os **top 5** candidatos pontuados.

### 4. Apresentar candidatos ao usuário

Antes de qualquer ação no Chrome, exibir:

```
Encontrei X contas novas do nicho. Vou seguir as 5 abaixo:

1. @{handle} — {followers_count} seguidores | API: {sim/não}
   Fonte: #{hashtag}

2. @{handle} — {followers_count} seguidores | API: {sim/não}
   Fonte: #{hashtag}

3. @{handle} — ...
4. @{handle} — ...
5. @{handle} — ...

As marcadas com "API: sim" serão adicionadas à rotação do /instagram-comment.
Confirma? (ou diz quais remover/substituir)
```

**Aguardar confirmação do usuário antes de prosseguir.**

### 5. Seguir cada conta via Chrome

Para cada conta confirmada:

#### 5a. Navegar + verificar estado (AppleScript único com delay embutido)

**IMPORTANTE:** navegação e verificação devem estar no mesmo arquivo AppleScript com `delay` — chamadas separadas de osascript sofrem race condition e retornam vazio.

```python
# Escrever AppleScript em arquivo temporário
script = f"""
tell application "Google Chrome"
  set URL of active tab of front window to "https://www.instagram.com/{handle}/"
end tell
delay 6
tell application "Google Chrome"
  set btns to execute active tab of front window javascript "Array.from(document.querySelectorAll('[role=button],button')).map(function(b){{return b.innerText.trim()}}).filter(function(t){{return t.length>0&&t.length<25}}).join('|')"
  return btns
end tell
"""
with open("/tmp/ig_step.applescript", "w") as f:
    f.write(script)
resultado = subprocess.run(["osascript", "/tmp/ig_step.applescript"], capture_output=True, text=True).stdout.strip()
```

Se `"Seguindo"` ou `"Solicitado"` aparecer → já segue, pular.
Se `"Seguir"` não aparecer → reportar erro ao usuário.

#### 5b. Clicar "Seguir" + confirmar (AppleScript único)

```python
script = f"""
tell application "Google Chrome"
  execute active tab of front window javascript "Array.from(document.querySelectorAll('[role=button],button')).find(function(b){{return b.innerText.trim()==='Seguir';}}).click()"
end tell
delay 3
tell application "Google Chrome"
  set r to execute active tab of front window javascript "Array.from(document.querySelectorAll('[role=button],button')).some(function(b){{return b.innerText.trim()==='Seguindo';}}) ? 'seguindo' : 'pendente'"
  return r
end tell
"""
with open("/tmp/ig_step.applescript", "w") as f:
    f.write(script)
confirmado = subprocess.run(["osascript", "/tmp/ig_step.applescript"], capture_output=True, text=True).stdout.strip()
```

Se `confirmado == "pendente"`: conta pode ter aprovação manual, registrar como `"pendente"` no log.

### 6. Verificar elegibilidade para rotação via Business Discovery

Para as contas recém-seguidas com `acessivel_api: true`, confirmar o acesso:

```bash
curl -s -G "https://graph.facebook.com/v19.0/${IG_USER_ID}" \
  --data-urlencode "fields=business_discovery.username({handle}){username,followers_count,media.limit(1){id}}" \
  --data-urlencode "access_token=${TOKEN}"
```

Se retornar sem erro → confirmar elegibilidade.

### 7. Adicionar elegíveis à rotação do instagram-comment

Carregar e atualizar `~/.claude/instagram-accounts-rotation.json`:

```python
import json, datetime, os

rotation_path = os.path.expanduser("~/.claude/instagram-accounts-rotation.json")
rotation = json.load(open(rotation_path))
handles_existentes = {c["handle"] for c in rotation}

for conta in novas_elegiveis:
    if conta["handle"] not in handles_existentes:
        rotation.append({
            "handle": conta["handle"],
            "adicionado_em": datetime.date.today().isoformat(),
            "fonte": "instagram_growth",
            "hashtag_origem": conta.get("hashtag_origem", ""),
            "followers_count": conta.get("followers_count", 0),
            "acessivel_api": True
        })

with open(rotation_path, "w") as f:
    json.dump(rotation, f, indent=2, ensure_ascii=False)
```

### 8. Registrar no growth log

Salvar todas as contas processadas (seguidas e não seguidas) em `~/.claude/instagram-growth-log.json`:

```python
import json, datetime, os

log_path = os.path.expanduser("~/.claude/instagram-growth-log.json")
try:
    log = json.load(open(log_path))
except:
    log = []

for conta in contas_processadas:
    log.append({
        "handle": conta["handle"],
        "acao": conta["acao"],  # "seguido", "ja_seguia", "erro"
        "acessivel_api": conta["acessivel_api"],
        "adicionado_rotacao": conta.get("adicionado_rotacao", False),
        "data_iso": datetime.datetime.utcnow().isoformat()
    })

with open(log_path, "w") as f:
    json.dump(log, f, indent=2, ensure_ascii=False)
```

### 9. Relatório final

```
Ciclo de growth concluído:

✓ Seguidas: 5 contas
  - @conta1 (150k seg) → adicionada à rotação de comentários
  - @conta2 (38k seg)  → adicionada à rotação de comentários
  - @conta3 (12k seg)  → conta pessoal, não entra na rotação
  - @conta4 (220k seg) → adicionada à rotação de comentários
  - @conta5 (8k seg)   → conta pessoal, não entra na rotação

Rotação do /instagram-comment: {N} contas no total
Próxima execução sugerida: daqui 7 dias
```

---

## Arquivos gerenciados

| Arquivo | Conteúdo |
|---|---|
| `~/.claude/instagram-accounts-rotation.json` | Lista de contas para rotação do `/instagram-comment` |
| `~/.claude/instagram-growth-log.json` | Histórico de contas seguidas pelo `/instagram-growth` |
| `~/.claude/instagram-comments-log.json` | Histórico de comentários postados pelo `/instagram-comment` |

## Pré-requisitos

- Chrome aberto e logado no Instagram como @app.ladoalado
- "Allow JavaScript from Apple Events" ativado: Chrome → View → Developer → Allow JavaScript from Apple Events
- Token Meta válido em `~/.claude/instagram-planner-config.json`

## Notas

- Limite seguro: seguir no máximo 5–10 contas por dia para evitar flag de spam pelo Instagram
- A skill nunca segue duas vezes a mesma conta (verifica `instagram-growth-log.json`)
- Contas pessoais são seguidas normalmente mas não entram na rotação de comentários (API não as acessa)
- Se o Instagram exibir um captcha ou tela de verificação durante o follow, a skill reporta ao usuário e pausa
