-- Run this SQL in your Supabase SQL Editor to add new features
-- This is an UPDATE script - run after the initial schema

-- Product/Gift Catalog
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id INTEGER REFERENCES categories(id),
  price DECIMAL(10,2) NOT NULL,
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

-- Delivery Zones
CREATE TABLE IF NOT EXISTS delivery_zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  areas TEXT, -- comma separated areas
  delivery_fee DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE
);

-- Order Status Tracking (extends invoices)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS order_status TEXT DEFAULT 'received' 
  CHECK(order_status IN ('received', 'processing', 'dispatched', 'delivered', 'cancelled'));
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_zone_id INTEGER REFERENCES delivery_zones(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gift_message TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS dispatched_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Delivery Photos
CREATE TABLE IF NOT EXISTS delivery_photos (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

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
  entity_type TEXT, -- 'invoice', 'customer', 'receipt', etc.
  entity_id INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default delivery zones
INSERT INTO delivery_zones (name, areas, delivery_fee) VALUES
  ('Colombo', 'Colombo 1-15, Dehiwala, Mount Lavinia', 300),
  ('Suburbs', 'Nugegoda, Maharagama, Kottawa, Piliyandala', 500),
  ('Outskirts', 'Kaduwela, Malabe, Battaramulla, Rajagiriya', 600),
  ('Other Areas', 'Other areas in Sri Lanka', 1000)
ON CONFLICT DO NOTHING;

-- Insert sample products
INSERT INTO products (name, category_id, price) VALUES
  ('Chocolate Cake (1kg)', (SELECT id FROM categories WHERE name = 'Cakes'), 3500),
  ('Red Velvet Cake (1kg)', (SELECT id FROM categories WHERE name = 'Cakes'), 4000),
  ('Fruit Cake (1kg)', (SELECT id FROM categories WHERE name = 'Cakes'), 3800),
  ('Large Teddy Bear', (SELECT id FROM categories WHERE name = 'Teddy Bears'), 2500),
  ('Medium Teddy Bear', (SELECT id FROM categories WHERE name = 'Teddy Bears'), 1500),
  ('Rose Bouquet (12 roses)', (SELECT id FROM categories WHERE name = 'Flowers'), 3000),
  ('Mixed Flower Bouquet', (SELECT id FROM categories WHERE name = 'Flowers'), 3500),
  ('Chocolate Box (Lindt)', (SELECT id FROM categories WHERE name = 'Chocolates'), 2800),
  ('Ferrero Rocher (24pc)', (SELECT id FROM categories WHERE name = 'Chocolates'), 3200)
ON CONFLICT DO NOTHING;
