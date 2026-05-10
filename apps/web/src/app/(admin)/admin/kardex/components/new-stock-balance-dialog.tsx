"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { AlertCircle, Loader2, Save, ScanBarcode, CheckCircle2, X } from "lucide-react";
import { useCreateStockBalance, useUpdateStockBalanceDraft, useCompleteStockBalance } from "@/hooks/use-stock-balances";
import { useProducts } from "@/hooks/use-products";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { StockBalance } from "@kwinna/contracts";

interface ScannedItem {
  productId: string;
  size?: string;
  countedQuantity: number;
}

export function NewStockBalanceDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [balance, setBalance] = useState<StockBalance | null>(null);
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [scanInput, setScanInput] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { products } = useProducts();
  const createBalance = useCreateStockBalance();
  const updateDraft = useUpdateStockBalanceDraft();
  const completeBalance = useCompleteStockBalance();

  // Iniciar balance al abrir el modal si no hay uno
  useEffect(() => {
    if (open && !balance && !createBalance.isPending) {
      createBalance.mutate(undefined, {
        onSuccess: (newBalance) => {
          setBalance(newBalance);
          toast.success("Balance de stock iniciado (Borrador)");
        },
        onError: () => {
          toast.error("Error al iniciar balance");
          onOpenChange(false);
        }
      });
    }
    
    if (!open) {
      setBalance(null);
      setItems([]);
      setScanInput("");
      setIsReviewing(false);
    }
  }, [open]);

  // Mantener focus en el input para escaneo láser
  useEffect(() => {
    if (open && !isReviewing) {
      const interval = setInterval(() => {
        if (document.activeElement !== inputRef.current && !isReviewing) {
          inputRef.current?.focus();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [open, isReviewing]);

  // Autoguardado cada 10 items scaneados (simplificado) o podemos hacerlo manual
  const handleSaveDraft = () => {
    if (balance) {
      updateDraft.mutate({ id: balance.id, items }, {
        onSuccess: () => toast.success("Borrador guardado correctamente")
      });
    }
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;

    // Asumimos que el scanner pasa SKU. Si hay talles, el SKU suele incluir variante.
    // Buscamos el producto por SKU. 
    // NOTA: Para Kwinna, asumo que SKU es único por producto, y si hay talles, 
    // el sistema actual de scanner en POS quizás use autoTags o seleccione talle.
    // Para simplificar, asumimos que se busca por SKU. Si hay varios talles, tomamos el default o vacio.
    const product = products.find(p => p.sku === scanInput.trim() || p.id === scanInput.trim());

    if (!product) {
      toast.error(`Producto no encontrado para: ${scanInput}`);
      setScanInput("");
      return;
    }

    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id && i.size === "");
      if (existing) {
        return prev.map(i => i === existing ? { ...i, countedQuantity: i.countedQuantity + 1 } : i);
      }
      return [{ productId: product.id, size: "", countedQuantity: 1 }, ...prev];
    });

    setScanInput("");
  };

  const incrementQty = (productId: string, size: string = "") => {
    setItems(prev => prev.map(i => (i.productId === productId && i.size === size) ? { ...i, countedQuantity: i.countedQuantity + 1 } : i));
  };

  const decrementQty = (productId: string, size: string = "") => {
    setItems(prev => prev.map(i => (i.productId === productId && i.size === size) ? { ...i, countedQuantity: Math.max(0, i.countedQuantity - 1) } : i).filter(i => i.countedQuantity > 0));
  };

  const handleComplete = () => {
    if (!balance) return;
    
    completeBalance.mutate({ id: balance.id, items }, {
      onSuccess: () => {
        toast.success("Balance de stock completado");
        onOpenChange(false);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Error al completar balance")
    });
  };

  if (!balance) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(val) => {
      // Prevent closing if not reviewing to avoid accidental loss
      if (!val && items.length > 0 && !isReviewing) {
        if (!confirm("Tienes un balance en curso. ¿Seguro que quieres cerrar? (Quedará como borrador)")) return;
      }
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ScanBarcode className="h-5 w-5" />
            Balance de Stock #{balance.id.split('-')[0]}
            <Badge variant="outline" className="ml-2 bg-yellow-500/10 text-yellow-600">En progreso</Badge>
          </DialogTitle>
          <DialogDescription>
            {isReviewing ? "Revisa las cantidades antes de finalizar y procesar ajustes." : "Modo Ciego: Escanea o ingresa manualmente los productos. Lo que no se cuente será ajustado a 0."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 bg-muted/10">
          {!isReviewing && (
            <form onSubmit={handleScan} className="flex gap-2 mb-6">
              <Input
                ref={inputRef}
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Escanea el SKU con el lector láser..."
                className="font-mono text-lg py-6"
                autoFocus
              />
              <Button type="submit" className="py-6 px-8">Contar</Button>
            </form>
          )}

          <div className="rounded-md border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Talle</TableHead>
                  <TableHead className="text-center">Cant. Contada</TableHead>
                  {!isReviewing && <TableHead className="text-right">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-32">
                      No hay productos escaneados aún.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map(item => {
                    const p = products.find(x => x.id === item.productId);
                    return (
                      <TableRow key={`${item.productId}-${item.size}`}>
                        <TableCell>
                          <div className="font-medium">{p?.name || 'Producto Desconocido'}</div>
                          <div className="text-xs text-muted-foreground font-mono">{p?.sku}</div>
                        </TableCell>
                        <TableCell>
                          {item.size ? <Badge variant="secondary">{item.size}</Badge> : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-lg font-bold">{item.countedQuantity}</span>
                        </TableCell>
                        {!isReviewing && (
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => decrementQty(item.productId, item.size)}>-</Button>
                              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => incrementQty(item.productId, item.size)}>+</Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter className="p-6 border-t bg-background flex flex-row items-center justify-between sm:justify-between">
          {!isReviewing ? (
            <>
              <div className="text-sm text-muted-foreground">
                <span className="font-bold">{items.length}</span> referencias contadas
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleSaveDraft} disabled={updateDraft.isPending}>
                  {updateDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar Borrador
                </Button>
                <Button onClick={() => setIsReviewing(true)}>
                  Continuar a Revisión
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsReviewing(false)}>
                Volver al conteo
              </Button>
              <div className="flex items-center gap-4">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Al finalizar, el stock se sobreescribirá.
                </p>
                <Button onClick={handleComplete} disabled={completeBalance.isPending} className="bg-green-600 hover:bg-green-700">
                  {completeBalance.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Procesar Balance
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
