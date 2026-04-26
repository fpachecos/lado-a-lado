---
name: instagram-planner
version: 2.0.0
description: "Gera plano mensal de publicações para Instagram otimizado para os sinais do algoritmo Andromeda/GEM da Meta. Output: arquivo MD com datas, conteúdo, descrição de imagens e protocolo de lançamento."
---

# instagram-planner

Gera plano editorial mensal para Instagram com estratégia calibrada para o algoritmo Andromeda da Meta (2025). Com ou sem dados históricos de performance via Meta Graph API.

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

#### 3c. Buscar insights por post (engajamento, alcance, impressões, saves)

Para cada post ID coletado:
```bash
curl -s "https://graph.facebook.com/v19.0/<POST_ID>/insights?\
metric=impressions,reach,engagement,saved&\
access_token=$META_ACCESS_TOKEN"
```

#### 3d. Resumir performance — ordenado por peso no algoritmo Andromeda

**Não usar likes como critério principal.** O Andromeda pesa saves e shares muito acima de likes. Calcular via Python inline:

1. **Save rate por post** (saves ÷ alcance × 100) — o sinal mais poderoso de valor percebido. Posts com save_rate > 3% são os que o algoritmo considera de alta relevância. Identificar o tema, formato e vocabulário desses posts.
2. **Engajamento por alcance** — proxy de DM share rate (não mensurável direto pela API, mas ratio alto = conteúdo sendo compartilhado). Engajamento ÷ alcance > 5% é forte.
3. **Top 3 por saves** — esses são os posts que o GEM pontuou mais alto. São a base para o Entity ID dominante da conta.
4. **Top 3 por alcance** — posts que "venceram" o teste de distribuição inicial do Andromeda. Analisar o que têm em comum (formato, hora, tema, vocabulário).
5. **Tipo de conteúdo** dos top posts (carrossel vs imagem).
6. **Vocabulário e temas dos top posts** — palavras recorrentes no texto dos posts mais salvos. Esses termos fazem parte do cluster semântico da conta; repeti-los no próximo mês reforça o posicionamento.
7. **Janela de horário** dos posts com melhor engajamento nas primeiras 3h.

⚠️ Se um post tiver muitos likes mas poucos saves → o algoritmo o considera entretenimento de baixo valor duradouro. Não replicar o tema/formato esperando resultado diferente.

### 4. Gerar estratégia editorial

Com base no contexto da conta + análise de performance (ou perfil do nicho se sem histórico).

#### 4a. Definir fio semântico do mês

**Antes de listar qualquer post**, definir um tema-guarda-chuva que conecta pelo menos 70% dos posts do mês. Esse fio semântico estabiliza o **Entity ID da conta** no cluster de recomendação do Andromeda — contas com Entity IDs estáveis têm distribuição acelerada porque o algoritmo já sabe para qual audiência distribuir antes de medir o engajamento.

O fio semântico não é o tema de cada post — é o contexto que amarra todos eles.

Exemplo ruim: "maternidade" (amplo demais, não estabiliza cluster)
Exemplo bom: "o mês que tudo muda — como manter rotina e afeto com o bebê em casa" (todos os posts giram em torno desse momento específico, independente do formato)

Registrar `fio_semantico` no JSON.

#### 4b. Planejar 2–3 séries temáticas

Uma série é um conjunto de 2–3 posts sobre o mesmo subtema, publicados com 4–7 dias de intervalo, que compartilham vocabulário e referências entre si. Séries criam reconhecimento de padrão na audiência ("esse post é da série que eu gosto") e reforçam o cluster semântico.

Cada episódio da série é independente (não precisa ter visto o anterior), mas o CTA do último episódio pode referenciar os anteriores.

Exemplo de série de 3 posts:
- Post 1: "O visitante que toda mãe ama" (o perfil ideal)
- Post 4 (5 dias depois): "O visitante bem-intencionado mas errado" (o perfil problema)
- Post 8 (5 dias depois): "Como transformar qualquer visitante no visitante que você precisa" (solução → CTA para o app)

#### 4c. Gerar JSON interno

