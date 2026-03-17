/* eslint-disable @typescript-eslint/no-explicit-any */
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
  product_id: string;
  configuration: any;
}

interface Order {
  id: string;
  user_name: string;
  user_email: string;
  user_id: string;
  observation: string | null;
  total_price: number;
  status: string; // Used for Logistics
  payment_status: string; // Used for Payment
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
  items?: any[];
}

/** Derive display statuses for an order */
const getOrderStatuses = (order: Order) => {
  const logistics = {
    cancelled: { label: "Cancelado", color: "text-muted-foreground", bg: "bg-muted", icon: XCircle },
    delivered: { label: "Entregue", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/40", icon: CheckCircle2 },
    separated: { label: "Separado", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/40", icon: Package },
    to_separate: { label: "A separar", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/40", icon: Package },
  };

  const payment = {
    paid: { label: "Pago", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-900/40", icon: CircleDollarSign },
    pending: { label: "A pagar", color: "text-orange-700 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/40", icon: CircleDollarSign },
  };

  const logKey = (order.status in logistics) ? order.status as keyof typeof logistics : "to_separate";
  const payKey = (order.payment_status === "paid" || order.receipt_url) ? "paid" : "pending";

  return {
    logistics: logistics[logKey],
    payment: payment[payKey],
  };
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

    // Fetch all cart items
    const { data: cartData, error: cartError } = await (supabase
      .from("cart_items" as any)
      .select("*") as any);

    if (cartError) {
      toast({ title: "Erro ao buscar carrinhos", variant: "destructive" });
      setPendingLoading(false);
      return;
    }

    if (!cartData || cartData.length === 0) {
      setPendingCarts([]);
      setPendingLoading(false);
      return;
    }

    // Group items by user
    const userIds = Array.from(new Set(cartData.map((d: any) => d.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .in("id", userIds as any[]);

    const pending = (profiles || []).map((p: any) => {
      const userItems = cartData.filter((d: any) => d.user_id === p.id);
      return {
        user_id: p.id,
        user_name: p.full_name,
        user_email: p.email,
        item_count: userItems.reduce((s: number, i: any) => s + i.quantity, 0),
        total_estimate: userItems.reduce((s: number, i: any) => s + (Number(i.price) * i.quantity), 0),
        items: userItems.map((i: any) => ({
          id: i.id,
          product_name: i.product_name,
          category: i.category,
          price: Number(i.price),
          quantity: i.quantity,
          selected_size: i.selected_size,
          selected_color: i.selected_color,
        })),
      };
    });

    setPendingCarts(pending as any);
    setPendingLoading(false);
  };

  useEffect(() => {
    fetchOrders();
    fetchPendingCarts();
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    // Get current order and its items
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus } as any)
      .eq("id", orderId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    // Logic for stock deduction when becoming "Separado"
    if (newStatus === "separated") {
      const items = order.items || [];
      for (const item of items) {
        if (item.configuration) {
          // It's a kit! Deduct stock for each component
          const { data: components } = await supabase
            .from("kit_components" as any)
            .select("*")
            .eq("kit_id", item.product_id);
          
          if (components) {
            for (const comp of (components as any[])) {
              // Iterate through each instance of the component in the kit
              for (let i = 0; i < comp.quantity; i++) {
                const key = `${comp.component_product_id}_${i}`;
                const spec = item.configuration[key];
                
                await supabase.rpc("decrease_stock", {
                  p_product_id: comp.component_product_id,
                  p_size: spec?.size || null,
                  p_color: spec?.color || null,
                  p_quantity: item.quantity // Deduct based on total number of kits ordered
                });
              }
            }
          }
        } else {
          // Simple product
          await supabase.rpc("decrease_stock", {
            p_product_id: item.product_id,
            p_size: item.selected_size,
            p_color: item.selected_color,
            p_quantity: item.quantity
          });
        }
      }
      toast({ title: "Estoque atualizado e pedido marcado como separado!" });
    } else {
      toast({ title: "Status de logística atualizado!" });
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  const updatePaymentStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: newStatus } as any)
      .eq("id", orderId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Status de pagamento atualizado!" });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, payment_status: newStatus } : o))
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
          "Logística": order.status,
          "Pagamento": order.payment_status,
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
                const statuses = getOrderStatuses(order);
                const LogIcon = statuses.logistics.icon;
                const PayIcon = statuses.payment.icon;
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
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className={`font-medium text-sm truncate ${cancelled ? "text-muted-foreground/60 line-through" : "text-foreground"}`}>
                            {order.user_name}
                          </p>
                          <div className="flex gap-1.5 flex-wrap">
                            {/* Logistics tag */}
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${statuses.logistics.bg} ${statuses.logistics.color}`}>
                              <LogIcon size={9} />
                              {statuses.logistics.label}
                            </span>
                            {/* Payment tag */}
                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${statuses.payment.bg} ${statuses.payment.color}`}>
                              <PayIcon size={9} />
                              {statuses.payment.label}
                            </span>
                          </div>
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
                            {/* Payment action toggles */}
                            {(order.payment_status === "paid" || order.receipt_url) ? (
                              <button
                                onClick={() => updatePaymentStatus(order.id, "pending")}
                                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                              >
                                <CircleDollarSign size={12} /> Marcar como A PAGAR
                              </button>
                            ) : (
                              <button
                                onClick={() => updatePaymentStatus(order.id, "paid")}
                                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                              >
                                <CircleDollarSign size={12} /> Marcar como PAGO
                              </button>
                            )}

                            {/* Logistics action toggles */}
                            {order.status !== "to_separate" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "to_separate")}
                                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 font-bold hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
                              >
                                <Package size={12} /> Marcar como A SEPARAR
                              </button>
                            )}

                            {order.status !== "separated" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "separated")}
                                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-bold hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                              >
                                <Package size={12} /> Marcar como SEPARADO
                              </button>
                            )}

                            {order.status !== "delivered" && (
                              <button
                                onClick={() => updateOrderStatus(order.id, "delivered")}
                                className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                              >
                                <CheckCircle2 size={12} /> Marcar como ENTREGUE
                              </button>
                            )}

                            <button
                              onClick={() => updateOrderStatus(order.id, "cancelled")}
                              className="flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-950/40 transition-colors"
                            >
                              <XCircle size={12} /> Cancelar pedido
                            </button>
                          </div>
                        )}

                        {cancelled && (
                          <button
                            onClick={() => updateOrderStatus(order.id, "to_separate")}
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

        <TabsContent value="pending">
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-snug">
              Usuários com itens no carrinho que ainda não finalizaram o pedido.
            </p>

            {pendingLoading ? (
              <p className="text-muted-foreground text-sm text-center py-4">Carregando...</p>
            ) : pendingCarts.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhum usuário com carrinho pendente identificado.</p>
            ) : (
              <div className="space-y-2">
                {pendingCarts.map((cart) => {
                  const isExpanded = expandedId === `cart_${cart.user_id}`;
                  return (
                    <div key={cart.user_id} className="bg-card rounded-xl shadow-card overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : `cart_${cart.user_id}`)}
                        className="w-full flex items-center gap-3 p-3 text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">{cart.user_name}</p>
                          <p className="text-xs text-muted-foreground">{cart.user_email}</p>
                          <p className="text-[10px] text-primary font-semibold mt-0.5">
                            {cart.item_count} item(s) — Total Est.: R$ {Number(cart.total_estimate).toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sendingPush === cart.user_id}
                            onClick={(e) => {
                              e.stopPropagation();
                              sendPushToUser(cart.user_id, cart.user_name);
                            }}
                            className="gap-1.5 h-8 text-xs px-2"
                          >
                            <Bell size={13} />
                            {sendingPush === cart.user_id ? "..." : "Notificar"}
                          </Button>
                          {isExpanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="px-3 pb-4 space-y-3 border-t border-border pt-3">
                          <div className="space-y-1">
                            {((cart as any).items || []).map((item: any) => (
                              <div key={item.id} className="flex items-center gap-2 text-xs">
                                <span className="font-medium text-foreground">{item.quantity}x</span>
                                <span className="flex-1 text-foreground truncate">{item.product_name}</span>
                                {item.selected_size && <span className="text-muted-foreground">Tam: {item.selected_size}</span>}
                                {item.selected_color && <span className="text-muted-foreground">Cor: {item.selected_color}</span>}
                                <span className="font-medium text-primary">R$ {(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManageOrders;
