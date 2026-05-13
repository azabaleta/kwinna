import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Camera, ShieldOff, Settings, ScanLine, X } from "lucide-react";
import {
  scan,
  cancel,
  Format,
  openAppSettings,
  type PermissionState,
} from "@tauri-apps/plugin-barcode-scanner";

// ── Platform detection ────────────────────────────────────────────────────────
// navigator.userAgent is synchronous and always available — no async IPC,
// no race condition, no flash of null on first render.
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
  const [isMobile]                      = useState(() => isAndroidWebView());
  const [isConfirming, setIsConfirming] = useState(false);
  const [isScanning,   setIsScanning]   = useState(false);
  const [permDenied,   setPermDenied]   = useState(false);
  const [scanError,    setScanError]    = useState<string | null>(null);

  if (!isMobile) return null;

  // ── Step 1: user presses camera button → show pre-scan confirmation ──────
  // windowed:false launches a native Android Activity that completely covers
  // the WebView. React UI is invisible while the camera is open, so it's
  // impossible to show a cancel button inside the camera. This confirmation
  // screen lets the user cancel BEFORE the camera opens, and informs them
  // that the system back gesture closes the camera if needed.
  function handlePress() {
    setScanError(null);
    setPermDenied(false);
    setIsConfirming(true);
  }

  // ── Step 2: user confirms → open camera ─────────────────────────────────
  async function handleScan() {
    setIsConfirming(false);
    setIsScanning(true);
    try {
      // Do NOT call requestPermissions() or checkPermissions() before scan() —
      // both cause a Kotlin lateinit crash because ActivityResultLauncher is
      // not initialized outside of the scan() lifecycle.
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
      // ignore
    } finally {
      setIsScanning(false);
    }
  }

  // ── Permission denied ────────────────────────────────────────────────────
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

  // ── Scan error ───────────────────────────────────────────────────────────
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

  // ── Pre-scan confirmation overlay ────────────────────────────────────────
  if (isConfirming) {
    return (
      <>
        <div className="w-[34px] h-[34px] flex-shrink-0" />
        {createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col items-center justify-center gap-6 px-8">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700
                            flex items-center justify-center">
              <ScanLine size={32} className="text-zinc-300" />
            </div>

            <div className="text-center flex flex-col gap-1.5">
              <p className="text-white text-base font-medium">
                Escanear código
              </p>
              <p className="text-zinc-400 text-sm leading-relaxed">
                La cámara se abrirá en pantalla completa.{"\n"}
                Deslizá desde el borde ← para cancelar.
              </p>
            </div>

            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                type="button"
                onClick={handleScan}
                className="w-full bg-white text-zinc-900 rounded-xl py-3.5 text-sm font-semibold
                           flex items-center justify-center gap-2 active:bg-zinc-100 transition-colors"
              >
                <Camera size={16} />
                Abrir cámara
              </button>
              <button
                type="button"
                onClick={() => setIsConfirming(false)}
                className="w-full bg-zinc-800 text-zinc-300 rounded-xl py-3.5 text-sm font-medium
                           flex items-center justify-center gap-2 active:bg-zinc-700 transition-colors
                           border border-zinc-700"
              >
                <X size={15} />
                Cancelar
              </button>
            </div>
          </div>,
          document.body
        )}
      </>
    );
  }

  // ── Scanning in progress (native Activity is open, WebView is hidden) ────
  if (isScanning) {
    return (
      <button
        type="button"
        onClick={handleCancel}
        className="bg-red-900/50 text-red-400 p-2.5 rounded-lg border border-red-800/50
                   flex items-center justify-center transition-colors flex-shrink-0"
      >
        <X size={15} />
      </button>
    );
  }

  // ── Default: camera button ───────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handlePress}
      title="Escanear código de barras"
      className="bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 p-2.5 rounded-lg border
                 border-zinc-700 transition-colors flex items-center justify-center flex-shrink-0"
    >
      <Camera size={15} />
    </button>
  );
}

export type { PermissionState };
