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
import { platform } from "@tauri-apps/plugin-os";

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
    // platform() from @tauri-apps/plugin-os is the correct Tauri v2 API.
    // It communicates with the Rust tauri-plugin-os crate via IPC.
    platform()
      .then((p) => setIsMobile(p === "android" || p === "ios"))
      .catch(() => setIsMobile(false));
  }, []);

  // Only render on mobile platforms.
  if (!isMobile) return null;

  async function handleScan() {
    setPermDenied(false);
    try {
      // 1. Check current permission state before attempting to scan.
      //    Cast to string: runtime Android may return "prompt" / "prompt-with-rationale"
      //    even if the TS union only declares "denied" | "granted".
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