```json
{
  "mes": "maio 2026",
  "conta": "@handle",
  "fio_semantico": "tema-guarda-chuva que conecta os posts do mês",
  "series": [
    {
      "titulo": "nome da série",
      "posts_ids": [1, 4, 8],
      "intervalo_dias": 5
    }
  ],
  "performance_resumo": {
    "top_formato": "",
    "top_tema": "",
    "save_rate_medio": "",
    "melhor_janela_horario": "",
    "vocabulario_dominante": []
  },
  "tema_mensal": "...",
  "pilares": ["pilar1", "pilar2", "pilar3"],
  "posts": [
    {
      "id": 1,
      "data": "2026-05-05",
      "dia_semana": "segunda",
      "horario_sugerido": "18:45",
      "tipo": "educativo|emocional|produto|dica|engajamento|bastidores|prova_social",
      "formato": "imagem_unica|carrossel",
      "serie": "nome da série ou null",
      "tema": "...",
      "acao_alvo": "save|dm_share|comment|reach",
      "mecanica_acao": "como esse post especificamente induz a acao_alvo — não pode ser genérico. Ex: 'carrossel com checklist de 5 itens que mães vão querer rever antes de cada visita → save natural sem precisar pedir'. O algoritmo mede ações, não intenções.",
      "legenda": "texto completo da legenda em PT-BR (incluindo CTA e hashtags ao final)",
      "slides": ["texto do slide 1", "texto do slide 2"],
      "descricao_imagem": "...",
      "primeiro_comentario": "texto para postar no próprio post em até 60 min após publicação — pergunta adicional ou dado complementar que semeia engajamento",
      "story_lancamento": "sugestão de texto para Story publicado em até 15 min após o post, apontando para ele"
    }
  ]
}
```

Gerar 12–16 posts distribuídos ao longo do mês (3–4 por semana).
Usar apenas `imagem_unica` e `carrossel` — sem reels, sem stories.
Priorizar formatos que tiveram melhor performance no histórico.
Se sem histórico: equilibrar 40% imagem única / 60% carrossel.

#### 4d. Distribuição de pilares — cada pilar tem uma ação primária

Cada pilar ressoa com um sinal específico do Andromeda. O plano deve calibrar o conteúdo de cada pilar para maximizar essa ação naturalmente (não forçada por CTA).

| Pilar | % | Ação primária | Por que o algoritmo responde |
|---|---|---|---|
| **Educativo/Utilidade** | 40% | save | Checklists, guias, referências — a pessoa salva para reler quando precisar. Save rate alto sinaliza ao Andromeda que o conteúdo tem valor duradouro. Evergreen. |
| **Emocional/Comunidade** | 30% | dm_share | Identificação ultra-específica e humor geram o impulso "preciso mandar isso pra fulana". DM share é o sinal #1 do Andromeda. Quanto mais específica a situação retratada, mais forte o impulso de compartilhar. |
| **Produto/Funcionalidade** | 20% | reach | Mostrar o app resolvendo um problema real — não venda, demonstração. Funciona como conteúdo de descoberta (topo de funil). O Andromeda distribui para audiências novas quando o sinal de alcance é forte. |
| **Bastidores/Prova Social** | 10% | comment | Humanizar a marca, perguntas com escolha binária, bastidores que geram curiosidade. Comentários em cadeia mantêm o post ativo por mais tempo no feed. |

**Regra crítica: um post, um CTA, uma ação.** Post com dois CTAs divide o sinal de engajamento e o algoritmo não consegue classificar o conteúdo. A única exceção é o tipo `reach`, onde "salva ou compartilha" é permitido.

#### 4e. Matriz de design por ação-alvo

Para cada `acao_alvo`, o conteúdo exige uma estrutura diferente de narrativa, visual e CTA:

**→ save** — conteúdo de referência futura
- Estrutura: problema recorrente → solução em lista ou passos → contexto de quando usar
- Visual: carrossel com informação densa e escaneável por slide (título + 1 item por slide)
- CTA: "Salva esse post — [motivo específico para voltar a ele]." Justificar o save com o momento exato de uso. Ex: "Salva aqui. Você vai querer isso na mão na próxima vez que a sogra ligar pedindo pra aparecer."
- ❌ Nunca: "salva pra não perder" (genérico, não converte)

**→ dm_share** — conteúdo de identificação e reconhecimento
- Estrutura: situação ultra-específica que a pessoa viveu → validação emocional → humor ou alívio
- Visual: cena reconhecível com pessoa(s) em situação típica. Quanto mais específica a cena, mais "sou eu!" — e mais forte o impulso de mandar pra alguém que também vai se identificar
- CTA: "Manda pra [descrição específica da pessoa]." Nomear a pessoa-alvo do share aumenta drasticamente a taxa. Ex: "Manda pra aquela amiga que tá na reta final." > "Compartilha com quem precisa."
- ❌ Nunca: "compartilhe com alguém especial" (abstrato demais)

