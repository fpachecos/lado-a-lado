---
name: instagram-planner
version: 1.1.0
description: "Gera plano mensal de publicações para Instagram com análise de performance via Meta Graph API. Output: arquivo MD com datas, conteúdo e descrição detalhada de imagens."
---

# instagram-planner

Gera plano editorial mensal para Instagram, com ou sem dados históricos de performance via Meta Graph API.

## Uso

```
/instagram-planner <mês> [--conta <@handle>] [--nicho <descrição>]
```

Exemplos:
- `/instagram-planner maio 2026`
- `/instagram-planner junho --conta @minhaempresa --nicho "tecnologia e produtividade"`

---

## O que fazer ao executar

### 1. Coletar contexto da conta

Verificar se existem configurações salvas:

```bash
cat ~/.claude/instagram-planner-config.json 2>/dev/null || echo "{}"
```

Se o arquivo existir e tiver os campos abaixo preenchidos, usar diretamente sem perguntar ao usuário.

Se não houver config, usar os seguintes **defaults do projeto Lado a Lado** e salvar em `~/.claude/instagram-planner-config.json`:

```json
{
  "handle": "@app.ladoalado",
  "tom_de_voz": "Acolhedor, descontraído, empático — fala como amigo que entende o caos gostoso da maternidade",
  "projeto_dir": "/Users/fipacheco/lado-a-lado",
  "meta_access_token_env": "META_ACCESS_TOKEN"
}
```

**`nicho` e `publico_alvo` não ficam no config — lê sempre do README:**

```bash
cat /Users/fipacheco/lado-a-lado/README.md | grep -A 2 "CONTEXTO DE MARKETING"
```

Os campos estão nos comentários HTML logo abaixo do título principal:
- `<!-- nicho: ... -->` — descrição completa do app para estratégia de conteúdo
- `<!-- publico_alvo: ... -->` — audiência-alvo
- `<!-- tom_de_voz: ... -->` — tom de comunicação

Só perguntar ao usuário se ele explicitamente pedir para usar outra conta ou nicho diferente.

### 2. Verificar e renovar token da Meta API

#### 2a. Carregar token

```bash
source ~/.zshrc 2>/dev/null
echo $META_ACCESS_TOKEN | wc -c
```

Se vazio → pular para passo 4 com aviso.

#### 2b. Verificar validade e expiração

```bash
curl -s "https://graph.facebook.com/v19.0/debug_token?input_token=$META_ACCESS_TOKEN&access_token=$META_ACCESS_TOKEN" \
  | python3 -c "
import sys, json, time
d = json.load(sys.stdin).get('data', {})
valid = d.get('is_valid', False)
expires = d.get('expires_at', 0)
now = int(time.time())
days_left = (expires - now) // 86400 if expires else 999
print(f'valid={valid} expires_at={expires} days_left={days_left}')
"
```

**Casos:**
- `valid=False` → token expirado, ir para 2c
- `days_left < 7` → token expirando, tentar renovar em 2c
- `valid=True` e `days_left >= 7` → token ok, ir para passo 3

#### 2c. Tentar renovar o token (long-lived refresh)

Para renovar, precisamos do `app_id` e `app_secret` salvos no config:

```bash
APP_ID=$(python3 -c "import json; d=json.load(open('/Users/fipacheco/.claude/instagram-planner-config.json')); print(d.get('meta_app_id',''))")
APP_SECRET=$(python3 -c "import json; d=json.load(open('/Users/fipacheco/.claude/instagram-planner-config.json')); print(d.get('meta_app_secret',''))")

curl -s "https://graph.facebook.com/v19.0/oauth/access_token\
?grant_type=fb_exchange_token\
&client_id=$APP_ID\
&client_secret=$APP_SECRET\
&fb_exchange_token=$META_ACCESS_TOKEN"
```

Se retornar `access_token` → novo token recebido. Salvar:

```bash
NEW_TOKEN="<token_retornado>"

# Atualizar .zshrc
sed -i '' "s|export META_ACCESS_TOKEN=\".*\"|export META_ACCESS_TOKEN=\"$NEW_TOKEN\"|" ~/.zshrc

# Atualizar config
python3 -c "
import json
with open('/Users/fipacheco/.claude/instagram-planner-config.json') as f:
    cfg = json.load(f)
cfg['meta_access_token_cached'] = '$NEW_TOKEN'
with open('/Users/fipacheco/.claude/instagram-planner-config.json', 'w') as f:
    json.dump(cfg, f, indent=2, ensure_ascii=False)
"
source ~/.zshrc
```

Se renovação falhar (sem `app_secret` ou erro da API) → pular para passo 4 com aviso de que o token expirou e instruções abaixo.

#### 2d. Se app_id/app_secret não estiverem no config

