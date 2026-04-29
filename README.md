# Lado a Lado

App iOS/Android de organização do puerpério e dos primeiros meses do bebê. Expo (React Native) + Supabase.

<!-- CONTEXTO DE MARKETING — lido pelas skills de Instagram -->
<!-- nicho: App completo de organização do puerpério e primeiros meses do bebê -->
<!-- publico_alvo: Mães grávidas e recém-paridas, parceiros e pais de primeira viagem — pessoas vivendo o caos organizado do puerpério e dos primeiros meses com bebê -->
<!-- tom_de_voz: Acolhedor, descontraído, empático — fala como amigo que entende o caos gostoso da maternidade -->

## Funcionalidades

### Agendas de visitas
- Cria agendas com dias e horários disponíveis
- Define capacidade por slot (quantas pessoas por horário)
- Gera link público — visitantes confirmam presença sem precisar de login
- Acompanha visitas confirmadas em tempo real
- Plano Premium: agendas com múltiplos dias

### Registro de mamadas
- Registra horário de início e fim, qual seio e duração
- Calcula automaticamente o intervalo entre mamadas
- Relatório diário e histórico dos últimos dias
- Dados prontos para compartilhar com o pediatra

### Crescimento do bebê
- Registro de peso e altura ao longo do tempo
- Curva de crescimento com marcos do pediatra

### Registro de fraldas
- Controle de trocas com horário e tipo
- Acompanhamento de padrões ao longo do dia

### Controle de sonecas
- Botão para iniciar e encerrar sonecas com data e hora editáveis
- Resumo do dia: total dormindo, quantidade de sonecas e horas acordadas (atualização em tempo real)
- Relógio animado 24h com visualização dos períodos de sono e vigília
- Histórico agrupado por dia
- Recurso Premium: histórico além de 3 dias e relatórios com gráficos históricos

### Calendário de vacinas
- Calendário vacinal do bebê com datas e registros

### Acompanhantes
- Cadastro de acompanhantes (familiares, amigos)
- Registro de atividades por acompanhante (em markdown)
- Convites por e-mail: acompanhantes co-gerenciam a agenda

### Conta e segurança
- Autenticação Supabase (login, cadastro, recuperação de senha)
- Notificações configuráveis por preferência
- Dados isolados por usuário com RLS ativo

## Pré-requisitos

- Node.js 18+
- Conta no Supabase
- Conta no RevenueCat

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Variáveis de ambiente

Crie `.env` na raiz:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=sua_chave_revenuecat_ios
```

- Supabase URL e Key: Dashboard → Settings → API
- RevenueCat Key: Dashboard → API Keys

### 3. Banco de dados

Execute os scripts de `database/` no SQL Editor do Supabase nesta ordem:

1. `schema.sql`
2. `trigger_no_overlap.sql`
3. `migration_add_schedule_name.sql`
4. `migration_companions.sql`
5. `migration_delete_user_rpc.sql`
6. `migration_delete_user_rpc_v2.sql`
7. `migration_fix_overlap_trigger.sql`
8. `migration_email_invites.sql`
9. `migration_activity_completed.sql`
10. `migration_baby_weights.sql`
11. `migration_baby_heights.sql`
12. `migration_baby_feedings.sql`
13. `migration_fix_accept_invite.sql`
14. `migration_fix_baby_feedings_update_rls.sql`
15. `migration_baby_feedings_nullable_ended_at.sql`
16. `migration_baby_notification_prefs.sql`
17. `migration_vaccination_schedule.sql`
18. `migration_baby_diapers.sql`
19. `migration_baby_naps.sql`

### 4. Executar

```bash
npm run ios       # iOS Simulator
npm run android   # Android
npm start         # Dev server
```

## Estrutura do Projeto

```
lado-a-lado/
├── app/                    # Telas (Expo Router)
│   ├── (auth)/            # Autenticação
│   ├── (tabs)/            # Telas principais com tabs
│   └── index.tsx          # Entry point (auth check)
├── components/            # Componentes compartilhados
├── constants/             # Cores e constantes
├── lib/                   # Supabase client, RevenueCat
├── types/                 # Tipos TypeScript (database.ts)
├── database/              # Scripts SQL e migrações
├── web/                   # Web app Next.js (portal de agendamento)
└── assets/                # Ícones e imagens
```

## Banco de Dados

Schema `ladoalado` no Supabase com RLS ativo.

| Tabela | Descrição |
|---|---|
| `babies` | Dados do bebê |
| `visit_schedules` | Agendas de visitas |
| `visit_slots` | Slots de horário dentro de uma agenda |
| `visit_bookings` | Agendamentos confirmados por visitantes |
| `companions` | Acompanhantes cadastrados |
| `companion_activities` | Atividades (markdown) por acompanhante |
| `user_invites` | Convites por e-mail entre usuários |

RLS relevante: `visit_schedules` e `visit_slots` têm SELECT público — usados pela web sem autenticação.

## RevenueCat — Sandbox

O ambiente sandbox é detectado automaticamente pela conta do App Store no dispositivo.

1. Criar conta sandbox: App Store Connect → Users and Access → Sandbox Testers → +
2. No dispositivo: Settings → App Store → faça logout da conta pessoal. Ao comprar no app, o iOS pedirá login — use a conta sandbox.
3. Dashboard RevenueCat: ative "View Sandbox Data"
4. Verifique se "Sandbox Testing Access" está ativo em Project Settings

**Compras não aparecem?** Confirme que os produtos e o entitlement "premium" estão configurados no RevenueCat e no App Store Connect.

## Ícones

| Arquivo | Tamanho |
|---|---|
| `assets/icon.png` | 1024×1024px |
| `assets/splash.png` | 1242×2436px |
| `assets/adaptive-icon.png` | 1024×1024px (Android) |
| `assets/favicon.png` | 32×32px |

Com EAS Build os ícones são processados automaticamente a partir do `app.json`.

## App Store — Textos

### Nome (máx. 30 caracteres)
```
Lado a Lado
```

### Subtítulo (máx. 30 caracteres)
```
Agendas de visita à maternidade
```

### Texto promocional (máx. 170 caracteres)
```
Organize as visitas à maternidade em um só lugar. Cadastre o bebê, crie agendas com horários e compartilhe o link para familiares e amigos escolherem quando visitar. Tudo simples e seguro.
```

### Descrição (máx. 4000 caracteres)
```
Lado a Lado foi feito para quem está à espera de um bebê e quer organizar as visitas à maternidade sem stress.

