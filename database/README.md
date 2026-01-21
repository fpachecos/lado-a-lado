# Scripts de Banco de Dados

Este diretório contém os scripts SQL necessários para configurar o banco de dados no Supabase.

## Ordem de Execução

1. **schema.sql** - Execute primeiro. Cria todas as tabelas, índices, triggers e políticas RLS.

2. **trigger_no_overlap.sql** - Execute após o schema.sql. Adiciona a validação de sobreposição de slots.

3. **migration_remove_profiles.sql** - Execute se você já tem a estrutura antiga com a tabela profiles. Remove a tabela profiles e atualiza as referências para usar auth.users diretamente.

## Como Executar

1. Acesse o Supabase Dashboard
2. Vá em SQL Editor
3. Cole e execute cada script na ordem mencionada acima
4. Verifique se não há erros

## Notas Importantes

- Os scripts são incrementais e seguros para executar múltiplas vezes (usam `IF NOT EXISTS`)
- As políticas RLS garantem que cada usuário só acesse seus próprios dados
- O trigger de sobreposição previne slots conflitantes no mesmo dia e horário

## Estrutura das Tabelas

- `ladoalado.babies` - Informações dos bebês (referencia auth.users diretamente)
- `ladoalado.visit_schedules` - Agendas de visitas (referencia auth.users diretamente)
- `ladoalado.visit_slots` - Slots de horários
- `ladoalado.visit_bookings` - Agendamentos confirmados

**Nota:** A autenticação é gerenciada pelo Supabase Auth (`auth.users`). Não há mais a tabela `profiles`.

