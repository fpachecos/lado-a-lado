---
name: db-migration
description: "Cria uma migration SQL incremental e retro-compatível para o banco Supabase do Lado a Lado, e oferece executá-la diretamente."
---

# db-migration

Cria uma nova migration SQL e oferece executá-la diretamente no Supabase remoto via CLI.

## Comportamento

Quando o usuário invocar `/db-migration` (com ou sem descrição do que precisa ser feito):

### 1. Entenda o que precisa ser alterado

Leia o contexto do usuário. Se não estiver claro, pergunte:
- O que precisa ser adicionado/alterado? (nova coluna, nova tabela, índice, política RLS)
- Em qual tabela?
- Qual o tipo e restrições?

### 2. Leia o estado atual do modelo de dados

Antes de criar qualquer script, leia **obrigatoriamente**:
- `types/database.ts` — fonte primária de verdade: interfaces TypeScript refletem as colunas reais de cada tabela
- `database/schema.sql` — estrutura base com tipos SQL, índices, triggers e políticas RLS
- `database/README.md` — ordem de execução das migrations já aplicadas
- Qualquer `database/migration_*.sql` existente — para não duplicar alterações

**Modelo de dados atual** (derivado de `types/database.ts`):

| Interface TypeScript | Tabela SQL | Campos principais |
|---|---|---|
| `Baby` | `ladoalado.babies` | `id`, `user_id`, `name`, `gender` |
| `VisitSchedule` | `ladoalado.visit_schedules` | `id`, `user_id`, `guid`, `name`, `start_date`, `end_date`, `custom_message` |
| `VisitSlot` | `ladoalado.visit_slots` | `id`, `schedule_id`, `date`, `start_time`, `duration_minutes`, `max_people`, `is_skipped` |
| `VisitBooking` | `ladoalado.visit_bookings` | `id`, `slot_id`, `visitor_name`, `number_of_people` |

> Todas as tabelas têm `created_at` e `updated_at` (timestamptz).
> Autenticação via `auth.users` — não há tabela `profiles` no schema `ladoalado`.

**Regra:** ao adicionar ou alterar campos no banco, **sempre atualizar também `types/database.ts`** para manter as interfaces em sincronia.

### 3. Crie o arquivo de migration

Nome do arquivo: `database/migration_<descricao_em_snake_case>.sql`

**Regras obrigatórias:**
- Toda migration deve ser **idempotente** (segura para executar múltiplas vezes)
- Toda migration deve ser **retro-compatível** (não pode quebrar dados ou código existente)
- Novas colunas devem ser `NULLABLE` ou ter `DEFAULT` para não quebrar INSERTs existentes
- Nunca use `DROP COLUMN`, `DROP TABLE` ou `TRUNCATE` sem instrução explícita do usuário

**Templates por tipo de alteração:**

#### Nova coluna
```sql
-- Migração: <descrição>

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'ladoalado'
      AND table_name   = '<tabela>'
      AND column_name  = '<coluna>'
  ) THEN
    ALTER TABLE ladoalado.<tabela> ADD COLUMN <coluna> <TIPO>;
    COMMENT ON COLUMN ladoalado.<tabela>.<coluna> IS '<descrição do campo>';
  END IF;
END;
$$;
```

#### Nova tabela
```sql
CREATE TABLE IF NOT EXISTS ladoalado.<tabela> (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- ... colunas ...
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_<tabela>_<campo> ON ladoalado.<tabela>(<campo>);

ALTER TABLE ladoalado.<tabela> ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_<tabela>_updated_at
  BEFORE UPDATE ON ladoalado.<tabela>
  FOR EACH ROW EXECUTE FUNCTION ladoalado.update_updated_at_column();
```

#### Nova política RLS
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = '<tabela>'
      AND policyname = '<nome da policy>'
  ) THEN
    CREATE POLICY "<nome da policy>" ON ladoalado.<tabela>
      FOR <SELECT|INSERT|UPDATE|DELETE>
      USING (<condição>);
  END IF;
END;
$$;
```

#### Trigger (já idempotente por natureza)
```sql
CREATE OR REPLACE FUNCTION ladoalado.<nome_funcao>() RETURNS TRIGGER AS $$
BEGIN
  -- lógica
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS <nome_trigger> ON ladoalado.<tabela>;
CREATE TRIGGER <nome_trigger>
  BEFORE INSERT OR UPDATE ON ladoalado.<tabela>
  FOR EACH ROW EXECUTE FUNCTION ladoalado.<nome_funcao>();
```

### 4. Atualize os arquivos de referência

Após criar o SQL da migration:
1. **`database/README.md`** — adicione o novo arquivo na lista de ordem de execução
2. **`types/database.ts`** — atualize ou adicione as interfaces TypeScript para refletir os novos campos/tabelas

### 5. Ofereça executar a migration diretamente

Após criar o arquivo, verifique se `SUPABASE_ACCESS_TOKEN` existe no `.env`:

```bash
grep SUPABASE_ACCESS_TOKEN /Users/fipacheco/lado-a-lado/.env
```

**Se a variável existir:** pergunte ao usuário se deseja executar a migration agora no banco remoto. Se confirmar, execute:

```bash
SUPABASE_ACCESS_TOKEN=$(grep SUPABASE_ACCESS_TOKEN /Users/fipacheco/lado-a-lado/.env | cut -d= -f2-) \
npx supabase db query --linked \
  -f /Users/fipacheco/lado-a-lado/database/<arquivo_migration>.sql \
  --agent=yes 2>&1
```

O projeto já está linkado ao ref `xstsbaexisgxebgydtyj`. Após executar, informe o resultado (sucesso ou erro).

**Se a variável NÃO existir:** informe ao usuário que o `SUPABASE_ACCESS_TOKEN` precisa estar no `.env`. Use `/supabase-token` para renová-lo. Após adicionar, ofereça executar imediatamente.

### Checklist antes de executar

- [ ] Script usa `IF NOT EXISTS` ou equivalente
- [ ] Novas colunas são nullable ou têm default
- [ ] Não há `DROP` sem instrução explícita
- [ ] `database/README.md` atualizado
- [ ] `types/database.ts` atualizado
- [ ] Usuário confirmou que quer executar no banco remoto
