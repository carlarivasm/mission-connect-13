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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Trash2, Minus, Plus, ExternalLink, ShoppingCart,
  CheckCircle, Copy, Check, ArrowRight, AlertCircle,
  MapPin, Truck, CreditCard,
} from "lucide-react";

const categoryLabels: Record<string, string> = {
  camiseta: "Camiseta",
  bone: "Boné",
  squeeze: "Squeeze",
  chaveiro: "Chaveiro",
  casaco: "Casaco",
  outros: "Outros",
};

interface DeliveryLocation {
  name: string;
  times: string[];
}

const Checkout = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const { toast } = useToast();

  // Step 1 = items review, 2 = payment + delivery
  const [step, setStep] = useState(1);

  // Payment settings
  const [whatsapp, setWhatsapp] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [qrcodeUrl, setQrcodeUrl] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [bankDetails, setBankDetails] = useState("");

  // Delivery settings (from admin)
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryLocations, setDeliveryLocations] = useState<DeliveryLocation[]>([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [observation, setObservation] = useState("");
  const [copied, setCopied] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Delivery form state
  const [deliveryRecipient, setDeliveryRecipient] = useState("");
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", [
        "store_whatsapp", "store_payment_link", "store_qrcode_url",
        "store_pix_key", "store_bank_details",
        "delivery_enabled", "delivery_locations",
      ])
      .then(({ data }) => {
        if (data) {
          data.forEach((d) => {
            if (d.setting_key === "store_whatsapp") setWhatsapp(d.setting_value);
            if (d.setting_key === "store_payment_link") setPaymentLink(d.setting_value);
            if (d.setting_key === "store_qrcode_url") setQrcodeUrl(d.setting_value);
            if (d.setting_key === "store_pix_key") setPixKey(d.setting_value);
            if (d.setting_key === "store_bank_details") setBankDetails(d.setting_value);
            if (d.setting_key === "delivery_enabled") setDeliveryEnabled(d.setting_value === "true");
            if (d.setting_key === "delivery_locations") {
              try {
                setDeliveryLocations(JSON.parse(d.setting_value) || []);
              } catch {
                setDeliveryLocations([]);
              }
            }
          });
        }
        setLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const selectedLocationData = deliveryLocations.find((l) => l.name === deliveryLocation);

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

    if (deliveryEnabled && deliveryRecipient) {
      lines.push(``);
      lines.push(`🚚 *Entrega:*`);
      lines.push(`   Responsável: ${deliveryRecipient}`);
      if (deliveryLocation) lines.push(`   Local: ${deliveryLocation}`);
      if (deliveryTime) lines.push(`   Horário: ${deliveryTime}`);
    }

    lines.push(``);
    lines.push(receiptFile ? `🧾 *Comprovante:* Anexado` : `🧾 *Comprovante:* Não enviado`);
    lines.push(``);
    lines.push(`✅ Pedido confirmado.`);

    return lines.join("\n");
  };

  const decreaseStock = async () => {
    for (const item of items) {
      await supabase.rpc("decrease_stock", {
        p_product_id: item.id,
        p_size: item.selectedSize || null,
        p_color: item.selectedColor || null,
        p_quantity: item.quantity,
      });
    }
  };

  const saveOrderToDb = async (receiptUrl: string | null) => {
    if (!user) return;

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email || "",
        user_email: user.email || "",
        observation: observation.trim() || null,
        total_price: totalPrice,
        status: "to_separate",
        payment_status: receiptUrl ? "paid" : "pending",
        pay_later: false,
        receipt_url: receiptUrl,
        delivery_recipient_name: deliveryEnabled && deliveryRecipient ? deliveryRecipient : null,
        delivery_location: deliveryEnabled && deliveryLocation ? deliveryLocation : null,
        delivery_time: deliveryEnabled && deliveryTime ? deliveryTime : null,
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

    let receiptUrl = null;

    if (receiptFile) {
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('payment_receipts')
        .upload(fileName, receiptFile);

      if (uploadError) {
        toast({
          title: "Erro ao fazer upload",
          description: "Não foi possível enviar o comprovante. Tente novamente.",
          variant: "destructive",
        });
        setSending(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('payment_receipts')
        .getPublicUrl(fileName);

      receiptUrl = publicUrlData.publicUrl;
    }

    // Save to database
    await saveOrderToDb(receiptUrl);

    // Decrease stock
    await decreaseStock();

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
      <AppHeader title={step === 1 ? "Revisão do Pedido" : "Pagamento"} onLogout={handleLogout} />

      {/* Step indicator — centered */}
      <div className="flex justify-center pt-4 pb-1">
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 1 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? "gradient-mission text-primary-foreground" : "bg-primary text-primary-foreground"}`}>
              {step > 1 ? <Check size={12} /> : "1"}
            </div>
            Itens
          </div>
          <div className="w-8 h-px bg-border" />
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step === 2 ? "text-primary" : "text-muted-foreground"}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? "gradient-mission text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              2
            </div>
            Pagamento
          </div>
        </div>
      </div>

      <main className="px-4 py-5 space-y-5 max-w-lg mx-auto">

        {/* ── STEP 1: Items Review ─────────────────────────────── */}
        {step === 1 && (
          <>
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
                placeholder="Adicione informações relevantes sobre o seu pedido."
                rows={2}
              />
            </div>

            {/* Total */}
            <div className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
              <span className="font-semibold text-foreground">Total</span>
              <span className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
            </div>

            {/* CTA */}
            <Button
              onClick={() => setStep(2)}
              className="w-full gradient-mission text-primary-foreground h-12 text-base font-semibold gap-2"
            >
              Ir para pagamento
              <ArrowRight size={20} />
            </Button>
          </>
        )}

        {/* ── STEP 2: Payment + Delivery ───────────────────────── */}
        {step === 2 && (
          <>
            {/* Order summary (compact) */}
            <div className="bg-card rounded-xl p-4 shadow-card flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{items.reduce((s, i) => s + i.quantity, 0)} item(s)</p>
                <p className="text-sm font-semibold text-foreground">Total do pedido</p>
              </div>
              <span className="text-xl font-bold text-primary">R$ {totalPrice.toFixed(2)}</span>
            </div>

            {/* Payment note — prominent */}
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-xl p-4">
              <AlertCircle size={20} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-300 font-medium leading-snug">
                O pagamento deve ser realizado para que o pedido seja efetivado. Realize o pagamento abaixo e envie o comprovante.
              </p>
            </div>

            {/* Payment Section */}
            <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Pagamento</h2>
              </div>

              {qrcodeUrl && (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs text-muted-foreground">Escaneie o QR Code para pagar:</p>
                  <img src={qrcodeUrl} alt="QR Code de Pagamento" className="w-48 h-48 rounded-xl object-contain bg-white p-1" />
                </div>
              )}

              {/* PIX — copy button only, key hidden */}
              {pixKey && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pixKey);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    toast({ title: "Chave Pix copiada!" });
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-base hover:bg-primary/90 transition-colors active:scale-[0.98]"
                >
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                  {copied ? "Copiado!" : "Copiar chave PIX"}
                </button>
              )}

              {bankDetails && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">Dados Bancários:</p>
                  <pre className="bg-muted rounded-lg px-3 py-2 text-xs text-foreground whitespace-pre-wrap font-sans">
                    {bankDetails}
                  </pre>
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

              {!qrcodeUrl && !paymentLink && !pixKey && !bankDetails && (
                <p className="text-sm text-muted-foreground text-center">
                  O administrador ainda não configurou as opções de pagamento.
                </p>
              )}

              {/* Receipt upload — optional */}
              <div className="pt-4 border-t space-y-2">
                <Label htmlFor="receipt" className="text-sm font-bold text-foreground">
                  Comprovante de Pagamento
                </Label>
                <Input
                  id="receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                  className="text-sm cursor-pointer file:cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Por favor, anexe o comprovante de pagamento.
                </p>
              </div>
            </div>

            {/* Delivery Section — conditional */}
            {deliveryEnabled && (
              <div className="bg-card rounded-xl p-4 shadow-card space-y-4">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-primary" />
                  <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Entrega</h2>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="delivery-recipient" className="text-sm font-semibold text-foreground">
                      Nome do responsável pelo recebimento
                    </Label>
                    <Input
                      id="delivery-recipient"
                      value={deliveryRecipient}
                      onChange={(e) => setDeliveryRecipient(e.target.value)}
                      placeholder="Nome completo de quem vai receber"
                    />
                  </div>

                  {deliveryLocations.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        <MapPin size={13} className="text-primary" />
                        Local de entrega
                      </Label>
                      <Select
                        value={deliveryLocation}
                        onValueChange={(val) => {
                          setDeliveryLocation(val);
                          setDeliveryTime("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o local" />
                        </SelectTrigger>
                        <SelectContent>
                          {deliveryLocations.map((loc) => (
                            <SelectItem key={loc.name} value={loc.name}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {selectedLocationData && selectedLocationData.times.length > 0 && (
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground">
                        Horário de entrega
                      </Label>
                      <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o horário" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedLocationData.times.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                onClick={handleConfirmPayment}
                disabled={sending}
                className="w-full gradient-mission text-primary-foreground h-12 text-base font-semibold gap-2"
              >
                <CheckCircle size={20} />
                {sending ? "Enviando..." : "Enviar pedido"}
              </Button>
              <button
                onClick={() => setStep(1)}
                className="w-full text-center text-sm text-muted-foreground py-2 hover:text-foreground transition-colors"
              >
                ← Rever itens
              </button>
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default Checkout;
