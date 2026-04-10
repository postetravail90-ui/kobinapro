/** Version du schéma offline-first (incrémenter à chaque migration). */
export const SCHEMA_VERSION = 1;

/** DDL initial : tables métier + file de sync. Toutes les entités portent les métadonnées de sync. */
export const MIGRATION_001 = `
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS _schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  applied_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  email TEXT,
  phone TEXT,
  display_name TEXT,
  avatar_url TEXT,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS businesses (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  name TEXT,
  slug TEXT,
  address_json TEXT,
  settings_json TEXT
);

CREATE TABLE IF NOT EXISTS managers (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  user_local_id TEXT,
  business_local_id TEXT,
  permissions_json TEXT,
  FOREIGN KEY (user_local_id) REFERENCES users(local_id),
  FOREIGN KEY (business_local_id) REFERENCES businesses(local_id)
);

CREATE TABLE IF NOT EXISTS products (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  business_local_id TEXT,
  sku TEXT,
  name TEXT,
  unit TEXT,
  price_cents INTEGER,
  cost_cents INTEGER,
  stock_qty REAL,
  barcode TEXT,
  category TEXT,
  extra_json TEXT,
  FOREIGN KEY (business_local_id) REFERENCES businesses(local_id)
);

CREATE TABLE IF NOT EXISTS stock_levels (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  product_local_id TEXT,
  business_local_id TEXT,
  quantity REAL,
  FOREIGN KEY (product_local_id) REFERENCES products(local_id),
  FOREIGN KEY (business_local_id) REFERENCES businesses(local_id)
);

CREATE TABLE IF NOT EXISTS sales (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  business_local_id TEXT,
  session_local_id TEXT,
  total_cents INTEGER,
  payment_mode TEXT,
  client_name TEXT,
  extra_json TEXT,
  FOREIGN KEY (business_local_id) REFERENCES businesses(local_id)
);

CREATE TABLE IF NOT EXISTS sale_items (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  sale_local_id TEXT,
  product_local_id TEXT,
  quantity REAL,
  unit_price_cents INTEGER,
  extra_json TEXT,
  FOREIGN KEY (sale_local_id) REFERENCES sales(local_id),
  FOREIGN KEY (product_local_id) REFERENCES products(local_id)
);

CREATE TABLE IF NOT EXISTS credits (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  business_local_id TEXT,
  sale_local_id TEXT,
  client_name TEXT,
  amount_cents INTEGER,
  remaining_cents INTEGER,
  status TEXT,
  extra_json TEXT,
  FOREIGN KEY (business_local_id) REFERENCES businesses(local_id),
  FOREIGN KEY (sale_local_id) REFERENCES sales(local_id)
);

CREATE TABLE IF NOT EXISTS credit_payments (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  credit_local_id TEXT,
  amount_cents INTEGER,
  extra_json TEXT,
  FOREIGN KEY (credit_local_id) REFERENCES credits(local_id)
);

CREATE TABLE IF NOT EXISTS expenses (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  business_local_id TEXT,
  title TEXT,
  amount_cents INTEGER,
  description TEXT,
  created_by TEXT,
  extra_json TEXT,
  FOREIGN KEY (business_local_id) REFERENCES businesses(local_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  business_local_id TEXT,
  label TEXT,
  status TEXT,
  opened_at INTEGER,
  closed_at INTEGER,
  extra_json TEXT,
  FOREIGN KEY (business_local_id) REFERENCES businesses(local_id)
);

CREATE TABLE IF NOT EXISTS session_items (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  session_local_id TEXT,
  product_local_id TEXT,
  quantity REAL,
  extra_json TEXT,
  FOREIGN KEY (session_local_id) REFERENCES sessions(local_id),
  FOREIGN KEY (product_local_id) REFERENCES products(local_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  user_local_id TEXT,
  title TEXT,
  body TEXT,
  read_at INTEGER,
  payload_json TEXT,
  FOREIGN KEY (user_local_id) REFERENCES users(local_id)
);

CREATE TABLE IF NOT EXISTS messages (
  local_id TEXT PRIMARY KEY NOT NULL,
  server_id TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  sync_error TEXT,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER,
  thread_id TEXT,
  sender_local_id TEXT,
  body TEXT,
  payload_json TEXT,
  FOREIGN KEY (sender_local_id) REFERENCES users(local_id)
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT NOT NULL,
  local_id TEXT NOT NULL,
  server_id TEXT,
  created_at INTEGER NOT NULL,
  retries INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_local_id);
CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_local_id);
`;
