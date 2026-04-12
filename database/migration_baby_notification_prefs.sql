-- Adiciona preferências de notificação na tabela babies
ALTER TABLE ladoalado.babies
  ADD COLUMN IF NOT EXISTS feeding_notification_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS feeding_notification_hours INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS milestone_notification_enabled BOOLEAN NOT NULL DEFAULT FALSE;
