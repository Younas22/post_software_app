import type Database from 'better-sqlite3'

export interface Migration {
  id: number
  name: string
  up: (db: Database.Database) => void
}

/**
 * Versioned local database migrations (Phase 04). Each migration runs
 * exactly once, tracked in `_migrations`; new migrations are only ever
 * appended, never edited in place, so an existing user's SQLite file is
 * migrated forward incrementally and never dropped/recreated by an app
 * update (Phase 13's "updates must not destroy SQLite data" rule).
 */
export const migrations: Migration[] = [
  {
    id: 1,
    name: 'initial_schema',
    up: (db): void => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS business (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          currency TEXT NOT NULL DEFAULT 'USD',
          timezone TEXT NOT NULL DEFAULT 'UTC',
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS branch (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          is_main INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS app_user (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          business_id INTEGER,
          branch_id INTEGER,
          roles TEXT NOT NULL DEFAULT '[]',
          permissions TEXT NOT NULL DEFAULT '[]',
          updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );

        CREATE TABLE IF NOT EXISTS products (
          id INTEGER PRIMARY KEY,
          category_id INTEGER,
          brand_id INTEGER,
          name TEXT NOT NULL,
          sku TEXT,
          barcode TEXT,
          sale_price REAL NOT NULL DEFAULT 0,
          purchase_price REAL NOT NULL DEFAULT 0,
          tax_rate REAL,
          unit TEXT NOT NULL DEFAULT 'pcs',
          minimum_stock INTEGER NOT NULL DEFAULT 0,
          status TEXT NOT NULL DEFAULT 'active',
          image TEXT,
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
        CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
        CREATE INDEX IF NOT EXISTS idx_products_name ON products(name COLLATE NOCASE);

        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          address TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          updated_at TEXT NOT NULL,
          deleted_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

        CREATE TABLE IF NOT EXISTS inventory (
          branch_id INTEGER NOT NULL,
          product_id INTEGER NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 0,
          updated_at TEXT,
          PRIMARY KEY (branch_id, product_id)
        );

        CREATE TABLE IF NOT EXISTS payment_methods (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          slug TEXT
        );

        CREATE TABLE IF NOT EXISTS sales (
          local_id TEXT PRIMARY KEY,
          server_id INTEGER,
          invoice_number TEXT,
          client_transaction_id TEXT UNIQUE NOT NULL,
          branch_id INTEGER NOT NULL,
          customer_id INTEGER,
          cashier_id INTEGER NOT NULL,
          subtotal REAL NOT NULL DEFAULT 0,
          discount REAL NOT NULL DEFAULT 0,
          tax REAL NOT NULL DEFAULT 0,
          total REAL NOT NULL DEFAULT 0,
          sync_status TEXT NOT NULL DEFAULT 'pending',
          sale_date TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_sales_sync_status ON sales(sync_status);
        CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);

        CREATE TABLE IF NOT EXISTS sale_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_local_id TEXT NOT NULL REFERENCES sales(local_id) ON DELETE CASCADE,
          product_id INTEGER NOT NULL,
          product_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          unit_price REAL NOT NULL,
          discount REAL NOT NULL DEFAULT 0,
          tax REAL NOT NULL DEFAULT 0,
          line_total REAL NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_local_id);

        CREATE TABLE IF NOT EXISTS payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sale_local_id TEXT NOT NULL REFERENCES sales(local_id) ON DELETE CASCADE,
          payment_method_id INTEGER NOT NULL,
          amount REAL NOT NULL,
          reference TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_local_id);

        CREATE TABLE IF NOT EXISTS sync_queue (
          operation_id TEXT PRIMARY KEY,
          entity TEXT NOT NULL,
          action TEXT NOT NULL,
          local_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);

        CREATE TABLE IF NOT EXISTS sync_conflicts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity TEXT NOT NULL,
          local_id TEXT,
          server_id INTEGER,
          reason TEXT NOT NULL,
          local_snapshot TEXT,
          server_snapshot TEXT,
          detected_at TEXT NOT NULL,
          resolved_at TEXT,
          resolution TEXT
        );

        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE TABLE IF NOT EXISTS sync_cursors (
          entity TEXT PRIMARY KEY,
          cursor TEXT,
          last_synced_at TEXT
        );
      `)
    }
  },
  {
    id: 2,
    name: 'business_logo',
    up: (db): void => {
      // Business branding for the app chrome: the server URL of the logo
      // and a cached data: URI copy so it renders offline (and within the
      // renderer's CSP, which only allows self/data:/blob: images).
      db.exec(`
        ALTER TABLE business ADD COLUMN logo_url TEXT;
        ALTER TABLE business ADD COLUMN logo_data TEXT;
      `)
    }
  },
  {
    id: 3,
    name: 'user_avatar_and_business_favicon',
    up: (db): void => {
      // Profile photo URL for the signed-in user, and the business's own
      // app/taskbar icon (favicon) URL — both fetched as images through
      // main (see mediaApi.ts) because the renderer CSP blocks remote images.
      db.exec(`
        ALTER TABLE app_user ADD COLUMN avatar_url TEXT;
        ALTER TABLE business ADD COLUMN favicon_url TEXT;
      `)
    }
  }
]
