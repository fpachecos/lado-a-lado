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

**Sempre usar o plano mais recente.** Detectar automaticamente qual arquivo usar:

```bash
ls ~/instagram-planner/<YYYY-MM>/plano*.md 2>/dev/null | sort -V | tail -1
```

Exemplos de precedência (da mais para menos recente): `plano_v3.md` > `plano_v2.md` > `plano.md`

Ler o plano mais recente encontrado. Se nenhum existir:
> "Plano não encontrado em ~/instagram-planner/<YYYY-MM>/. Execute primeiro: `/instagram-planner <mês>`"

Parsear os posts do plano (extrair: número, data, horário, formato, legenda, descrição da imagem, slides se carrossel).

Se `--post <N>` fornecido: processar apenas esse post. Senão: processar todos.

### 2. Gerar imagens via Gemini API (Nano Banana 2)

Criar diretório de output:
```bash
mkdir -p ~/instagram-planner/<YYYY-MM>/images
```

#### 2a. Detectar se o post precisa de screenshot do app

Antes de gerar qualquer imagem, analisar a `descricao_imagem` do post. Se ela contiver qualquer menção a print, screenshot ou tela do app (ex: "print do app", "screenshot do app", "mock-up de smartphone com tela do app", "tela do Lado a Lado", "app aberto", etc.):

1. **Pedir credenciais** ao usuário (e-mail e senha do app) se ainda não foram fornecidas nesta sessão.

2. **Rodar a skill app-screenshots** para capturar a tela relevante — passar o argumento `--screen` com a rota mais adequada ao contexto do post. Exemplos:
   - Post mostrando lista de agendas → `--screen schedules`
   - Post mostrando home → `--screen /` (sem filtro adicional)
   - Post mostrando nova agenda → `--screen schedules/new`

   ```bash
   # Verificar servidor Expo
   curl -s http://localhost:8081 -o /dev/null -w "%{http_code}"
   # Se não retornar 200, subir:
   cd /Users/fipacheco/lado-a-lado && npx expo start --web --port 8081 &
   # Aguardar e rodar:
   SCREENSHOT_EMAIL="<email>" SCREENSHOT_PASSWORD="<senha>" \
     node /Users/fipacheco/lado-a-lado/take-screenshots.mjs --screen <rota>
   ```

3. Identificar o arquivo gerado em `screenshots/iphone65_*_<rota>.png`.

4. **Validar se o screenshot tem dados antes de chamar o Gemini.** Abrir a imagem e analisá-la visualmente:
   - Se a tela estiver **vazia** (sem registros, listas vazias, estados de empty state) → **parar e avisar o usuário** antes de gerar qualquer imagem no Gemini. Pedir que cadastre dados e confirme para continuar.
   - Se a tela tiver **dados reais** → prosseguir normalmente para o passo 2b.

   Exemplo de aviso:
   > "O screenshot da tela `/feedings` está vazio — sem mamadas registradas. Cadastre alguns dados no app com o usuário `fpachecosouza@icloud.com` e me avise para retomar a geração. Isso evita gastar chamadas Gemini com imagens inúteis."

#### 2b. Escolher o script de geração correto

| Situação | Script a usar |
|---|---|
| Imagem **com** screenshot/tela do app | `gemini_gen_with_image.py` (prompt + imagem de entrada) |
| Imagem **sem** referência ao app | `gemini_gen.py` (apenas prompt) |

**Script sem imagem de entrada** (caso padrão):
```bash
source ~/.zshrc
python3 /Users/fipacheco/lado-a-lado/.claude/skills/instagram-publisher/scripts/gemini_gen.py \
  "<prompt_em_ingles>" \
  ~/instagram-planner/<YYYY-MM>/images/post-<N>-img-<slide>.png
```

**Script com imagem de entrada** (quando o post pede screenshot do app):
```bash
source ~/.zshrc
python3 /Users/fipacheco/lado-a-lado/.claude/skills/instagram-publisher/scripts/gemini_gen_with_image.py \
  "<prompt_em_ingles>" \
  /Users/fipacheco/lado-a-lado/screenshots/iphone65_<arquivo>.png \
  ~/instagram-planner/<YYYY-MM>/images/post-<N>-img-<slide>.png
```

O prompt deve descrever a cena ao redor do telefone (superfície, iluminação, objetos) e instruir o modelo a preservar a tela do app exatamente como está.

Para **carrossel**: gerar uma imagem por slide, traduzindo a descrição de cada slide.

#### Dicas de prompt

- Traduzir para inglês e condensar em ~60 palavras
- **Sempre gerar sem texto:** toda imagem deve ter `no text, no lettering, no watermark` no final do prompt
- Para slides de carrossel: incluir `leave empty space at top (~30% height) for text overlay` quando o OVERLAY for `posição: top`
- Para imagens únicas: sem modificações de espaço
- Máximo de 6 slides por carrossel

#### Diretrizes de composição visual obrigatórias

**Figuras humanas > ícones e objetos.**
Toda imagem deve transmitir emoção real através de pessoas. Regras:
- Priorizar cenas com figuras humanas em interação real: mãe com bebê, avó segurando recém-nascido, casal olhando para o bebê juntos, visitante chegando com sorriso, etc.
- A emoção da cena deve ser legível: ternura, alívio, cansaço amoroso, alegria contida, conexão intergeracional
- Evitar ilustrações de ícones soltos (smartphone, campainha, relógio, etc.) como elemento principal — usar como detalhe secundário no máximo
- Estilo preferido: fotorrealista editorial ou ilustração flat/aquarela com personagens expressivos e humanizados
- Sem poses artificiais ou stock photo genérico — buscar naturalidade e intimidade
- **Bebê sempre visível como figura inteira** — nunca descrever cenas onde o bebê aparece apenas como detalhe (só pés, só mão). O bebê deve ser visível no colo, no braço ou deitado, com o corpo reconhecível. Detalhe de pés/mãos só como elemento secundário da composição, nunca o foco principal.

