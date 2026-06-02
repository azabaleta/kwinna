import { useEffect, useRef, useState } from "react";
import { CheckSquare, MessageSquare, RefreshCw, Send, Square, Trash2 } from "lucide-react";
import { useAuthStore } from "../store/use-auth-store";
import {
  deleteComentario,
  fetchInteraccion,
  fetchSemanaHtml,
  fetchSemanaJson,
  fetchSemanas,
  patchRealizada,
  postComentario,
  type ComentarioRow,
  type Interaccion,
  type Pieza,
  type SemanaListItem,
} from "../services/planificacion";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLATAFORMA_COLOR: Record<string, string> = {
  Instagram: "#E1306C",
  TikTok:    "#111111",
};
const colorPlat = (p: string) => PLATAFORMA_COLOR[p] ?? "#0A7ABF";

// ─── Componente de una sola ficha en el tab Seguimiento ───────────────────────

function FichaCard({
  pieza,
  realizada,
  comentarios,
  currentUserId,
  onToggle,
  onAddComentario,
  onDeleteComentario,
}: {
  pieza:             Pieza;
  realizada:         boolean;
  comentarios:       ComentarioRow[];
  currentUserId:     string;
  onToggle:          (piezaId: string, val: boolean) => void;
  onAddComentario:   (piezaId: string, texto: string) => Promise<void>;
  onDeleteComentario:(id: number, piezaId: string) => Promise<void>;
}) {
  const [texto,    setTexto]    = useState("");
  const [enviando, setEnviando] = useState(false);
  const [abierto,  setAbierto]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleEnviar(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    setEnviando(true);
    try {
      await onAddComentario(pieza.id, texto.trim());
      setTexto("");
    } finally {
      setEnviando(false);
    }
  }

  const totalComentarios = comentarios.length;

  return (
    <div className={`rounded-xl border transition-colors overflow-hidden ${
      realizada ? "border-zinc-700 bg-zinc-900/60" : "border-zinc-700 bg-zinc-900"
    }`}>

      {/* Barra de plataforma + estado */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: realizada ? "#2a2a2a" : colorPlat(
          pieza.plataforma === "Alternativo" && pieza.canal_alternativo
            ? pieza.canal_alternativo
            : pieza.plataforma
        ) }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-sm">
            {pieza.plataforma === "Alternativo" && pieza.canal_alternativo
              ? pieza.canal_alternativo
              : pieza.plataforma}
            {pieza.formato ? ` · ${pieza.formato}` : ""}
          </span>
          <span className="text-white/60 text-xs">
            {pieza.tipo === "IA" ? "🤖 IA" : "🎬 Propia"}
          </span>
        </div>
        <span className="text-white/80 text-xs font-medium">{pieza.dia_hora}</span>
      </div>

      {/* Contenido */}
      <div className="px-4 py-3 flex flex-col gap-3">

        {/* Gancho */}
        <p className={`text-sm leading-snug ${realizada ? "text-zinc-500 line-through" : "text-zinc-200"}`}>
          {pieza.gancho || <span className="italic text-zinc-600">Sin gancho</span>}
        </p>

        {/* Checkbox realizada */}
        <button
          onClick={() => onToggle(pieza.id, !realizada)}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: realizada ? "#a3e635" : "#71717a" }}
        >
          {realizada
            ? <CheckSquare size={18} className="text-lime-400" />
            : <Square size={18} />
          }
          {realizada ? "Realizada" : "Marcar como realizada"}
        </button>

        {/* Toggle comentarios */}
        <button
          onClick={() => { setAbierto(!abierto); setTimeout(() => inputRef.current?.focus(), 50); }}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors w-fit"
        >
          <MessageSquare size={13} />
          {totalComentarios > 0
            ? `${totalComentarios} comentario${totalComentarios !== 1 ? "s" : ""}`
            : "Agregar nota"}
        </button>

        {/* Panel de comentarios */}
        {abierto && (
          <div className="flex flex-col gap-2 pt-1 border-t border-zinc-800">

            {comentarios.map((c) => (
              <div key={c.id} className="flex items-start gap-2 group">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-zinc-400">{c.userName} </span>
                  <span className="text-xs text-zinc-300">{c.texto}</span>
                </div>
                {c.userId === currentUserId && (
                  <button
                    onClick={() => onDeleteComentario(c.id, pieza.id)}
                    className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400
                               transition-all flex-shrink-0 mt-0.5"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            <form onSubmit={handleEnviar} className="flex gap-2 mt-1">
              <input
                ref={inputRef}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Agregar una nota..."
                className="flex-1 bg-zinc-800 text-white text-xs rounded-lg px-3 py-2
                           border border-zinc-700 focus:border-zinc-500 outline-none
                           placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={enviando || !texto.trim()}
                className="bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg px-3
                           disabled:opacity-40 transition-colors flex-shrink-0"
              >
                <Send size={13} />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vista principal ──────────────────────────────────────────────────────────

type Tab = "fichas" | "seguimiento";

export default function PlanificacionView() {
  const currentUser   = useAuthStore((s) => s.user);
  const currentUserId = currentUser?.id ?? "";

  const [semanas,      setSemanas]      = useState<SemanaListItem[]>([]);
  const [semanaActual, setSemanaActual] = useState<number | null>(null);
  const [tab,          setTab]          = useState<Tab>("fichas");
  const [htmlContent,  setHtmlContent]  = useState("");
  const [piezas,       setPiezas]       = useState<Pieza[]>([]);
  const [interaccion,  setInteraccion]  = useState<Interaccion>({ estados: {}, comentarios: {} });
  const [cargando,     setCargando]     = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  // Carga inicial: lista de semanas
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
      const [html, json, iact] = await Promise.all([
        fetchSemanaHtml(n),
        fetchSemanaJson(n),
        fetchInteraccion(n),
      ]);
      setHtmlContent(html);
      setPiezas(json.piezas ?? []);
      setInteraccion(iact);
    } catch {
      setError("No se pudo cargar la semana seleccionada");
    } finally {
      setCargando(false);
    }
  }

  // ── Handlers de interacción (optimistic) ─────────────────────────────────

  async function handleToggle(piezaId: string, val: boolean) {
    // Optimistic
    setInteraccion((prev) => ({
      ...prev,
      estados: {
        ...prev.estados,
        [piezaId]: {
          piezaId,
          realizada:            val,
          actualizadoEn:        new Date().toISOString(),
          actualizadoPorNombre: currentUser?.name ?? null,
        },
      },
    }));
    try {
      const row = await patchRealizada(semanaActual!, piezaId, val);
      setInteraccion((prev) => ({
        ...prev,
        estados: { ...prev.estados, [piezaId]: row },
      }));
    } catch {
      // Revertir
      setInteraccion((prev) => ({
        ...prev,
        estados: {
          ...prev.estados,
          [piezaId]: { ...prev.estados[piezaId]!, realizada: !val },
        },
      }));
    }
  }

  async function handleAddComentario(piezaId: string, texto: string) {
    const row = await postComentario(semanaActual!, piezaId, texto);
    setInteraccion((prev) => ({
      ...prev,
      comentarios: {
        ...prev.comentarios,
        [piezaId]: [...(prev.comentarios[piezaId] ?? []), row],
      },
    }));
  }

  async function handleDeleteComentario(id: number, piezaId: string) {
    await deleteComentario(id);
    setInteraccion((prev) => ({
      ...prev,
      comentarios: {
        ...prev.comentarios,
        [piezaId]: (prev.comentarios[piezaId] ?? []).filter((c) => c.id !== id),
      },
    }));
  }

  // ── Contadores para el tab de seguimiento ────────────────────────────────

  const realizadas = piezas.filter((p) => interaccion.estados[p.id]?.realizada).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">

      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-zinc-800"
           style={{ background: "#70005E" }}>
        <span className="text-white font-bold text-base">Planificación</span>
        {semanaActual !== null && (
          <span className="text-white/70 text-sm">Semana {semanaActual}</span>
        )}
        {cargando && <RefreshCw size={14} className="text-white/70 animate-spin ml-auto" />}
      </div>

      {/* Selector de semanas */}
      {semanas.length > 1 && (
        <div className="flex-shrink-0 flex gap-2 px-3 py-2.5 bg-white border-b border-zinc-200 overflow-x-auto">
          {semanas.map((s) => (
            <button
              key={s.semana}
              onClick={() => cargarSemana(s.semana)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap"
              style={{
                background: semanaActual === s.semana ? "#70005E" : "#f0f0f0",
                color:      semanaActual === s.semana ? "white"   : "#555",
              }}
            >
              Sem. {s.semana}{s.periodo ? ` · ${s.periodo}` : ""}
            </button>
          ))}
        </div>
      )}

      {/* Tabs fichas / seguimiento */}
      {semanaActual !== null && !cargando && !error && (
        <div className="flex-shrink-0 flex bg-zinc-900 border-b border-zinc-800">
          <button
            onClick={() => setTab("fichas")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              tab === "fichas"
                ? "text-white border-b-2 border-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Fichas
          </button>
          <button
            onClick={() => setTab("seguimiento")}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors ${
              tab === "seguimiento"
                ? "text-white border-b-2 border-white"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Seguimiento
            {piezas.length > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                realizadas === piezas.length
                  ? "bg-lime-500/20 text-lime-400"
                  : "bg-zinc-700 text-zinc-400"
              }`}>
                {realizadas}/{piezas.length}
              </span>
            )}
          </button>
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

        {!cargando && !error && semanas.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-zinc-400">
            <span className="text-4xl">📋</span>
            <p className="text-sm">Todavía no hay fichas disponibles.</p>
            <p className="text-xs">Se generan automáticamente cada domingo a las 18:00 hs.</p>
          </div>
        )}

        {/* Tab: Fichas (iframe) */}
        {!cargando && !error && tab === "fichas" && htmlContent && (
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-none"
            title={`Fichas semana ${semanaActual}`}
            sandbox="allow-same-origin"
          />
        )}

        {/* Tab: Seguimiento */}
        {!cargando && !error && tab === "seguimiento" && (
          <div className="h-full overflow-y-auto">
            {piezas.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 text-sm">
                No hay piezas en esta semana.
              </div>
            ) : (
              <div className="flex flex-col gap-3 p-4">
                {/* Barra de progreso */}
                <div className="flex flex-col gap-1.5 bg-zinc-900 rounded-xl px-4 py-3 border border-zinc-800">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Progreso de la semana</span>
                    <span className="font-semibold text-white">{realizadas} / {piezas.length}</span>
                  </div>
                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width:      `${piezas.length > 0 ? (realizadas / piezas.length) * 100 : 0}%`,
                        background: realizadas === piezas.length ? "#a3e635" : "#70005E",
                      }}
                    />
                  </div>
                </div>

                {piezas.map((pieza) => (
                  <FichaCard
                    key={pieza.id}
                    pieza={pieza}
                    realizada={interaccion.estados[pieza.id]?.realizada ?? false}
                    comentarios={interaccion.comentarios[pieza.id] ?? []}
                    currentUserId={currentUserId}
                    onToggle={handleToggle}
                    onAddComentario={handleAddComentario}
                    onDeleteComentario={handleDeleteComentario}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
