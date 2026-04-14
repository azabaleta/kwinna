"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Plus, PlusCircle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useCreateProduct } from "@/hooks/use-products";
import { ProductFormSchema, type ProductFormValues, CATEGORIES } from "@/schemas/product";

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateProductDialog() {
  const [open, setOpen]       = useState(false);
  const [tagInput, setTagInput] = useState("");

  const { mutateAsync, isPending } = useCreateProduct();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(ProductFormSchema),
    defaultValues: {
      name:        "",
      description: "",
      sku:         "",
      price:       0,
      categoryId:  "",
      images:      [],
      tags:        [],
    },
  });

  // ── Image helpers ───────────────────────────────────────────────────────────

  function addImageRow() {
    const current = form.getValues("images");
    form.setValue("images", [...current, ""], { shouldValidate: false });
  }

  function removeImageRow(idx: number) {
    const current = form.getValues("images");
    form.setValue("images", current.filter((_, i) => i !== idx), { shouldValidate: true });
  }

  function updateImageRow(idx: number, val: string) {
    const current = form.getValues("images");
    const next = [...current];
    next[idx] = val;
    form.setValue("images", next, { shouldValidate: true });
  }

  // ── Tag helpers ─────────────────────────────────────────────────────────────

  function addTag() {
    const tag = tagInput.trim();
    if (!tag) return;
    const current = form.getValues("tags");
    if (!current.includes(tag)) {
      form.setValue("tags", [...current, tag], { shouldValidate: true });
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    const current = form.getValues("tags");
    form.setValue("tags", current.filter((t) => t !== tag), { shouldValidate: true });
  }

  // ── Reset on close ──────────────────────────────────────────────────────────

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      form.reset();
      setTagInput("");
    }
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function onSubmit(values: ProductFormValues) {
    // Strip empty image URLs before sending
    const payload: ProductFormValues = {
      ...values,
      images: values.images.filter((url) => url.trim() !== ""),
    };

    try {
      const product = await mutateAsync(payload);
      toast.success("Producto creado", {
        description: `${product.name} — SKU ${product.sku}`,
      });
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear el producto";
      toast.error("No se pudo crear", { description: message });
    }
  }

  const watchedImages = form.watch("images");
  const watchedTags   = form.watch("tags");

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <PlusCircle className="h-4 w-4" />
          Nuevo Producto
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Producto</DialogTitle>
          <DialogDescription>
            Completá los datos del producto. Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate>
            <div className="space-y-4 py-2">

              {/* ── Nombre ── */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ej: Vestido Midi Lino" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Descripción ── */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Descripción
                      <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Breve descripción del producto…"
                        className="resize-none"
                        rows={2}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── SKU + Precio ── */}
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <Input placeholder="VES-MI-LIN-001" className="font-mono" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Precio (ARS) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          placeholder="85000"
                          {...field}
                          value={field.value === 0 ? "" : field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* ── Categoría ── */}
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría *</FormLabel>
                    <Select value={field.value ?? ""} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccioná una categoría…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Imágenes ── */}
              <div className="space-y-2">
                <FormLabel>
                  Imágenes
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(URLs, opcional)</span>
                </FormLabel>
                <div className="space-y-2">
                  {watchedImages.map((url, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        placeholder="https://…"
                        value={url}
                        onChange={(e) => updateImageRow(idx, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeImageRow(idx)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {form.formState.errors.images && (
                  <p className="text-xs font-medium text-destructive">
                    {typeof form.formState.errors.images.message === "string"
                      ? form.formState.errors.images.message
                      : "Revisá las URLs de las imágenes"}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={addImageRow}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar imagen
                </Button>
              </div>

              {/* ── Tags ── */}
              <div className="space-y-2">
                <FormLabel>
                  Tags
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(opcional)</span>
                </FormLabel>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: verano, casual…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { e.preventDefault(); addTag(); }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={addTag}
                  >
                    Agregar
                  </Button>
                </div>
                {watchedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {watchedTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-0.5 rounded-full hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending} className="gap-2">
                {isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</>
                  : <><PlusCircle className="h-4 w-4" />Crear Producto</>
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
