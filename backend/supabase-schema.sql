-- Run this SQL in your Supabase SQL Editor to create all tables

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
  notes TEXT
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

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  recipient_id INTEGER REFERENCES recipients(id),
  subtotal DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT CHECK(status IN ('pending', 'paid', 'cancelled')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

-- Invoice items
CREATE TABLE IF NOT EXISTS invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  category_id INTEGER REFERENCES categories(id),
  vendor_id INTEGER REFERENCES vendors(id),
  description TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL
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

-- Settings (for logo, bank details, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- Insert default categories
INSERT INTO categories (name) VALUES 
  ('Cakes'), ('Teddy Bears'), ('Watches'), ('Flowers'), ('Chocolates'),
  ('Perfumes'), ('Jewelry'), ('Gift Hampers'), ('Electronics'), ('Clothing'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- Insert default settings
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
