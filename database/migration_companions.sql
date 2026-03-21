-- Migration: Adiciona tabelas de acompanhantes e atividades
-- Criada em: 2026-03-21

-- Tabela de acompanhantes
CREATE TABLE IF NOT EXISTS ladoalado.companions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Tabela de atividades do acompanhante
CREATE TABLE IF NOT EXISTS ladoalado.companion_activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  companion_id UUID NOT NULL REFERENCES ladoalado.companions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS companions_user_id_idx ON ladoalado.companions(user_id);
CREATE INDEX IF NOT EXISTS companion_activities_companion_id_idx ON ladoalado.companion_activities(companion_id);
CREATE INDEX IF NOT EXISTS companion_activities_position_idx ON ladoalado.companion_activities(companion_id, position);

-- RLS
ALTER TABLE ladoalado.companions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladoalado.companion_activities ENABLE ROW LEVEL SECURITY;

-- Política RLS para companions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'companions'
      AND policyname = 'Users can manage their own companions'
  ) THEN
    CREATE POLICY "Users can manage their own companions"
      ON ladoalado.companions
      FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END;
$$;

-- Política RLS para companion_activities (acesso via ownership do companion)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'ladoalado'
      AND tablename  = 'companion_activities'
      AND policyname = 'Users can manage activities of their companions'
  ) THEN
    CREATE POLICY "Users can manage activities of their companions"
      ON ladoalado.companion_activities
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM ladoalado.companions
          WHERE companions.id = companion_activities.companion_id
            AND companions.user_id = auth.uid()
        )
      );
  END IF;
END;
$$;

-- Trigger updated_at para companions
DROP TRIGGER IF EXISTS update_companions_updated_at ON ladoalado.companions;
CREATE TRIGGER update_companions_updated_at
  BEFORE UPDATE ON ladoalado.companions
  FOR EACH ROW EXECUTE FUNCTION ladoalado.update_updated_at_column();

-- Trigger updated_at para companion_activities
DROP TRIGGER IF EXISTS update_companion_activities_updated_at ON ladoalado.companion_activities;
CREATE TRIGGER update_companion_activities_updated_at
  BEFORE UPDATE ON ladoalado.companion_activities
  FOR EACH ROW EXECUTE FUNCTION ladoalado.update_updated_at_column();