#### Paleta de cores obrigatória (identidade Lado a Lado)

Todos os posts devem seguir a identidade visual do app. Exceções só para datas especiais com justificativa explícita no plano.

| Elemento | Cor | Hex |
|---|---|---|
| Cor primária | Coral Suave | `#FF6F61` |
| Cor secundária | Verde-Menta | `#A8D5BA` |
| Fundo base | Bege Quente | `#F4E4BC` |
| Gradiente (início) | Pêssego | `#FFD4BF` |
| Gradiente (meio) | Creme | `#FCE8C4` |
| Gradiente (fim) | Dourado Âmbar | `#F0C87A` |
| Texto principal | Marrom Escuro Quente | `#2D2018` |
| Texto sobre fundos coloridos | Branco Off | `#FAFAFA` |

- Fundos de slides: usar o gradiente quente ou o bege `#F4E4BC` como base
- Bandas de overlay (texto): usar coral `#FF6F61` ou uma variação escura `#D95F50` para destaques primários; verde-menta `#A8D5BA` ou `#7DB89A` para destaques secundários
- Slides CTA (último slide): fundo coral sólido `#FF6F61` com texto branco `#FAFAFA`
- Nunca usar azul bebê (#5B9BD5) ou amarelo-mel (#F5C842) como cor principal — não fazem parte da identidade do app

### 2c. Sobrepor texto nas imagens de carrossel (Pillow)

Para cada slide que tiver um campo `OVERLAY` no plano, após gerar a imagem base, executar o script permanente da skill:

Script: `.claude/skills/instagram-publisher/scripts/text_overlay.py`

```bash
python3 /Users/fipacheco/lado-a-lado/.claude/skills/instagram-publisher/scripts/text_overlay.py \
  ~/instagram-planner/<YYYY-MM>/images/post-<N>-img-<slide>.jpg \
  ~/instagram-planner/<YYYY-MM>/images/post-<N>-img-<slide>-final.jpg \
  "<texto do overlay>" \
  "<top|bottom|center>" \
  "<#cor_fundo>" \
  "<#cor_texto>"
```

Usar sempre o arquivo `-final.jpg` para o upload (não o original sem texto).

### 2d. Validação obrigatória das imagens antes de publicar

**Após gerar todas as imagens** (e aplicar overlays quando houver), exibir cada imagem ao usuário e aguardar aprovação explícita antes de prosseguir para o upload e publicação.

Formato de apresentação:
```
🖼️ Post <N> — Slide <S>: [exibir imagem]
Descrição gerada: <resumo do que aparece na imagem>
✅ Aprovar / ❌ Regerar
```

- Se o usuário aprovar todas: prosseguir para o passo 3 (upload + publicação).
- Se reprovar alguma: pedir instrução de ajuste, regerar apenas o(s) slide(s) reprovados e reapresentar.
- **Nunca fazer upload nem publicar sem aprovação explícita do usuário.**

---

### 3. Hospedar imagens no litterbox.catbox.moe (anônimo, sem cadastro)

Para cada imagem gerada (usar sempre o `-final.jpg` quando houver overlay):

```bash
IMG_PATH=~/instagram-planner/<YYYY-MM>/images/post-<N>-img-<slide>-final.jpg

IMG_URL=$(curl -s -F "reqtype=fileupload" -F "time=72h" \
  -F "fileToUpload=@$IMG_PATH" \
  https://litterbox.catbox.moe/resources/internals/api.php)

echo "URL: $IMG_URL"
```

`litterbox` retorna diretamente a URL pública (ex: `https://litter.catbox.moe/abc123.jpg`). Guardar para o passo seguinte.

**Nota:** usar `litterbox.catbox.moe` (com `time=72h`), não `catbox.moe/user.php` — o segundo retorna 404 sem autenticação.

Se o upload falhar, tentar novamente — o serviço é gratuito e pode ter instabilidade ocasional.

Se `--dry-run`: parar aqui. Exibir lista de imagens geradas + URLs e não publicar.

### 4. Publicar via Meta Graph API

Script permanente: `.claude/skills/instagram-publisher/scripts/publish_instagram.py`

```bash
source ~/.zshrc

# Imagem única
python3 /Users/fipacheco/lado-a-lado/.claude/skills/instagram-publisher/scripts/publish_instagram.py \
  --tipo imagem \
  --imagens "https://url-da-imagem.jpg" \
  --legenda "Legenda do post com #hashtags"

# Carrossel (2–4 imagens)
python3 /Users/fipacheco/lado-a-lado/.claude/skills/instagram-publisher/scripts/publish_instagram.py \
  --tipo carrossel \
  --imagens "https://url1.jpg" "https://url2.jpg" "https://url3.jpg" "https://url4.jpg" "https://url5.jpg" "https://url6.jpg" \
  --legenda "Legenda do post"

# Dry-run (cria containers mas não publica)
python3 ... --dry-run
```

O script imprime o Instagram media ID ao final e lida com toda a lógica de polling de status (`FINISHED`/`ERROR`).

#### 4b. Agendamento (`--agendar`)

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
