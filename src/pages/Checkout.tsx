import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import AppHeader from "@/components/AppHeader";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Minus, Plus, ExternalLink, ShoppingCart, CheckCircle, Copy, Check } from "lucide-react";

const categoryLabels: Record<string, string> = {
  camiseta: "Camiseta",
  bone: "Boné",
  squeeze: "Squeeze",
  chaveiro: "Chaveiro",
  casaco: "Casaco",
  outros: "Outros",
};

const Checkout = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const { toast } = useToast();

  const [whatsapp, setWhatsapp] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [qrcodeUrl, setQrcodeUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [observation, setObservation] = useState("");

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["store_whatsapp", "store_payment_link", "store_qrcode_url"])
      .then(({ data }) => {
        if (data) {
          data.forEach((d) => {
            if (d.setting_key === "store_whatsapp") setWhatsapp(d.setting_value);
            if (d.setting_key === "store_payment_link") setPaymentLink(d.setting_value);
            if (d.setting_key === "store_qrcode_url") setQrcodeUrl(d.setting_value);
          });
        }
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const buildOrderMessage = () => {
    const lines = [
      `🛒 *Novo Pedido - Loja Missionária*`,
      ``,
      `👤 *Cliente:* ${user?.user_metadata?.full_name || user?.email || "Não identificado"}`,
      `📧 *E-mail:* ${user?.email || "N/A"}`,
      ``,
      `📋 *Itens do Pedido:*`,
    ];

    items.forEach((item, i) => {
      let desc = `${i + 1}. *${item.name}* — ${item.quantity}x R$ ${item.price.toFixed(2)}`;
      if (item.selectedSize) desc += ` | Tam: ${item.selectedSize}`;
      if (item.selectedColor) desc += ` | Cor: ${item.selectedColor}`;
      lines.push(desc);
    });

    lines.push(``);
    lines.push(`💰 *Total: R$ ${totalPrice.toFixed(2)}*`);

    if (observation.trim()) {
      lines.push(``);
      lines.push(`📝 *Observação:* ${observation.trim()}`);
    }

    lines.push(``);
    lines.push(`✅ Pagamento confirmado pelo cliente.`);

    return lines.join("\n");
  };

  const saveOrderToDb = async () => {
    if (!user) return;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email || "",
        user_email: user.email || "",
        observation: observation.trim() || null,
        total_price: totalPrice,
        status: "confirmed",
      } as any)
      .select("id")
      .single();

    if (orderErr || !order) return;

    const orderItems = items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      product_name: item.name,
      category: item.category,
      price: item.price,
      quantity: item.quantity,
      selected_size: item.selectedSize || null,
      selected_color: item.selectedColor || null,
      image_url: item.image_url || null,
    }));

    await supabase.from("order_items").insert(orderItems as any);
  };

  const handleConfirmPayment = async () => {
    if (items.length === 0) return;
    setSending(true);

    // Save to database
    await saveOrderToDb();

    // Send to WhatsApp
    const message = buildOrderMessage();
    const encoded = encodeURIComponent(message);
    const cleanNumber = whatsapp.replace(/\D/g, "");

    if (cleanNumber) {
      window.open(`https://wa.me/${cleanNumber}?text=${encoded}`, "_blank");
    } else {
      toast({
        title: "WhatsApp não configurado",
        description: "O administrador ainda não configurou o número para pedidos.",
        variant: "destructive",
      });
      setSending(false);
      return;
    }

    clearCart();
    toast({ title: "Pedido enviado!", description: "Sua lista foi enviada pelo WhatsApp." });
    setSending(false);
    navigate("/loja");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader title="Checkout" onLogout={handleLogout} />
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <AppHeader title="Checkout" onLogout={handleLogout} />
        <main className="px-4 py-12 text-center space-y-4">
          <ShoppingCart size={48} className="mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Seu carrinho está vazio.</p>
          <Button onClick={() => navigate("/loja")} className="gradient-mission text-primary-foreground">
            Voltar à Loja
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader title="Checkout" onLogout={handleLogout} />

      <main className="px-4 py-5 space-y-5 max-w-lg mx-auto">
        {/* Cart Items */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Seus Itens</h2>
          {items.map((item) => (
            <div key={`${item.id}_${item.selectedSize}_${item.selectedColor}`} className="flex gap-3 p-3 bg-card rounded-xl shadow-card">
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <ShoppingCart size={20} className="text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {categoryLabels[item.category] || item.category}
                  {item.selectedSize && ` • ${item.selectedSize}`}
                  {item.selectedColor && ` • ${item.selectedColor}`}
                </p>
                <p className="text-sm font-bold text-primary mt-0.5">
                  R$ {(item.price * item.quantity).toFixed(2)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                    className="p-1 rounded-md bg-muted text-foreground hover:bg-muted/80"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                    className="p-1 rounded-md bg-muted text-foreground hover:bg-muted/80"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={() => removeItem(item.id, item.selectedSize, item.selectedColor)}
                    className="ml-auto p-1 rounded-md text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Observation */}
        <div className="bg-card rounded-xl p-4 shadow-card space-y-2">
          <Label htmlFor="observation" className="text-sm font-bold text-foreground uppercase tracking-wide">
            Observação
          </Label>
          <Textarea
            id="observation"
            value={observation}
            onChange={(e) => setObservation(e.target.value)}
            placeholder="Número do quarto, pedido especial, etc."
            rows={2}
          />
        </div>

        {/* Total */}
        <div className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
          <span className="font-semibold text-foreground">Total</span>
          <span className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
        </div>

        {/* Payment Section */}
        <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Pagamento</h2>

          {qrcodeUrl && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-muted-foreground">Escaneie o QR Code para pagar:</p>
              <img src={qrcodeUrl} alt="QR Code de Pagamento" className="w-48 h-48 rounded-xl object-contain bg-white p-2" />
            </div>
          )}

          {paymentLink && (
            <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="outline" className="w-full gap-2">
                <ExternalLink size={16} />
                Abrir Link de Pagamento
              </Button>
            </a>
          )}

          {!qrcodeUrl && !paymentLink && (
            <p className="text-sm text-muted-foreground text-center">
              O administrador ainda não configurou as opções de pagamento.
            </p>
          )}
        </div>

        {/* Confirm */}
        <Button
          onClick={handleConfirmPayment}
          disabled={sending}
          className="w-full gradient-mission text-primary-foreground h-12 text-base font-semibold gap-2"
        >
          <CheckCircle size={20} />
          {sending ? "Enviando..." : "Já Paguei — Enviar Pedido"}
        </Button>

        <p className="text-[10px] text-muted-foreground text-center">
          Ao confirmar, sua lista de produtos será enviada pelo WhatsApp para o responsável.
        </p>
      </main>

      <BottomNav />
    </div>
  );
};

export default Checkout;
