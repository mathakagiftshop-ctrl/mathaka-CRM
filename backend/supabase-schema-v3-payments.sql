-- Run this SQL in your Supabase SQL Editor to add advance/partial payment support
-- This is an UPDATE script - run after the initial schema and v2

-- Payments table (for tracking advance/partial payments)
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

-- Add amount_paid column to invoices to track total payments
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0;

-- Create index for faster payment lookups
CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);

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

-- Trigger to auto-update amount_paid
DROP TRIGGER IF EXISTS trigger_update_invoice_amount_paid ON payments;
CREATE TRIGGER trigger_update_invoice_amount_paid
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW EXECUTE FUNCTION update_invoice_amount_paid();