Pedir ao usuário:
> "Seu token Meta expirou ou está próximo de expirar. Para renovar automaticamente, preciso do App ID e App Secret do app 'Lado a Lado' em developers.facebook.com → seu app → Configurações básicas. Posso salvar isso no config para renovações futuras."

Depois salvar:
```bash
python3 -c "
import json
with open('/Users/fipacheco/.claude/instagram-planner-config.json') as f:
    cfg = json.load(f)
cfg['meta_app_id'] = '<APP_ID_FORNECIDO>'
cfg['meta_app_secret'] = '<APP_SECRET_FORNECIDO>'
with open('/Users/fipacheco/.claude/instagram-planner-config.json', 'w') as f:
    json.dump(cfg, f, indent=2, ensure_ascii=False)
"
```

Depois repetir o passo 2c com os novos valores.

**Nota:** O `ig_user_id` e `page_id` já estão no config (`17841434375697785` e `1092052980657649`). Usar diretamente no passo 3 sem precisar redescobrir.

### 3. Buscar performance dos últimos 2 meses (se token disponível)

#### 3a. Descobrir o Instagram User ID

```bash
IG_USER_ID=$(curl -s "https://graph.facebook.com/v19.0/me/accounts?access_token=$META_ACCESS_TOKEN" \
  | python3 -c "
import sys, json
pages = json.load(sys.stdin).get('data', [])
for p in pages:
    print(p.get('id'), p.get('name'))
")
echo $IG_USER_ID
```

Depois pegar o IG Business Account vinculado:
```bash
curl -s "https://graph.facebook.com/v19.0/<PAGE_ID>?fields=instagram_business_account&access_token=$META_ACCESS_TOKEN"
```

#### 3b. Buscar posts recentes (últimos 60 dias)

```bash
SINCE=$(date -v-60d +%s 2>/dev/null || date -d "60 days ago" +%s)

curl -s "https://graph.facebook.com/v19.0/<IG_USER_ID>/media?\
fields=id,caption,media_type,timestamp,like_count,comments_count&\
since=$SINCE&\
access_token=$META_ACCESS_TOKEN" \
| python3 -c "
import sys, json
data = json.load(sys.stdin)
posts = data.get('data', [])
print(f'Total posts: {len(posts)}')
for p in posts[:5]:
    print(p.get('timestamp','')[:10], '|', p.get('like_count',0), 'likes |', p.get('comments_count',0), 'comments | ', (p.get('caption','') or '')[:60])
"
```

#### 3c. Buscar insights por post (engajamento, alcance, impressões)

Para cada post ID coletado:
```bash
curl -s "https://graph.facebook.com/v19.0/<POST_ID>/insights?\
metric=impressions,reach,engagement,saved&\
access_token=$META_ACCESS_TOKEN"
```

#### 3d. Resumir performance

Calcular via Python inline:
- Top 3 posts por engajamento
- Média de likes, comentários, alcance
- Tipo de conteúdo que performou melhor (carrossel vs imagem vs reels)
- Melhor dia/horário de postagem (baseado nos timestamps dos top posts)

### 4. Gerar estratégia editorial

Com base no contexto da conta + análise de performance (ou perfil do nicho se sem histórico), gerar JSON interno:

```json
{
  "mes": "maio 2026",
  "conta": "@handle",
  "performance_resumo": {
    "top_formatos": [],
    "melhor_dia": "",
    "melhor_horario": "",
    "temas_mais_engajados": []
  },
  "tema_mensal": "...",
  "pilares": ["pilar1", "pilar2", "pilar3"],
  "posts": [
    {
      "data": "2026-05-05",
      "dia_semana": "segunda",
      "horario_sugerido": "18:00",
      "tipo": "educativo|emocional|produto|dica|engajamento|bastidores|prova_social",
      "formato": "imagem_unica|carrossel",
      "tema": "...",
      "acao_alvo": "save|dm_share|comment|reach",
      "legenda": "texto completo da legenda em PT-BR (incluindo CTA e hashtags ao final)",
      "slides": ["texto do slide 1", "texto do slide 2"],
      "descricao_imagem": "Descrição detalhada e visual da imagem ou de cada slide do carrossel. Incluir: composição, cores dominantes, elementos visuais, estilo fotográfico ou ilustrativo, mood, o que aparece em primeiro e segundo plano. Suficientemente detalhado para um designer ou IA de imagem executar."
    }
  ]
}
```

Gerar 12–16 posts distribuídos ao longo do mês (3–4 por semana).
Usar apenas `imagem_unica` e `carrossel` — sem reels, sem stories.
Priorizar formatos que tiveram melhor performance no histórico.
Se sem histórico: equilibrar 40% imagem única / 60% carrossel (carrosséis convertem 114% mais que imagens únicas).

