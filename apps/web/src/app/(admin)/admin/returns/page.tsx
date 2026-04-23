"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  PackageX,
  Plus,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import {
  RETURN_REASON_LABELS,
  RETURN_REASON_RESALABLE,
  ReturnCreateInputSchema,
  type ReturnReason,
} from "@kwinna/contracts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useCreateReturn, useReturns } from "@/hooks/use-returns";
import { useProducts } from "@/hooks/use-products";
import { cn } from "@/lib/utils";

// ─── Form schema ──────────────────────────────────────────────────────────────

const FormSchema = ReturnCreateInputSchema.extend({
  quantity: z.coerce.number().int().min(1, "Mínimo 1"),
  // Sobreescribir restock sin .default() — react-hook-form infiere el tipo de
  // entrada (boolean | undefined) y choca con el output type (boolean).
  // El valor inicial lo maneja defaultValues en useForm.
  restock: z.boolean(),
});
type FormValues = z.infer<typeof FormSchema>;

// ─── Reason Badge ─────────────────────────────────────────────────────────────

function ReasonBadge({ reason }: { reason: ReturnReason }) {
  const color: Record<ReturnReason, string> = {
    quality:         "border-red-400 text-red-600",
    detail:          "border-orange-400 text-orange-600",
    color:           "border-violet-400 text-violet-600",
    size:            "border-sky-400 text-sky-600",
    not_as_expected: "border-muted-foreground text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={color[reason]}>
      {RETURN_REASON_LABELS[reason]}
    </Badge>
  );
}

// ─── Register Dialog ──────────────────────────────────────────────────────────

