"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Plus, Copy, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BarcodePreview } from "@/components/labels/BarcodePreview";
import { InlineCreateModal } from "@/components/labels/InlineCreateModal";
import { NativeSelect } from "@/components/labels/NativeSelect";
import {
  fetchCategories, fetchItemTypes, fetchQualities, fetchVariants,
  createCategory, createItemType, createQuality, createVariant,
  updateCategory, updateItemType, updateQuality, updateVariant,
  type GlossaryCategory, type GlossaryItemType, type GlossaryQuality, type GlossaryVariant,
} from "@/services/glossary";
import { buildEAN8 } from "@/lib/barcode";

type ModalTarget = "category" | "itemType" | "quality" | "variant" | null;

interface EAN8PickerProps {
  onCodeReady: (code: string) => void;
  onClose?: () => void;
}

export function EAN8Picker({ onCodeReady, onClose }: EAN8PickerProps) {
  const [categories, setCategories] = useState<GlossaryCategory[]>([]);
  const [itemTypes, setItemTypes]   = useState<GlossaryItemType[]>([]);
  const [qualities, setQualities]   = useState<GlossaryQuality[]>([]);
  const [variants, setVariants]     = useState<GlossaryVariant[]>([]);

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [itemTypeId, setItemTypeId] = useState<number | "">("");
  const [qualityId, setQualityId]   = useState<number | "">("");
  const [variantId, setVariantId]   = useState<number | "">("");

  const [modal, setModal]     = useState<ModalTarget>(null);
  const [copied, setCopied]   = useState(false);
  const [apiError, setApiError] = useState("");

  const pendingQualityId = useRef<number | null>(null);
  const pendingVariantId = useRef<number | null>(null);
  const qualitiesCacheRef = useRef<Record<number, GlossaryQuality[]>>({});

  useEffect(() => {
    fetchCategories()
      .then(setCategories)
      .catch(() => setApiError("No se pudo conectar con el servidor del glosario."));
  }, []);

  useEffect(() => {
    setItemTypeId(""); setQualityId(""); setVariantId("");
    setItemTypes([]); setQualities([]); setVariants([]);
    qualitiesCacheRef.current = {};
    if (!categoryId) return;
    fetchItemTypes(Number(categoryId)).then(setItemTypes).catch(console.error);
  }, [categoryId]);

  useEffect(() => {
    if (!itemTypeId) { setQualityId(""); setVariantId(""); setQualities([]); setVariants([]); return; }
    const id = Number(itemTypeId);
    const cached = qualitiesCacheRef.current[id];
    if (cached) {
      setQualities(cached);
    } else {
      fetchQualities(id).then((qs) => {
        setQualities(qs);
        qualitiesCacheRef.current[id] = qs;
      }).catch(console.error);
    }
    setVariants([]);
    if (pendingQualityId.current !== null) {
      setQualityId(pendingQualityId.current);
      pendingQualityId.current = null;
    } else {
      setQualityId(""); setVariantId("");
    }
  }, [itemTypeId]);

  useEffect(() => {
    if (!qualityId) { setVariantId(""); setVariants([]); return; }
    fetchVariants(Number(qualityId)).then((vs) => {
      setVariants(vs);
      if (pendingVariantId.current !== null) {
        setVariantId(pendingVariantId.current);
        pendingVariantId.current = null;
      } else {
        setVariantId("");
      }
    }).catch(console.error);
  }, [qualityId]);

  const selected = useMemo(() => ({
    category: categories.find((c) => c.id === Number(categoryId)),
    itemType: itemTypes.find((t)  => t.id === Number(itemTypeId)),
    quality:  qualities.find((q)  => q.id === Number(qualityId)),
    variant:  variants.find((v)   => v.id === Number(variantId)),
  }), [categories, itemTypes, qualities, variants, categoryId, itemTypeId, qualityId, variantId]);

  const sevenDigits = useMemo(() => {
    const { category, quality, itemType, variant } = selected;
    if (!category || !quality || !itemType || !variant) return null;
    return `${category.code}${quality.code}${itemType.code}${variant.code}`;
  }, [selected]);

  const fullCode = sevenDigits ? buildEAN8(sevenDigits) : null;

  async function handleConfirm() {
    if (!fullCode) return;
    onCodeReady(fullCode);
    onClose?.();
  }

  async function handleCopy() {
    if (!fullCode) return;
    await navigator.clipboard.writeText(fullCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // ─── Creación inline ──────────────────────────────────────────────────────────

  async function handleCreateCategory(code: string, name: string) {
    const cat = await createCategory({ code, name });
    setCategories((prev) => [...prev, cat].sort((a, b) => a.code.localeCompare(b.code)));
    setCategoryId(cat.id);
  }

  async function handleCreateItemType(code: string, name: string) {
    const t = await createItemType({ categoryId: Number(categoryId), code, name });
    setItemTypes((prev) => [...prev, t].sort((a, b) => a.code.localeCompare(b.code)));
    qualitiesCacheRef.current[t.id] = [];
    setItemTypeId(t.id);
  }

  async function handleCreateQuality(code: string, name: string) {
    const q = await createQuality({ itemTypeId: Number(itemTypeId), code, name });
    const sorted = [...(qualitiesCacheRef.current[Number(itemTypeId)] ?? []), q].sort((a, b) => a.code.localeCompare(b.code));
    setQualities(sorted);
    qualitiesCacheRef.current[Number(itemTypeId)] = sorted;
    setQualityId(q.id);
  }

  async function handleCreateVariant(code: string, name: string) {
    const v = await createVariant({ qualityId: Number(qualityId), code, name });
    setVariants((prev) => [...prev, v].sort((a, b) => a.code.localeCompare(b.code)));
    setVariantId(v.id);
  }

  if (apiError) {
    return (
      <div className="flex items-start gap-2 text-amber-400 text-sm p-4">
        <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
        {apiError}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-950 p-5 space-y-5">
      {/* Selectores en cascada */}
      <div className="grid grid-cols-2 gap-4">
        <SelectorRow
          label="Categoría" hint="dígitos 1-2"
          value={categoryId} onChange={(v) => setCategoryId(v === "" ? "" : Number(v))}
          options={categories} onAdd={() => setModal("category")}
        />
        <SelectorRow
          label="Tipo de prenda" hint="dígitos 4-5"
          value={itemTypeId} onChange={(v) => setItemTypeId(v === "" ? "" : Number(v))}
          options={itemTypes} disabled={!categoryId}
          disabledHint="Selecciona una categoría primero"
          onAdd={() => setModal("itemType")} addDisabled={!categoryId}
        />
        <SelectorRow
          label="Calidad" hint="dígito 3"
          value={qualityId} onChange={(v) => setQualityId(v === "" ? "" : Number(v))}
          options={qualities} disabled={!itemTypeId}
          disabledHint="Selecciona un tipo primero"
          onAdd={() => setModal("quality")} addDisabled={!itemTypeId}
        />
        <SelectorRow
          label="Variante / Color" hint="dígitos 6-7"
          value={variantId} onChange={(v) => setVariantId(v === "" ? "" : Number(v))}
          options={variants} disabled={!qualityId}
          disabledHint="Selecciona una calidad primero"
          onAdd={() => setModal("variant")} addDisabled={!qualityId}
        />
      </div>

      {/* Código formado en vivo */}
      <div className="rounded-lg bg-gray-900 border border-gray-800 p-3 space-y-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Código 7 dígitos</p>
        <div className="flex gap-1 font-mono text-lg">
          <Segment value={selected.category?.code} digits={2} label="cat" />
          <Segment value={selected.quality?.code}  digits={1} label="cal" />
          <Segment value={selected.itemType?.code} digits={2} label="tipo" />
          <Segment value={selected.variant?.code}  digits={2} label="var" />
        </div>
      </div>

      {/* Preview */}
      {fullCode && (
        <div className="flex justify-center">
          <BarcodePreview fullCode={fullCode} />
        </div>
      )}

      {/* Acciones */}
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 border-gray-700 text-gray-300" onClick={handleCopy} disabled={!fullCode}>
          {copied ? <><Check className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar</>}
        </Button>
        <Button className="flex-1" onClick={handleConfirm} disabled={!fullCode}>
          Usar este código
        </Button>
        {onClose && (
          <Button variant="ghost" className="text-gray-500" onClick={onClose}>Cancelar</Button>
        )}
      </div>

      {/* Modales */}
      {modal === "category" && <InlineCreateModal title="Nueva categoría" codeLength={2} usedCodes={categories.map((c) => c.code)} onConfirm={handleCreateCategory} onClose={() => setModal(null)} />}
      {modal === "itemType" && <InlineCreateModal title="Nuevo tipo de prenda" codeLength={2} usedCodes={itemTypes.map((t) => t.code)} onConfirm={handleCreateItemType} onClose={() => setModal(null)} />}
      {modal === "quality" && <InlineCreateModal title="Nueva calidad" codeLength={1} usedCodes={qualities.map((q) => q.code)} onConfirm={handleCreateQuality} onClose={() => setModal(null)} />}
      {modal === "variant" && <InlineCreateModal title="Nueva variante / color" codeLength={2} usedCodes={variants.map((v) => v.code)} onConfirm={handleCreateVariant} onClose={() => setModal(null)} />}
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

interface SelectorRowProps {
  label: string; hint: string;
  value: number | ""; onChange: (v: string) => void;
  options: { id: number; code: string; name: string }[];
  disabled?: boolean; disabledHint?: string;
  onAdd: () => void; addDisabled?: boolean;
}

function SelectorRow({ label, hint, value, onChange, options, disabled, disabledHint, onAdd, addDisabled }: SelectorRowProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-sm text-gray-300">
          {label} <span className="text-gray-600 font-normal text-xs">({hint})</span>
        </Label>
        <button
          onClick={onAdd}
          disabled={addDisabled}
          title={`Crear ${label.toLowerCase()}`}
          className="flex items-center justify-center w-6 h-6 rounded border border-gray-700 text-gray-400 hover:text-gray-100 hover:border-gray-500 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
      <NativeSelect
        value={value === "" ? "" : String(value)}
        onChange={(e) => onChange(e.target.value)}
        placeholder={disabled ? (disabledHint ?? `Selecciona ${label}`) : `Selecciona ${label}`}
        disabled={disabled || options.length === 0}
      >
        {options.map((o) => (
          <option key={o.id} value={String(o.id)}>{o.code} — {o.name}</option>
        ))}
      </NativeSelect>
      {!disabled && options.length === 0 && (
        <p className="text-xs text-gray-600">Sin opciones. Usa "+" para crear.</p>
      )}
    </div>
  );
}

function Segment({ value, digits, label }: { value: string | undefined; digits: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`tracking-widest text-xl tabular-nums transition-colors ${value ? "text-gray-100" : "text-gray-700"}`}>
        {value ?? "─".repeat(digits)}
      </span>
      <span className="text-[9px] text-gray-600 uppercase">{label}</span>
    </div>
  );
}
