-- Run this SQL in your Supabase SQL Editor to add "partial" status support
-- This updates the invoice status constraint to include 'partial'

-- Update the status check constraint to include 'partial'
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('pending', 'partial', 'paid', 'cancelled'));
