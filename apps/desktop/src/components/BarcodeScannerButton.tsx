import { useState } from "react";
import { AlertCircle, Camera, X, ShieldOff, Settings } from "lucide-react";
import {
  scan,
  cancel,
  Format,
  openAppSettings,
  type PermissionState,
} from "@tauri-apps/plugin-barcode-scanner";

// ── Platform detection ────────────────────────────────────────────────────────
// We detect Android using navigator.userAgent — it's always synchronous,
// never fails, and the Android WebView UA always contains "Android".
// Using IPC (plugin-os platform()) caused a race condition: the component
// returned null on the first render and the platform() promise sometimes
// failed silently due to missing capability permissions.
function isAndroidWebView(): boolean {
  if (typeof navigator === "undefined") return false;
  return /android/i.test(navigator.userAgent);
}

export interface BarcodeScannerButtonProps {
  /** Called with the raw scanned string when a barcode is successfully read. */
  onScan: (code: string) => void | Promise<void>;
  /** Barcode formats to accept. Defaults to EAN-8 (products). Pass [Format.Code128] for transactions. */
  formats?: Format[];
}

export default function BarcodeScannerButton({
  onScan,
  formats = [Format.EAN8],
}: BarcodeScannerButtonProps) {
  // Initialize synchronously — no async IPC, no flash of null on first render.
  const [isMobile]                    = useState(() => isAndroidWebView());
  const [isScanning, setIsScanning]   = useState(false);
  const [permDenied, setPermDenied]   = useState(false);
  const [scanError,  setScanError]    = useState<string | null>(null);

  // Only render on Android.
  if (!isMobile) return null;

  async function handleScan() {
    setPermDenied(false);
    setScanError(null);
    setIsScanning(true);
    try {
      // scan() handles camera permission internally on Android.
      // Do NOT call requestPermissions() or checkPermissions() before this —
      // both can cause a Kotlin lateinit crash or return false negatives before
      // the ActivityResultLauncher is initialized in the scan() lifecycle.
      const result = await scan({ windowed: false, formats });

      if (result?.content) {
        await onScan(result.content);
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "string"
          ? err
          : JSON.stringify(err);

      // DEBUG: show raw error so we can identify the root cause.
      // Remove this alert once the scanner works correctly.
      alert(`[Scanner debug]\n${msg}`);

      if (
        msg.toLowerCase().includes("permission") ||
        msg.toLowerCase().includes("denied") ||
        msg.toLowerCase().includes("camera")
      ) {
        setPermDenied(true);
        return;
      }
      if (
        !msg.toLowerCase().includes("cancel") &&
        msg !== "null" &&
        msg !== "{}" &&
        msg.trim() !== ""
      ) {
        setScanError(msg);
      }
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
  // Show visible text label on Android (title tooltips don't appear on touch).
  // Tapping opens Android app settings so the user can grant camera access.
  if (permDenied) {
    return (
      <button
        type="button"
        onClick={() => void openAppSettings()}
        className="bg-amber-950/60 text-amber-400 px-2.5 py-2 rounded-lg border border-amber-800/50
                   flex items-center gap-1.5 justify-center transition-colors flex-shrink-0"
      >
        <ShieldOff size={13} />
        <Settings size={11} />
      </button>
    );
  }

  // ── Scanner error state ───────────────────────────────────────────────────
  // Show visible "Error" label — title tooltips are invisible on Android touch.
  // Tapping resets to idle so the user can retry.
  if (scanError) {
    return (
      <button
        type="button"
        onClick={() => setScanError(null)}
        title={scanError}
        className="bg-red-950/60 text-red-400 px-2.5 py-2 rounded-lg border border-red-800/50
                   flex items-center gap-1.5 justify-center transition-colors flex-shrink-0"
      >
        <AlertCircle size={13} />
        <span className="text-[11px] leading-none">Error</span>
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
