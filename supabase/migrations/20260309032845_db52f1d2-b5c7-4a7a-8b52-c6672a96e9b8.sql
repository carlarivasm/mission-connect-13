
CREATE TABLE public.product_stock (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.store_products(id) ON DELETE CASCADE NOT NULL,
  size TEXT,
  color TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, size, color)
);

ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read stock
CREATE POLICY "Authenticated users can read stock"
ON public.product_stock FOR SELECT TO authenticated
USING (true);

-- Only admins can manage stock
CREATE POLICY "Admins can manage stock"
ON public.product_stock FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Function to decrease stock on purchase
CREATE OR REPLACE FUNCTION public.decrease_stock(
  p_product_id UUID,
  p_size TEXT,
  p_color TEXT,
  p_quantity INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_qty INTEGER;
BEGIN
  SELECT quantity INTO current_qty
  FROM product_stock
  WHERE product_id = p_product_id
    AND (size IS NOT DISTINCT FROM p_size)
    AND (color IS NOT DISTINCT FROM p_color)
  FOR UPDATE;

  IF current_qty IS NULL OR current_qty < p_quantity THEN
    RETURN FALSE;
  END IF;

  UPDATE product_stock
  SET quantity = quantity - p_quantity,
      updated_at = now()
  WHERE product_id = p_product_id
    AND (size IS NOT DISTINCT FROM p_size)
    AND (color IS NOT DISTINCT FROM p_color);

  RETURN TRUE;
END;
$$;
