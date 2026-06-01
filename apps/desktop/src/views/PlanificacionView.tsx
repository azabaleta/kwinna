import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  fetchSemanaHtml,
  fetchSemanas,
  type SemanaListItem,
} from "../services/planificacion";

export default function PlanificacionView() {
  const [semanas,       setSemanas]       = useState<SemanaListItem[]>([]);
  const [semanaActual,  setSemanaActual]  = useState<number | null>(null);
  const [htmlContent,   setHtmlContent]   = useState("");
  const [cargando,      setCargando]      = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    fetchSemanas()
      .then((data) => {
        setSemanas(data);
        if (data.length > 0) cargarSemana(data[0]!.semana);
      })
      .catch(() => setError("No se pudo conectar con el servidor"));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarSemana(n: number) {
    setCargando(true);
    setError(null);
    setSemanaActual(n);
    try {
      const html = await fetchSemanaHtml(n);
      setHtmlContent(html);
    } catch {
      setError("No se pudo cargar la semana seleccionada");
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3
                      border-b border-zinc-800" style={{ background: "#E1306C" }}>
        <span className="text-white font-bold text-base">Planificación</span>
        {semanaActual !== null && (
          <span className="text-white/70 text-sm">Semana {semanaActual}</span>
        )}
        {cargando && (
          <RefreshCw size={14} className="text-white/70 animate-spin ml-auto" />
        )}
      </div>

      {/* Selector de semanas */}
      {semanas.length > 1 && (
        <div className="flex-shrink-0 flex gap-2 px-3 py-2.5 bg-white border-b
                        border-zinc-200 overflow-x-auto">
          {semanas.map((s) => (
            <button
              key={s.semana}
              onClick={() => cargarSemana(s.semana)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold
                         transition-colors whitespace-nowrap"
              style={{
                background: semanaActual === s.semana ? "#E1306C" : "#f0f0f0",
                color:      semanaActual === s.semana ? "white"   : "#555",
              }}
            >
              Sem. {s.semana}{s.periodo ? ` · ${s.periodo}` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Área de contenido */}
      <div className="flex-1 overflow-hidden relative">

        {cargando && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#f0f0f0]">
            <span className="text-zinc-400 text-sm">Cargando fichas…</span>
          </div>
        )}

        {error && (
          <div className="p-6 text-center text-red-500 text-sm">{error}</div>
        )}

        {!cargando && !error && htmlContent && (
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-none"
            title={`Fichas semana ${semanaActual}`}
            sandbox="allow-same-origin"
          />
        )}

        {!cargando && !error && !htmlContent && semanas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
            <span className="text-4xl">📋</span>
            <p className="text-sm">Todavía no hay fichas disponibles.</p>
            <p className="text-xs">Se generan automáticamente cada domingo a las 18:00 hs.</p>
          </div>
        )}
      </div>
    </div>
  );
}
