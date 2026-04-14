-- Kobina PRO — index de performance suggérés
-- À exécuter dans le SQL Editor Supabase du projet qui utilise les tables
-- `commerces`, `produits`, `sessions`, `factures`, `credits`, `depenses`.
-- Vérifiez que les colonnes existent avant d’exécuter (adaptez si besoin).

CREATE INDEX IF NOT EXISTS idx_sessions_commerce_created
  ON sessions (commerce_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_factures_session
  ON factures (session_id);

CREATE INDEX IF NOT EXISTS idx_produits_commerce
  ON produits (commerce_id);

CREATE INDEX IF NOT EXISTS idx_produits_code_barre
  ON produits (code_barre)
  WHERE code_barre IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_credits_commerce_status
  ON credits (commerce_id, status);

CREATE INDEX IF NOT EXISTS idx_depenses_commerce_date
  ON depenses (commerce_id, created_at DESC);
