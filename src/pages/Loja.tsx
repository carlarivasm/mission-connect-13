import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/contexts/AuthContext";
import { ShoppingBag, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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
          <p className="text-base font-bold text-primary mt-1">
            R$ {product.price.toFixed(2)}
          </p>
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
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Tamanhos</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {product.sizes.map((s) => (
                      <span key={s} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {product.colors.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Cores</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {product.colors.map((c) => (
                      <span key={c} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {product.contact_info && (
              <a
                href={product.contact_info.startsWith("http") ? product.contact_info : `https://wa.me/${product.contact_info.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <Button className="w-full gradient-mission text-primary-foreground h-12 text-base font-semibold gap-2">
                  <MessageCircle size={20} />
                  Fazer Pedido
                </Button>
              </a>
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
