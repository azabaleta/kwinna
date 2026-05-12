import { useState } from "react";
import { AlertCircle, Camera, X, ShieldOff } from "lucide-react";
import {
  scan,
  cancel,
  Format,
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
  /** Barcode formats to accept. Defaults to EAN-8 only. */
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
    try {
      setIsScanning(true);

      // scan() internally checks and requests camera permission on Android.
      // Calling requestPermissions() separately causes a Kotlin lateinit crash
      // in tauri-plugin-barcode-scanner because the ActivityResultLauncher
      // is not initialized when invoked outside of the scan() lifecycle.
      const result = await scan({ windowed: false, formats });

      if (result?.content) {
        await onScan(result.content);
      }
    } catch (err) {
      setIsScanning(false);
      const msg = err instanceof Error
        ? err.message
        : JSON.stringify(err, null, 2);

      // Detect permission denial
      if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
        setPermDenied(true);
        return;
      }
      // Ignore user-initiated cancel (back button)
      if (!msg.toLowerCase().includes("cancel") && msg !== "null" && msg !== "{}") {
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

  // ── Scanner error ─────────────────────────────────────────────────────────
  if (scanError) {
    return (
      <button
        type="button"
        onClick={() => setScanError(null)}
        title={`Error: ${scanError}. Tocá para reintentar.`}
        className="bg-red-950/60 text-red-400 p-2.5 rounded-lg border border-red-800/50
                   flex items-center justify-center transition-colors flex-shrink-0"
      >
        <AlertCircle size={15} />
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
