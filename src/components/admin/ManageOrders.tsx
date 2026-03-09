import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { FileSpreadsheet, ShoppingCart, Eye } from "lucide-react";
import { exportToExcel } from "@/lib/excel";

interface OrderItem {
  id: string;
  product_name: string;
  category: string;
  price: number;
  quantity: number;
  selected_size: string | null;
  selected_color: string | null;
}

interface Order {
  id: string;
  user_name: string;
  user_email: string;
  observation: string | null;
  total_price: number;
  status: string;
  created_at: string;
  items?: OrderItem[];
}

const ManageOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    if (!data || data.length === 0) { setOrders([]); setLoading(false); return; }

    // Fetch items for all orders
    const orderIds = data.map((o: any) => o.id);
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .in("order_id", orderIds);

    const ordersWithItems = data.map((o: any) => ({
      ...o,
      items: (items || []).filter((i: any) => i.order_id === o.id),
    }));

    setOrders(ordersWithItems);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleExportExcel = () => {
    if (orders.length === 0) return;

    const rows: any[] = [];
    orders.forEach((order) => {
      (order.items || []).forEach((item) => {
        rows.push({
          "Data": new Date(order.created_at).toLocaleDateString("pt-BR"),
          "Hora": new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          "Cliente": order.user_name,
          "E-mail": order.user_email,
          "Produto": item.product_name,
          "Categoria": item.category,
          "Tamanho": item.selected_size || "-",
          "Cor": item.selected_color || "-",
          "Qtd": item.quantity,
          "Preço Unit.": item.price,
          "Subtotal": item.price * item.quantity,
          "Total Pedido": order.total_price,
          "Observação": order.observation || "-",
          "Status": order.status,
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pedidos");
    XLSX.writeFile(wb, `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Excel exportado!" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ShoppingCart size={18} /> Pedidos Realizados
        </h3>
        <Button onClick={handleExportExcel} disabled={orders.length === 0} variant="outline" size="sm" className="gap-1">
          <FileSpreadsheet size={14} /> Exportar Excel
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
      ) : orders.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-8">Nenhum pedido realizado.</p>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => (
            <div key={order.id} className="bg-card rounded-xl shadow-card overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                className="w-full flex items-center gap-3 p-3 text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm truncate">{order.user_name}</p>
                  <p className="text-xs text-muted-foreground">{order.user_email}</p>
                  <p className="text-[10px] text-muted-foreground/60">
                    {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <span className="text-sm font-bold text-primary shrink-0">
                  R$ {Number(order.total_price).toFixed(2)}
                </span>
                <Eye size={16} className="text-muted-foreground shrink-0" />
              </button>

              {expandedId === order.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                  {order.observation && (
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">
                      📝 <strong>Obs:</strong> {order.observation}
                    </p>
                  )}
                  {(order.items || []).map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-foreground">{item.quantity}x</span>
                      <span className="flex-1 text-foreground truncate">{item.product_name}</span>
                      {item.selected_size && <span className="text-muted-foreground">Tam: {item.selected_size}</span>}
                      {item.selected_color && <span className="text-muted-foreground">Cor: {item.selected_color}</span>}
                      <span className="font-medium text-primary">R$ {(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageOrders;
