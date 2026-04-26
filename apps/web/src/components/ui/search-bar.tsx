"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SearchBarProps {
  /** Placeholder shown inside the input. */
  placeholder?: string;
  /** Additional classes applied to the wrapper. */
  className?: string;
  /** Debounce delay in ms (default: 350). */
  debounceMs?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SearchBar({
  placeholder = "Buscar piezas…",
  className,
  debounceMs = 350,
}: SearchBarProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  // Controlled value mirrors the URL param — stays in sync on navigation.
  const [value, setValue] = useState(() => searchParams.get("q") ?? "");

  // Track whether the user is actively typing to avoid resetting the input
  // mid-keystroke when Next.js re-renders the page after router.push.
  const isTypingRef = useRef(false);

  // Keep controlled value in sync when the URL changes externally (e.g. back button),
  // but ONLY when the user is not actively typing — otherwise the sync resets the
  // input on mobile browsers and the search appears "broken".
  useEffect(() => {
    if (!isTypingRef.current) {
      setValue(searchParams.get("q") ?? "");
    }
  }, [searchParams]);

  // ── Debounced URL push ───────────────────────────────────────────────────

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pushQuery = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) {
        params.set("q", q);
      } else {
        params.delete("q");
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });

      // After pushing, mark typing as finished so subsequent URL changes
      // (e.g. browser back) sync normally again.
      isTypingRef.current = false;
    },
    [router, pathname, searchParams],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    isTypingRef.current = true;
    setValue(next);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => pushQuery(next), debounceMs);
  }

  function handleClear() {
    isTypingRef.current = false;
    setValue("");
    if (timerRef.current) clearTimeout(timerRef.current);
    pushQuery("");
  }

  // Submit on Enter — flush the debounce immediately and dismiss mobile keyboard.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (timerRef.current) clearTimeout(timerRef.current);
      pushQuery(value);
      (e.target as HTMLInputElement).blur(); // dismiss mobile keyboard
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={cn("relative w-full max-w-sm", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label="Buscar productos"
        className="h-9 pl-8 pr-8 text-sm [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Limpiar búsqueda"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

