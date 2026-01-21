# Lado a Lado

Aplicativo iOS para acompanhantes de pessoas grávidas, desenvolvido com Expo e React Native.

## Funcionalidades

- ✅ Autenticação com Supabase (login, cadastro, recuperação de senha)
- ✅ Cadastro de informações do bebê
- ✅ Criação e gestão de agendas de visitas à maternidade
- ✅ Sistema de slots de visita com horários customizáveis
- ✅ Controle de capacidade máxima por slot
- ✅ Possibilidade de pular slots (ex: almoço)
- ✅ Gestão de visitas confirmadas
- ✅ Integração com RevenueCat para assinaturas premium
- ✅ Validação de sobreposição de horários

## Pré-requisitos

- Node.js 18+ 
- npm ou yarn
- Expo CLI (`npm install -g expo-cli`)
- Conta no Supabase
- Conta no RevenueCat (para funcionalidades premium)

## Configuração

1. **Clone o repositório e instale as dependências:**

```bash
npm install
```

2. **Configure as variáveis de ambiente:**

Crie um arquivo `.env` na raiz do projeto com:

```
EXPO_PUBLIC_SUPABASE_URL=sua_url_do_supabase
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=sua_chave_do_revenuecat_ios
```

3. **Configure o banco de dados:**

Execute o script SQL em `database/schema.sql` no SQL Editor do Supabase. O script cria todas as tabelas, índices, triggers e políticas RLS necessárias.

4. **Configure os ícones do aplicativo:**

Copie os ícones de `/Users/fipacheco/Downloads/IconKitchen-Output/ios/` para `assets/icon.png` e configure no `app.json`.

## Executando o aplicativo

```bash
# Iniciar o servidor de desenvolvimento
npm start

# Executar no iOS
npm run ios
```

## Estrutura do Projeto

```
lado-a-lado/
├── app/                    # Telas do aplicativo (Expo Router)
│   ├── (auth)/            # Telas de autenticação
│   ├── (tabs)/            # Telas principais com navegação por tabs
│   └── _layout.tsx        # Layout raiz
├── constants/             # Constantes (cores, etc)
├── lib/                   # Bibliotecas e configurações
│   ├── supabase.ts       # Cliente Supabase
│   └── revenuecat.ts     # Configuração RevenueCat
├── types/                 # Tipos TypeScript
├── database/              # Scripts SQL
└── assets/                # Imagens e recursos
```

## Cores do Aplicativo

- **Coral Suave** (#FF6F61): Cor primária (botões, ícone)
- **Bege Quente** (#F4E4BC): Fundo principal
- **Verde-Menta** (#A8D5BA): Cor secundária (checklists, progresso)
- **Cinza Claro** (#E0E0E0): Neutra (textos secundários)
- **Branco Off** (#FAFAFA): Fundo/app bar

## Funcionalidades Premium

Usuários do plano gratuito podem criar agendas apenas para 1 dia. Para criar agendas com múltiplos dias, é necessário fazer upgrade para o plano premium através do RevenueCat.

## Banco de Dados

O banco de dados utiliza Row Level Security (RLS) do Supabase para garantir que cada usuário só acesse seus próprios dados. As políticas estão configuradas no script SQL.

### Tabelas Principais

- `profiles`: Perfis de usuários
- `babies`: Informações dos bebês
- `visit_schedules`: Agendas de visitas
- `visit_slots`: Slots de horários dentro das agendas
- `visit_bookings`: Agendamentos de visitas confirmados

## Publicação no iOS

1. Configure o `app.json` com o bundle identifier correto
2. Execute `eas build --platform ios` (requer conta Expo)
3. Siga o processo de publicação na App Store

## Licença

Este projeto é privado.

