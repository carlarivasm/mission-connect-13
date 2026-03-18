/* eslint-disable @typescript-eslint/no-explicit-any */
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CartItem {
  id: string; // product_id
  name: string;
  price: number;
  image_url: string | null;
  category: string;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  isCombo?: boolean;
  comboMinQuantity?: number;
  comboPrice?: number | null;
  configuration?: any; // For kit component selections
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (id: string, selectedSize?: string, selectedColor?: string, configuration?: any) => void;
  updateQuantity: (id: string, quantity: number, selectedSize?: string, selectedColor?: string, configuration?: any) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

const CART_KEY = "jfm_cart";

const getCartKey = (item: CartItem | { id: string; selectedSize?: string; selectedColor?: string; configuration?: any }) =>
  `${item.id}_${item.selectedSize || ""}_${item.selectedColor || ""}_${item.configuration ? JSON.stringify(item.configuration) : ""}`;

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  // Sync with Supabase on Login
  useEffect(() => {
    if (user) {
      const fetchCart = async () => {
        const { data, error } = await (supabase
          .from("cart_items" as any) as any)
          .select(`
            *,
            store_products (
              is_combo,
              combo_min_quantity,
              combo_price,
              product_type
            )
          `)
          .eq("user_id", user.id);

        if (data && data.length > 0) {
          const mappedItems: CartItem[] = data.map((d: any) => ({
            id: d.product_id,
            name: d.product_name,
            price: Number(d.price),
            category: d.category,
            quantity: d.quantity,
            selectedSize: d.selected_size || undefined,
            selectedColor: d.selected_color || undefined,
            image_url: d.image_url,
            configuration: d.configuration || undefined,
            isCombo: d.store_products?.is_combo,
            comboMinQuantity: d.store_products?.combo_min_quantity,
            comboPrice: d.store_products?.combo_price,
          }));
          setItems(mappedItems);
        } else if (items.length > 0) {
          // If Supabase is empty but local has items, sync to Supabase
          for (const item of items) {
            await syncItem(item);
          }
        }
      };
      fetchCart();
    }
  }, [user?.id]);

  const syncItem = async (item: CartItem) => {
    if (!user) return;
    const { error } = await (supabase
      .from("cart_items" as any)
      .upsert({
        user_id: user.id,
        product_id: item.id,
        product_name: item.name,
        category: item.category,
        price: item.price,
        quantity: item.quantity,
        selected_size: item.selectedSize || null,
        selected_color: item.selectedColor || null,
        image_url: item.image_url,
        configuration: item.configuration || null,
      } as any, { onConflict: "user_id, product_id, selected_size, selected_color" }) as any);
  };

  const removeSyncItem = async (id: string, size?: string, color?: string, configuration?: any) => {
    if (!user) return;

    let query = supabase
      .from("cart_items")
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", id);

    if (size) {
      query = query.eq("selected_size", size);
    } else {
      query = query.is("selected_size", null);
    }

    if (color) {
      query = query.eq("selected_color", color);
    } else {
      query = query.is("selected_color", null);
    }

    if (configuration) {
      // Use contains for jsonb match to be safe
      query = query.contains("configuration", configuration);
    } else {
      query = query.is("configuration", null);
    }

    await (query as any);
  };

  const addItem = (item: Omit<CartItem, "quantity">, quantity = 1) => {
    const key = getCartKey(item);
    setItems((prev) => {
      const existing = prev.find((i) => getCartKey(i) === key);
      let newItems;
      if (existing) {
        newItems = prev.map((i) =>
          getCartKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        newItems = [...prev, { ...item, quantity }];
      }

      // Background sync
      if (user) {
        const newItem = newItems.find(i => getCartKey(i) === key)!;
        syncItem(newItem);
      }

      return newItems;
    });
  };

  const removeItem = (id: string, selectedSize?: string, selectedColor?: string, configuration?: any) => {
    const key = `${id}_${selectedSize || ""}_${selectedColor || ""}_${configuration ? JSON.stringify(configuration) : ""}`;
    setItems((prev) => {
      const newItems = prev.filter((i) => getCartKey(i) !== key);
      if (user) removeSyncItem(id, selectedSize, selectedColor, configuration);
      return newItems;
    });
  };

  const updateQuantity = (id: string, quantity: number, selectedSize?: string, selectedColor?: string, configuration?: any) => {
    if (quantity <= 0) {
      removeItem(id, selectedSize, selectedColor, configuration);
      return;
    }
    const key = `${id}_${selectedSize || ""}_${selectedColor || ""}_${configuration ? JSON.stringify(configuration) : ""}`;
    setItems((prev) => {
      const newItems = prev.map((i) => getCartKey(i) === key ? { ...i, quantity } : i);
      if (user) {
        const item = newItems.find(i => getCartKey(i) === key)!;
        syncItem(item);
      }
      return newItems;
    });
  };

  const clearCart = () => {
    setItems([]);
    if (user) {
      (supabase.from("cart_items" as any).delete().eq("user_id", user.id) as any).then();
    }
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);

  // Group quantities by product_id to check for combo eligibility
  const productQuantities: Record<string, number> = {};
  items.forEach(i => {
    productQuantities[i.id] = (productQuantities[i.id] || 0) + i.quantity;
  });

  const totalPrice = items.reduce((sum, i) => {
    const totalProductQty = productQuantities[i.id] || 0;
    const isEligibleForCombo = i.isCombo && i.comboMinQuantity && totalProductQty >= i.comboMinQuantity;

    const effectivePrice = (isEligibleForCombo && i.comboPrice)
      ? i.comboPrice
      : i.price;
    return sum + effectivePrice * i.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  );
};
