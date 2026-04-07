import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Upload, Check, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Acompanhante {
  nome: string;
  idade: string;
}

interface MissionPaymentScreenProps {
  missionTitle: string;
  valor: number;
  pixKey: string | null;
  pixQrUrl: string | null;
  idadeGratuito: number;
  idadeMeia: number;
  whatsappResponsavel: string | null;
  acompanhantes: Acompanhante[];
  nomeTitular: string;
  inscricaoId: string;
  isEditing: boolean;
  onClose: () => void;
}

const MissionPaymentScreen = ({
  missionTitle,
  valor,
  pixKey,
  pixQrUrl,
  idadeGratuito,
  idadeMeia,
  whatsappResponsavel,
  acompanhantes,
  nomeTitular,
  inscricaoId,
  isEditing,
  onClose,
}: MissionPaymentScreenProps) => {
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [comprovanteUrl, setComprovanteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showKitDialog, setShowKitDialog] = useState(false);

  const calculateTotal = () => {
    let total = valor;
    for (const a of acompanhantes) {
      const age = parseInt(a.idade);
      if (isNaN(age)) {
        total += valor;
      } else if (idadeGratuito > 0 && age <= idadeGratuito) {
        // free
      } else if (idadeMeia > 0 && age <= idadeMeia) {
        total += valor / 2;
      } else {
        total += valor;
      }
    }
    return total;
  };

  const totalValue = calculateTotal();

  const handleCopyPix = async () => {
    if (!pixKey) return;
    try {
      await navigator.clipboard.writeText(pixKey);
      setCopied(true);
      toast.success("Chave PIX copiada!");
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error("Não foi possível copiar.");
    }
  };

  const handleUploadReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande (máx 5MB).");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `mission-receipts/${inscricaoId}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("payment_receipts").upload(path, file, { upsert: true });
    if (uploadErr) {
      toast.error("Erro ao enviar comprovante.");
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("payment_receipts").getPublicUrl(path);
    const publicUrl = urlData.publicUrl;
    setComprovanteUrl(publicUrl);

    await supabase.from("missao_inscricoes").update({
      comprovante_url: publicUrl,
      valor_total: totalValue,
      pago: true,
    } as any).eq("id", inscricaoId);

    toast.success("Comprovante enviado! ✅");
    setUploading(false);
  };

  const buildPriceBreakdown = () => {
    const lines: string[] = [`  • ${nomeTitular}: R$ ${valor.toFixed(2)} (inteira)`];
    for (const a of acompanhantes) {
      const age = parseInt(a.idade);
      if (isNaN(age)) {
        lines.push(`  • ${a.nome}: R$ ${valor.toFixed(2)} (inteira)`);
      } else if (idadeGratuito > 0 && age <= idadeGratuito) {
        lines.push(`  • ${a.nome} (${a.idade} anos): Gratuito`);
      } else if (idadeMeia > 0 && age <= idadeMeia) {
        lines.push(`  • ${a.nome} (${a.idade} anos): R$ ${(valor / 2).toFixed(2)} (meia)`);
      } else {
        lines.push(`  • ${a.nome} (${a.idade} anos): R$ ${valor.toFixed(2)} (inteira)`);
      }
    }
    return lines.join("\n");
  };

  const handleConfirm = () => {
    if (whatsappResponsavel) {
      const phone = whatsappResponsavel.replace(/\D/g, "");
      const priceBreakdown = buildPriceBreakdown();
      const msg = encodeURIComponent(
        `Olá! Segue meu comprovante de pagamento da missão *${missionTitle}*.\n\n` +
        `👤 Titular: ${nomeTitular}\n` +
        `${priceBreakdown}\n` +
        `💰 *Total: R$ ${totalValue.toFixed(2)}*\n` +
        (comprovanteUrl ? `\n📎 Comprovante: ${comprovanteUrl}` : "")
      );
      window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    }
    toast.success("Inscrição confirmada! ✅");
    setShowKitDialog(true);
  };

  return (
    <div className="space-y-4 py-2">
      <div className="text-center">
        <p className="text-3xl">💳</p>
        <h3 className="text-lg font-bold text-foreground mt-1">
          {isEditing ? "Pagamento" : "Pagamento da Inscrição"}
        </h3>
        <p className="text-sm text-muted-foreground">{missionTitle}</p>
      </div>

      {/* Price breakdown */}
      <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
        <p className="font-semibold text-foreground">Resumo:</p>
        <div className="flex justify-between">
          <span>{nomeTitular}</span>
          <span className="font-medium">R$ {valor.toFixed(2)}</span>
        </div>
        {acompanhantes.map((a, i) => {
          const age = parseInt(a.idade);
          let price = valor;
          let label = "inteira";
          if (!isNaN(age) && idadeGratuito > 0 && age <= idadeGratuito) {
            price = 0; label = "gratuito";
          } else if (!isNaN(age) && idadeMeia > 0 && age <= idadeMeia) {
            price = valor / 2; label = "meia";
          }
          return (
            <div key={i} className="flex justify-between text-muted-foreground">
              <span>{a.nome || `Acomp. ${i + 1}`} {a.idade ? `(${a.idade}a)` : ""}</span>
              <span className={price === 0 ? "text-green-600 font-medium" : ""}>
                {price === 0 ? "Grátis" : `R$ ${price.toFixed(2)}`} <span className="text-xs">({label})</span>
              </span>
            </div>
          );
        })}
        <div className="border-t pt-1 mt-1 flex justify-between font-bold text-foreground">
          <span>Total</span>
          <span className="text-primary">R$ {totalValue.toFixed(2)}</span>
        </div>
        {idadeGratuito > 0 && (
          <p className="text-xs text-muted-foreground">* Até {idadeGratuito} anos: gratuito</p>
        )}
        {idadeMeia > 0 && (
          <p className="text-xs text-muted-foreground">* Até {idadeMeia} anos: meia entrada</p>
        )}
      </div>

      {/* PIX QR Code */}
      {pixQrUrl && (
        <div className="text-center">
          <p className="text-sm font-medium mb-2">QR Code PIX:</p>
          <img src={pixQrUrl} alt="QR Code PIX" className="mx-auto max-w-[200px] rounded-lg border" />
        </div>
      )}

      {/* PIX Key copy */}
      {pixKey && (
        <div className="space-y-1">
          <Label className="text-sm">Chave PIX:</Label>
          <div className="flex gap-2">
            <Input value={pixKey} readOnly className="text-sm bg-muted/30" />
            <Button size="icon" variant="outline" onClick={handleCopyPix} title="Copiar">
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </Button>
          </div>
        </div>
      )}

      {/* Upload receipt */}
      <div className="space-y-1">
        <Label className="text-sm">📎 Enviar comprovante de pagamento:</Label>
        <Input
          type="file"
          accept="image/*,.pdf"
          onChange={handleUploadReceipt}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <p className="text-xs text-muted-foreground">Enviando...</p>}
        {comprovanteUrl && <p className="text-xs text-green-600 font-medium">✅ Comprovante enviado!</p>}
      </div>

      {/* Confirm button */}
      <Button className="w-full" variant="default" onClick={handleConfirm}>
        <Check size={16} className="mr-2" /> Confirmar Inscrição
      </Button>

      <Button className="w-full" variant="outline" onClick={onClose}>
        Fechar
      </Button>

      {/* Kit dialog */}
      <Dialog open={showKitDialog} onOpenChange={setShowKitDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>🎒 Kit Missionário</DialogTitle>
            <DialogDescription>
              Deseja comprar o kit missionário para esta missão?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-2">
            <Button onClick={() => { setShowKitDialog(false); navigate("/loja"); onClose(); }}>
              <ShoppingBag size={16} className="mr-2" /> Ir para a Loja
            </Button>
            <Button variant="outline" onClick={() => { setShowKitDialog(false); onClose(); }}>
              Não, obrigado
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MissionPaymentScreen;
