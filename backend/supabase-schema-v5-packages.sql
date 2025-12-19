-- Run this SQL in your Supabase SQL Editor to add package-based invoicing with cost tracking
-- This is an UPDATE script - run after the previous schemas

-- =====================================================
-- STEP 1: Update products table with cost and retail prices
-- =====================================================

-- Add cost_price and retail_price columns to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS retail_price DECIMAL(10,2) DEFAULT 0;

-- Migrate existing price data to retail_price (if any products exist)
UPDATE products SET retail_price = price WHERE retail_price = 0 AND price > 0;

-- Add product_type to distinguish regular products from packaging materials
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'product' 
  CHECK(product_type IN ('product', 'packaging'));

-- =====================================================
-- STEP 2: Create invoice_packages table
-- =====================================================

CREATE TABLE IF NOT EXISTS invoice_packages (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  package_price DECIMAL(10,2) NOT NULL, -- Final selling price for the package
  packaging_cost DECIMAL(10,2) DEFAULT 0, -- Cost of packaging materials
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 3: Update invoice_items to link to packages
-- =====================================================

-- Add package_id to invoice_items (nullable for backward compatibility)
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS package_id INTEGER REFERENCES invoice_packages(id) ON DELETE CASCADE;

-- Add product_id reference to invoice_items
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id);

-- Add cost_price to invoice_items for tracking cost at time of sale
ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS cost_price DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- STEP 4: Add margin tracking columns to invoices
-- =====================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_packaging_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(10,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS markup_percentage DECIMAL(10,2) DEFAULT 0;

-- =====================================================
-- STEP 5: Create indexes for better performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_invoice_packages_invoice_id ON invoice_packages(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_package_id ON invoice_items(package_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_product_type ON products(product_type);

-- =====================================================
-- STEP 6: Insert sample packaging materials
-- =====================================================

INSERT INTO products (name, description, category_id, cost_price, retail_price, price, product_type) VALUES
  ('Gift Box - Small', 'Small decorative gift box', NULL, 150, 0, 0, 'packaging'),
  ('Gift Box - Medium', 'Medium decorative gift box', NULL, 250, 0, 0, 'packaging'),
  ('Gift Box - Large', 'Large decorative gift box', NULL, 400, 0, 0, 'packaging'),
  ('Gift Wrap Paper', 'Premium gift wrapping paper', NULL, 50, 0, 0, 'packaging'),
  ('Ribbon - Satin', 'Satin ribbon for decoration', NULL, 30, 0, 0, 'packaging'),
  ('Gift Bag - Small', 'Small gift bag', NULL, 100, 0, 0, 'packaging'),
  ('Gift Bag - Large', 'Large gift bag', NULL, 200, 0, 0, 'packaging')
ON CONFLICT DO NOTHING;
