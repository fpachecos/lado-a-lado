-- Whitelist de emails premium: usuários listados aqui são tratados como
-- assinantes premium sem precisar de assinatura RevenueCat.
-- Para adicionar: INSERT INTO ladoalado.premium_whitelist (email) VALUES ('email@exemplo.com');

CREATE TABLE IF NOT EXISTS ladoalado.premium_whitelist (
  email      TEXT        PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE ladoalado.premium_whitelist ENABLE ROW LEVEL SECURITY;

-- Cada usuário autenticado pode verificar apenas o próprio email
CREATE POLICY "user can check own email"
  ON ladoalado.premium_whitelist
  FOR SELECT
  TO authenticated
  USING (lower(email) = lower(auth.jwt() ->> 'email'));
