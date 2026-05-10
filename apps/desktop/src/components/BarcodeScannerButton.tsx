import { useState, useEffect } from "react";
import { Camera, X, ShieldOff } from "lucide-react";
import {
  scan,
  cancel,
  Format,
  checkPermissions,
  requestPermissions,
  type PermissionState,
} from "@tauri-apps/plugin-barcode-scanner";

// ── Platform detection ────────────────────────────────────────────────────────
// We detect mobile by checking for the Tauri globals AND the userAgent.
// This avoids importing @tauri-apps/plugin-os (which adds a Rust dependency
// just for platform detection) while being reliable inside a Tauri WebView.
function detectMobile(): boolean {
  if (typeof window === "undefined") return false;
  // In Tauri Android/iOS the global __TAURI_INTERNALS__ is always injected.
  const isTauri = Boolean((window as Record<string, unknown>).__TAURI_INTERNALS__);
  if (!isTauri) return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes("android") || ua.includes("iphone") || ua.includes("ipad");
}

export interface BarcodeScannerButtonProps {
  /** Called with the raw scanned string when a barcode is successfully read. */
  onScan: (code: string) => void | Promise<void>;
  /** Barcode formats to accept. Defaults to EAN-8 only. */
  formats?: Format[];
}

export default function BarcodeScannerButton({
  onScan,
  formats = [Format.EAN8],
}: BarcodeScannerButtonProps) {
  const [isMobile,   setIsMobile]   = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [permDenied, setPermDenied] = useState(false);

  useEffect(() => {
    setIsMobile(detectMobile());
  }, []);

  // Only render on mobile platforms.
  if (!isMobile) return null;

  async function handleScan() {
    setPermDenied(false);
    try {
      // 1. Check current permission state before attempting to scan.
      //    Cast to string so TS doesn't complain about the union narrowing —
      //    the actual runtime values include "prompt" and "prompt-with-rationale"
      //    on some Android versions even if the type definition doesn't list them.
      const currentPerm = (await checkPermissions()) as string;

      // 2. If not yet decided, request permission from the user.
      let permission: string = currentPerm;
      if (currentPerm === "prompt" || currentPerm === "prompt-with-rationale") {
        permission = (await requestPermissions()) as string;
      }

      // 3. Hard-stop if denied — show UI feedback instead of a silent failure.
      if (permission !== "granted") {
        setPermDenied(true);
        return;
      }

      setIsScanning(true);

      // 4. Open native scanner overlay.
      const result = await scan({ windowed: true, formats });

      if (result?.content) {
        await onScan(result.content);
      }
    } catch {
      // User cancelled the scan by pressing the back button — not an error.
    } finally {
      setIsScanning(false);
    }
  }

  async function handleCancel() {
    try {
      await cancel();
    } catch {
      // Ignore cancel errors — scanner may have already closed.
    } finally {
      setIsScanning(false);
    }
  }

  // ── Permission denied state ───────────────────────────────────────────────
  if (permDenied) {
    return (
      <button
        type="button"
        onClick={() => setPermDenied(false)}
        title="Permiso de cámara denegado. Tocá para reintentar."
        className="bg-amber-950/60 text-amber-400 p-2.5 rounded-lg border border-amber-800/50
                   flex items-center justify-center transition-colors flex-shrink-0"
      >
        <ShieldOff size={15} />
      </button>
    );
  }

  // ── Scanning in progress ──────────────────────────────────────────────────
  if (isScanning) {
    return (
      <button
        type="button"
        onClick={handleCancel}
        title="Cancelar escaneo"
        className="bg-red-900/50 hover:bg-red-900/70 text-red-400 p-2.5 rounded-lg border border-red-800/50
                   flex items-center justify-center transition-colors flex-shrink-0"
      >
        <X size={15} />
      </button>
    );
  }

  // ── Default: camera button ────────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleScan}
      title="Escanear código de barras"
      className="bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 p-2.5 rounded-lg border
                 border-zinc-700 transition-colors flex items-center justify-center flex-shrink-0"
    >
      <Camera size={15} />
    </button>
  );
}

// Re-export type for consumers that need to type the permission state
export type { PermissionState };
