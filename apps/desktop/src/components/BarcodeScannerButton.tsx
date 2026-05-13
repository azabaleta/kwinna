import { useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Camera, ShieldOff, Settings, X } from "lucide-react";
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
      // windowed: true keeps the camera inside the existing WebView window,
      // allowing the React scanning overlay to remain visible on top.
      // windowed: false launches a separate native Activity that completely
      // covers the WebView, making it impossible to show a React cancel button.
      //
      // Do NOT call requestPermissions() or checkPermissions() before scan() —
      // both can cause a Kotlin lateinit crash because the ActivityResultLauncher
      // is not initialized outside of the scan() lifecycle.
      const result = await scan({ windowed: true, formats });

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
  // With windowed:true the camera renders behind the WebView. We render a
  // full-screen portal overlay on top so the rest of the app is hidden and the
  // user sees the camera through the transparent scanning zone.
  if (isScanning) {
    return (
      <>
        {/* Ghost placeholder to preserve search-bar layout */}
        <div className="w-[34px] h-[34px] flex-shrink-0" />

        {createPortal(
          <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: "transparent" }}>
            {/* ── Top dark band ── */}
            <div className="bg-black/80 flex items-end justify-center pb-3" style={{ flex: 3 }}>
              <p className="text-white/70 text-sm tracking-wide">
                Apuntá la cámara al código
              </p>
            </div>

            {/* ── Middle row: side strips + transparent scanning window ── */}
            <div className="flex" style={{ flex: 4 }}>
              <div className="bg-black/80" style={{ flex: 1 }} />

              {/* Camera shows through this area (transparent background) */}
              <div className="relative" style={{ flex: 8, background: "transparent" }}>
                {/* Corner frame markers */}
                <span className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-white/90 rounded-tl" />
                <span className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-white/90 rounded-tr" />
                <span className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-white/90 rounded-bl" />
                <span className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-white/90 rounded-br" />
                {/* Animated scan line */}
                <div
                  className="absolute left-1 right-1 h-px bg-white/50"
                  style={{ top: "50%", boxShadow: "0 0 6px 1px rgba(255,255,255,0.4)" }}
                />
              </div>

              <div className="bg-black/80" style={{ flex: 1 }} />
            </div>

            {/* ── Bottom dark band with cancel button ── */}
            <div
              className="bg-black/80 flex flex-col items-center justify-start gap-4 pt-6"
              style={{ flex: 5 }}
            >
              <p className="text-white/40 text-xs">
                El código debe estar dentro del marco
              </p>
              <button
                type="button"
                onClick={handleCancel}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 active:bg-white/30
                           text-white border border-white/25 rounded-full px-8 py-3
                           text-sm font-medium transition-colors"
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
