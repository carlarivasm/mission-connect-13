-- 1. Add new columns to 'orders' table
ALTER TABLE public.orders
ADD COLUMN receipt_url TEXT,
ADD COLUMN pay_later BOOLEAN DEFAULT false;

-- 2. Create the Storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment_receipts', 'payment_receipts', true);

-- 3. Set up Storage Policies for 'payment_receipts' bucket
-- Allow public access to view receipts
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'payment_receipts');

-- Allow authenticated users to upload receipts
CREATE POLICY "Authenticated users can upload receipts" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'payment_receipts');

-- Allow users to update their own uploads (optional, if needed)
CREATE POLICY "Users can update their own receipts" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'payment_receipts' AND auth.uid() = owner);

-- Allow users to delete their own uploads (optional, if needed)
CREATE POLICY "Users can delete their own receipts" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'payment_receipts' AND auth.uid() = owner);
