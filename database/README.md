# Scripts de Banco de Dados

Este diretório contém os scripts SQL necessários para configurar e evoluir o banco de dados no Supabase.

## Ordem de Execução

Execute os scripts nesta ordem em bancos novos:

1. **schema.sql** — Schema base: tabelas, índices, triggers de `updated_at` e políticas RLS.
2. **trigger_no_overlap.sql** — Trigger que impede sobreposição de slots no mesmo dia/horário.
3. **migration_add_schedule_name.sql** — Adiciona a coluna `name` à tabela `visit_schedules`.
4. **migration_companions.sql** — Cria as tabelas `companions` e `companion_activities` com RLS e triggers.
5. **migration_delete_user_rpc.sql** — Cria a função RPC `public.delete_user()` para exclusão de conta.
6. **migration_delete_user_rpc_v2.sql** — Melhoria da `delete_user()`: exclui dinamicamente todos os dados do usuário em qualquer tabela do schema com coluna `user_id`.
7. **migration_fix_overlap_trigger.sql** — Corrige bug no trigger `check_slot_overlap`: filtra por `schedule_id` para evitar falsos positivos entre agendas diferentes.
8. **migration_email_invites.sql** — Sistema de convites por e-mail: cria `user_invites`, RPCs `accept_invite()` e `get_invite_info()`, e políticas RLS para acesso de convidados.
9. **migration_activity_completed.sql** — Adiciona coluna `is_completed` às atividades de acompanhantes.
10. **migration_baby_weights.sql** — Tabela para registro de peso do bebê.
11. **migration_baby_heights.sql** — Tabela para registro de altura do bebê.
12. **migration_baby_feedings.sql** — Tabela para registro de alimentações do bebê.
13. **migration_fix_accept_invite.sql** — Corrige `accept_invite()` para aceitar convites com `invitee_id` já preenchido.

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
| `ladoalado.babies` | Dados do bebê (referencia `auth.users`) |
| `ladoalado.visit_schedules` | Agendas de visitas (`name`, `start_date`, `end_date`, `custom_message`) |
| `ladoalado.visit_slots` | Slots de horário dentro de uma agenda |
| `ladoalado.visit_bookings` | Agendamentos confirmados por visitantes |
| `ladoalado.companions` | Acompanhantes cadastrados pelos usuários |
| `ladoalado.companion_activities` | Atividades (markdown) por acompanhante |
| `ladoalado.user_invites` | Convites por e-mail entre usuários |

**Autenticação:** gerenciada pelo Supabase Auth (`auth.users`). Não há tabela `profiles`.

## Políticas RLS Relevantes

- `visit_schedules`: acesso público de SELECT (`USING (true)`) — usado pela web sem autenticação
- `visit_slots`: acesso público de SELECT — usado pela web sem autenticação
- `visit_bookings`: INSERT, SELECT e DELETE públicos — visitantes podem agendar e cancelar sem login