#### Distribuição de pilares (baseada em benchmarks de nicho apps)
- **40% Educativo/Utilidade** — dicas, guias, listas. Prioridade para saves (evergreen).
- **30% Emocional/Comunidade** — identificação, histórias, engajamento. Prioridade para compartilhamentos via DM.
- **20% Produto/Funcionalidade** — mostrar o app como solução de problema, não como venda.
- **10% Bastidores/Prova Social** — humanizar a marca, depoimentos, curiosidades.

#### Hierarquia de engajamento que o algoritmo prioriza (2025)
1. **Compartilhamentos via DM** (sinal mais forte)
2. **Salvamentos** (conteúdo evergreen, vale revisitar)
3. **Compartilhamentos públicos**
4. **Comentários**
5. **Curtidas** (sinal mais fraco)

Cada post deve ser pensado com o objetivo de maximizar 1 ou 2 dessas ações. Adicionar no JSON interno qual ação-alvo o post busca (`acao_alvo: "save"|"dm_share"|"comment"|"reach"`).

#### Horários recomendados por dia
- Segunda: 19h–21h
- Quarta: 12h ou 18h (melhores do dia)
- Quinta: 9h ou 19h (dia com mais engajamento geral)
- Sexta: 18h
- Sábado: 10h ou 17h
- Domingo: 12h–15h

### 5. Salvar arquivo MD de output

Criar diretório de saída:
```bash
mkdir -p ~/instagram-planner/<YYYY-MM>
```

Gerar arquivo `~/instagram-planner/<YYYY-MM>/plano.md` com a seguinte estrutura:

```markdown
# Plano Instagram — <Mês Ano>
**Conta:** @handle
**Tema do mês:** ...
**Pilares de conteúdo:** pilar1 · pilar2 · pilar3

---

## Análise de Performance (últimos 2 meses)

> (se disponível)
- Média de likes: X
- Média de alcance: X
- Formatos com melhor engajamento: X
- Melhor dia para postar: X às XX:00
- Temas mais engajados: X, Y, Z

---

## Posts do Mês

### Post 1 — DD/MM (dia da semana) às HH:00
**Formato:** imagem única / carrossel (N slides)
**Tipo:** educativo / emocional / produto / dica / engajamento / bastidores / prova_social
**Tema:** ...
**Ação-alvo:** save / dm_share / comment / reach

**Legenda:**
> (legenda completa com hashtags — seguir anatomia: Hook → Corpo → CTA específico → 5–8 hashtags)

**Descrição da imagem:**
> (descrição detalhada para designer/IA: composição, cores, elementos, estilo, mood)

**Slides (se carrossel — alvo 8–10 slides):**
- Slide 1 (capa): ...
- Slide 2: ...
- ...
- Último slide (CTA): ...

---

### Post 2 — ...
```

### 6. Relatório final

Exibir ao usuário:
- Caminho do arquivo gerado
- Resumo: quantos posts, distribuição por formato, tema mensal
- Próximos passos sugeridos (ex: configurar token Meta API se não tinha)

---

## Como configurar o token Meta API

Se o usuário não tiver token configurado, mostrar este guia:

```
Para usar análise de performance automática, você precisa:

1. Acessar developers.facebook.com → Criar App (tipo Business)
2. Adicionar produto: Instagram Graph API
3. No Graph API Explorer:
   - Selecionar seu app
   - Adicionar permissões: instagram_basic, instagram_manage_insights,
     pages_show_list, pages_read_engagement
   - Gerar User Token
4. Converter para long-lived token (60 dias):
   GET https://graph.facebook.com/v19.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id={app_id}
     &client_secret={app_secret}
     &fb_exchange_token={short_lived_token}
5. Salvar o token:
   echo 'export META_ACCESS_TOKEN="seu_token"' >> ~/.zshrc
   source ~/.zshrc

Ou adicionar "meta_access_token" no arquivo:
~/.claude/instagram-planner-config.json
```

---

## Notas

- Nunca postar automaticamente — arquivo MD fica em `~/instagram-planner/<YYYY-MM>/plano.md` para revisão manual
- Legendas em português brasileiro
- **Hashtags: 5–8 tags específicas de nicho** (pesquisas 2025 mostram que 3–8 niche hashtags superam 20 genéricas em alcance orgânico). Evitar hashtags genéricas como `#maternidade` sozinha — combiná-las com tags específicas como `#maternidadereal` e `#organizaçãodevisitas`)
- Descrições de imagem devem ser detalhadas o suficiente para um designer ou ferramenta de IA (Midjourney, DALL-E, ComfyUI) executar sem dúvidas
- Se conta nova (sem histórico): mencionar isso no plano e focar em diversidade de formatos para teste A/B natural

### Anatomia obrigatória da legenda

Toda legenda deve seguir esta estrutura:

