-- =====================================================
-- MATHAKA CRM - CONSOLIDATED DATABASE SCHEMA
-- =====================================================
-- This is the complete schema for a fresh installation.
-- Last updated: December 2024
-- 
-- Contains all tables from:
-- - supabase-schema.sql (base)
-- - supabase-schema-v2.sql (products, delivery, expenses)
-- - supabase-schema-v3-payments.sql (partial payments)
-- - supabase-schema-v4-partial-status.sql (status update)
-- - supabase-schema-v5-packages.sql (package-based invoicing)
-- =====================================================

-- =====================================================
-- SECTION 1: CORE TABLES
-- =====================================================

-- Users table (admin/staff)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT CHECK(role IN ('admin', 'staff')) DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  country TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipients (people who receive gifts in Sri Lanka)
CREATE TABLE IF NOT EXISTS recipients (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  relationship TEXT
);

-- Important dates for customers
CREATE TABLE IF NOT EXISTS important_dates (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  recipient_id INTEGER REFERENCES recipients(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  recurring BOOLEAN DEFAULT TRUE,
  notes TEXT,
  reminder_days INTEGER DEFAULT 7,
  reminder_sent_at TIMESTAMPTZ
);

-- Gift categories
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT
);

-- Vendors/Suppliers
CREATE TABLE IF NOT EXISTS vendors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings (for logo, bank details, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- =====================================================
-- SECTION 2: PRODUCTS & CATALOG
-- =====================================================

-- Product/Gift Catalog
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  price DECIMAL(10,2) DEFAULT 0,
  cost_price DECIMAL(10,2) DEFAULT 0,
  retail_price DECIMAL(10,2) DEFAULT 0,
  product_type TEXT DEFAULT 'product' CHECK(product_type IN ('product', 'packaging')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift Packages (templates)
CREATE TABLE IF NOT EXISTS gift_packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  total_price DECIMAL(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gift Package Items
CREATE TABLE IF NOT EXISTS gift_package_items (
  id SERIAL PRIMARY KEY,
  package_id INTEGER NOT NULL REFERENCES gift_packages(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL
);

-- =====================================================
-- SECTION 3: DELIVERY
-- =====================================================

-- Delivery Zones
CREATE TABLE IF NOT EXISTS delivery_zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  areas TEXT,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- =====================================================
-- SECTION 4: INVOICES & ORDERS
-- =====================================================

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  recipient_id INTEGER REFERENCES recipients(id),
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  
  -- Cost tracking
  total_cost DECIMAL(10,2) DEFAULT 0,
  total_packaging_cost DECIMAL(10,2) DEFAULT 0,
  profit_margin DECIMAL(10,2) DEFAULT 0,
  markup_percentage DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status TEXT CHECK(status IN ('pending', 'partial', 'paid', 'cancelled')) DEFAULT 'pending',
  order_status TEXT DEFAULT 'received' CHECK(order_status IN ('received', 'processing', 'dispatched', 'delivered', 'returned', 'cancelled')),
  
  -- Delivery
  delivery_zone_id INTEGER REFERENCES delivery_zones(id),
  gift_message TEXT,
  
  -- Notes
  notes TEXT,
  cancelled_reason TEXT,
  return_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  dispatched_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Invoice Packages (for package-based invoicing)
CREATE TABLE IF NOT EXISTS invoice_packages (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  package_price DECIMAL(10,2) NOT NULL,
  packaging_cost DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  package_id INTEGER REFERENCES invoice_packages(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id),
  category_id INTEGER REFERENCES categories(id),
  vendor_id INTEGER REFERENCES vendors(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  cost_price DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL
);

-- Order Status History
CREATE TABLE IF NOT EXISTS order_status_history (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Delivery Photos
CREATE TABLE IF NOT EXISTS delivery_photos (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 5: PAYMENTS & RECEIPTS
-- =====================================================

-- Payments (for tracking advance/partial payments)
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer',
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Receipts
CREATE TABLE IF NOT EXISTS receipts (
  id SERIAL PRIMARY KEY,
  receipt_number TEXT UNIQUE NOT NULL,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT DEFAULT 'bank_transfer',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 6: EXPENSES & LOGGING
-- =====================================================

-- Expenses (vendor payments)
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id),
  vendor_id INTEGER REFERENCES vendors(id),
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  expense_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SECTION 7: INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_packages_invoice_id ON invoice_packages(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_package_id ON invoice_items(package_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_recipients_customer_id ON recipients(customer_id);
CREATE INDEX IF NOT EXISTS idx_important_dates_customer_id ON important_dates(customer_id);

-- =====================================================
-- SECTION 8: TRIGGERS
-- =====================================================

-- Function to update invoice amount_paid when payments change
CREATE OR REPLACE FUNCTION update_invoice_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE invoices 
    SET amount_paid = COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = OLD.invoice_id), 0)
    WHERE id = OLD.invoice_id;
    RETURN OLD;
  ELSE
    UPDATE invoices 
    SET amount_paid = COALESCE((SELECT SUM(amount) FROM payments WHERE invoice_id = NEW.invoice_id), 0)
    WHERE id = NEW.invoice_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_amount_paid ON payments;
CREATE TRIGGER trigger_update_invoice_amount_paid
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_invoice_amount_paid();

-- =====================================================
-- SECTION 9: DEFAULT DATA
-- =====================================================

-- Default categories
INSERT INTO categories (name) VALUES 
  ('Cakes'), ('Teddy Bears'), ('Watches'), ('Flowers'), ('Chocolates'),
  ('Perfumes'), ('Jewelry'), ('Gift Hampers'), ('Electronics'), ('Clothing'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- Default settings
INSERT INTO settings (key, value) VALUES
  ('business_name', 'Mathaka Gift Store'),
  ('business_phone', '+94 XX XXX XXXX'),
  ('business_email', 'info@mathakagifts.com'),
  ('business_address', 'Your Address Here, Sri Lanka'),
  ('bank_name', 'Your Bank Name'),
  ('bank_account_name', 'Mathaka Gift Store'),
  ('bank_account_number', 'XXXX XXXX XXXX'),
  ('bank_branch', 'Your Branch'),
  ('invoice_prefix', 'INV'),
  ('receipt_prefix', 'RCP'),
  ('currency', 'Rs.')
ON CONFLICT (key) DO NOTHING;

-- Default delivery zones
INSERT INTO delivery_zones (name, areas, delivery_fee) VALUES
  ('Colombo', 'Colombo 1-15, Dehiwala, Mount Lavinia', 300),
  ('Suburbs', 'Nugegoda, Maharagama, Kottawa, Piliyandala', 500),
  ('Outskirts', 'Kaduwela, Malabe, Battaramulla, Rajagiriya', 600),
  ('Other Areas', 'Other areas in Sri Lanka', 1000)
ON CONFLICT DO NOTHING;

-- Default packaging materials
INSERT INTO products (name, description, cost_price, retail_price, price, product_type) VALUES
  ('Gift Box - Small', 'Small decorative gift box', 150, 0, 0, 'packaging'),
  ('Gift Box - Medium', 'Medium decorative gift box', 250, 0, 0, 'packaging'),
  ('Gift Box - Large', 'Large decorative gift box', 400, 0, 0, 'packaging'),
  ('Gift Wrap Paper', 'Premium gift wrapping paper', 50, 0, 0, 'packaging'),
  ('Ribbon - Satin', 'Satin ribbon for decoration', 30, 0, 0, 'packaging'),
  ('Gift Bag - Small', 'Small gift bag', 100, 0, 0, 'packaging'),
  ('Gift Bag - Large', 'Large gift bag', 200, 0, 0, 'packaging')
ON CONFLICT DO NOTHING;
