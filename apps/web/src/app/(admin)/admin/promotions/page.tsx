"use client";

import { useState } from "react";
import { Tag, Plus, Pencil, Loader2, TicketPercent, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { PromoCode, PromoCodeCreateInput, DiscountType, ShippingZone } from "@kwinna/contracts";
import { PromoCodeCreateInputSchema } from "@kwinna/contracts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePromoCodes, useCreatePromoCode, useUpdatePromoCode, useDeletePromoCode } from "@/hooks/use-promo-codes";
import { useShippingZones, useCreateShippingZone, useUpdateShippingZone, useDeleteShippingZone } from "@/hooks/use-shipping-zones";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDiscount(type: DiscountType | null | undefined, value: number | null | undefined): string {
  if (!type || value == null) return "—";
  return type === "percentage" ? `${value}%` : `$${value.toLocaleString("es-AR")}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `${date} ${time}`;
}

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  code:                 string;
  description:          string;
  transferEnabled:      boolean;
  transferDiscountType: DiscountType;
  transferDiscountValue:string;
  cardEnabled:          boolean;
  cardDiscountType:     DiscountType;
  cardDiscountValue:    string;
  isActive:             boolean;
  validUntil:           string;
  maxUses:              string;
}

const EMPTY_FORM: FormState = {
  code:                  "",
  description:           "",
  transferEnabled:       true,
  transferDiscountType:  "percentage",
  transferDiscountValue: "",
  cardEnabled:           false,
  cardDiscountType:      "percentage",
  cardDiscountValue:     "",
  isActive:              true,
  validUntil:            "",
  maxUses:               "",
};

function promoToForm(p: PromoCode): FormState {
  return {
    code:                  p.code,
    description:           p.description ?? "",
    transferEnabled:       !!(p.transferDiscountType && p.transferDiscountValue != null),
    transferDiscountType:  p.transferDiscountType  ?? "percentage",
    transferDiscountValue: p.transferDiscountValue != null ? String(p.transferDiscountValue) : "",
    cardEnabled:           !!(p.cardDiscountType && p.cardDiscountValue != null),
    cardDiscountType:      p.cardDiscountType  ?? "percentage",
    cardDiscountValue:     p.cardDiscountValue != null ? String(p.cardDiscountValue) : "",
    isActive:              p.isActive,
    validUntil:            p.validUntil ? toDatetimeLocal(p.validUntil) : "",
    maxUses:               p.maxUses != null ? String(p.maxUses) : "",
  };
}

function formToPayload(f: FormState): PromoCodeCreateInput {
  return {
    code:                  f.code.toUpperCase(),
    description:           f.description || undefined,
    transferDiscountType:  f.transferEnabled ? f.transferDiscountType : undefined,
    transferDiscountValue: f.transferEnabled && f.transferDiscountValue ? Number(f.transferDiscountValue) : undefined,
    cardDiscountType:      f.cardEnabled ? f.cardDiscountType : undefined,
    cardDiscountValue:     f.cardEnabled && f.cardDiscountValue ? Number(f.cardDiscountValue) : undefined,
    isActive:              f.isActive,
    validUntil:            f.validUntil ? new Date(f.validUntil).toISOString() : undefined,
    maxUses:               f.maxUses ? Number(f.maxUses) : undefined,
  };
}

// ─── Discount section ─────────────────────────────────────────────────────────

function DiscountSection({
  label,
  enabled,
  onToggle,
  type,
  onType,
  value,
  onValue,
  error,
}: {
  label:    string;
  enabled:  boolean;
  onToggle: (v: boolean) => void;
  type:     DiscountType;
  onType:   (v: DiscountType) => void;
  value:    string;
  onValue:  (v: string) => void;
  error?:   string;
}) {
  return (
    <div className={cn("rounded-none border p-4 space-y-3 transition-colors", enabled ? "border-foreground/30" : "border-border/40 opacity-60")}>
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold tracking-wider uppercase">{label}</Label>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">Tipo</Label>
            <Select value={type} onValueChange={(v) => onType(v as DiscountType)}>
              <SelectTrigger className="rounded-none h-9 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                <SelectItem value="fixed">Monto fijo ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground">
              {type === "percentage" ? "% de descuento" : "Monto ($)"}
            </Label>
            <Input
              type="number"
              min={1}
              max={type === "percentage" ? 100 : undefined}
              step={type === "percentage" ? 1 : 100}
              value={value}
              onChange={(e) => onValue(e.target.value)}
              placeholder={type === "percentage" ? "ej: 10" : "ej: 5000"}
              className="rounded-none h-9 text-xs"
            />
            {error && <p className="text-[11px] text-destructive">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PromotionsPage() {
  const { data: codes = [], isLoading } = usePromoCodes();
  const createMutation = useCreatePromoCode();
  const updateMutation = useUpdatePromoCode();
  const deleteMutation = useDeletePromoCode();

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [editingPromo,  setEditingPromo]  = useState<PromoCode | null>(null);
  const [form,          setForm]          = useState<FormState>(EMPTY_FORM);
  const [errors,        setErrors]        = useState<Partial<Record<keyof FormState, string>>>({});

  // ─── Shipping zones ──────────────────────────────────────────────────────────
  const { data: zones = [], isLoading: zonesLoading } = useShippingZones();
  const createZone = useCreateShippingZone();
  const updateZone = useUpdateShippingZone();
  const deleteZone = useDeleteShippingZone();

  const [zoneDialogOpen,  setZoneDialogOpen]  = useState(false);
  const [editingZone,     setEditingZone]     = useState<ShippingZone | null>(null);
  const [zoneName,        setZoneName]        = useState("");
  const [zoneCost,        setZoneCost]        = useState("");
  const [zoneErrors,      setZoneErrors]      = useState<{ name?: string; cost?: string }>({});

  function openCreateZone() {
    setEditingZone(null);
    setZoneName("");
    setZoneCost("");
    setZoneErrors({});
    setZoneDialogOpen(true);
  }

  function openEditZone(zone: ShippingZone) {
    setEditingZone(zone);
    setZoneName(zone.displayName);
    setZoneCost(String(zone.cost));
    setZoneErrors({});
    setZoneDialogOpen(true);
  }

  async function handleZoneSubmit() {
    const errs: { name?: string; cost?: string } = {};
    if (!zoneName.trim()) errs.name = "Requerido";
    const costNum = Number(zoneCost);
    if (!zoneCost || isNaN(costNum) || costNum < 0) errs.cost = "Valor inválido";
    if (Object.keys(errs).length) { setZoneErrors(errs); return; }

    try {
      if (editingZone) {
        await updateZone.mutateAsync({ id: editingZone.id, payload: { displayName: zoneName.trim(), cost: costNum } });
        toast.success("Zona actualizada");
      } else {
        await createZone.mutateAsync({ displayName: zoneName.trim(), cost: costNum });
        toast.success("Zona creada");
      }
      setZoneDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function handleDeleteZone(zone: ShippingZone) {
    try {
      await deleteZone.mutateAsync(zone.id);
      toast.success(`"${zone.displayName}" eliminada`);
    } catch {
      toast.error("Error al eliminar");
    }
  }

  const isZonePending = createZone.isPending || updateZone.isPending;

  function openCreate() {
    setEditingPromo(null);
    setForm(EMPTY_FORM);
    setErrors({});
    setDialogOpen(true);
  }

  function openEdit(promo: PromoCode) {
    setEditingPromo(promo);
    setForm(promoToForm(promo));
    setErrors({});
    setDialogOpen(true);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  async function handleSubmit() {
    const payload = formToPayload(form);
    const parsed  = PromoCodeCreateInputSchema.safeParse(payload);

    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const path = issue.path[0] as string | undefined;
        if (path === "transferDiscountValue") fieldErrors.transferDiscountValue = issue.message;
        else if (path === "transferDiscountType") fieldErrors.transferDiscountType = issue.message;
        else if (path === "cardDiscountValue")    fieldErrors.cardDiscountValue    = issue.message;
        else if (path === "cardDiscountType")     fieldErrors.cardDiscountType     = issue.message;
        else if (path === "code")                 fieldErrors.code                 = issue.message;
        else if (path === "maxUses")              fieldErrors.maxUses              = issue.message;
        else fieldErrors.code = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    try {
      if (editingPromo) {
        await updateMutation.mutateAsync({ id: editingPromo.id, payload: parsed.data });
        toast.success("Código actualizado");
      } else {
        await createMutation.mutateAsync(parsed.data);
        toast.success("Código creado");
      }
      setDialogOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al guardar");
    }
  }

  async function handleDeletePromo(promo: PromoCode) {
    try {
      await deleteMutation.mutateAsync(promo.id);
      toast.success(`Código "${promo.code}" eliminado`);
    } catch {
      toast.error("Error al eliminar");
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TicketPercent className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Códigos Promocionales</h1>
            <p className="text-xs text-muted-foreground">Descuentos canjeables en el checkout web</p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          size="sm"
          className="rounded-none text-xs tracking-wider uppercase"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo código
        </Button>
      </div>

      {/* Table */}
      <Card className="rounded-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase">
            {codes.length} código{codes.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription className="text-xs">
            Transferencia suma al 20% base · Tarjeta aplica sobre precio lista
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : codes.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Tag className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin códigos creados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] tracking-wider uppercase">Código</TableHead>
                    <TableHead className="text-[11px] tracking-wider uppercase">Transferencia</TableHead>
                    <TableHead className="text-[11px] tracking-wider uppercase">Tarjeta</TableHead>
                    <TableHead className="text-[11px] tracking-wider uppercase">Usos</TableHead>
                    <TableHead className="text-[11px] tracking-wider uppercase">Vence</TableHead>
                    <TableHead className="text-[11px] tracking-wider uppercase">Estado</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((promo) => (
                    <TableRow key={promo.id} className={cn(!promo.isActive && "opacity-50")}>
                      <TableCell>
                        <div>
                          <p className="font-mono text-xs font-semibold tracking-widest">{promo.code}</p>
                          {promo.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{promo.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-emerald-600">
                        {fmtDiscount(promo.transferDiscountType, promo.transferDiscountValue)}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-blue-600">
                        {fmtDiscount(promo.cardDiscountType, promo.cardDiscountValue)}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums">
                        {promo.usedCount}
                        {promo.maxUses != null && (
                          <span className="text-muted-foreground"> / {promo.maxUses}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs tabular-nums whitespace-nowrap">
                        {promo.validUntil ? (
                          <span className={new Date(promo.validUntil) < new Date() ? "text-destructive" : ""}>
                            {fmtDate(promo.validUntil)}
                          </span>
                        ) : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={promo.isActive && (!promo.validUntil || new Date(promo.validUntil) >= new Date()) ? "default" : "secondary"}
                          className="text-[10px] tracking-wider uppercase rounded-none"
                        >
                          {!promo.isActive
                            ? "Inactivo"
                            : promo.validUntil && new Date(promo.validUntil) < new Date()
                              ? "Vencido"
                              : "Activo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none"
                            onClick={() => openEdit(promo)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none text-destructive hover:text-destructive"
                            onClick={() => handleDeletePromo(promo)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Shipping zones ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Zonas de envío</h2>
            <p className="text-xs text-muted-foreground">Ciudades con costo de envío configurado</p>
          </div>
        </div>
        <Button
          onClick={openCreateZone}
          size="sm"
          className="rounded-none text-xs tracking-wider uppercase"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva zona
        </Button>
      </div>

      <Card className="rounded-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold tracking-wide uppercase">
            {zones.length} zona{zones.length !== 1 ? "s" : ""} configurada{zones.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription className="text-xs">
            Si la ciudad del cliente no está en la lista, el envío se calcula como $0
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {zonesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : zones.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <MapPin className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Sin zonas configuradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[11px] tracking-wider uppercase">Ciudad</TableHead>
                    <TableHead className="text-[11px] tracking-wider uppercase text-right">Costo de envío</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{zone.displayName}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">{zone.city}</p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        ${zone.cost.toLocaleString("es-AR")}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none"
                            onClick={() => openEditZone(zone)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-none text-destructive hover:text-destructive"
                            onClick={() => handleDeleteZone(zone)}
                            disabled={deleteZone.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Zone create / edit dialog */}
      <Dialog open={zoneDialogOpen} onOpenChange={setZoneDialogOpen}>
        <DialogContent className="max-w-sm rounded-none">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-wide uppercase">
              {editingZone ? "Editar zona" : "Nueva zona de envío"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Ciudad <span className="text-destructive">*</span>
              </Label>
              <Input
                value={zoneName}
                onChange={(e) => { setZoneName(e.target.value); setZoneErrors((p) => ({ ...p, name: undefined })); }}
                placeholder="Ej: Neuquén"
                className="rounded-none text-sm"
              />
              {zoneErrors.name && <p className="text-[11px] text-destructive">{zoneErrors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Costo de envío ($) <span className="text-destructive">*</span>
              </Label>
              <Input
                type="number"
                min={0}
                step={100}
                value={zoneCost}
                onChange={(e) => { setZoneCost(e.target.value); setZoneErrors((p) => ({ ...p, cost: undefined })); }}
                placeholder="Ej: 3500"
                className="rounded-none text-sm font-mono"
              />
              {zoneErrors.cost && <p className="text-[11px] text-destructive">{zoneErrors.cost}</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setZoneDialogOpen(false)}
              className="rounded-none text-xs tracking-wider uppercase"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleZoneSubmit}
              disabled={isZonePending}
              className="rounded-none text-xs tracking-wider uppercase"
            >
              {isZonePending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingZone ? "Guardar" : "Crear zona"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold tracking-wide uppercase">
              {editingPromo ? "Editar código" : "Nuevo código promocional"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">

            {/* Código */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Código <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                placeholder="KWINNA20"
                disabled={!!editingPromo}
                className="rounded-none font-mono tracking-widest uppercase text-sm"
                maxLength={50}
              />
              {errors.code && <p className="text-[11px] text-destructive">{errors.code}</p>}
              <p className="text-[10px] text-muted-foreground">Solo mayúsculas, números, guión y guión bajo.</p>
            </div>

            {/* Descripción */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Descripción interna (opcional)
              </Label>
              <Input
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                placeholder="Black Friday 2026"
                className="rounded-none text-sm"
                maxLength={200}
              />
            </div>

            {/* Descuento Transferencia */}
            <DiscountSection
              label="Transferencia bancaria"
              enabled={form.transferEnabled}
              onToggle={(v) => setField("transferEnabled", v)}
              type={form.transferDiscountType}
              onType={(v) => setField("transferDiscountType", v)}
              value={form.transferDiscountValue}
              onValue={(v) => setField("transferDiscountValue", v)}
              error={errors.transferDiscountValue}
            />
            {form.transferEnabled && form.transferDiscountType === "percentage" && (
              <p className="text-[10px] text-muted-foreground -mt-3 pl-1">
                Se suma al 20% base. Ej: 10% aquí → cliente paga con 30% total de descuento.
              </p>
            )}

            {/* Descuento Tarjeta */}
            <DiscountSection
              label="Tarjeta (Mercado Pago)"
              enabled={form.cardEnabled}
              onToggle={(v) => setField("cardEnabled", v)}
              type={form.cardDiscountType}
              onType={(v) => setField("cardDiscountType", v)}
              value={form.cardDiscountValue}
              onValue={(v) => setField("cardDiscountValue", v)}
              error={errors.cardDiscountValue}
            />

            {/* Vencimiento */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                  Vence el (opcional)
                </Label>
                {form.validUntil && (
                  <button
                    type="button"
                    onClick={() => setField("validUntil", "")}
                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <Input
                type="datetime-local"
                value={form.validUntil}
                onChange={(e) => setField("validUntil", e.target.value)}
                className="rounded-none text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                El código se rechazará automáticamente pasada esta fecha y hora.
              </p>
            </div>

            {/* Límite de usos */}
            <div className="space-y-1.5">
              <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Máx. usos (opcional)
              </Label>
              <Input
                type="number"
                min={1}
                value={form.maxUses}
                onChange={(e) => setField("maxUses", e.target.value)}
                placeholder="∞"
                className="rounded-none text-xs"
              />
              {errors.maxUses && <p className="text-[11px] text-destructive">{errors.maxUses}</p>}
            </div>

            {/* Activo */}
            <div className="flex items-center justify-between rounded-none border border-border/50 px-4 py-3">
              <Label className="text-xs font-medium">Activo</Label>
              <Switch
                checked={form.isActive}
                onCheckedChange={(v) => setField("isActive", v)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="rounded-none text-xs tracking-wider uppercase"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-none text-xs tracking-wider uppercase"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPromo ? "Guardar" : "Crear código"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
