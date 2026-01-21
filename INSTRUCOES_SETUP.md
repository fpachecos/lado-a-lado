# Instruções de Setup - Lado a Lado

## Passo a Passo para Configurar o Aplicativo

### 1. Instalar Dependências

```bash
cd /Users/fipacheco/lado-a-lado
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=sua_chave_revenuecat_ios
```

**Onde encontrar:**
- **Supabase URL e Key**: Dashboard do Supabase > Settings > API
- **RevenueCat Key**: Dashboard do RevenueCat > API Keys

### 3. Configurar Banco de Dados no Supabase

1. Acesse o Supabase Dashboard
2. Vá em **SQL Editor**
3. Execute os scripts na seguinte ordem:

   a. **database/schema.sql** - Cria todas as tabelas, índices, triggers e políticas RLS
   
   b. **database/trigger_no_overlap.sql** - Adiciona validação de sobreposição de slots

4. Verifique se não há erros na execução

### 4. Configurar Ícones

Siga as instruções em `SETUP_ICONS.md` para copiar os ícones do diretório `/Users/fipacheco/Downloads/IconKitchen-Output/ios/` para `assets/`.

### 5. Executar o Aplicativo

```bash
# Iniciar o servidor de desenvolvimento
npm start

# Executar no iOS Simulator
npm run ios
```

### 6. Testar o Aplicativo

1. **Criar uma conta** - Use a tela de cadastro
2. **Cadastrar informações do bebê** - Navegue até a aba "Bebê"
3. **Criar uma agenda** - Vá em "Agendas" > "+ Nova"
4. **Adicionar slots** - Após criar a agenda, adicione slots de visita
5. **Visualizar visitas** - Na aba "Visitas", veja as visitas confirmadas

## Funcionalidades Implementadas

✅ **Autenticação completa**
- Login com e-mail e senha
- Cadastro de novos usuários
- Recuperação de senha

✅ **Gestão de Bebê**
- Cadastro de nome e sexo do bebê
- Edição das informações

✅ **Agendas de Visitas**
- Criação de agendas com data de início e fim
- Mensagem personalizada para visitantes
- Código GUID único para cada agenda
- Limitação de 1 dia para usuários Free
- Múltiplos dias para usuários Premium

✅ **Slots de Visita**
- Criação de slots com horário e duração customizáveis
- Capacidade máxima de pessoas por slot
- Possibilidade de pular slots (ex: almoço)
- Validação de sobreposição de horários

✅ **Gestão de Visitas**
- Visualização de visitas confirmadas por slot
- Informações do visitante e número de acompanhantes
- Agrupamento por data

✅ **Integração RevenueCat**
- Verificação de status premium
- Preparado para assinaturas (UI implementada)

## Próximos Passos

1. **Configurar RevenueCat** - Criar produtos e ofertas no dashboard
2. **Implementar tela de assinatura** - Conectar com RevenueCat para compras
3. **Criar ferramenta externa** - Para visitantes confirmarem presença usando o GUID
4. **Testar fluxo completo** - Criar agenda, compartilhar link, confirmar visita
5. **Publicar no App Store** - Configurar EAS Build e submeter para revisão

## Estrutura de Arquivos

```
lado-a-lado/
├── app/                    # Telas (Expo Router)
│   ├── (auth)/            # Autenticação
│   ├── (tabs)/            # Telas principais
│   └── index.tsx          # Entrada do app
├── constants/             # Cores e constantes
├── lib/                   # Configurações (Supabase, RevenueCat)
├── types/                 # Tipos TypeScript
├── database/              # Scripts SQL
└── assets/                # Ícones e imagens
```

## Troubleshooting

### Erro: "Supabase URL ou chave não configurada"
- Verifique se o arquivo `.env` existe e está na raiz do projeto
- Confirme que as variáveis começam com `EXPO_PUBLIC_`

### Erro ao executar SQL no Supabase
- Certifique-se de executar os scripts na ordem correta
- Verifique se já existem tabelas com os mesmos nomes (os scripts usam `IF NOT EXISTS`)

### Erro: "Slot sobrepõe outro slot"
- Isso é esperado! O sistema previne sobreposição de horários
- Verifique se o trigger foi executado corretamente

### Problemas com DateTimePicker
- No iOS, o picker aparece como modal
- No Android, aparece como dialog nativo
- Isso é comportamento esperado do componente

## Suporte

Para dúvidas ou problemas, verifique:
- Documentação do Expo: https://docs.expo.dev/
- Documentação do Supabase: https://supabase.com/docs
- Documentação do RevenueCat: https://www.revenuecat.com/docs