**→ comment** — conteúdo com lacuna que o usuário quer preencher
- Estrutura: pergunta genuína ou escolha binária clara → espaço para resposta pessoal → promessa de engajamento do criador com as respostas
- Visual: imagem que ilustra as opções ou o dilema
- CTA: mecânica concreta e de baixo esforço. Ex: "Comenta A se prefere visitas curtas e frequentes, B se prefere longas e espaçadas. Quero ver o resultado." Quanto menor o esforço para responder, maior a taxa.
- ❌ Nunca: "o que você acha?" (aberto demais, paralisa)

**→ reach** — conteúdo de entrada (topo de funil)
- Estrutura: problema universal no nicho → solução ou perspectiva nova → menção ao app como facilitador (não como foco)
- Visual: cena emocional que ressoa com qualquer mãe, não apenas com usuárias do app
- CTA: "Salva ou compartilha se isso fez sentido pra você." Único caso de CTA duplo permitido.

#### 4f. Horários — janela crítica de 60–90 minutos

O Andromeda testa cada post em uma amostra pequena nas **primeiras 60–90 minutos** após publicação. Se o engajamento nessa janela superar o threshold do cluster de audiência, o algoritmo expande a distribuição. Postar no horário errado desperdiça conteúdo bom.

O post deve estar publicado **15 minutos antes do pico de audiência** para aproveitar a onda de acesso ativa:

| Dia | Publicar às | Pico de audiência |
|---|---|---|
| Segunda | 18h45 | 19h |
| Quarta | 11h30 ou 17h30 | 12h ou 18h |
| Quinta | 8h30 ou 18h30 | 9h ou 19h (maior engajamento semanal) |
| Sexta | 17h30 | 18h |
| Sábado | 9h30 ou 16h30 | 10h ou 17h |
| Domingo | 11h30 | 12h |

**Protocolo obrigatório pós-publicação** (incluir no plano como campo de cada post):
- **Em até 15 min**: publicar Story com texto curto apontando para o post ("tem post novo no feed — vale demais")
- **Em até 30 min**: responder os primeiros comentários com respostas longas (cada resposta aumenta a contagem de comentários e sinaliza atividade ao algoritmo)
- **Em até 60 min**: postar o `primeiro_comentario` — uma pergunta adicional ou dado complementar que semeia mais interação

### 5. Salvar arquivo MD de output

Criar diretório de saída:
```bash
mkdir -p ~/instagram-planner/<YYYY-MM>
```

Gerar arquivo `~/instagram-planner/<YYYY-MM>/plano.md` com a seguinte estrutura:

```markdown
# Plano Instagram — <Mês Ano>
**Conta:** @handle
**Fio semântico:** [tema-guarda-chuva que conecta os posts do mês]
**Tema do mês:** ...
**Pilares:** pilar1 · pilar2 · pilar3
**Séries:** série1 (posts 1, 4, 8) · série2 (posts 3, 7)

---

## Análise de Performance (últimos 2 meses)

> (se disponível)
- Save rate médio: X%
- Engajamento por alcance médio: X%
- Top formato por saves: carrossel / imagem única
- Tema com maior save rate: [tema]
- Vocabulário dominante dos top posts: [palavras recorrentes]
- Melhor janela de horário: [dia] às [hora]

---

## Posts do Mês

### Post 1 — DD/MM (dia da semana) — publicar às HH:MM
**Formato:** imagem única / carrossel (N slides)
**Tipo:** educativo / emocional / produto / engajamento / bastidores / prova_social
**Série:** [nome da série ou —]
**Ação-alvo:** save / dm_share / comment / reach
**Mecânica de ação:** [como esse post especificamente induz a ação — concreto, não genérico]

**Legenda:**
> (legenda completa com hashtags — seguir anatomia: Hook → Corpo → CTA da ação-alvo → hashtags)

**Descrição da imagem:**
> (descrição detalhada para designer/IA: emoção exata, cena específica, composição, cores, estilo)

**Slides (se carrossel):**
- Slide 1 (capa): [promessa + visual sem revelar a resposta]
- Slide 2: [primeiro valor imediato]
- Slide N: [conteúdo + microganceto para o próximo slide]
- Último slide (CTA): [apenas CTA, sem conteúdo novo]

**Protocolo de lançamento:**
- Story (em até 15 min): [texto sugerido]
- Primeiro comentário (em até 60 min): [texto sugerido]

---

### Post 2 — ...
```

