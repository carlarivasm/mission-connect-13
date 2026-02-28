
-- Store products table
CREATE TABLE public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'outros',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  available BOOLEAN NOT NULL DEFAULT true,
  sizes TEXT[] DEFAULT '{}',
  colors TEXT[] DEFAULT '{}',
  contact_info TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can view available products
CREATE POLICY "Authenticated can view products" ON public.store_products
  FOR SELECT TO authenticated USING (true);

-- Only admins can manage products
CREATE POLICY "Admins can manage products" ON public.store_products
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies for product images
CREATE POLICY "Anyone can view product images" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'product-images');

CREATE POLICY "Admins can upload product images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete product images" ON storage.objects
  FOR DELETE TO authenticated USING (
    bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin')
  );
