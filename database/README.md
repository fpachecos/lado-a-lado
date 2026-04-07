# Scripts de Banco de Dados

Este diretório contém os scripts SQL necessários para configurar e evoluir o banco de dados no Supabase.

## Ordem de Execução

Execute os scripts nesta ordem em bancos novos:

1. **schema.sql** — Schema base: tabelas, índices, triggers de `updated_at` e políticas RLS.
2. **trigger_no_overlap.sql** — Trigger que impede sobreposição de slots no mesmo dia/horário.
3. **migration_add_schedule_name.sql** — Adiciona a coluna `name` à tabela `visit_schedules`.
4. **migration_companions.sql** — Cria as tabelas `companions` e `companion_activities` com RLS e triggers.
5. **migration_delete_user_rpc.sql** — Cria a função RPC `public.delete_user()` que permite ao usuário autenticado excluir a própria conta.
6. **migration_delete_user_rpc_v2.sql** — Melhoria da `delete_user()`: exclui dinamicamente todos os dados do usuário em qualquer tabela do schema `ladoalado` que possua coluna `user_id`, sem necessidade de atualização manual ao adicionar novas tabelas.
7. **migration_fix_overlap_trigger.sql** — Corrige bug no trigger `check_slot_overlap`: a verificação agora filtra por `schedule_id`, evitando falsos positivos entre slots de agendas diferentes no mesmo dia e horário.
8. **migration_email_invites.sql** — Sistema de convites por e-mail: cria a tabela `user_invites`, as RPCs `accept_invite()` e `get_invite_info()`, e adiciona políticas RLS em todas as tabelas de dados para que usuários convidados possam acessar e gerenciar os dados do convidante.

## Como Executar

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá em **SQL Editor**
3. Cole e execute cada script na ordem acima
4. Verifique se não há erros antes de prosseguir

## Criando Novas Migrações

**Nunca edite o `schema.sql`** para refletir mudanças futuras — ele representa o estado inicial.

Toda alteração nova deve ser um arquivo separado `migration_<descricao>.sql`. Use `/db-migration` no Claude Code para criar migrations com o padrão correto automaticamente.

### Regras

- Toda migration deve ser **idempotente** (segura para executar múltiplas vezes)
- Toda migration deve ser **retro-compatível** (não pode quebrar dados ou código existente)
- Novas colunas devem ser `NULLABLE` ou ter `DEFAULT` para não quebrar INSERTs existentes
- Após criar o arquivo, adicione-o na lista acima na ordem correta

## Estrutura das Tabelas

| Tabela | Descrição |
|---|---|
| `ladoalado.babies` | Informações dos bebês, referencia `auth.users` diretamente |
| `ladoalado.visit_schedules` | Agendas de visitas, com `name`, `start_date`, `end_date`, `custom_message` |
| `ladoalado.visit_slots` | Slots de horário dentro de uma agenda |
| `ladoalado.visit_bookings` | Agendamentos confirmados por visitantes |
| `ladoalado.companions` | Acompanhantes cadastrados pelos usuários |
| `ladoalado.companion_activities` | Atividades (markdown) associadas a cada acompanhante |
| `ladoalado.user_invites` | Convites por e-mail: relaciona convidantes e convidados |

**Autenticação:** gerenciada pelo Supabase Auth (`auth.users`). Não há tabela `profiles`.

## Políticas RLS Relevantes

- `visit_schedules`: acesso público de SELECT (`USING (true)`) — usado pela web sem autenticação
- `visit_slots`: acesso público de SELECT — usado pela web sem autenticação
- `visit_bookings`: INSERT, SELECT e DELETE públicos — visitantes podem agendar e cancelar sem login

