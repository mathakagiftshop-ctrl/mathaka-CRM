-- =====================================================
-- MATHAKA CRM - VENDOR ORDER MANAGEMENT
-- =====================================================
-- Schema for tracking vendor assignments and payments
-- Run this after the consolidated schema
-- =====================================================

-- Vendor Orders (assign invoices/items to vendors)
CREATE TABLE IF NOT EXISTS vendor_orders (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  
  -- Order details
  description TEXT NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Payment tracking
  advance_paid DECIMAL(10,2) DEFAULT 0,
  amount_paid DECIMAL(10,2) DEFAULT 0,
  
  -- Status
  status TEXT DEFAULT 'assigned' CHECK(status IN ('assigned', 'in_progress', 'completed', 'cancelled')),
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendor Payments (track advance and final payments to vendors)
CREATE TABLE IF NOT EXISTS vendor_payments (
  id SERIAL PRIMARY KEY,
  vendor_order_id INTEGER NOT NULL REFERENCES vendor_orders(id) ON DELETE CASCADE,
  vendor_id INTEGER NOT NULL REFERENCES vendors(id),
  
  -- Payment details
  amount DECIMAL(10,2) NOT NULL,
  payment_type TEXT DEFAULT 'advance' CHECK(payment_type IN ('advance', 'partial', 'final', 'adjustment')),
  payment_method TEXT DEFAULT 'cash',
  payment_date TIMESTAMPTZ DEFAULT NOW(),
  
  -- Notes
  notes TEXT,
  
  -- Tracking
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vendor_orders_invoice_id ON vendor_orders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_vendor_id ON vendor_orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_orders_status ON vendor_orders(status);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_order_id ON vendor_payments(vendor_order_id);
CREATE INDEX IF NOT EXISTS idx_vendor_payments_vendor_id ON vendor_payments(vendor_id);

-- Trigger to update vendor_order amount_paid when payments change
CREATE OR REPLACE FUNCTION update_vendor_order_amount_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE vendor_orders 
    SET 
      amount_paid = COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE vendor_order_id = OLD.vendor_order_id), 0),
      advance_paid = COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE vendor_order_id = OLD.vendor_order_id AND payment_type = 'advance'), 0),
      updated_at = NOW()
    WHERE id = OLD.vendor_order_id;
    RETURN OLD;
  ELSE
    UPDATE vendor_orders 
    SET 
      amount_paid = COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE vendor_order_id = NEW.vendor_order_id), 0),
      advance_paid = COALESCE((SELECT SUM(amount) FROM vendor_payments WHERE vendor_order_id = NEW.vendor_order_id AND payment_type = 'advance'), 0),
      updated_at = NOW()
    WHERE id = NEW.vendor_order_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vendor_order_amount_paid ON vendor_payments;
CREATE TRIGGER trigger_update_vendor_order_amount_paid
AFTER INSERT OR UPDATE OR DELETE ON vendor_payments
FOR EACH ROW EXECUTE FUNCTION update_vendor_order_amount_paid();
