-- Schema do banco de dados para Lado a Lado
-- Execute este script no Supabase SQL Editor
-- IMPORTANTE: Execute os comandos incrementalmente conforme necessário

-- Extensão para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar schema se não existir
CREATE SCHEMA IF NOT EXISTS ladoalado;

-- Tabela de bebês
-- Nota: user_id referencia auth.users diretamente (autenticação gerenciada pelo Supabase)
CREATE TABLE IF NOT EXISTS ladoalado.babies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  gender TEXT CHECK (gender IN ('male', 'female')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de agendas de visita
-- Nota: user_id referencia auth.users diretamente (autenticação gerenciada pelo Supabase)
CREATE TABLE IF NOT EXISTS ladoalado.visit_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guid UUID NOT NULL DEFAULT uuid_generate_v4() UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  custom_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de slots de visita
-- Nota: A constraint de exclusão de sobreposição será implementada via trigger
-- para evitar complexidade com EXCLUDE USING gist
CREATE TABLE IF NOT EXISTS ladoalado.visit_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID NOT NULL REFERENCES ladoalado.visit_schedules(id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  max_people INTEGER NOT NULL DEFAULT 1,
  date DATE NOT NULL,
  is_skipped BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tabela de agendamentos de visitas
CREATE TABLE IF NOT EXISTS ladoalado.visit_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES ladoalado.visit_slots(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  number_of_people INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_babies_user_id ON ladoalado.babies(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_schedules_user_id ON ladoalado.visit_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_schedules_guid ON ladoalado.visit_schedules(guid);
CREATE INDEX IF NOT EXISTS idx_visit_slots_schedule_id ON ladoalado.visit_slots(schedule_id);
CREATE INDEX IF NOT EXISTS idx_visit_slots_date ON ladoalado.visit_slots(date);
CREATE INDEX IF NOT EXISTS idx_visit_bookings_slot_id ON ladoalado.visit_bookings(slot_id);

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION ladoalado.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_babies_updated_at BEFORE UPDATE ON ladoalado.babies
  FOR EACH ROW EXECUTE FUNCTION ladoalado.update_updated_at_column();

CREATE TRIGGER update_visit_schedules_updated_at BEFORE UPDATE ON ladoalado.visit_schedules
  FOR EACH ROW EXECUTE FUNCTION ladoalado.update_updated_at_column();

CREATE TRIGGER update_visit_slots_updated_at BEFORE UPDATE ON ladoalado.visit_slots
  FOR EACH ROW EXECUTE FUNCTION ladoalado.update_updated_at_column();

CREATE TRIGGER update_visit_bookings_updated_at BEFORE UPDATE ON ladoalado.visit_bookings
  FOR EACH ROW EXECUTE FUNCTION ladoalado.update_updated_at_column();

-- RLS (Row Level Security) Policies
ALTER TABLE ladoalado.babies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladoalado.visit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladoalado.visit_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladoalado.visit_bookings ENABLE ROW LEVEL SECURITY;

-- Políticas para babies
CREATE POLICY "Users can view own babies" ON ladoalado.babies
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own babies" ON ladoalado.babies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own babies" ON ladoalado.babies
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own babies" ON ladoalado.babies
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas para visit_schedules
CREATE POLICY "Users can view own schedules" ON ladoalado.visit_schedules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own schedules" ON ladoalado.visit_schedules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own schedules" ON ladoalado.visit_schedules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own schedules" ON ladoalado.visit_schedules
  FOR DELETE USING (auth.uid() = user_id);

-- Política pública para visualizar schedules por GUID (para a ferramenta externa)
CREATE POLICY "Public can view schedules by guid" ON ladoalado.visit_schedules
  FOR SELECT USING (true);

-- Políticas para visit_slots
CREATE POLICY "Users can view own slots" ON ladoalado.visit_slots
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ladoalado.visit_schedules
      WHERE visit_schedules.id = visit_slots.schedule_id
      AND visit_schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own slots" ON ladoalado.visit_slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM ladoalado.visit_schedules
      WHERE visit_schedules.id = visit_slots.schedule_id
      AND visit_schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own slots" ON ladoalado.visit_slots
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM ladoalado.visit_schedules
      WHERE visit_schedules.id = visit_slots.schedule_id
      AND visit_schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own slots" ON ladoalado.visit_slots
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM ladoalado.visit_schedules
      WHERE visit_schedules.id = visit_slots.schedule_id
      AND visit_schedules.user_id = auth.uid()
    )
  );

-- Política pública para visualizar slots por schedule (para a ferramenta externa)
CREATE POLICY "Public can view slots by schedule" ON ladoalado.visit_slots
  FOR SELECT USING (true);

-- Políticas para visit_bookings
CREATE POLICY "Users can view own bookings" ON ladoalado.visit_bookings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM ladoalado.visit_slots
      JOIN ladoalado.visit_schedules ON visit_schedules.id = visit_slots.schedule_id
      WHERE visit_slots.id = visit_bookings.slot_id
      AND visit_schedules.user_id = auth.uid()
    )
  );

CREATE POLICY "Public can insert bookings" ON ladoalado.visit_bookings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view bookings by slot" ON ladoalado.visit_bookings
  FOR SELECT USING (true);



ALTER DEFAULT PRIVILEGES IN SCHEMA ladoalado
GRANT ALL ON TABLES TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA ladoalado TO authenticated;

-- Permitir que os roles acessem o schema
GRANT USAGE ON SCHEMA ladoalado TO anon, authenticated;

-- Permitir SELECT em todas as tabelas do schema para o role anon
GRANT SELECT ON ALL TABLES IN SCHEMA ladoalado TO anon;

-- Permitir INSERT em bookings para o role anon (a web precisa inserir aqui)
GRANT INSERT ON TABLE ladoalado.visit_bookings TO anon;

-- 1) Permitir que o role anon faça DELETE na tabela
GRANT DELETE ON TABLE ladoalado.visit_bookings TO anon;

-- Permitir que acessos públicos (anon) deletem agendamentos
CREATE POLICY "Public can delete bookings"
ON ladoalado.visit_bookings
FOR DELETE
USING (true);