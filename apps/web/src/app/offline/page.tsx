"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white gap-6 px-6 text-center">
      <div className="text-6xl font-bold tracking-tighter">K</div>
      <h1 className="text-xl font-semibold">Sin conexión</h1>
      <p className="text-sm text-zinc-400 max-w-xs">
        No hay internet en este momento. Conectate y volvé a intentarlo.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 rounded-full bg-white text-black px-6 py-2 text-sm font-medium hover:bg-zinc-200 transition-colors"
      >
        Reintentar
      </button>
    </div>
  );
}
