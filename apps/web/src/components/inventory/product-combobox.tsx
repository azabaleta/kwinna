"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import type { Product } from "@kwinna/contracts";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ProductComboboxProps {
  products: Product[];
  value: string;
  onValueChange: (value: string) => void;
  error?: boolean;
}

export function ProductCombobox({
  products,
  value,
  onValueChange,
  error,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);

  // Encontrar el producto seleccionado para mostrar su nombre en el botón
  const selectedProduct = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between overflow-hidden",
            !selectedProduct && "text-muted-foreground",
            error && "border-destructive focus-visible:ring-destructive"
          )}
        >
          <span className="truncate">
            {selectedProduct ? selectedProduct.name : "Seleccioná un producto…"}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          filter={(value, search) => {
            // El value aquí es el string `${id}:::${name}:::${sku}` (todo en minúsculas por cmdk)
            if (value.includes(search.toLowerCase())) return 1;
            return 0;
          }}
        >
          <CommandInput placeholder="Buscar por código (SKU) o nombre…" />
          <CommandList>
            <CommandEmpty>No se encontró ningún producto.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => {
                // Combinamos el id, nombre y sku para que el filtro interno de cmdk actúe sobre ellos
                const cmdValue = `${product.id}:::${product.name}:::${product.sku}`;
                return (
                  <CommandItem
                    key={product.id}
                    value={cmdValue}
                    keywords={[product.name, product.sku]}
                    onSelect={(currentValue) => {
                      // Recuperamos el ID separando el string
                      const id = currentValue.split(":::")[0];
                      if (id) onValueChange(id);
                      setOpen(false);
                    }}
                    className="flex flex-col items-start gap-1 py-2"
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <div className="flex flex-col items-start min-w-0">
                        <span className="truncate font-medium">
                          {product.name}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {product.sku}
                        </span>
                      </div>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0",
                          value === product.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                    </div>
                    {product.description && (
                      <span className="line-clamp-1 text-xs text-muted-foreground/70">
                        {product.description}
                      </span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
