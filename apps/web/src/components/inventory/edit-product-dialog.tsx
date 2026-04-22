"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import type { Product } from "@kwinna/contracts";
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
import { ImageUploader } from "@/components/inventory/image-uploader";
import { useUpdateProduct } from "@/hooks/use-products";
import { cn } from "@/lib/utils";
import {
  ProductUpdateFormSchema,
  type ProductUpdateFormValues,
  CATEGORIES,
  PRODUCT_TAGS,
  ACCESSORY_TAG,
} from "@/schemas/product";
import { SEASON_LABELS, type ProductSeason } from "@kwinna/contracts";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EditProductDialogProps {
  product: Product;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function productToFormValues(p: Product): ProductUpdateFormValues {
  return {
    name:        p.name,
    description: p.description ?? "",
    price:       p.price,
    categoryId:  p.categoryId ?? "",
    images:      p.images,
    tags:        p.tags,
    season:      p.season,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EditProductDialog({ product }: EditProductDialogProps) {
  const [open, setOpen]               = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const { mutateAsync, isPending } = useUpdateProduct(product.id);

  const form = useForm<ProductUpdateFormValues>({
    resolver: zodResolver(ProductUpdateFormSchema),
    defaultValues: productToFormValues(product),
  });

  // Reset the form whenever the product prop changes (e.g. after a refetch)
  // or when the dialog opens, so stale data never leaks across renders.
  useEffect(() => {
    if (open) {
      form.reset(productToFormValues(product));
      setIsUploading(false);
    }
  }, [open, product, form]);

  // ── Tag helpers ─────────────────────────────────────────────────────────────

  function toggleTag(tag: string) {
    const current = form.getValues("tags");
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    form.setValue("tags", next, { shouldValidate: true });
    if (tag === ACCESSORY_TAG && !current.includes(tag)) {
      form.setValue("season", undefined, { shouldValidate: true });
    }
  }

  // ── Open/close ──────────────────────────────────────────────────────────────

  function handleOpenChange(next: boolean) {
    if (!next) {
      form.reset(productToFormValues(product));
      setIsUploading(false);
    }
    setOpen(next);
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function onSubmit(values: ProductUpdateFormValues) {
    try {
      const updated = await mutateAsync(values);
      toast.success("Producto actualizado", {
        description: updated.name,
      });
      setOpen(false);
    } catch (err) {
      const axiosError = err as { response?: { data?: { error?: string } } };
      const message =
        axiosError.response?.data?.error ??
        (err instanceof Error ? err.message : "Error al guardar los cambios");
      toast.error("No se pudo guardar", { description: message });
    }
  }

  const watchedImages = form.watch("images");
  const watchedTags   = form.watch("tags");
  const isAccessory   = watchedTags.includes(ACCESSORY_TAG);
  const blocked       = isPending || isUploading;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground hover:text-foreground"
          aria-label={`Editar ${product.name}`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Editar producto</DialogTitle>
          <DialogDescription>
            Modificá los datos de{" "}
            <span className="font-semibold text-foreground">{product.name}</span>.
            El SKU{" "}
            <code className="rounded bg-muted px-1 text-xs">{product.sku}</code>{" "}
            no puede cambiarse.
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
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        (opcional)
                      </span>
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

              {/* ── Precio ── */}
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

              {/* ── Temporada (admin-only) ── */}
              <FormField
                control={form.control}
                name="season"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Temporada
                      {isAccessory ? (
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          (no aplica para accesorios)
                        </span>
                      ) : (
                        <span className="ml-1 text-xs font-normal text-destructive">*</span>
                      )}
                    </FormLabel>
                    <div className="flex gap-2 flex-wrap">
                      {(Object.entries(SEASON_LABELS) as [ProductSeason, string][]).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          disabled={isAccessory}
                          onClick={() => field.onChange(field.value === value ? undefined : value)}
                          className={cn(
                            "rounded-none border px-3 py-1.5 text-xs font-medium tracking-wide transition-colors",
                            isAccessory
                              ? "cursor-not-allowed border-border/40 text-muted-foreground/40"
                              : field.value === value
                              ? "border-foreground bg-foreground text-background"
                              : "border-border text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* ── Imágenes ── */}
              <div className="space-y-2">
                <FormLabel>
                  Fotos del producto
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (hasta 8 imágenes)
                  </span>
                </FormLabel>
                <ImageUploader
                  value={watchedImages}
                  onChange={(urls) =>
                    form.setValue("images", urls, { shouldValidate: true })
                  }
                  onUploadingChange={setIsUploading}
                />
                {isUploading && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Subiendo imágenes… esperá antes de guardar
                  </p>
                )}
                {form.formState.errors.images && !isUploading && (
                  <p className="text-xs font-medium text-destructive">
                    {typeof form.formState.errors.images.message === "string"
                      ? form.formState.errors.images.message
                      : "Revisá las imágenes"}
                  </p>
                )}
              </div>

              {/* ── Tags ── */}
              <div className="space-y-2">
                <FormLabel>
                  Categorías
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (seleccioná una o más)
                  </span>
                </FormLabel>
                <div className="flex flex-wrap gap-1.5">
                  {PRODUCT_TAGS.filter((t) => t !== ACCESSORY_TAG).map((tag) => {
                    const active = watchedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "rounded-none border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors",
                          active
                            ? "border-foreground bg-foreground text-background"
                            : "border-border bg-transparent text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
                {/* Accesorios — separado porque tiene comportamiento especial */}
                <div className="flex items-center gap-2 border-t border-border/40 pt-2">
                  <button
                    type="button"
                    onClick={() => toggleTag(ACCESSORY_TAG)}
                    className={cn(
                      "rounded-none border px-2.5 py-1 text-[11px] font-medium tracking-wide transition-colors",
                      watchedTags.includes(ACCESSORY_TAG)
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-transparent text-muted-foreground hover:border-foreground/50 hover:text-foreground",
                    )}
                  >
                    {ACCESSORY_TAG}
                  </button>
                  <span className="text-[10px] text-muted-foreground">
                    Exime de asignar temporada
                  </span>
                </div>
                {watchedTags.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Seleccionadas: {watchedTags.join(", ")}
                  </p>
                )}
              </div>

            </div>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={blocked}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={blocked} className="gap-2">
                {isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Guardando…</>
                ) : isUploading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Subiendo fotos…</>
                ) : (
                  <><Pencil className="h-4 w-4" />Guardar cambios</>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
