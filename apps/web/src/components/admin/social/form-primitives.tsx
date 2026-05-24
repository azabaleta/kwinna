"use client";

import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
}

// ─── FormField ────────────────────────────────────────────────────────────────

interface FormFieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn("mb-4", className)}>
      <label className="mb-1 block text-sm font-semibold text-foreground">{label}</label>
      {hint && <p className="mb-1 text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

// ─── FormCard ─────────────────────────────────────────────────────────────────

interface FormCardProps {
  children: ReactNode;
  className?: string;
}

export function FormCard({ children, className }: FormCardProps) {
  return (
    <div className={cn("mb-4 rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

// ─── MetricRow ────────────────────────────────────────────────────────────────

interface MetricRowProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  hint?: string;
}

export function MetricRow({ label, value, onChange, hint }: MetricRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-2 last:border-0">
      <div className="min-w-0 flex-1">
        <span className="text-sm text-foreground">{label}</span>
        {hint && <span className="ml-1 text-xs text-muted-foreground">({hint})</span>}
      </div>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="—"
        className="w-28 text-right"
      />
    </div>
  );
}

// ─── PctRow ───────────────────────────────────────────────────────────────────

interface PctRowProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

export function PctRow({ label, value, onChange }: PctRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-2 last:border-0">
      <span className="flex-1 text-sm text-foreground">{label}</span>
      <div className="flex items-center gap-1">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="—"
          min={0}
          max={100}
          className="w-20 text-right"
        />
        <span className="text-sm text-muted-foreground">%</span>
      </div>
    </div>
  );
}

// ─── FormSelect ───────────────────────────────────────────────────────────────

interface FormSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: (string | SelectOption)[];
  placeholder?: string;
}

export function FormSelect({ value, onChange, options, placeholder = "Seleccioná..." }: FormSelectProps) {
  const normalized = options.map((o) =>
    typeof o === "string" ? { value: o, label: o } : o
  );
  // Filter out empty-value placeholder options — shadcn handles placeholder via prop
  const valid = normalized.filter((o) => o.value !== "");

  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {valid.map(({ value: val, label }) => (
          <SelectItem key={val} value={val}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── UrgencyBadge ─────────────────────────────────────────────────────────────

type UrgencyType = "critico" | "urgente" | "sabado";

const URGENCY_STYLES: Record<UrgencyType, string> = {
  critico: "border-red-200 bg-red-100 text-red-700",
  urgente: "border-amber-200 bg-amber-100 text-amber-700",
  sabado:  "border-blue-200 bg-blue-100 text-blue-700",
};

const URGENCY_LABELS: Record<UrgencyType, string> = {
  critico: "⚡ Cargar antes de las 24 hs",
  urgente: "⏱ Cargar dentro de las 48 hs",
  sabado:  "📅 Completar el sábado",
};

interface UrgencyBadgeProps {
  type: UrgencyType;
}

export function UrgencyBadge({ type }: UrgencyBadgeProps) {
  return (
    <span className={cn("inline-block rounded-full border px-2 py-1 text-xs font-semibold", URGENCY_STYLES[type])}>
      {URGENCY_LABELS[type]}
    </span>
  );
}

// ─── SectionTitle ─────────────────────────────────────────────────────────────

interface SectionTitleProps {
  icon: string;
  title: string;
  badge?: UrgencyType;
}

export function SectionTitle({ icon, title, badge }: SectionTitleProps) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="text-2xl">{icon}</span>
      <div>
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        {badge && <UrgencyBadge type={badge} />}
      </div>
    </div>
  );
}

// ─── AddButton ────────────────────────────────────────────────────────────────

interface AddButtonProps {
  onClick: () => void;
  label: string;
}

export function AddButton({ onClick, label }: AddButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 flex items-center gap-2 text-sm font-semibold text-primary transition hover:opacity-70"
    >
      <span className="text-lg leading-none">＋</span>
      {label}
    </button>
  );
}

// ─── RemoveButton ─────────────────────────────────────────────────────────────

interface RemoveButtonProps {
  onClick: () => void;
}

export function RemoveButton({ onClick }: RemoveButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium text-muted-foreground transition hover:text-destructive"
    >
      Eliminar
    </button>
  );
}
