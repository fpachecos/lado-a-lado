# Lado a Lado

App iOS/Android para organizar agendas de visitas à maternidade. Desenvolvido com Expo (React Native) e Supabase.

## Funcionalidades

- Autenticação com Supabase (login, cadastro, recuperação de senha)
- Cadastro de informações do bebê
- Criação e gestão de agendas de visitas com slots de horário
- Controle de capacidade máxima por slot
- Link público para visitantes confirmarem presença sem login
- Gestão de visitas confirmadas
- Sistema de convites por e-mail (acompanhantes gerenciam a agenda juntos)
- Integração com RevenueCat para assinaturas premium (múltiplos dias)

## Pré-requisitos

- Node.js 18+
- Conta no Supabase
- Conta no RevenueCat (para funcionalidades premium)

## Configuração

1. **Instale as dependências:**

```bash
npm install
```

2. **Configure as variáveis de ambiente** — crie `.env` na raiz:

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=
```

3. **Configure o banco de dados:**

Execute os scripts de `database/` no SQL Editor do Supabase na ordem indicada em `database/README.md`.

4. **Execute o aplicativo:**

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

Schema `ladoalado` no Supabase com RLS ativo. Tabelas principais:

| Tabela | Descrição |
|---|---|
| `babies` | Dados do bebê |
| `visit_schedules` | Agendas de visitas |
| `visit_slots` | Slots de horário dentro de uma agenda |
| `visit_bookings` | Agendamentos confirmados por visitantes |
| `companions` | Acompanhantes cadastrados |
| `companion_activities` | Atividades (markdown) por acompanhante |
| `user_invites` | Convites por e-mail entre usuários |

Ver `database/README.md` para a ordem de execução dos scripts.

## Licença

Projeto privado.
