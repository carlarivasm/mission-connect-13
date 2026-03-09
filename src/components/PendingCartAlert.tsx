import { useCart } from "@/contexts/CartContext";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, X } from "lucide-react";
import { useState, useEffect } from "react";

const PendingCartAlert = () => {
  const { totalItems, totalPrice } = useCart();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (totalItems > 0 && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [totalItems, dismissed]);

  if (!visible || totalItems === 0) return null;

  return (
    <div className="animate-fade-in rounded-xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
          <ShoppingCart size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            Carrinho pendente 🛒
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Você tem {totalItems} {totalItems === 1 ? "item" : "itens"} no carrinho
            {" "}(R$ {totalPrice.toFixed(2).replace(".", ",")}). Finalize sua solicitação!
          </p>
          <button
            onClick={() => navigate("/checkout")}
            className="mt-2 text-xs font-bold text-primary hover:underline"
          >
            Ir para o checkout →
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dispensar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default PendingCartAlert;