### 6. Relatório final

Exibir ao usuário:
- Caminho do arquivo gerado
- Fio semântico escolhido e por que ele reforça o Entity ID da conta
- Distribuição: quantos posts por pilar e por ação-alvo
- Séries planejadas com datas de cada episódio
- ⚠️ Alertar se mais de 3 posts consecutivos tiverem o mesmo `acao_alvo` (monotonia de sinal)
- ⚠️ Alertar se algum post não tiver `mecanica_acao` preenchida de forma concreta

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

## Notas e diretrizes de criação

- Nunca postar automaticamente — arquivo MD fica em `~/instagram-planner/<YYYY-MM>/plano.md` para revisão manual
- Legendas em português brasileiro
- Se conta nova (sem histórico): mencionar isso no plano e focar em diversidade de formatos para teste A/B natural

### Anatomia obrigatória da legenda

Toda legenda segue: **Hook → Corpo → CTA → Hashtags**

```
[HOOK — o texto visível antes do botão "mais". Equivale aos primeiros 3 segundos de um Reels:
o algoritmo mede quantas pessoas tocam "mais" como proxy de interesse inicial.

O hook deve ter PROMESSA ESPECÍFICA + LACUNA DE CURIOSIDADE. Nunca revelar a resposta no hook.

Formatos que funcionam:
  • Número + especificidade: "3 coisas que ninguém te conta antes da primeira visita ao bebê"
  • Cenário reconhecível: "Você marcou horário, fez comida, limpou a casa. O visitante atrasou 1 hora."
  • Afirmação que divide: "Visita de avó não combina com rotina de bebê. (ou combina?)"
  • Dado surpreendente: "Mães de recém-nascido recebem em média 12 visitas nas primeiras 2 semanas."

❌ Proibido: começar com nome do app, saudação ("Oi mamãe!"), ou contexto genérico ("Hoje vamos falar sobre...")]

[CORPO — parágrafos curtos (máx 2 linhas), separados por linha em branco.
Emojis: 1 por parágrafo no máximo. Apenas para marcar transição ou destacar ponto-chave. Nunca decorativo.]

[CTA — usar a fórmula da acao_alvo do post. Ver tabela abaixo.]

#hashtag-core-1 #hashtag-core-2 #hashtag-core-3 #hashtag-tema-1 #hashtag-tema-2
```

**Fórmulas de CTA por ação-alvo:**

| Ação | Fórmula | Exemplo concreto |
|---|---|---|
| save | "Salva esse post — [motivo específico de quando vai precisar]." | "Salva esse post — você vai querer isso na mão antes da próxima visita surpresa." |
| dm_share | "Manda pra [descrição específica de quem vai se identificar]." | "Manda pra aquela amiga que tá na reta final da gravidez." |
| comment | "[Mecânica concreta de baixo esforço] nos comentários." | "Comenta A se prefere visitas curtas e frequentes, B se longas e espaçadas. Quero ver." |
| reach | "Salva ou compartilha se isso fez sentido pra você." | (único caso de CTA duplo) |

❌ CTAs proibidos (genéricos, não direcionam sinal específico): "comenta aí!", "o que você acha?", "compartilhe com alguém", "marca nos comentários".

### Carrossel — narrativa com tração de slides

O algoritmo mede a **taxa de conclusão** do carrossel (quantos slides o usuário viu). Funciona exatamente como watch time em Reels — quanto maior a taxa de conclusão, maior a distribuição subsequente. Cada slide deve criar tensão que puxa o próximo:

- **Slide 1 (capa)**: promessa clara + visual impactante com figura humana. **Não revelar a resposta** — a capa existe para gerar curiosidade. O usuário deve swipear para descobrir.
- **Slide 2**: entregar o primeiro valor imediatamente. A pessoa já swipou — não desperdiçar com contexto ou introdução.
- **Slides intermediários**: cada slide termina com uma transição que torna o próximo irresistível:
  - Suspense: "...e o terceiro motivo é o que mais surpreende →"
  - Anúncio: "No próximo slide: o erro que 9 em 10 mães cometem →"
  - Progressão crescente: ir do mais simples/óbvio para o mais surpreendente/impactante
