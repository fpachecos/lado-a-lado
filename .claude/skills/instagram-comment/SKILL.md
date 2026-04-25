---
name: instagram-comment
version: 1.0.0
description: "Seleciona 2 contas seguidas, busca os últimos posts via Meta API, elabora comentários relevantes, apresenta para aprovação e posta via automação do Chrome."
---

# instagram-comment

Engajamento orgânico: busca posts recentes de contas seguidas, elabora comentários relevantes e contextualiza com o nicho do @app.ladoalado, apresenta para aprovação e posta via Chrome.

## Uso

```
/instagram-comment
```

Sem argumentos — a skill escolhe automaticamente as 2 contas.

---

## O que fazer ao executar

### 1. Carregar configuração

```bash
cat ~/.claude/instagram-planner-config.json
```

Extrair:
- `meta_access_token_cached` → TOKEN
- `ig_user_id` → IG_USER_ID (default: `17841434375697785`)
- `handle`, `tom_de_voz`

Ler `nicho` e `publico_alvo` sempre do README (fonte de verdade):

```bash
cat /Users/fipacheco/lado-a-lado/README.md | grep -A 2 "CONTEXTO DE MARKETING"
```

### 2. Carregar histórico de comentários

```bash
cat ~/.claude/instagram-comments-log.json 2>/dev/null || echo "[]"
```

O arquivo é uma lista de objetos:
```json
[
  {
    "handle": "laurapadilhaparteira",
    "post_url": "https://www.instagram.com/p/DXhvffVhw2X/",
    "comentario": "...",
    "data_iso": "2026-04-24T22:00:00"
  }
]
```

Calcular quais contas já receberam comentário nos últimos 7 dias:

```python
import json, datetime
log = json.load(open(os.path.expanduser("~/.claude/instagram-comments-log.json")))
agora = datetime.datetime.utcnow()
recentes = {
    e["handle"]
    for e in log
    if (agora - datetime.datetime.fromisoformat(e["data_iso"])).days < 7
}
```

### 3. Lista de contas para rotação

Carregar do arquivo compartilhado (gerenciado pelo `/instagram-growth`):

```bash
cat ~/.claude/instagram-accounts-rotation.json
```

O arquivo é uma lista de objetos. Usar apenas as contas com `"acessivel_api": true`:

```python
import json
rotation = json.load(open(os.path.expanduser("~/.claude/instagram-accounts-rotation.json")))
elegíveis = [c["handle"] for c in rotation if c.get("acessivel_api", False)]
```

Filtrar as que **não** receberam comentário nos últimos 7 dias. Se sobrar menos de 2, usar as que têm o comentário mais antigo (respeitando a regra de intervalo mínimo).

Escolher as **2 primeiras elegíveis** da lista filtrada.

### 4. Buscar posts recentes via Business Discovery API

Para cada conta escolhida:

```bash
TOKEN="<token>"
IG_USER_ID="17841434375697785"
HANDLE="<handle>"

curl -s -G "https://graph.facebook.com/v19.0/${IG_USER_ID}" \
  --data-urlencode "fields=business_discovery.username(${HANDLE}){username,followers_count,media.limit(3){id,caption,timestamp,like_count,comments_count,permalink,media_type}}" \
  --data-urlencode "access_token=${TOKEN}"
```

Para cada post retornado, extrair:
- `id`, `caption`, `timestamp`, `like_count`, `comments_count`, `permalink`, `media_type`

**Critérios de seleção do post:**
- Preferir o post mais recente (máximo 14 dias)
- Excluir posts que pareçam publicidade patrocinada (caption contém "publicidade", "#publi", "parceria paga", cupom de desconto)
- Preferir posts com caption substantiva (> 50 chars) — sem caption não há como elaborar comentário relevante
- Se o post mais recente for patrocinado, tentar o segundo

### 5. Elaborar comentário

Para cada post selecionado, redigir um comentário seguindo as regras:

**Regras absolutas:**
1. O comentário deve ser sobre o **tema do post** — não sobre o @app.ladoalado
2. Nunca sugerir mudanças ou melhorias no conteúdo da pessoa
3. Nunca citar o app diretamente — o handle @app.ladoalado já aparece no perfil
4. Tom: acolhedor, empático, de igual para igual — não de fã, não corporativo
5. Tamanho: 2 a 4 frases. Nem emoji vazio, nem parágrafo longo
6. Conectar naturalmente ao universo do app quando fizer sentido — mas só se for natural, nunca forçado. O app cobre múltiplas frentes: visitas ao bebê, amamentação (registro de mamadas), peso/altura do bebê, fraldas, rotina do puerpério. Não limitar sempre a "visitas"
7. Terminar com um emoji leve (💙, 😅, 🤍) quando apropriado

**O que gera engajamento nos comentários:**
- Adicionar uma perspectiva real ao tema do post
- Ressoar com a experiência do público (mães, pais de primeira viagem)
- Ser específico o suficiente para parecer humano, genérico o suficiente para ser verdadeiro

### 6. Apresentar para aprovação

