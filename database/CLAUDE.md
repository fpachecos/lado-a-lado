# Database — Lado a Lado

Schema PostgreSQL no Supabase. Nome do schema: `ladoalado`.

## Tabelas

| Tabela | Descrição |
|---|---|
| `babies` | Dados do bebê (user_id, name, gender) |
| `visit_schedules` | Agendas de visita (user_id, name, start/end_date, custom_message) |
| `visit_slots` | Horários dentro de uma agenda (date, start_time, duration_minutes, max_people, is_skipped) |
| `visit_bookings` | Reservas de visitantes (slot_id, visitor_name, number_of_people) |
| `companions` | Acompanhantes do bebê (user_id, name) |
| `companion_activities` | Atividades de cada acompanhante (companion_id, content, is_completed, order_index) |

Auth via `auth.users` (Supabase) — sem tabela `profiles`.

## Arquivos

| Arquivo | Propósito |
|---|---|
| `schema.sql` | Schema base completo — idempotente (`IF NOT EXISTS`). Representa o estado inicial. |
| `trigger_no_overlap.sql` | Trigger que impede sobreposição de slots no mesmo dia/horário. Executar após o schema. |
| `migration_*.sql` | Migrações incrementais — cada uma adiciona/altera sem quebrar o existente. |

## Regras

**Nunca edite `schema.sql` para refletir mudanças futuras** — ele representa o estado inicial do banco. Toda alteração nova deve ser um arquivo `migration_<descricao>.sql` separado.

**Toda migração deve ser retro-compatível e idempotente.** Use os padrões abaixo:

```sql
-- Adicionar coluna
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ladoalado'
      AND table_name   = 'nome_da_tabela'
      AND column_name  = 'nova_coluna'
  ) THEN
    ALTER TABLE ladoalado.nome_da_tabela ADD COLUMN nova_coluna TEXT;
  END IF;
END;
$$;

-- Nova tabela
CREATE TABLE IF NOT EXISTS ladoalado.nova_tabela ( ... );

-- Nova política RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'nome_da_tabela'
      AND policyname = 'nome da policy'
  ) THEN
    CREATE POLICY "nome da policy" ON ladoalado.nome_da_tabela FOR SELECT USING (true);
  END IF;
END;
$$;

-- Trigger (já é idempotente por natureza)
CREATE OR REPLACE FUNCTION ladoalado.minha_funcao() ...
DROP TRIGGER IF EXISTS nome_trigger ON ladoalado.tabela;
CREATE TRIGGER nome_trigger ...
```

## Como aplicar uma migração

1. Crie o arquivo `database/migration_<descricao>.sql`
2. Acesse o Supabase Dashboard → SQL Editor
3. Cole e execute o script
4. Atualize a lista de scripts em `README.md` (raiz) com o novo arquivo na ordem de execução

Use `/db-migration` para criar uma migração nova com o padrão correto.

## RLS — Políticas relevantes

- Todas as tabelas têm RLS ativo
- `visit_schedules`: policy SELECT pública (`USING (true)`) — acessível sem login pela web
- Demais tabelas: `user_id = auth.uid()` — usuário vê apenas seus próprios dados
