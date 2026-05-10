import { useState, useEffect } from "react";
import { Camera, X, ShieldOff } from "lucide-react";
import {
  scan,
  cancel,
  Format,
  checkPermissions,
  requestPermissions,
} from "@tauri-apps/plugin-barcode-scanner";
import { platform } from "@tauri-apps/api/core";

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
  const [isMobile,        setIsMobile]        = useState(false);
  const [isScanning,      setIsScanning]       = useState(false);
  const [permDenied,      setPermDenied]       = useState(false);

  useEffect(() => {
    // Use Tauri's native platform() API — more reliable than navigator.userAgent
    // inside a Tauri WebView, especially on Android.
    platform()
      .then((p) => setIsMobile(p === "android" || p === "ios"))
      .catch(() => {
        // Fallback: if platform() is unavailable (e.g. running in plain browser),
        // stay hidden — this feature is mobile-only.
        setIsMobile(false);
      });
  }, []);

  // Only render on mobile platforms.
  if (!isMobile) return null;

  async function handleScan() {
    setPermDenied(false);
    try {
      // 1. Check current permission state before attempting to scan.
      let permission = await checkPermissions();

      // 2. If not yet decided, request permission from the user.
      if (permission === "prompt" || permission === "prompt-with-rationale") {
        permission = await requestPermissions();
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