Exibir para o usuário **antes de qualquer ação no Chrome**:

```
---
### Conta 1 — @{handle} ({followers_count} seguidores)

**Post:** [{media_type}] {timestamp[:10]} — {like_count}❤️ {comments_count}💬
**Link:** {permalink}
**Caption:** "{caption[:300]}..."

**Comentário proposto:**
> {comentario}

---
### Conta 2 — @{handle} ({followers_count} seguidores)

**Post:** [{media_type}] {timestamp[:10]} — {like_count}❤️ {comments_count}💬
**Link:** {permalink}
**Caption:** "{caption[:300]}..."

**Comentário proposto:**
> {comentario}

---
Confirma os dois comentários? (ou indica qual ajustar)
```

**Aguardar confirmação do usuário.** Não prosseguir sem aprovação explícita.

### 7. Postar via Chrome

Só executar após aprovação do usuário.

Para cada comentário aprovado:

#### 7a. Extrair shortcode e construir URL `/p/`

O shortcode está na permalink: `https://www.instagram.com/reel/SHORTCODE/` ou `https://www.instagram.com/p/SHORTCODE/`.

Sempre usar o formato `/p/` — é o único que exibe o textarea de comentário na view desktop:

```python
import re
match = re.search(r'instagram\.com/(?:reel|p)/([^/]+)/', permalink)
shortcode = match.group(1)
post_url = f"https://www.instagram.com/p/{shortcode}/"
```

#### 7b. Navegar, colar e postar (AppleScript único com delay embutido)

**IMPORTANTE:** todas as etapas devem estar num único arquivo AppleScript com `delay` — chamadas separadas de osascript sofrem race condition e retornam vazio.

```python
# Copiar comentário para clipboard antes de tudo
subprocess.run(["bash","-c",f"echo -n '{comentario}' | pbcopy"])

script = f"""
tell application "Google Chrome"
  set URL of active tab of front window to "{post_url}"
end tell
delay 5
tell application "Google Chrome"
  set ta to execute active tab of front window javascript "document.querySelector('textarea') ? 'ok' : 'sem_textarea'"
  if ta is not "ok" then return "sem_textarea"
  execute active tab of front window javascript "var ta=document.querySelector('textarea'); ta.click(); ta.focus();"
end tell
delay 1
tell application "System Events"
  tell process "Google Chrome"
    keystroke "v" using command down
  end tell
end tell
delay 1
tell application "Google Chrome"
  set chars to execute active tab of front window javascript "document.querySelector('textarea').value.length"
  if chars is "0" then return "sem_chars"
  execute active tab of front window javascript "Array.from(document.querySelectorAll('[role=button],button')).find(function(b){{return b.innerText.trim()==='Postar';}}).click()"
end tell
delay 3
tell application "Google Chrome"
  set ok to execute active tab of front window javascript "document.body.innerText.includes('{comentario[:20]}') ? 'ok' : 'pendente'"
  return ok
end tell
"""
with open("/tmp/ig_comment.applescript","w") as f:
    f.write(script)
resultado = subprocess.run(["osascript","/tmp/ig_comment.applescript"], capture_output=True, text=True).stdout.strip()
# resultado == "ok" → publicado | "sem_textarea" → página não carregou | "pendente" → verificar manualmente
```

### 8. Registrar no log

Após cada comentário postado com sucesso:

```python
import json, datetime, os

log_path = os.path.expanduser("~/.claude/instagram-comments-log.json")
try:
    log = json.load(open(log_path))
except:
    log = []

log.append({
    "handle": handle,
    "post_url": post_url,
    "comentario": comentario,
    "data_iso": datetime.datetime.utcnow().isoformat()
})

with open(log_path, "w") as f:
    json.dump(log, f, indent=2, ensure_ascii=False)
```

### 9. Relatório final

Exibir resumo:

```
✓ Comentário postado em @laurapadilhaparteira
✓ Comentário postado em @grupo.perinatal

Próxima janela disponível para essas contas: {data + 7 dias}
```

---

## Pré-requisitos

- Chrome aberto e logado no Instagram como @app.ladoalado
- "Allow JavaScript from Apple Events" ativado: Chrome → View → Developer → Allow JavaScript from Apple Events
- Token Meta válido em `~/.claude/instagram-planner-config.json`

## Adicionando novas contas à rotação

Para adicionar uma conta nova à lista de rotação, verificar primeiro se é acessível via Business Discovery API:

```bash
TOKEN=$(python3 -c "import json; print(json.load(open('/Users/fipacheco/.claude/instagram-planner-config.json'))['meta_access_token_cached'])")
IG_USER_ID="17841434375697785"
HANDLE="novacontaaqui"

curl -s -G "https://graph.facebook.com/v19.0/${IG_USER_ID}" \
  --data-urlencode "fields=business_discovery.username(${HANDLE}){username,followers_count}" \
  --data-urlencode "access_token=${TOKEN}"
```

Se retornar `followers_count` sem erro → conta elegível. Adicionar à lista no passo 3.
