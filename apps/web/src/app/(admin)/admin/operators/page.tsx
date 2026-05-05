"use client";

import { useState } from "react";
import { UserCog, Plus, Pencil, PowerOff, Power, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  useOperators,
  useCreateOperator,
  useUpdateOperator,
  useDeactivateOperator,
  useReactivateOperator,
} from "@/hooks/use-operators";
import type { Operator } from "@kwinna/contracts";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

interface OperatorFormDialogProps {
  open:       boolean;
  onClose:    () => void;
  operator?:  Operator;
}

function OperatorFormDialog({ open, onClose, operator }: OperatorFormDialogProps) {
  const isEdit = !!operator;

  const [name,     setName]     = useState(operator?.name     ?? "");
  const [email,    setEmail]    = useState(operator?.email    ?? "");
  const [password, setPassword] = useState("");

  const create = useCreateOperator();
  const update = useUpdateOperator();
  const busy   = create.isPending || update.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (isEdit) {
        await update.mutateAsync({
          id:    operator.id,
          input: {
            name:     name     || undefined,
            password: password || undefined,
          },
        });
        toast.success("Operador actualizado");
      } else {
        await create.mutateAsync({ name, email, password });
        toast.success("Operador creado");
      }
      onClose();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      toast.error(msg ?? "Error al guardar el operador");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar operador" : "Nuevo operador"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="op-name">Nombre</Label>
            <Input
              id="op-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: María García"
            />
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="op-email">Email</Label>
              <Input
                id="op-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="operador@kwinna.com"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="op-password">
              {isEdit ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"}
            </Label>
            <Input
              id="op-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!isEdit}
              minLength={8}
              placeholder={isEdit ? "••••••••" : "Mínimo 8 caracteres"}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? "Guardar cambios" : "Crear operador"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OperatorsPage() {
  const { operators, isLoading } = useOperators();
  const deactivate = useDeactivateOperator();
  const reactivate = useReactivateOperator();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing,    setEditing]    = useState<Operator | null>(null);

  async function handleToggleActive(op: Operator) {
    try {
      if (op.isActive) {
        await deactivate.mutateAsync(op.id);
        toast.success(`${op.name} desactivado`);
      } else {
        await reactivate.mutateAsync(op.id);
        toast.success(`${op.name} reactivado`);
      }
    } catch {
      toast.error("Error al cambiar el estado del operador");
    }
  }

  const active   = operators.filter((o) => o.isActive).length;
  const inactive = operators.filter((o) => !o.isActive).length;

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserCog className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Operadores</h1>
              <p className="text-sm text-muted-foreground">
                {active} activo{active !== 1 ? "s" : ""}
                {inactive > 0 && ` · ${inactive} inactivo${inactive !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo operador
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Equipo de ventas</CardTitle>
            <CardDescription>
              Los operadores pueden iniciar sesión en el POS (desktop y Android).
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      Cargando...
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading && operators.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No hay operadores todavía. Creá el primero.
                    </TableCell>
                  </TableRow>
                )}
                {operators.map((op) => (
                  <TableRow key={op.id} className={!op.isActive ? "opacity-50" : ""}>
                    <TableCell className="font-medium">{op.name}</TableCell>
                    <TableCell className="text-muted-foreground">{op.email}</TableCell>
                    <TableCell>
                      <Badge variant={op.isActive ? "default" : "secondary"}>
                        {op.isActive ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{fmtDate(op.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditing(op)}
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleToggleActive(op)}
                          title={op.isActive ? "Desactivar" : "Reactivar"}
                          className={op.isActive ? "text-destructive hover:text-destructive" : "text-emerald-600"}
                        >
                          {op.isActive
                            ? <PowerOff className="h-4 w-4" />
                            : <Power    className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>

      <OperatorFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      {editing && (
        <OperatorFormDialog
          open={!!editing}
          onClose={() => setEditing(null)}
          operator={editing}
        />
      )}
    </main>
  );
}
