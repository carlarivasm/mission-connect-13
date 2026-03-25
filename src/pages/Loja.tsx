/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { ShoppingBag, ShoppingCart, Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Product {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_url: string | null;
  available: boolean;
  sizes: string[];
  colors: string[];
  contact_info: string | null;
  is_combo: boolean;
  combo_min_quantity: number;
  combo_price: number | null;
  product_type: 'simple' | 'kit';
  is_kit: boolean;
}

interface KitComponent {
  kit_id: string;
  component_product_id: string;
  quantity: number;
  product?: Product;
}

interface StockEntry {
  product_id: string;
  size: string | null;
  color: string | null;
  quantity: number;
}

const categoryLabels: Record<string, string> = {
  camiseta: "Camiseta",
  bone: "Boné",
  squeeze: "Squeeze",
  chaveiro: "Chaveiro",
  casaco: "Casaco",
  kit: "Kit",
  outros: "Outros",
};

const categoryEmojis: Record<string, string> = {
  camiseta: "👕",
  bone: "🧢",
  squeeze: "🥤",
  chaveiro: "🔑",
  casaco: "🧥",
  kit: "🎁",
  outros: "📦",
};

const Loja = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { totalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const [kitComponents, setKitComponents] = useState<KitComponent[]>([]);

  useEffect(() => {
    localStorage.setItem('has_visited_store', 'true');
    Promise.all([
      supabase.from("store_products").select("*").order("category"),
      supabase.from("product_stock").select("product_id, size, color, quantity"),
      supabase.from("app_settings").select("setting_value").eq("setting_key", "store_whatsapp").single(),
      supabase.from("kit_components" as any).select("*"),
    ]).then(([prodRes, stockRes, whatsRes, kitRes]) => {
      const allProds = (prodRes.data || []) as any[];
      if (prodRes.data) setProducts(allProds as Product[]);
      if (stockRes.data) setStock(stockRes.data as StockEntry[]);
      if (whatsRes.data) setWhatsapp(whatsRes.data.setting_value);
      if (kitRes.data) {
        const componentsWithProds = (kitRes.data as any[]).map(comp => ({
          ...comp,
          product: allProds.find(p => p.id === comp.component_product_id)
        }));
        setKitComponents(componentsWithProds);
      }
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const getProductTotalStock = (productId: string) => {
    const entries = stock.filter((s) => s.product_id === productId);
    if (entries.length === 0) return null; // No stock configured
    return entries.reduce((sum, s) => sum + s.quantity, 0);
  };

  const getVariantStock = (productId: string, size: string | null, color: string | null) => {
    const entry = stock.find(
      (s) => s.product_id === productId &&
        (s.size ?? null) === (size ?? null) &&
        (s.color ?? null) === (color ?? null)
    );
    return entry?.quantity ?? null;
  };

  const isProductAvailable = (product: Product) => {
    if (!product.available) return false;
    const totalStock = getProductTotalStock(product.id);
    if (totalStock === null) return true; // No stock tracking = always available
    return totalStock > 0;
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  const uniqueCategories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <AppHeader title="Loja Missionária" onLogout={handleLogout} />

      <main className="px-4 pt-0 pb-5 space-y-3">
        {/* Cart button */}
        <button
          onClick={() => navigate("/checkout")}
          className="fixed bottom-24 right-4 z-40 gradient-mission text-primary-foreground p-3.5 rounded-full shadow-elevated transition-transform active:scale-95"
        >
          <ShoppingCart size={24} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-secondary text-secondary-foreground text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>

        {/* Category filters */}
        <div className="flex gap-2 overflow-x-auto pb-0 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${!selectedCategory
              ? "gradient-mission text-primary-foreground"
              : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
          >
            Todos
          </button>
          {uniqueCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${selectedCategory === cat
                ? "gradient-mission text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
            >
              {categoryEmojis[cat] || "📦"} {categoryLabels[cat] || cat}
            </button>
          ))}
        </div>

        {/* Products grid */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag size={48} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Nenhum produto disponível no momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                stock={stock}
                whatsapp={whatsapp}
                isAvailable={isProductAvailable(product)}
                getVariantStock={(prodId, size, color) => getVariantStock(prodId, size, color)}
                kitComponents={kitComponents.filter(c => c.kit_id === product.id)}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

const ProductCard = ({
  product,
  stock,
  whatsapp,
  isAvailable,
  getVariantStock,
  kitComponents,
}: {
  product: Product;
  stock: StockEntry[];
  whatsapp: string;
  isAvailable: boolean;
  getVariantStock: (productId: string, size: string | null, color: string | null) => number | null;
  kitComponents: KitComponent[];
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Lock body scroll while modal is open
  useEffect(() => {
    if (showDetails) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showDetails]);

  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes.length > 0 ? product.sizes[0] : undefined
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors.length > 0 ? product.colors[0] : undefined
  );
  const [quantity, setQuantity] = useState(1);
  const [kitSpecs, setKitSpecs] = useState<Record<string, { size?: string, color?: string }>>({});

  // Initialize kitSpecs if it's a kit
  useEffect(() => {
    if (product.product_type === 'kit' && kitComponents.length > 0) {
      const initialSpecs: Record<string, { size?: string, color?: string }> = {};
      kitComponents.forEach(comp => {
        if (comp.product) {
          // Initialize specs for each instance of the component item
          for (let i = 0; i < comp.quantity; i++) {
            const key = `${comp.component_product_id}_${i}`;
            initialSpecs[key] = {
              size: comp.product.sizes.length > 0 ? comp.product.sizes[0] : undefined,
              color: comp.product.colors.length > 0 ? comp.product.colors[0] : undefined,
            };
          }
        }
      });
      setKitSpecs(initialSpecs);
    }
  }, [product.id, kitComponents]);

  const { addItem } = useCart();
  const { toast } = useToast();

  const currentVariantStock = getVariantStock(product.id, selectedSize ?? null, selectedColor ?? null);
  const variantOutOfStock = currentVariantStock !== null && currentVariantStock <= 0;

  // Clamp quantity whenever the selected variant changes so it never exceeds available stock
  useEffect(() => {
    if (currentVariantStock !== null) {
      setQuantity((q) => Math.min(q, Math.max(1, currentVariantStock)));
    }
  }, [currentVariantStock]);

  const handleWhatsApp = () => {
    if (!whatsapp) return;
    const cleanNumber = whatsapp.replace(/\D/g, "");
    const msg = encodeURIComponent(`Olá! Gostaria de saber sobre a disponibilidade do produto: ${product.name}`);
    window.open(`https://wa.me/${cleanNumber}?text=${msg}`, "_blank");
  };

  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isAvailable || variantOutOfStock) return;
    // Final guard: never add more than what's in stock
    const safeQty = currentVariantStock !== null ? Math.min(quantity, currentVariantStock) : quantity;
    if (safeQty <= 0) return;
    for (let i = 0; i < safeQty; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
        category: product.category,
        selectedSize: product.product_type === 'simple' ? selectedSize : undefined,
        selectedColor: product.product_type === 'simple' ? selectedColor : undefined,
        configuration: product.product_type === 'kit' ? kitSpecs : undefined,
        isCombo: product.is_combo,
        comboMinQuantity: product.combo_min_quantity,
        comboPrice: product.combo_price,
      } as any);
    }
    toast({ title: `${safeQty}x adicionado ao carrinho!`, description: product.name });
    setShowDetails(false);
    setQuantity(1);
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;

    // If it's a kit, always open details to select specs
    if (product.product_type === 'kit') {
      setQuantity(1);
      setShowDetails(true);
      return;
    }

    // If product has MULTIPLE size or color options, open modal to let user pick
    const hasMultipleSizes = product.sizes.length > 1;
    const hasMultipleColors = product.colors.length > 1;
    if (hasMultipleSizes || hasMultipleColors) {
      setQuantity(1);
      setShowDetails(true);
      return;
    }
    // Single variant (or no variant): add directly with the only available option
    const defaultSize = product.sizes.length === 1 ? product.sizes[0] : null;
    const defaultColor = product.colors.length === 1 ? product.colors[0] : null;
    const defaultStock = getVariantStock(product.id, defaultSize, defaultColor);
    if (defaultStock !== null && defaultStock <= 0) {
      toast({ title: "Esgotado", description: "Este item está fora de estoque.", variant: "destructive" });
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      category: product.category,
      selectedSize: defaultSize ?? undefined,
      selectedColor: defaultColor ?? undefined,
      isCombo: product.is_combo,
      comboMinQuantity: product.combo_min_quantity,
      comboPrice: product.combo_price,
    });
    toast({ title: "Adicionado!", description: product.name });
  };

  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        className="bg-card rounded-xl shadow-card overflow-hidden text-left transition-transform active:scale-[0.98] relative"
      >
        {!isAvailable && (
          <div className="absolute inset-0 bg-background/60 z-10 flex items-center justify-center rounded-xl">
            <span className="text-xs font-bold text-destructive bg-card px-3 py-1 rounded-full shadow">Indisponível</span>
          </div>
        )}
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-32 object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-32 bg-muted flex items-center justify-center">
            <span className="text-4xl">{categoryEmojis[product.category] || "📦"}</span>
          </div>
        )}
        <div className="p-3">
          <p className="font-semibold text-foreground text-sm truncate">{product.name}</p>
          <p className="text-xs text-muted-foreground">{categoryLabels[product.category] || product.category}</p>
          {product.sizes.length > 0 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">Tam: {product.sizes.join(", ")}</p>
          )}
          {product.colors.length > 0 && (
            <p className="text-[10px] text-muted-foreground">Cor: {product.colors.join(", ")}</p>
          )}
          <div className="flex items-center justify-between mt-1">
            <p className="text-base font-bold text-primary">
              R$ {product.price.toFixed(2)}
            </p>
            {product.product_type === 'kit' && (
              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                KIT
              </span>
            )}
            {isAvailable ? (
              <button
                onClick={handleQuickAdd}
                className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus size={16} />
              </button>
            ) : whatsapp ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleWhatsApp(); }}
                className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
              >
                <MessageCircle size={16} />
              </button>
            ) : null}
          </div>
        </div>
      </button>

      {/* Product detail modal */}
      {showDetails && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={() => setShowDetails(false)}>
          <div
            className="w-full max-w-lg bg-card rounded-t-2xl p-5 space-y-4 animate-slide-up max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {product.image_url && (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-48 object-cover rounded-xl"
              />
            )}
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-foreground font-display">{product.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground">
                    {categoryLabels[product.category] || product.category}
                  </span>
                </div>
                <p className="text-xl font-bold text-primary">R$ {product.price.toFixed(2)}</p>
              </div>

              {product.description && (
                <p className="text-sm text-muted-foreground mt-3">{product.description}</p>
              )}

              {/* Simple Product Specs OR Kit Component Specs */}
              {product.product_type === 'simple' ? (
                <>
                  {product.sizes.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Tamanho</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {product.sizes.map((s) => {
                          const sStock = getVariantStock(product.id, s, selectedColor ?? null);
                          const outOfStock = sStock !== null && sStock <= 0;
                          return (
                            <button
                              key={s}
                              onClick={() => setSelectedSize(s)}
                              disabled={outOfStock}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${outOfStock
                                ? "bg-muted text-muted-foreground line-through opacity-50 cursor-not-allowed"
                                : selectedSize === s
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground hover:bg-muted/80"
                                }`}
                            >
                              {s}
                              {sStock !== null && (
                                <span className="ml-1 text-[10px] opacity-70">({sStock})</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {product.colors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cor</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {product.colors.map((c) => {
                          const cStock = getVariantStock(product.id, selectedSize ?? null, c);
                          const outOfStock = cStock !== null && cStock <= 0;
                          return (
                            <button
                              key={c}
                              onClick={() => setSelectedColor(c)}
                              disabled={outOfStock}
                              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${outOfStock
                                ? "bg-muted text-muted-foreground line-through opacity-50 cursor-not-allowed"
                                : selectedColor === c
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground hover:bg-muted/80"
                                }`}
                            >
                              {c}
                              {cStock !== null && (
                                <span className="ml-1 text-[10px] opacity-70">({cStock})</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {currentVariantStock !== null && (
                    <p className={`text-xs mt-2 font-semibold ${currentVariantStock > 0 ? "text-green-600" : "text-destructive"}`}>
                      {currentVariantStock > 0 ? `${currentVariantStock} em estoque` : "Fora de estoque"}
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-4 space-y-4">
                  <p className="text-xs font-bold text-muted-foreground uppercase border-b pb-1">Itens do Kit</p>
                  {kitComponents.map((comp) => (
                    <div key={comp.component_product_id} className="space-y-3">
                      <p className="text-sm font-bold border-l-2 border-primary pl-2">{comp.product?.name}</p>
                      <div className="grid gap-3">
                        {Array.from({ length: comp.quantity }).map((_, idx) => {
                          const key = `${comp.component_product_id}_${idx}`;
                          return (
                            <div key={key} className="bg-muted/50 p-3 rounded-xl space-y-2 border border-border/50">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase">Item {idx + 1}</p>

                              {comp.product && comp.product.sizes.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Tamanho</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {comp.product.sizes.map(s => {
                                      const sStock = getVariantStock(comp.component_product_id, s, kitSpecs[key]?.color ?? null);
                                      return (
                                        <button
                                          key={s}
                                          onClick={() => setKitSpecs(prev => ({ ...prev, [key]: { ...prev[key], size: s } }))}
                                          className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${kitSpecs[key]?.size === s ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}
                                        >
                                          {s} {sStock !== null && `(${sStock})`}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {comp.product && comp.product.colors.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase">Cor</p>
                                  <div className="flex gap-1 flex-wrap">
                                    {comp.product.colors.map(c => {
                                      const cStock = getVariantStock(comp.component_product_id, kitSpecs[key]?.size ?? null, c);
                                      return (
                                        <button
                                          key={c}
                                          onClick={() => setKitSpecs(prev => ({ ...prev, [key]: { ...prev[key], color: c } }))}
                                          className={`px-2 py-0.5 rounded-md text-[10px] transition-colors ${kitSpecs[key]?.color === c ? "bg-primary text-primary-foreground" : "bg-background text-foreground"}`}
                                        >
                                          {c} {cStock !== null && `(${cStock})`}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {isAvailable && !variantOutOfStock ? (
              <div className="space-y-3">
                {/* Quantity selector */}
                <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-2">
                  <span className="text-sm font-semibold text-foreground">Quantidade</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-lg font-bold text-foreground hover:bg-muted transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-bold text-foreground">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => currentVariantStock !== null ? Math.min(q + 1, currentVariantStock) : q + 1)}
                      className="w-8 h-8 rounded-full bg-background border border-border flex items-center justify-center text-lg font-bold text-foreground hover:bg-muted transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <Button
                  onClick={() => handleAddToCart()}
                  className="w-full gradient-mission text-primary-foreground h-12 text-base font-semibold gap-2"
                >
                  <ShoppingCart size={20} />
                  Adicionar ao Carrinho
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-center text-sm text-destructive font-semibold">Produto indisponível</p>
                {whatsapp && (
                  <Button
                    onClick={handleWhatsApp}
                    className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-semibold gap-2"
                  >
                    <MessageCircle size={20} />
                    Falar no WhatsApp
                  </Button>
                )}
              </div>
            )}

            <button
              onClick={() => setShowDetails(false)}
              className="w-full text-center text-sm text-muted-foreground py-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Loja;
