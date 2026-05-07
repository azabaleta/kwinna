"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { ConfigPanel } from "@/components/labels/ConfigPanel";
import { LabelGrid } from "@/components/labels/LabelGrid";
import { GlossaryList } from "@/components/labels/GlossaryList";
import { InlineCreateModal } from "@/components/labels/InlineCreateModal";
import { NativeSelect } from "@/components/labels/NativeSelect";
import { Label } from "@/components/ui/label";
import { generatePDF } from "@/lib/generate-pdf";
import { parseCodes } from "@/lib/barcode";
import { calculateGrid, DEFAULT_CONFIG, type LayoutConfig } from "@/lib/layout";
import { buildEAN8 } from "@/lib/barcode";
import {
  fetchCategories, fetchItemTypes, fetchQualities, fetchVariants,
  fetchSkuEntries,
  createCategory, createItemType, createQuality, createVariant,
  updateCategory, updateItemType, updateQuality, updateVariant,
  type GlossaryCategory, type GlossaryItemType, type GlossaryQuality, type GlossaryVariant, type SkuEntry,
} from "@/services/glossary";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "print" | "glossary";
type ModalTarget = "category" | "itemType" | "quality" | "variant" | null;

// ─── Print tab ────────────────────────────────────────────────────────────────

function PrintTab() {
  const [config, setConfig]         = useState<LayoutConfig>(DEFAULT_CONFIG);
  const [rawInput, setRawInput]     = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [codeDescriptions, setCodeDescriptions] = useState<Record<string, string>>({});

  const { valid: codes, invalid } = useMemo(() => parseCodes(rawInput), [rawInput]);
  const layout = useMemo(() => calculateGrid(config, codes.length), [config, codes.length]);

  // Fetch product names for all valid codes
  useEffect(() => {
    if (codes.length === 0) { setCodeDescriptions({}); return; }
    fetchSkuEntries()
      .then((entries) => {
        const map: Record<string, string> = {};
        for (const e of entries) map[e.fullCode] = e.description;
        setCodeDescriptions(map);
      })
      .catch(console.error);
  }, [codes.length]);

  async function handleDownload() {
    setIsGenerating(true);
    try {
      await generatePDF(codes, config, codeDescriptions, logoDataUrl);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Panel lateral */}
      <div className="w-72 shrink-0 border-r border-gray-800 overflow-y-auto">
        <ConfigPanel
          config={config} onChange={setConfig}
          rawInput={rawInput} onRawInputChange={(v) => { setRawInput(v); setCurrentPage(1); }}
          codes={codes} invalid={invalid}
          layout={layout}
          currentPage={currentPage} onPageChange={setCurrentPage}
          onDownload={handleDownload} isGenerating={isGenerating}
          logoDataUrl={logoDataUrl} onLogoChange={setLogoDataUrl}
        />
      </div>

      {/* Preview A4 */}
      <div className="flex-1 overflow-auto bg-gray-900 p-6 flex items-start justify-center">
        <div className="w-full max-w-2xl">
          <LabelGrid
            codes={codes} config={config} layout={layout}
            currentPage={currentPage}
            logoDataUrl={logoDataUrl}
            codeDescriptions={codeDescriptions}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Glossary tab ─────────────────────────────────────────────────────────────

function GlossaryTab() {
  const [categories, setCategories] = useState<GlossaryCategory[]>([]);
  const [itemTypes, setItemTypes]   = useState<GlossaryItemType[]>([]);
  const [qualities, setQualities]   = useState<GlossaryQuality[]>([]);
  const [variants, setVariants]     = useState<GlossaryVariant[]>([]);
  const [qualitiesByItemType, setQualitiesByItemType] = useState<Record<number, GlossaryQuality[]>>({});
  const [variantsByQuality, setVariantsByQuality]     = useState<Record<number, GlossaryVariant[]>>({});

  const [categoryId, setCategoryId] = useState<number | "">("");
  const [itemTypeId, setItemTypeId] = useState<number | "">("");
  const [qualityId, setQualityId]   = useState<number | "">("");
  const [variantId, setVariantId]   = useState<number | "">("");

  const [savedProducts, setSavedProducts] = useState<Record<string, SkuEntry>>({});
  const [modal, setModal] = useState<ModalTarget>(null);

  const qualitiesCacheRef    = useRef<Record<number, GlossaryQuality[]>>({});
  const variantsByQualityRef = useRef<Record<number, GlossaryVariant[]>>({});
  const pendingQualityId     = useRef<number | null>(null);
  const pendingVariantId     = useRef<number | null>(null);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setItemTypeId(""); setQualityId(""); setVariantId("");
    setItemTypes([]); setQualities([]); setVariants([]);
    setQualitiesByItemType({}); setVariantsByQuality({});
    qualitiesCacheRef.current = {}; variantsByQualityRef.current = {};
    if (!categoryId) return;
    fetchItemTypes(Number(categoryId)).then(setItemTypes).catch(console.error);
  }, [categoryId]);

  useEffect(() => {
    if (itemTypes.length === 0) return;
    Promise.all(
      itemTypes.map((t) => fetchQualities(t.id).then((qs) => [t.id, qs] as [number, GlossaryQuality[]]))
    ).then((entries) => {
      const qualMap = Object.fromEntries(entries);
      setQualitiesByItemType(qualMap);
      qualitiesCacheRef.current = qualMap;
      return Promise.all(
        entries.flatMap(([, qs]) => qs).map((q) => fetchVariants(q.id).then((vs) => [q.id, vs] as [number, GlossaryVariant[]]))
      );
    }).then((varEntries) => {
      const varMap = Object.fromEntries(varEntries);
      setVariantsByQuality(varMap);
      variantsByQualityRef.current = varMap;
    }).catch(console.error);
  }, [itemTypes]);

  useEffect(() => {
    if (!itemTypeId) { setQualityId(""); setVariantId(""); setQualities([]); setVariants([]); return; }
    const id = Number(itemTypeId);
    const cached = qualitiesCacheRef.current[id];
    if (cached) { setQualities(cached); }
    else { fetchQualities(id).then((qs) => { setQualities(qs); qualitiesCacheRef.current[id] = qs; setQualitiesByItemType((p) => ({ ...p, [id]: qs })); }).catch(console.error); }
    setVariants([]);
    if (pendingQualityId.current !== null) { setQualityId(pendingQualityId.current); pendingQualityId.current = null; }
    else { setQualityId(""); setVariantId(""); }
  }, [itemTypeId]);

  useEffect(() => {
    if (!qualityId) { setVariantId(""); setVariants([]); return; }
    const id = Number(qualityId);
    const cached = variantsByQualityRef.current[id];
    if (cached) { setVariants(cached); }
    else { fetchVariants(id).then((vs) => { setVariants(vs); variantsByQualityRef.current[id] = vs; setVariantsByQuality((p) => ({ ...p, [id]: vs })); }).catch(console.error); }
    if (pendingVariantId.current !== null) { setVariantId(pendingVariantId.current); pendingVariantId.current = null; }
    else { setVariantId(""); }
  }, [qualityId]);

  // Fetch saved products for the selected category prefix
  const selectedCategory = categories.find((c) => c.id === Number(categoryId));
  useEffect(() => {
    if (!selectedCategory) { setSavedProducts({}); return; }
    fetchSkuEntries(selectedCategory.code)
      .then((entries) => setSavedProducts(Object.fromEntries(entries.map((e) => [e.fullCode, e]))))
      .catch(console.error);
  }, [selectedCategory]);

  const handleSelectFromList = useCallback((type: GlossaryItemType, quality: GlossaryQuality, variant: GlossaryVariant) => {
    pendingQualityId.current = quality.id;
    pendingVariantId.current = variant.id;
    setItemTypeId(type.id);
  }, []);

  const handleCopyCode = useCallback((code: string) => { void navigator.clipboard.writeText(code); }, []);

  const handleRenameCategory = useCallback(async (id: number, name: string) => {
    await updateCategory(id, name);
    setCategories((prev) => prev.map((c) => c.id === id ? { ...c, name } : c));
  }, []);

  const handleRenameItemType = useCallback(async (id: number, name: string) => {
    await updateItemType(id, name);
    setItemTypes((prev) => prev.map((t) => t.id === id ? { ...t, name } : t));
  }, []);

  const handleRenameQuality = useCallback(async (id: number, name: string) => {
    await updateQuality(id, name);
    const apply = (qs: GlossaryQuality[]) => qs.map((q) => q.id === id ? { ...q, name } : q);
    setQualities((p) => apply(p));
    setQualitiesByItemType((p) => { const n: Record<number, GlossaryQuality[]> = {}; for (const k in p) n[k] = apply(p[k]!); return n; });
    for (const k in qualitiesCacheRef.current) qualitiesCacheRef.current[k] = apply(qualitiesCacheRef.current[k]!);
  }, []);

  const handleRenameVariant = useCallback(async (id: number, name: string) => {
    await updateVariant(id, name);
    const apply = (vs: GlossaryVariant[]) => vs.map((v) => v.id === id ? { ...v, name } : v);
    setVariants((p) => apply(p));
    setVariantsByQuality((p) => { const n: Record<number, GlossaryVariant[]> = {}; for (const k in p) n[k] = apply(p[k]!); return n; });
    for (const k in variantsByQualityRef.current) variantsByQualityRef.current[k] = apply(variantsByQualityRef.current[k]!);
  }, []);

  async function handleCreateCategory(code: string, name: string) {
    const cat = await createCategory({ code, name });
    setCategories((p) => [...p, cat].sort((a, b) => a.code.localeCompare(b.code)));
    setCategoryId(cat.id);
  }
  async function handleCreateItemType(code: string, name: string) {
    const t = await createItemType({ categoryId: Number(categoryId), code, name });
    setItemTypes((p) => [...p, t].sort((a, b) => a.code.localeCompare(b.code)));
    qualitiesCacheRef.current[t.id] = [];
    setQualitiesByItemType((p) => ({ ...p, [t.id]: [] }));
    setItemTypeId(t.id);
  }
  async function handleCreateQuality(code: string, name: string) {
    const q = await createQuality({ itemTypeId: Number(itemTypeId), code, name });
    const id = Number(itemTypeId);
    const sorted = [...(qualitiesCacheRef.current[id] ?? []), q].sort((a, b) => a.code.localeCompare(b.code));
    setQualities(sorted); qualitiesCacheRef.current[id] = sorted;
    setQualitiesByItemType((p) => ({ ...p, [id]: sorted }));
    setQualityId(q.id);
  }
  async function handleCreateVariant(code: string, name: string) {
    const v = await createVariant({ qualityId: Number(qualityId), code, name });
    const id = Number(qualityId);
    const sorted = [...(variantsByQualityRef.current[id] ?? []), v].sort((a, b) => a.code.localeCompare(b.code));
    setVariants(sorted); variantsByQualityRef.current[id] = sorted;
    setVariantsByQuality((p) => ({ ...p, [id]: sorted }));
    setVariantId(v.id);
  }

  return (
    <div className="flex flex-col min-h-0 overflow-auto bg-gray-950 text-gray-100">
      {/* Selector de categoría */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800 bg-gray-900">
        <Label className="text-gray-400 text-sm shrink-0">Categoría:</Label>
        <NativeSelect
          value={categoryId === "" ? "" : String(categoryId)}
          onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
          placeholder="Selecciona una categoría…"
          className="max-w-xs"
        >
          {categories.map((c) => (
            <option key={c.id} value={String(c.id)}>{c.code} — {c.name}</option>
          ))}
        </NativeSelect>
        <button
          onClick={() => setModal("category")}
          title="Nueva categoría"
          className="flex items-center justify-center w-7 h-7 rounded border border-gray-700 text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Lista del glosario */}
      {selectedCategory ? (
        <GlossaryList
          category={selectedCategory}
          itemTypes={itemTypes}
          qualitiesByItemType={qualitiesByItemType}
          variantsByQuality={variantsByQuality}
          savedProducts={savedProducts}
          selectedItemTypeId={itemTypeId}
          selectedQualityId={qualityId}
          selectedVariantId={variantId}
          onSelect={handleSelectFromList}
          onCopyCode={handleCopyCode}
          onRenameCategory={handleRenameCategory}
          onRenameItemType={handleRenameItemType}
          onRenameQuality={handleRenameQuality}
          onRenameVariant={handleRenameVariant}
        />
      ) : (
        <div className="p-8 text-center text-sm text-gray-600">
          Selecciona una categoría para ver el glosario.
        </div>
      )}

      {/* Modales */}
      {modal === "category" && <InlineCreateModal title="Nueva categoría" codeLength={2} usedCodes={categories.map((c) => c.code)} onConfirm={handleCreateCategory} onClose={() => setModal(null)} />}
      {modal === "itemType" && <InlineCreateModal title="Nuevo tipo de prenda" codeLength={2} usedCodes={itemTypes.map((t) => t.code)} onConfirm={handleCreateItemType} onClose={() => setModal(null)} />}
      {modal === "quality"  && <InlineCreateModal title="Nueva calidad" codeLength={1} usedCodes={qualities.map((q) => q.code)} onConfirm={handleCreateQuality} onClose={() => setModal(null)} />}
      {modal === "variant"  && <InlineCreateModal title="Nueva variante / color" codeLength={2} usedCodes={variants.map((v) => v.code)} onConfirm={handleCreateVariant} onClose={() => setModal(null)} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LabelsPage() {
  const [tab, setTab] = useState<Tab>("print");

  return (
    <main className="flex flex-col h-[calc(100vh-3.5rem)] lg:h-screen px-0 py-0">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-4 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
          <Tag className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">Etiquetas</h1>
          <p className="text-xs text-muted-foreground">Impresión de códigos EAN-8 y glosario de codificación</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0 px-6 bg-card">
        {(["print", "glossary"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "print" ? "Imprimir" : "Glosario"}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === "print"   && <PrintTab />}
        {tab === "glossary" && <GlossaryTab />}
      </div>
    </main>
  );
}
