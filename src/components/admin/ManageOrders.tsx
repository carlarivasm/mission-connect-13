import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileSpreadsheet, ShoppingCart, Eye, CheckCircle2, Package, Truck,
  XCircle, CircleDollarSign, Bell, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
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
  user_id: string;
  observation: string | null;
  total_price: number;
  status: string;
  created_at: string;
  receipt_url: string | null;
  pay_later: boolean | null;
  delivery_recipient_name?: string | null;
  delivery_location?: string | null;
  delivery_time?: string | null;
  items?: OrderItem[];
}

interface PendingCart {
  user_id: string;
  user_name: string;
  user_email: string;
  item_count: number;
  total_estimate: number;
}

/** Derive a display status for an order */
const getOrderStatus = (order: Order) => {
  if (order.status === "cancelled") return { label: "Cancelado", color: "text-muted-foreground", bg: "bg-muted", icon: XCircle };
  if (order.status === "delivered") return { label: "Entregue", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/40", icon: CheckCircle2 };
  if (order.status === "separated") return { label: "Separado", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/40", icon: Package };
  if (order.receipt_url) return { label: "Pago", color: "text-green-700 dark:text-green-400", bg: "bg-green-100 dark:bg-green-900/40", icon: CircleDollarSign };
  return { label: "A pagar", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-900/40", icon: CircleDollarSign };
};

const ManageOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingCarts, setPendingCarts] = useState<PendingCart[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [sendingPush, setSendingPush] = useState<string | null>(null);

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

  const fetchPendingCarts = async () => {
    setPendingLoading(true);
    // Get all confirmed order user_ids so we can find users without recent orders
    // For "pending", we look at fcm_tokens (active users) cross-referenced with profiles
    // Since we don't have a carts table, we show all approved profiles minus those
    // who placed an order in the last 24h as a heuristic. We'll just show profiles
    // that have FCM tokens (active users) as potential pending cart holders.
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("approved", true);

    if (!profiles) { setPendingLoading(false); return; }

    // Users who placed an order in last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentOrders } = await supabase
      .from("orders")
      .select("user_id")
      .gte("created_at", sevenDaysAgo)
      .neq("status", "cancelled");

    const recentUserIds = new Set((recentOrders || []).map((o: any) => o.user_id));

    // For pending carts, show users who have NOT placed an order recently but have FCM tokens
    const { data: fcmTokens } = await supabase
      .from("fcm_tokens")
      .select("user_id");

    const activeFcmUsers = new Set((fcmTokens || []).map((t: any) => t.user_id));

    const pending = profiles
      .filter((p: any) => activeFcmUsers.has(p.id) && !recentUserIds.has(p.id))
      .map((p: any) => ({
        user_id: p.id,
        user_name: p.full_name,
        user_email: p.email,
        item_count: 0,
        total_estimate: 0,
      }));

    setPendingCarts(pending);
    setPendingLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    fetchPendingCarts();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus } as any)
      .eq("id", orderId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status atualizado!" });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }
  };

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
          "Comprovante": order.receipt_url ? "Sim" : "Não",
          "Entrega - Responsável": (order as any).delivery_recipient_name || "-",
          "Entrega - Local": (order as any).delivery_location || "-",
          "Entrega - Horário": (order as any).delivery_time || "-",
        });
      });
    });
    exportToExcel(rows, "Pedidos", `pedidos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Excel exportado!" });
  };

  const sendPushToUser = async (userId: string, userName: string) => {
    setSendingPush(userId);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) { setSendingPush(null); return; }

    const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/send-push-notification`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          title: "🛒 Você tem itens no carrinho!",
          body: "Finalize seu pedido na Loja Missionária antes que acabem os itens.",
          link: "/checkout",
          user_ids: [userId],
        }),
      });
      toast({ title: "Notificação enviada!", description: `Lembrete enviado para ${userName}.` });
    } catch {
      toast({ title: "Erro ao enviar notificação", variant: "destructive" });
    }
    setSendingPush(null);
  };

  const isCancelled = (order: Order) => order.status === "cancelled";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ShoppingCart size={18} /> Pedidos
        </h3>
        <Button onClick={handleExportExcel} disabled={orders.length === 0} variant="outline" size="sm" className="gap-1">
          <FileSpreadsheet size={14} /> Excel
        </Button>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="w-full grid grid-cols-2 mb-2">
          <TabsTrigger value="orders">Realizados</TabsTrigger>
          <TabsTrigger value="pending">Carrinhos Pendentes</TabsTrigger>
        </TabsList>

        {/* ── TAB: Confirmed Orders ── */}
        <TabsContent value="orders">
          {loading ? (
            <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
          ) : orders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">Nenhum pedido realizado.</p>
          ) : (
            <div className="space-y-2">
              {orders.map((order) => {
                const statusInfo = getOrderStatus(order);
                const StatusIcon = statusInfo.icon;
                const cancelled = isCancelled(order);
                const textClass = cancelled ? "text-muted-foreground/60" : "";

                return (
                  <div
                    key={order.id}
                    className={`bg-card rounded-xl shadow-card overflow-hidden ${cancelled ? "opacity-70" : ""}`}
                  >
                    {/* Card header */}
                    <button
                      onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
                      className="w-full flex items-start gap-3 p-3 text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-medium text-sm truncate ${cancelled ? "text-muted-foreground/60 line-through" : "text-foreground"}`}>
                            {order.user_name}
                          </p>
                          {/* Status tag */}
                          <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color}`}>
                            <StatusIcon size={10} />
                            {statusInfo.label}
                          </span>
                        </div>
                        <p className={`text-xs ${cancelled ? "text-muted-foreground/50" : "text-muted-foreground"}`}>{order.user_email}</p>
                        <p className={`text-[10px] ${cancelled ? "text-muted-foreground/40" : "text-muted-foreground/60"}`}>
                          {new Date(order.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-sm font-bold ${cancelled ? "text-muted-foreground/60 line-through" : "text-primary"}`}>
                          R$ {Number(order.total_price).toFixed(2)}
                        </span>
                        {expandedId === order.id ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {expandedId === order.id && (
                      <div className={`px-3 pb-4 space-y-3 border-t border-border pt-3 ${textClass}`}>

                        {/* Items */}
                        <div className="space-y-1">
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

                        {/* Observation */}
                        {order.observation && (
                          <p className="text-xs text-muted-foreground bg-muted p-2 rounded-lg">
                            📝 <strong>Obs:</strong> {order.observation}
                          </p>
                        )}

                        {/* Delivery details */}
                        {((order as any).delivery_recipient_name || (order as any).delivery_location) && (
                          <div className="text-xs bg-muted p-2 rounded-lg space-y-0.5">
                            <p className="font-semibold text-foreground flex items-center gap-1"><Truck size={11} /> Entrega</p>
                            {(order as any).delivery_recipient_name && (
                              <p className="text-muted-foreground">Responsável: {(order as any).delivery_recipient_name}</p>
                            )}
                            {(order as any).delivery_location && (
                              <p className="text-muted-foreground">Local: {(order as any).delivery_location}</p>
                            )}
                            {(order as any).delivery_time && (
                              <p className="text-muted-foreground">Horário: {(order as any).delivery_time}</p>
                            )}
                          </div>
                        )}

                        {/* Receipt link */}
                        {order.receipt_url && (
                          <a
                            href={order.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline"
                          >
                            <ExternalLink size={12} /> Ver comprovante
                          </a>
                        )}

                        {/* Action buttons */}
                        {!cancelled && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {order.status !== "paid" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "paid")}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                              >
                                <CircleDollarSign size={12} /> Marcar como pago
                              </button>
                            )}
                            {order.status !== "separated" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "separated")}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                <Package size={12} /> Marcar como separado
                              </button>
                            )}
                            {order.status !== "delivered" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "delivered")}
                                className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                              >
                                <CheckCircle2 size={12} /> Marcar como entregue
                              </button>
                            )}
                            <button
                              onClick={() => updateOrderStatus(order.id, "cancelled")}
                              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                            >
                              <XCircle size={12} /> Cancelar pedido
                            </button>
                          </div>
                        )}

                        {cancelled && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "confirmed")}
                            className="text-xs text-muted-foreground hover:text-foreground underline"
                          >
                            Desfazer cancelamento
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB: Pending Carts ── */}
        <TabsContent value="pending">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-snug">
              Usuários ativos (com notificações habilitadas) que não fizeram pedidos nos últimos 7 dias. Envie um lembrete de carrinho pendente.
            </p>

            {pendingLoading ? (
              <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
            ) : pendingCarts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum usuário com carrinho pendente identificado.</p>
            ) : (
              <div className="space-y-2">
                {pendingCarts.map((cart) => (
                  <div key={cart.user_id} className="flex items-center gap-3 p-3 bg-card rounded-xl shadow-card">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate">{cart.user_name}</p>
                      <p className="text-xs text-muted-foreground">{cart.user_email}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sendingPush === cart.user_id}
                      onClick={() => sendPushToUser(cart.user_id, cart.user_name)}
                      className="gap-1.5 shrink-0 text-xs"
                    >
                      <Bell size={13} />
                      {sendingPush === cart.user_id ? "Enviando..." : "Notificar"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageOrders;
