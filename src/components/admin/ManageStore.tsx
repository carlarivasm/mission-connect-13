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
import { Trash2, ShoppingBag, Pencil, ImagePlus } from "lucide-react";

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

const categories = [
  { value: "camiseta", label: "Camiseta" },
  { value: "bone", label: "Boné" },
  { value: "squeeze", label: "Squeeze" },
  { value: "chaveiro", label: "Chaveiro" },
  { value: "casaco", label: "Casaco" },
  { value: "outros", label: "Outros" },
];

const ManageStore = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

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
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, file);

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
    };

    if (editingId) {
      const { error } = await supabase.from("store_products").update(payload).eq("id", editingId);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Produto atualizado!" }); resetForm(); fetchProducts(); }
    } else {
      const { error } = await supabase.from("store_products").insert(payload);
      if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
      else { toast({ title: "Produto adicionado!" }); resetForm(); fetchProducts(); }
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
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("store_products").delete().eq("id", id);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else fetchProducts();
  };

  const categoryLabel = (val: string) => categories.find((c) => c.value === val)?.label || val;

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="bg-card rounded-xl p-4 shadow-card space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ShoppingBag size={18} /> {editingId ? "Editar Produto" : "Novo Produto"}
        </h3>
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

      <div className="space-y-2">
        {loading ? (
          <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
        ) : products.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">Nenhum produto cadastrado.</p>
        ) : (
          products.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
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
                <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageStore;