```
[HOOK — 1 frase forte antes do "mais". Deve parar o scroll. Ex: pergunta, dado surpreendente, afirmação ousada]

[CORPO — desenvolvimento em parágrafos curtos, separados por linha em branco. Usar emojis estrategicamente para quebrar texto e destacar pontos — 3 a 5 por legenda, no máximo.]

[CTA específico — nunca genérico. Em vez de "comenta aqui", usar "comenta o número da situação que mais te representa" ou "manda esse post pra quem precisa ver isso". CTA deve mapear para a acao_alvo do post.]

#hashtag1 #hashtag2 #hashtag3 #hashtag4 #hashtag5
```

### Carrossel: boas práticas

- **Máximo 6 slides por carrossel** — o espaço extra permite narrativa mais rica sem cortar conteúdo
- **Slide 1 (capa)**: deve funcionar como thumbnail autônomo — frase forte, visual impactante com figura humana
- **Slide 2**: entregar o primeiro valor imediatamente — não desperdiçar com introdução
- **Último slide**: sempre com CTA claro, alinhado à `acao_alvo`
- Cada slide: 1 ideia, 1 visual, texto mínimo legível

### Composição visual — Figuras humanas obrigatórias

Toda imagem do plano deve priorizar figuras humanas em interação real. Regras para `descricao_imagem`:

- **Cenas com pessoas** > ícones isolados > objetos. Ícones de smartphone/campainha/relógio são permitidos apenas como detalhe secundário, nunca como elemento principal.
- Descrever sempre: quem aparece (mãe, pai, avó, visitante, casal), o que estão fazendo, e a **emoção** que transmitem (ternura, alívio, cansaço amoroso, alegria contida, conexão, surpresa positiva).
- Evitar: pose artificial, stock genérico, figuras sem expressão, cenas sem contexto emocional.
- Estilo preferido: fotorrealista editorial de maternidade ou ilustração flat/aquarela com personagens expressivos.

### Paleta de cores obrigatória (identidade Lado a Lado)

Usar a paleta do app em todos os posts. Exceções apenas para datas especiais, com justificativa no plano.

| Elemento | Cor | Hex |
|---|---|---|
| Primária | Coral Suave | `#FF6F61` |
| Secundária | Verde-Menta | `#A8D5BA` |
| Fundo base | Bege Quente | `#F4E4BC` |
| Gradiente início | Pêssego | `#FFD4BF` |
| Gradiente meio | Creme | `#FCE8C4` |
| Gradiente fim | Dourado Âmbar | `#F0C87A` |
| Texto principal | Marrom Escuro Quente | `#2D2018` |
| Texto sobre cor | Branco Off | `#FAFAFA` |

Regras de aplicação:
- Fundo dos slides: gradiente quente ou `#F4E4BC` como base
- Bandas de overlay: coral `#FF6F61` (primário) ou verde-menta `#7DB89A` (secundário)
- Slide CTA (último): fundo coral `#FF6F61`, texto `#FAFAFA`
- **Proibido** usar azul bebê (#5B9BD5), amarelo-mel (#F5C842) ou verde-menta como primária — são cores externas à identidade

### Diversidade de funcionalidades — Regra obrigatória

O app tem múltiplas funcionalidades. Ler a lista completa e atualizada sempre do README:

```bash
cat /Users/fipacheco/lado-a-lado/README.md | grep -A 100 "^## Funcionalidades" | grep -B 100 "^## Pré-requisitos" | grep "^###"
```

Todo plano mensal deve cobrir **pelo menos 2 funcionalidades diferentes**. Nunca concentrar todos os posts de produto na mesma feature no mesmo mês.

### Texto nas imagens — OBRIGATÓRIO para carrosséis

As imagens são geradas **sem texto** (para evitar erros de tipografia da IA). O texto é sobreposto via código (Pillow) depois da geração.

Toda `descricao_imagem` de carrossel deve ter dois campos separados por slide:

```
Slide N — VISUAL: [descrição do fundo/ilustração apenas, sem mencionar texto]
Slide N — OVERLAY: "[texto exato a sobrepor]" | posição: top | cor_fundo: #HEXHEX | cor_texto: #HEXHEX
```

- `posição`: `top` (banda no topo, boa para slides com ilustração centralizada), `bottom` (banda embaixo, boa para fotos), `center` (texto centralizado sem banda, para slides de fundo sólido)
- `cor_fundo`: cor da banda de texto (pode ser hex com alpha implícito 80%) — usar a cor de destaque do slide
- `cor_texto`: `#FFFFFF` (branco) na maioria dos casos

Exemplo correto:
> Slide 1 — VISUAL: fundo creme (#FAF7F0), ilustração flat de mãe segurando bebê com ícones de WhatsApp e calendário ao redor, espaço livre no topo (~30% da altura).
> Slide 1 — OVERLAY: "Situações que toda mãe de primeira viagem já viveu" | posição: top | cor_fundo: #5B9BD5 | cor_texto: #FFFFFF
