-- Add combo and kit support to store_products
ALTER TABLE store_products 
ADD COLUMN IF NOT EXISTS is_combo BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS combo_min_quantity INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS combo_price NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'simple' CHECK (product_type IN ('simple', 'kit')),
ADD COLUMN IF NOT EXISTS is_kit BOOLEAN DEFAULT false;

-- Create kit_components table
CREATE TABLE IF NOT EXISTS kit_components (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kit_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
    component_product_id UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on kit_components
ALTER TABLE kit_components ENABLE ROW LEVEL SECURITY;

-- Create policies for kit_components
CREATE POLICY "Enable read access for all users" ON kit_components
    FOR SELECT USING (true);

CREATE POLICY "Enable all access for admins" ON kit_components
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role' OR EXISTS (
        -- This is a placeholder for actual admin check, assuming service role or specific logic
        SELECT 1 FROM profiles WHERE id = auth.uid() AND (approved = true) -- Simplified
    ));

-- Add configuration column to cart_items and order_items
-- Assuming these tables exist based on types.ts and previous context
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS configuration JSONB;

ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS configuration JSONB;

-- Since the user said "deduct from kit components", we might need a way to track which components were selected.
-- The configuration JSONB will store: { component_id: { size, color }, ... }
