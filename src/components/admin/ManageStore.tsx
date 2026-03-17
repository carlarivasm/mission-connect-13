/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Trash2, ShoppingBag, Pencil, ImagePlus, CreditCard, Save, Upload, Package, Truck, X } from "lucide-react";

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
  id?: string;
  kit_id: string;
  component_product_id: string;
  quantity: number;
}

interface StockEntry {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  quantity: number;
}

const categories = [
  { value: "camiseta", label: "Camiseta" },
  { value: "bone", label: "Boné" },
  { value: "squeeze", label: "Squeeze" },
  { value: "chaveiro", label: "Chaveiro" },
  { value: "casaco", label: "Casaco" },
  { value: "kit", label: "Kit" },
  { value: "outros", label: "Outros" },
];

const PaymentSettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [whatsapp, setWhatsapp] = useState("");
  const [paymentLink, setPaymentLink] = useState("");
  const [qrcodeUrl, setQrcodeUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [pixKey, setPixKey] = useState("");
  const [bankDetails, setBankDetails] = useState("");

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["store_whatsapp", "store_payment_link", "store_qrcode_url", "store_pix_key", "store_bank_details"])
      .then(({ data }) => {
        if (data) {
          data.forEach((d) => {
            if (d.setting_key === "store_whatsapp") setWhatsapp(d.setting_value);
            if (d.setting_key === "store_payment_link") setPaymentLink(d.setting_value);
            if (d.setting_key === "store_qrcode_url") setQrcodeUrl(d.setting_value);
            if (d.setting_key === "store_pix_key") setPixKey(d.setting_value);
            if (d.setting_key === "store_bank_details") setBankDetails(d.setting_value);
          });
        }
      });
  }, []);

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `qrcode-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(fileName, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setQrcodeUrl(urlData.publicUrl);
      toast({ title: "QR Code enviado!" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const entries = [
      { setting_key: "store_whatsapp", setting_value: whatsapp.trim() },
      { setting_key: "store_payment_link", setting_value: paymentLink.trim() },
      { setting_key: "store_qrcode_url", setting_value: qrcodeUrl.trim() },
      { setting_key: "store_pix_key", setting_value: pixKey.trim() },
      { setting_key: "store_bank_details", setting_value: bankDetails.trim() },
    ];
    for (const entry of entries) {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { ...entry, updated_by: user.id, updated_at: new Date().toISOString() } as any,
          { onConflict: "setting_key" }
        );
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    toast({ title: "Configurações de pagamento salvas!" });
    setSaving(false);
  };

  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-3">
        <div className="space-y-1">
          <Label>WhatsApp para receber pedidos</Label>
          <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="5511999999999" />
          <p className="text-[10px] text-muted-foreground">Número com DDD e código do país (ex: 5511999999999)</p>
        </div>
        <div className="space-y-1">
          <Label>Link de Pagamento (Pix, etc.)</Label>
          <Input value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://..." />
        </div>
        <div className="space-y-1">
          <Label>Chave Pix</Label>
          <Input value={pixKey} onChange={(e) => setPixKey(e.target.value)} placeholder="CPF, e-mail, telefone ou chave aleatória" />
          <p className="text-[10px] text-muted-foreground">Será exibida abaixo do QR Code para o usuário copiar.</p>
        </div>
        <div className="space-y-1">
          <Label>QR Code de Pagamento</Label>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background text-sm cursor-pointer hover:bg-accent transition-colors">
              <Upload size={16} />
              {uploading ? "Enviando..." : "Upload QR Code"}
              <input type="file" accept="image/*" onChange={handleQrUpload} className="hidden" disabled={uploading} />
            </label>
            {qrcodeUrl && (
              <img src={qrcodeUrl} alt="QR Code" className="h-16 w-16 rounded-lg object-contain bg-muted p-1" />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <Label>Dados Bancários</Label>
          <Textarea value={bankDetails} onChange={(e) => setBankDetails(e.target.value)} placeholder="Banco, Agência, Conta, Titular..." rows={3} />
          <p className="text-[10px] text-muted-foreground">Exibido na tela de checkout para transferência.</p>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving} className="gradient-mission text-primary-foreground gap-2">
        <Save size={16} /> {saving ? "Salvando..." : "Salvar Pagamento"}
      </Button>
    </div>
  );
};

interface DeliveryLocationEntry {
  name: string;
  times: string[];
}

const DeliverySettings = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [locations, setLocations] = useState<DeliveryLocationEntry[]>([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [newTimes, setNewTimes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["delivery_enabled", "delivery_locations"])
      .then(({ data }) => {
        if (data) {
          data.forEach((d) => {
            if (d.setting_key === "delivery_enabled") setEnabled(d.setting_value === "true");
            if (d.setting_key === "delivery_locations") {
              try { setLocations(JSON.parse(d.setting_value) || []); } catch { setLocations([]); }
            }
          });
        }
      });
  }, []);

  const addLocation = () => {
    const name = newLocationName.trim();
    if (!name) return;
    if (locations.find((l) => l.name === name)) {
      toast({ title: "Local já existe", variant: "destructive" });
      return;
    }
    setLocations((prev) => [...prev, { name, times: [] }]);
    setNewLocationName("");
  };

  const removeLocation = (name: string) => {
    setLocations((prev) => prev.filter((l) => l.name !== name));
  };

  const addTime = (locationName: string) => {
    const time = (newTimes[locationName] || "").trim();
    if (!time) return;
    setLocations((prev) =>
      prev.map((l) =>
        l.name === locationName && !l.times.includes(time)
          ? { ...l, times: [...l.times, time] }
          : l
      )
    );
    setNewTimes((prev) => ({ ...prev, [locationName]: "" }));
  };

  const removeTime = (locationName: string, time: string) => {
    setLocations((prev) =>
      prev.map((l) =>
        l.name === locationName ? { ...l, times: l.times.filter((t) => t !== time) } : l
      )
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const entries = [
      { setting_key: "delivery_enabled", setting_value: enabled ? "true" : "false" },
      { setting_key: "delivery_locations", setting_value: JSON.stringify(locations) },
    ];
    for (const entry of entries) {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { ...entry, updated_by: user.id, updated_at: new Date().toISOString() } as any,
          { onConflict: "setting_key" }
        );
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        setSaving(false);
        return;
      }
    }
    toast({ title: "Configurações de entrega salvas!" });
    setSaving(false);
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Ativar entrega no checkout</p>
          <p className="text-xs text-muted-foreground">Quando desativado, o cliente não vê a etapa de entrega.</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* Locations & times */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase">Locais e horários de entrega</p>

        {locations.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum local cadastrado.</p>
        )}

        {locations.map((loc) => (
          <div key={loc.name} className="bg-muted rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{loc.name}</p>
              <button onClick={() => removeLocation(loc.name)} className="p-1 rounded text-destructive hover:bg-destructive/10 transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Existing times */}
            <div className="flex flex-wrap gap-1.5">
              {loc.times.map((t) => (
                <span key={t} className="flex items-center gap-1 bg-background text-foreground text-xs px-2 py-0.5 rounded-full border border-border">
                  {t}
                  <button onClick={() => removeTime(loc.name, t)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>

            {/* Add time */}
            <div className="flex gap-2">
              <Input
                value={newTimes[loc.name] || ""}
                onChange={(e) => setNewTimes((prev) => ({ ...prev, [loc.name]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTime(loc.name); } }}
                placeholder="Ex: 09:00 – 11:00"
                className="h-8 text-xs"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => addTime(loc.name)} className="h-8 text-xs whitespace-nowrap">
                + Horário
              </Button>
            </div>
          </div>
        ))}

        {/* Add location */}
        <div className="flex gap-2">
          <Input
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
            placeholder="Nome do local (ex: Igreja Central)"
            className="h-9 text-sm"
          />
          <Button type="button" variant="outline" onClick={addLocation} className="h-9 text-sm whitespace-nowrap">
            + Local
          </Button>
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="gradient-mission text-primary-foreground gap-2">
        <Save size={16} /> {saving ? "Salvando..." : "Salvar Entrega"}
      </Button>
    </div>
  );
};

const StockManager = ({ product, onStockUpdated }: { product: Product; onStockUpdated: () => void }) => {
  const { toast } = useToast();
  const [stock, setStock] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStock = async () => {
    const { data } = await supabase
      .from("product_stock")
      .select("*")
      .eq("product_id", product.id);
    if (data) setStock(data as StockEntry[]);
    setLoading(false);
  };

  useEffect(() => { fetchStock(); }, [product.id]);

  // Generate all variants
  const variants: { size: string | null; color: string | null }[] = [];
  const sizes = product.sizes.length > 0 ? product.sizes : [null];
  const colors = product.colors.length > 0 ? product.colors : [null];
  for (const size of sizes) {
    for (const color of colors) {
      variants.push({ size, color });
    }
  }

  const getStockQty = (size: string | null, color: string | null) => {
    const entry = stock.find(
      (s) => (s.size ?? null) === size && (s.color ?? null) === color
    );
    return entry?.quantity ?? 0;
  };

  const handleStockChange = async (size: string | null, color: string | null, qty: number) => {
    const { error } = await supabase
      .from("product_stock")
      .upsert(
        {
          product_id: product.id,
          size: size || null,
          color: color || null,
          quantity: Math.max(0, qty),
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "product_id,size,color" }
      );
    if (error) {
      toast({ title: "Erro ao salvar estoque", description: error.message, variant: "destructive" });
    } else {
      fetchStock();
      onStockUpdated();
    }
  };

  if (loading) return <p className="text-xs text-muted-foreground">Carregando estoque...</p>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
        <Package size={12} /> Estoque
      </p>
      <div className="grid gap-1.5">
        {variants.map(({ size, color }) => {
          const label = [size, color].filter(Boolean).join(" / ") || "Geral";
          const qty = getStockQty(size, color);
          return (
            <div key={`${size}_${color}`} className="flex items-center gap-2">
              <span className="text-xs text-foreground min-w-[80px]">{label}</span>
              <Input
                type="number"
                min="0"
                value={qty}
                onChange={(e) => handleStockChange(size, color, parseInt(e.target.value) || 0)}
                className="w-20 h-8 text-xs"
              />
              <span className="text-[10px] text-muted-foreground">un.</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ManageStore = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [expandedStockId, setExpandedStockId] = useState<string | null>(null);

  // Collapsible sections
  const [showPaymentSettings, setShowPaymentSettings] = useState(false);
  const [showNewProduct, setShowNewProduct] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("camiseta");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Combo fields
  const [isCombo, setIsCombo] = useState(false);
  const [comboMinQuantity, setComboMinQuantity] = useState(1);
  const [comboPrice, setComboPrice] = useState("");

  // Kit fields
  const [productType, setProductType] = useState<'simple' | 'kit'>('simple');
  const [kitComponents, setKitComponents] = useState<{ component_product_id: string; quantity: number }[]>([]);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from("store_products")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setProducts(data as Product[]);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const resetForm = () => {
    setName(""); setDescription(""); setCategory("camiseta"); setPrice("");
    setAvailable(true); setSizes(""); setColors(""); setContactInfo("");
    setImageUrl(""); setEditingId(null);
    setIsCombo(false); setComboMinQuantity(1); setComboPrice("");
    setProductType('simple'); setKitComponents([]);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("product-images").upload(fileName, file);
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
    } else {
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
      setImageUrl(urlData.publicUrl);
      toast({ title: "Imagem enviada!" });
    }
    setUploading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      category,
      price: parseFloat(price) || 0,
      available,
      sizes: sizes ? sizes.split(",").map((s) => s.trim()) : [],
      colors: colors ? colors.split(",").map((c) => c.trim()) : [],
      contact_info: contactInfo.trim() || null,
      image_url: imageUrl || null,
      created_by: user?.id,
      is_combo: isCombo,
      combo_min_quantity: comboMinQuantity,
      combo_price: isCombo ? parseFloat(comboPrice) || null : null,
      product_type: productType,
      is_kit: productType === 'kit',
    };
    const { error } = editingId
      ? await supabase.from("store_products").update(payload).eq("id", editingId)
      : await supabase.from("store_products").insert(payload);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      // Update kit components if it's a kit
      if (productType === 'kit') {
        const finalId = editingId || (await supabase.from("store_products").select("id").eq("name", payload.name).order("created_at", { ascending: false }).limit(1).single()).data?.id;
        if (finalId) {
          await (supabase.from("kit_components" as any).delete().eq("kit_id", finalId) as any);
          if (kitComponents.length > 0) {
            await (supabase.from("kit_components" as any).insert(
              kitComponents.map(c => ({ ...c, kit_id: finalId }))
            ) as any);
          }
        }
      }
      toast({ title: editingId ? "Produto atualizado!" : "Produto adicionado!" });
      resetForm();
      fetchProducts();
    }
    setSubmitting(false);
  };

  const handleEdit = (p: Product) => {
    setEditingId(p.id);
    setName(p.name);
    setDescription(p.description || "");
    setCategory(p.category);
    setPrice(p.price.toString());
    setAvailable(p.available);
    setSizes(p.sizes.join(", "));
    setColors(p.colors.join(", "));
    setContactInfo(p.contact_info || "");
    setImageUrl(p.image_url || "");
    setIsCombo(p.is_combo || false);
    setComboMinQuantity(p.combo_min_quantity || 1);
    setComboPrice(p.combo_price?.toString() || "");
    setProductType(p.product_type || 'simple');

    // Fetch kit components if it's a kit
    if (p.product_type === 'kit') {
      (supabase.from("kit_components" as any).select("*").eq("kit_id", p.id) as any).then(({ data }: any) => {
        if (data) setKitComponents(data.map((c: any) => ({ component_product_id: c.component_product_id, quantity: c.quantity })));
      });
    } else {
      setKitComponents([]);
    }

    setShowNewProduct(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("store_products").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchProducts();
  };

  const categoryLabel = (val: string) => categories.find((c) => c.value === val)?.label || val;

  const [showDeliverySettings, setShowDeliverySettings] = useState(false);

  return (
    <div className="space-y-6">
      {/* Configurações de Pagamento - collapsible */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <button onClick={() => setShowPaymentSettings(!showPaymentSettings)} className="flex items-center gap-2 w-full text-left">
          <CreditCard size={14} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Configurações de Pagamento</h4>
          <span className="text-xs text-muted-foreground ml-auto">{showPaymentSettings ? "▲" : "▼"}</span>
        </button>
        {showPaymentSettings && <PaymentSettings />}
      </div>

      {/* Configurações de Entrega - collapsible */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <button onClick={() => setShowDeliverySettings(!showDeliverySettings)} className="flex items-center gap-2 w-full text-left">
          <Truck size={14} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">Configurações de Entrega</h4>
          <span className="text-xs text-muted-foreground ml-auto">{showDeliverySettings ? "▲" : "▼"}</span>
        </button>
        {showDeliverySettings && <DeliverySettings />}
      </div>

      {/* Novo Produto - collapsible */}
      <div className="bg-card rounded-xl p-4 shadow-card space-y-3">
        <button onClick={() => setShowNewProduct(!showNewProduct)} className="flex items-center gap-2 w-full text-left">
          <ShoppingBag size={14} className="text-primary" />
          <h4 className="text-sm font-semibold text-foreground">{editingId ? "Editar Produto" : "Novo Produto"}</h4>
          <span className="text-xs text-muted-foreground ml-auto">{showNewProduct ? "▲" : "▼"}</span>
        </button>
        {showNewProduct && (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do produto" required />
                </div>
                <div className="space-y-1">
                  <Label>Categoria</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Product Type / Kit Settings */}
              <div className="bg-muted p-3 rounded-xl space-y-3">
                <div className="space-y-1">
                  <Label>Tipo de Produto</Label>
                  <Select value={productType} onValueChange={(v: any) => setProductType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="simple">Simples</SelectItem>
                      <SelectItem value="kit">Kit de itens variados</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {productType === 'kit' && (
                  <div className="space-y-2">
                    <Label className="text-xs uppercase text-muted-foreground">Produtos que compõem o kit</Label>
                    {kitComponents.map((comp: any, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <Select value={comp.component_product_id} onValueChange={(val) => {
                          const newComps = [...kitComponents];
                          newComps[idx].component_product_id = val;
                          setKitComponents(newComps);
                        }}>
                          <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            {products.filter(p => p.product_type === 'simple').map(p => (
                              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          className="w-16"
                          value={comp.quantity}
                          onChange={(e) => {
                            const newComps = [...kitComponents];
                            (newComps[idx] as any).quantity = parseInt(e.target.value) || 1;
                            setKitComponents(newComps);
                          }}
                        />
                        <button onClick={() => setKitComponents(kitComponents.filter((_, i) => i !== idx))} className="text-destructive">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setKitComponents([...kitComponents, { component_product_id: '', quantity: 1 }])}>
                      + Adicionar Produto ao Kit
                    </Button>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <Label>Descrição</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalhes do produto" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Preço (R$)</Label>
                  <Input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0,00" required />
                </div>
                <div className="space-y-1 flex flex-col">
                  <Label>Disponível</Label>
                  <div className="flex items-center gap-2 h-10">
                    <Switch checked={available} onCheckedChange={setAvailable} />
                    <span className="text-sm text-muted-foreground">{available ? "Sim" : "Não"}</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Tamanhos</Label>
                  <Input value={sizes} onChange={(e) => setSizes(e.target.value)} placeholder="P, M, G, GG" />
                </div>
                <div className="space-y-1">
                  <Label>Cores</Label>
                  <Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="Azul, Branco" />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Contato/Pedido</Label>
                <Input value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} placeholder="WhatsApp ou link para pedido" />
              </div>

              {/* Combo Settings */}
              <div className="bg-muted p-3 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Ativar Combo?</Label>
                  <Switch checked={isCombo} onCheckedChange={setIsCombo} />
                </div>
                {isCombo && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Qtd Mínima</Label>
                      <Input type="number" value={comboMinQuantity} onChange={(e) => setComboMinQuantity(parseInt(e.target.value) || 1)} min="1" />
                    </div>
                    <div className="space-y-1">
                      <Label>Preço Unit. no Combo (R$)</Label>
                      <Input type="number" step="0.01" value={comboPrice} onChange={(e) => setComboPrice(e.target.value)} placeholder="0,00" />
                    </div>
                  </div>
                )}
              </div>


              <div className="space-y-1">
                <Label>Imagem</Label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-input bg-background text-sm cursor-pointer hover:bg-accent transition-colors">
                    <ImagePlus size={16} />
                    {uploading ? "Enviando..." : "Upload"}
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
                  </label>
                  {imageUrl && (
                    <img src={imageUrl} alt="Preview" className="h-10 w-10 rounded-lg object-cover" />
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting} className="gradient-mission text-primary-foreground">
                {submitting ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
            </div>
          </form>
        )}
      </div>

      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum produto cadastrado.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} className="bg-card rounded-xl shadow-card overflow-hidden">
              <div className="flex items-center gap-3 p-3">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <ShoppingBag size={20} className="text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel(p.category)} • R$ {p.price.toFixed(2)}
                  </p>
                  {p.sizes.length > 0 && (
                    <p className="text-xs text-muted-foreground">Tam: {p.sizes.join(", ")}</p>
                  )}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${p.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {p.available ? "Disponível" : "Esgotado"}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setExpandedStockId(expandedStockId === p.id ? null : p.id)}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="Gerenciar estoque"
                  >
                    <Package size={16} />
                  </button>
                  <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {expandedStockId === p.id && (
                <div className="px-3 pb-3 border-t border-border pt-3">
                  <StockManager product={p} onStockUpdated={fetchProducts} />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageStore;
