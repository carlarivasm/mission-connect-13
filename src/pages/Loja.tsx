import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { ShoppingBag, ShoppingCart, Plus } from "lucide-react";
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
}

const categoryLabels: Record<string, string> = {
  camiseta: "Camiseta",
  bone: "Boné",
  squeeze: "Squeeze",
  chaveiro: "Chaveiro",
  casaco: "Casaco",
  outros: "Outros",
};

const categoryEmojis: Record<string, string> = {
  camiseta: "👕",
  bone: "🧢",
  squeeze: "🥤",
  chaveiro: "🔑",
  casaco: "🧥",
  outros: "📦",
};

const Loja = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { totalItems } = useCart();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("store_products")
      .select("*")
      .eq("available", true)
      .order("category")
      .then(({ data }) => {
        if (data) setProducts(data as Product[]);
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products;

  const uniqueCategories = [...new Set(products.map((p) => p.category))];

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Loja Missionária" onLogout={handleLogout} />

      <main className="px-4 py-5 space-y-5">
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
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              !selectedCategory
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
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                selectedCategory === cat
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
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(
    product.sizes.length > 0 ? product.sizes[0] : undefined
  );
  const [selectedColor, setSelectedColor] = useState<string | undefined>(
    product.colors.length > 0 ? product.colors[0] : undefined
  );
  const { addItem } = useCart();
  const { toast } = useToast();

  const handleAddToCart = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      category: product.category,
      selectedSize,
      selectedColor,
    });
    toast({ title: "Adicionado ao carrinho!", description: product.name });
    setShowDetails(false);
  };

  return (
    <>
      <button
        onClick={() => setShowDetails(true)}
        className="bg-card rounded-xl shadow-card overflow-hidden text-left transition-transform active:scale-[0.98]"
      >
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                // Quick add without size/color selection
                addItem({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  image_url: product.image_url,
                  category: product.category,
                  selectedSize: product.sizes.length > 0 ? product.sizes[0] : undefined,
                  selectedColor: product.colors.length > 0 ? product.colors[0] : undefined,
                });
                toast({ title: "Adicionado!", description: product.name });
              }}
              className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
            >
              <Plus size={16} />
            </button>
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

              {product.sizes.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Tamanho</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSize(s)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedSize === s
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {product.colors.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cor</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {product.colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setSelectedColor(c)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                          selectedColor === c
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground hover:bg-muted/80"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => handleAddToCart()}
              className="w-full gradient-mission text-primary-foreground h-12 text-base font-semibold gap-2"
            >
              <ShoppingCart size={20} />
              Adicionar ao Carrinho
            </Button>

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