function RegisterReturnDialog({
  open,
  onClose,
}: {
  open:    boolean;
  onClose: () => void;
}) {
  const { products } = useProducts();
  const { mutateAsync, isPending } = useCreateReturn();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      productId: "",
      size:      "",
      quantity:  1,
      reason:    undefined,
      restock:   false,
      saleId:    undefined,
      notes:     "",
    },
  });

  const selectedReason = form.watch("reason");
  const restock        = form.watch("restock");

  // When the reason changes, update the restock toggle to the smart default
  function handleReasonChange(value: ReturnReason) {
    form.setValue("reason", value);
    form.setValue("restock", RETURN_REASON_RESALABLE[value]);
  }

  function handleClose() {
    form.reset();
    onClose();
  }

  async function onSubmit(values: FormValues) {
    try {
      const result = await mutateAsync({
        ...values,
        size:   values.size   || undefined,
        saleId: values.saleId || undefined,
        notes:  values.notes  || undefined,
      });

      const action = result.restocked ? "repuesta al stock" : "registrada como pérdida";
      toast.success("Devolución registrada", {
        description: `Prenda ${action}`,
      });
      handleClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      if (message === "tiempo de cambio expirado") {
        toast.error("Tiempo de cambio expirado", {
          description: "La transacción tiene más de 30 días. No se puede procesar el cambio.",
        });
      } else {
        toast.error("Error al registrar la devolución");
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Registrar devolución
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

            {/* Producto */}
            <FormField
              control={form.control}
              name="productId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Producto <span className="text-destructive">*</span></FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná un producto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {/* Talle */}
              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Talle{" "}
                      <span className="text-[11px] font-normal text-muted-foreground">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="XS / S / M…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Cantidad */}
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Motivo */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo <span className="text-destructive">*</span></FormLabel>
                  <Select
                    onValueChange={(v) => handleReasonChange(v as ReturnReason)}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccioná un motivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(Object.entries(RETURN_REASON_LABELS) as [ReturnReason, string][]).map(
                        ([value, label]) => (
                          <SelectItem key={value} value={value}>
                            <span className="flex items-center gap-2">
                              {label}
                              {!RETURN_REASON_RESALABLE[value] && (
                                <span className="text-[10px] text-destructive/70">(daño)</span>
                              )}
                            </span>
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Restock toggle — solo visible cuando hay un motivo seleccionado */}
            {selectedReason && (
              <FormField
                control={form.control}
                name="restock"
                render={({ field }) => (
                  <FormItem className={cn(
                    "flex items-center justify-between rounded-lg border p-3 transition-colors",
                    restock
                      ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30"
                      : "border-destructive/30 bg-destructive/5",
                  )}>
                    <div className="space-y-0.5">
                      <FormLabel className="text-sm font-medium">
                        {restock ? "Reponer al inventario" : "Registrar como pérdida"}
                      </FormLabel>
                      <FormDescription className="text-[11px]">
                        {restock
                          ? "La prenda vuelve al stock y se puede volver a vender."
                          : "La prenda está dañada o no es apta para la venta. Se registrará la pérdida económica."}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            {/* N° de transacción (opcional) */}
            <FormField
              control={form.control}
              name="saleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    N° de transacción{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="ID de la venta original"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    Si la transacción tiene más de 30 días no se podrá procesar el cambio.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notas */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notas{" "}
                    <span className="text-[11px] font-normal text-muted-foreground">(opcional)</span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Estado de la prenda, descripción del problema…"
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Registrando…" : "Registrar"}
              </Button>
            </div>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReturnsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { returns, isLoading, isError, refetch } = useReturns();
  const { products } = useProducts();

  const productName = Object.fromEntries(products.map((p) => [p.id, p.name]));

  const sorted = [...returns].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const totalUnits  = returns.reduce((s, r) => s + r.quantity, 0);
  const lostUnits   = returns.filter((r) => !r.restocked).reduce((s, r) => s + r.quantity, 0);
  const lostValue   = returns.filter((r) => !r.restocked).reduce((s, r) => s + r.quantity * r.unitPrice, 0);

  const topReason = (
    Object.entries(
      returns.reduce<Record<string, number>>((acc, r) => {
        acc[r.reason] = (acc[r.reason] ?? 0) + r.quantity;
        return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1])[0]?.[0]
  ) as ReturnReason | undefined;

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
              <RotateCcw className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Devoluciones</h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Cargando…"
                  : `${returns.length} devoluciones · ${totalUnits} unidades · ${lostUnits} pérdidas`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Actualizar
            </Button>
            <Button size="sm" className="gap-2" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Registrar devolución
            </Button>
          </div>
        </div>

        {/* ── Summary chips ── */}
        {!isLoading && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.entries(
              returns.reduce<Record<string, number>>((acc, r) => {
                acc[r.reason] = (acc[r.reason] ?? 0) + r.quantity;
                return acc;
              }, {})
            ) as [ReturnReason, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([reason, count]) => (
                <Card key={reason} className="px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {RETURN_REASON_LABELS[reason]}
                  </p>
                  <p className="mt-0.5 text-xl font-bold tabular-nums text-foreground">{count}</p>
                </Card>
              ))}
          </div>
        )}

        {/* ── Loss summary ── */}
        {!isLoading && lostUnits > 0 && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="flex flex-wrap items-center gap-6 pt-4 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive/70">
                  Pérdida económica total
                </p>
                <p className="text-2xl font-bold tabular-nums text-destructive">
                  ${lostValue.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-destructive/70">
                  Prendas no recuperadas
                </p>
                <p className="text-2xl font-bold tabular-nums text-destructive">{lostUnits}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Error ── */}
        {isError && (
          <Card className="border-destructive/30 bg-destructive/10">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">No se pudieron cargar las devoluciones.</p>
            </CardContent>
          </Card>
        )}

        {/* ── Table ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Historial de Devoluciones</CardTitle>
            <CardDescription>
              {topReason
                ? `Motivo más frecuente: ${RETURN_REASON_LABELS[topReason]}`
                : "Sin devoluciones registradas"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Fecha</TableHead>
                  <TableHead>Producto</TableHead>
                  <TableHead>Talle</TableHead>
                  <TableHead className="text-center">Cant.</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="pr-6 text-right">Valor perdido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {[1, 2, 3, 4, 5, 6, 7].map((j) => (
                        <TableCell key={j}>
                          <div className="h-4 animate-pulse rounded bg-muted" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <PackageX className="h-8 w-8 text-muted-foreground/20" />
                        <p className="text-sm text-muted-foreground">Sin devoluciones registradas</p>
                        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
                          Registrar la primera
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="pl-6 whitespace-nowrap text-sm text-muted-foreground">
                        {new Date(ret.createdAt).toLocaleDateString("es-AR", {
                          day: "2-digit", month: "short", year: "numeric",
                        })}
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        {productName[ret.productId] ?? ret.productId.slice(0, 8) + "…"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {ret.size ?? <span className="text-muted-foreground/40">—</span>}
                      </TableCell>
                      <TableCell className="text-center text-sm tabular-nums">
                        {ret.quantity}
                      </TableCell>
                      <TableCell>
                        <ReasonBadge reason={ret.reason} />
                      </TableCell>
                      <TableCell className="text-center">
                        {ret.restocked ? (
                          <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 text-[10px]">
                            Repuesto
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">
                            Pérdida
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right tabular-nums text-sm">
                        {ret.restocked ? (
                          <span className="text-muted-foreground/40">—</span>
                        ) : (
                          <span className="font-medium text-destructive">
                            ${(ret.quantity * ret.unitPrice).toLocaleString("es-AR", {
                              maximumFractionDigits: 0,
                            })}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      <RegisterReturnDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </main>
  );
}