- **Máximo 6 slides** — o que não couber em 6 é conteúdo de outro post
- **Último slide**: exclusivamente CTA alinhado à `acao_alvo`. Sem conteúdo novo — o último slide que tiver informação nova vai fazer o usuário parar nele em vez de agir.
- Cada slide: 1 ideia, 1 visual, texto mínimo legível

### Composição visual — emoção específica, não genérica

O GEM (camada de ranqueamento do Andromeda) analisa semanticamente a imagem: rostos, composição, emoção, contexto. Imagens com **emoção específica e reconhecível** geram mais engajamento que imagens "positivas genéricas". O algoritmo detecta autenticidade vs encenação.

Regras para `descricao_imagem`:

- **Descrever a emoção exata, não o rótulo**: não "mãe feliz com bebê" — mas "mãe de costas apoiada na porta do quarto às 22h, cabeça levemente inclinada, expressão de alívio exausto — o bebê acabou de dormir depois de 45 min de colo"
- **Cenas com tensão ou conflito (mesmo que resolvidos)** performam melhor que harmonia perfeita — o algoritmo lê que a imagem tem narrativa. Ex: "pai tentando afastar o cachorro do berço com o pé enquanto acalenta o bebê" > "pai carinhoso com bebê"
- **Especificidade da cena** > generalidade: "avó tentando pegar o bebê no colo sem acordar, com o braço estendido hesitante" > "avó com bebê"
- **Figuras humanas sempre** — cenas com pessoas > ícones > objetos isolados. Ícones de smartphone/campainha/relógio permitidos apenas como detalhe secundário.
- **Estilo**: fotorrealista editorial de maternidade (primeira opção) ou ilustração flat/aquarela com personagens expressivos (segunda opção). Nunca stock genérico ou pose artificial sem expressão.
- Descrever sempre: **quem** aparece, **o que estão fazendo** (ação específica), e a **emoção exata** (não o rótulo da emoção, mas a expressão física dela)

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

### Hashtags — core fixo + rotativo

O Andromeda usa hashtags como parte do fingerprint semântico (Entity ID) da conta. Hashtags repetidas consistentemente ajudam o algoritmo a posicionar a conta no cluster correto mais rápido.

Estrutura obrigatória:
- **3 hashtags core** (as mesmas em todos os posts do mês — ancoragem de cluster)
- **2–5 hashtags de tema** (específicas do assunto do post — rotativas)
- Total: 5–8 hashtags. Nunca mais que 8.

Hashtags core do nicho Lado a Lado (ajustar se conta diferente):
`#maternidadereal` `#organizaçãodevisitas` `#maternidadeprematura` (exemplo — confirmar com histórico de performance)

Evitar hashtags genéricas isoladas (`#maternidade`, `#bebê`, `#amor`). Combiná-las sempre com tags de nicho específico.

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
- `cor_fundo`: cor da banda de texto — usar a cor de destaque do slide
- `cor_texto`: `#FFFFFF` (branco) na maioria dos casos

Exemplo correto:
> Slide 1 — VISUAL: fundo creme (#FAF7F0), ilustração flat de mãe segurando bebê com ícones de WhatsApp e calendário ao redor, espaço livre no topo (~30% da altura).
> Slide 1 — OVERLAY: "Situações que toda mãe de primeira viagem já viveu" | posição: top | cor_fundo: #FF6F61 | cor_texto: #FFFFFF

### Consistência semântica — proteção do Entity ID

O Andromeda constrói um perfil semântico (Entity ID) da conta ao longo do tempo. Contas que postam dentro de um nicho consistente têm esse ID estável, o que acelera a distribuição para o cluster correto antes mesmo do engajamento ser medido. Posts fora do nicho fragmentam o ID e enfraquecem o posicionamento.

Regras de proteção:
- **Vocabulário consistente**: usar as mesmas palavras-chave de nicho ao longo do mês. Variações semânticas aleatórias enfraquecem o cluster. Se o histórico mostra que "rotina do bebê" performa mais que "cuidados neonatais", padronizar o vocabulário.
- **Máximo 1 post completamente fora do nicho por mês**. Mais do que isso, alertar o usuário.
- **Nunca misturar nichos opostos no mesmo mês** (ex: maternidade + culinária + viagens). Cada nicho adicional divide a audiência que o algoritmo construiu.
- O `fio_semantico` do mês existe para garantir que mesmo posts de pilares diferentes falem "a mesma língua" semanticamente.