Com o app você:
• Cadastra as informações do bebê (nome e sexo) em um único lugar
• Cria agendas de visitas com dias e horários que funcionam para você
• Define quantas pessoas podem visitar em cada horário
• Gera um link para compartilhar com familiares e amigos
• Acompanha quais visitas já foram confirmadas

Assim, todo mundo sabe quando pode ir, evita aglomeração e você consegue descansar nos momentos certos.

RECURSOS

— Informações do bebê
Guarde o nome e o sexo do bebê no app. Dados só seus, na sua conta.

— Agendas de visitas
Monte a agenda com a data, o nome (ex.: "Primeira semana em casa"), os horários e a quantidade de vagas por slot. No plano gratuito você cria agendas de 1 dia; no Premium, de vários dias.

— Link para compartilhar
Cada agenda gera um link. Envie no grupo da família ou por mensagem. Quem recebe escolhe um horário disponível e confirma a visita.

— Controle das visitas
Veja em uma lista quais horários já foram preenchidos e por quem, tudo no celular.

— Plano Premium
Assinando o Premium você desbloqueia a criação de agendas com múltiplos dias, ideal para receber pessoas em mais de 1 dia.

Lado a Lado é pensado para gestantes, parceiros e famílias que querem receber visitas com calma e segurança. Baixe e organize as visitas ao seu ritmo.
```

### Palavras-chave (máx. 100 caracteres)
```
maternidade,bebê,visitas,agenda,gestante,recém-nascido,família,organizar,visita hospitalar,parto
```

### Novidades (versão 1.0.0)
```
Bem-vindo ao Lado a Lado.

Nesta primeira versão você já pode:
• Cadastrar as informações do seu bebê
• Criar agendas de visitas com horários e vagas por slot
• Compartilhar o link da agenda com familiares e amigos
• Acompanhar as visitas confirmadas
• Assinar o plano Premium para criar agendas com vários dias

Se tiver sugestões ou problemas, use o link de suporte na página do app. Obrigado por baixar!
```

### URLs obrigatórias

| Campo | Obrigatório |
|---|---|
| URL de suporte | Sim |
| URL de política de privacidade | Sim (app coleta e-mail e dados do bebê) |
| URL de marketing | Não |

### Categoria

- Principal: **Estilo de vida** (Lifestyle)
- Secundária: **Saúde e fitness** (Health & Fitness)

### Classificação etária: 4+

### Capturas de tela — tamanhos aceitos

| Display | Dimensões |
|---|---|
| 6.9" | 1290×2796 ou 1320×2868 |
| 6.5" | 1284×2778 ou 1242×2688 |
| 6.1" | 1170×2532 ou 1179×2556 |

Para redimensionar no Mac: Preview → Ferramentas → Ajustar tamanho.

## Troubleshooting

**"Supabase URL ou chave não configurada"** — verifique se `.env` está na raiz e as variáveis começam com `EXPO_PUBLIC_`.

**"getDevServer is not a function"** — cache corrompido:
```bash
rm -rf node_modules .expo package-lock.json
npm install
npx expo start --clear
```

**Expo Go não conecta** — use o iOS Simulator (`npm run ios`) ou faça um Development Build:
```bash
eas build --profile development --platform ios
```

**"Slot sobrepõe outro slot"** — comportamento esperado; o sistema impede sobreposição de horários.

## Licença

Projeto privado.
