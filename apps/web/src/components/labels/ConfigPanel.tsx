"use client";

import { Download, Loader2, ChevronLeft, ChevronRight, AlertCircle, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { type LayoutConfig, type GridLayout } from "@/lib/layout";

interface ConfigPanelProps {
  config: LayoutConfig;
  onChange: (c: LayoutConfig) => void;
  rawInput: string;
  onRawInputChange: (v: string) => void;
  codes: string[];
  invalid: string[];
  layout: GridLayout;
  currentPage: number;
  onPageChange: (p: number) => void;
  onDownload: () => void;
  isGenerating: boolean;
  logoDataUrl: string | null;
  onLogoChange: (url: string | null) => void;
}

function SliderField({ label, value, min, max, step = 0.5, unit = "mm", onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label className="text-gray-300">{label}</Label>
        <span className="text-xs text-gray-300 tabular-nums">{value} {unit}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={(vals: number[]) => onChange(vals[0]!)} />
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div className={className}>
      <p className="text-gray-500">{label}</p>
      <p className="text-gray-100 font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function ConfigPanel({
  config, onChange, rawInput, onRawInputChange,
  codes, invalid, layout, currentPage, onPageChange,
  onDownload, isGenerating, logoDataUrl, onLogoChange,
}: ConfigPanelProps) {
  const set = (key: keyof LayoutConfig) => (value: number) => onChange({ ...config, [key]: value });

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onLogoChange(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col h-full p-4 gap-6 bg-gray-950 text-gray-100">
      <section className="space-y-2">
        <Label className="text-gray-200 text-sm font-semibold uppercase tracking-wide">Códigos</Label>
        <Textarea
          placeholder={"1234567\n7654321\n1111111"}
          value={rawInput}
          onChange={(e) => onRawInputChange(e.target.value)}
          className="h-36 bg-gray-900 border-gray-700 text-gray-100"
        />
        <p className="text-xs text-gray-500">Un código por línea o separados por comas. 7 dígitos (checksum auto) u 8 dígitos.</p>
        {invalid.length > 0 && (
          <div className="flex items-start gap-1.5 text-amber-400 text-xs">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>Ignorados: {invalid.join(", ")}</span>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <Label className="text-gray-200 text-sm font-semibold uppercase tracking-wide">Logo</Label>
        {logoDataUrl ? (
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoDataUrl} alt="logo" className="h-8 max-w-[120px] object-contain rounded" />
            <button onClick={() => onLogoChange(null)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors ml-auto">
              <X className="w-3.5 h-3.5" /> Quitar
            </button>
          </div>
        ) : (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-400 hover:text-gray-200 transition-colors">
            <Upload className="w-4 h-4 shrink-0" />
            <span>Subir logo…</span>
            <input type="file" accept="image/*" className="sr-only" onChange={handleLogoFile} />
          </label>
        )}
        <p className="text-xs text-gray-600">PNG o JPG. Se mostrará encima del código.</p>
      </section>

      <section className="space-y-4">
        <Label className="text-gray-200 text-sm font-semibold uppercase tracking-wide">Etiqueta</Label>
        <SliderField label="Ancho"              value={config.labelWidth}   min={20} max={100} onChange={set("labelWidth")} />
        <SliderField label="Alto"               value={config.labelHeight}  min={10} max={60}  onChange={set("labelHeight")} />
        <SliderField label="Gap entre etiquetas" value={config.gap}          min={0}  max={10}  onChange={set("gap")} />
        <SliderField label="Texto descripción"  value={config.descFontSize} min={2}  max={14}  step={0.5} unit="pt" onChange={set("descFontSize")} />
      </section>

      <section className="space-y-4">
        <Label className="text-gray-200 text-sm font-semibold uppercase tracking-wide">Márgenes</Label>
        <SliderField label="Superior"  value={config.marginTop}    min={0} max={30} onChange={set("marginTop")} />
        <SliderField label="Inferior"  value={config.marginBottom} min={0} max={30} onChange={set("marginBottom")} />
        <SliderField label="Izquierdo" value={config.marginLeft}   min={0} max={30} onChange={set("marginLeft")} />
        <SliderField label="Derecho"   value={config.marginRight}  min={0} max={30} onChange={set("marginRight")} />
      </section>

      <section className="mt-auto space-y-3">
        <div className="rounded-lg bg-gray-900 border border-gray-800 p-3 grid grid-cols-2 gap-2 text-xs">
          <Stat label="Códigos"      value={codes.length} />
          <Stat label="Por hoja"     value={layout.labelsPerPage} />
          <Stat label="Columnas"     value={layout.cols} />
          <Stat label="Filas"        value={layout.rows} />
          <Stat label="Hojas totales" value={layout.totalPages} className="col-span-2" />
        </div>

        {layout.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-400">Página {currentPage} / {layout.totalPages}</span>
            <Button variant="ghost" size="icon" onClick={() => onPageChange(Math.min(layout.totalPages, currentPage + 1))} disabled={currentPage === layout.totalPages}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <Button className="w-full" onClick={onDownload} disabled={codes.length === 0 || isGenerating}>
          {isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generando…</> : <><Download className="w-4 h-4" /> Descargar PDF</>}
        </Button>
      </section>
    </div>
  );
}
