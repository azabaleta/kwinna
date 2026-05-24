import { create } from "zustand";
import type {
  SocialFormData,
  SocialFormMeta,
  SocialIGGeneral,
  SocialTTGeneral,
  SocialStory,
  SocialIGPost,
  SocialTTVideo,
  SocialAltPost,
  SocialDMs,
  SocialIGCom,
  SocialTTCom,
  SocialFormContext,
} from "@kwinna/contracts";

// ─── Re-exports for consumers ─────────────────────────────────────────────────
// Los tipos viven en @kwinna/contracts (fuente única de verdad).
// Los re-exportamos desde el store para no cambiar los imports existentes.

export type {
  SocialFormData,
  SocialFormMeta   as FormMeta,
  SocialIGGeneral  as IGGeneral,
  SocialTTGeneral  as TTGeneral,
  SocialStory      as Story,
  SocialIGPost     as IGPost,
  SocialTTVideo    as TTVideo,
  SocialAltPost    as AltPost,
  SocialDMs        as DMsData,
  SocialIGCom      as IGComData,
  SocialTTCom      as TTComData,
  SocialFormContext as FormContextData,
};

// ─── Factory functions ────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2);
}

export function newStory(): SocialStory {
  return {
    id: uid(), fecha: "", hora: "", tipo: "Video", tema: "",
    sticker: false, stickerTipo: "", link: false,
    repros: "", alcanzadas: "", respuestas: "", clicsSticker: "",
    clicsLink: "", navSiguiente: "", salidas: "", tasaSalida: "", nota: "",
  };
}

export function newIGPost(): SocialIGPost {
  return {
    id: uid(), formato: "Reel", fecha: "", hora: "", tema: "", gancho: "",
    duracion: "", audio: "", alcanceOrg: "", alcancePago: "", impresiones: "",
    likes: "", comentarios: "", guardados: "", compartidos: "",
    visitasPerfil: "", clicsBio: "", repros: "", pctNoSeg: "",
    ret3s: "", ret25: "", ret50: "", ret75: "", ret100: "", segAbandono: "", nota: "",
  };
}

export function newTTVideo(): SocialTTVideo {
  return {
    id: uid(), fecha: "", hora: "", tema: "", gancho: "", audio: "", duracion: "",
    vistas: "", likes: "", comentarios: "", compartidos: "", guardados: "",
    nuevosSegs: "", pctNoSeg: "", tiempoPromedio: "", pctCompletacion: "",
    vistasFYP: "", vistasPerfil: "", vistasBusqueda: "", vistasSegs: "", nota: "",
  };
}

export function newAltPost(): SocialAltPost {
  return {
    id: uid(), plataforma: "YouTube Shorts", fecha: "", hora: "", tema: "", gancho: "",
    duracion: "", alcance: "", likes: "", comentarios: "", compartidos: "", guardados: "", nota: "",
  };
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_META: SocialFormMeta = { semana: "", periodoInicio: "", periodoFin: "", operador: "" };

const INITIAL_IG: SocialIGGeneral = {
  segsInicio: "", segsFin: "", nuevosSegs: "", unfollows: "",
  visitasPerfil: "", alcanceTotal: "", impresiones: "", clicsBio: "",
};

const INITIAL_TT: SocialTTGeneral = {
  segsInicio: "", segsFin: "", nuevosSegs: "", unfollows: "",
  visitasPerfil: "", vistas: "", likes: "",
};

const INITIAL_DMS: SocialDMs = {
  volumen: "", temas: ["", "", "", "", ""], frases: ["", "", ""],
  sentimiento: "", destacable: "",
};

const INITIAL_IG_COM: SocialIGCom = {
  postDestacado: "", temas: ["", "", ""], frases: ["", "", ""], sentimiento: "",
};

const INITIAL_TT_COM: SocialTTCom = {
  videoDestacado: "", temas: ["", "", ""], frases: ["", "", ""], sentimiento: "",
};

const INITIAL_CTX: SocialFormContext = {
  eventoLocal: "", cambiosLocal: "", recursosProduccion: "", viralFlop: "", observaciones: "",
  fechaEspecial: "", eventoProximo: "", mercaderiaProxima: "", mercaderiaDetalle: "",
  promocionProxima: "", diasFilmacion: "", restricciones: "", instruccionLibre: "",
};

export const INITIAL_FORM_DATA: SocialFormData = {
  meta:     INITIAL_META,
  igG:      INITIAL_IG,
  ttG:      INITIAL_TT,
  prevIg:   INITIAL_IG,
  prevTt:   INITIAL_TT,
  stories:  [newStory()],
  igPosts:  [newIGPost()],
  ttVideos: [newTTVideo()],
  altPosts: [],
  dms:      INITIAL_DMS,
  igCom:    INITIAL_IG_COM,
  ttCom:    INITIAL_TT_COM,
  ctx:      INITIAL_CTX,
};

// ─── Store interface ──────────────────────────────────────────────────────────

interface SocialFormState extends SocialFormData {
  lastUpdated: string | null;
  hasHydrated: boolean;
}

interface SocialFormActions {
  setMeta:        (v: SocialFormMeta)    => void;
  setIgG:         (v: SocialIGGeneral)   => void;
  setTtG:         (v: SocialTTGeneral)   => void;
  setPrevIg:      (v: SocialIGGeneral)   => void;
  setPrevTt:      (v: SocialTTGeneral)   => void;
  setStories:     (v: SocialStory[])     => void;
  setIgPosts:     (v: SocialIGPost[])    => void;
  setTtVideos:    (v: SocialTTVideo[])   => void;
  setAltPosts:    (v: SocialAltPost[])   => void;
  setDms:         (v: SocialDMs)         => void;
  setIgCom:       (v: SocialIGCom)       => void;
  setTtCom:       (v: SocialTTCom)       => void;
  setCtx:         (v: SocialFormContext) => void;
  hydrateForm:    (data: SocialFormData) => void;
  resetForm:      ()                     => void;
  setHasHydrated: (value: boolean)       => void;
}

export type SocialFormStore = SocialFormState & SocialFormActions;

// ─── Store ────────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

export const useSocialFormStore = create<SocialFormStore>()((set) => ({
  ...INITIAL_FORM_DATA,
  lastUpdated: null,
  hasHydrated: false,

  setMeta:     (meta)     => set({ meta,     lastUpdated: now() }),
  setIgG:      (igG)      => set({ igG,      lastUpdated: now() }),
  setTtG:      (ttG)      => set({ ttG,      lastUpdated: now() }),
  setPrevIg:   (prevIg)   => set({ prevIg,   lastUpdated: now() }),
  setPrevTt:   (prevTt)   => set({ prevTt,   lastUpdated: now() }),
  setStories:  (stories)  => set({ stories,  lastUpdated: now() }),
  setIgPosts:  (igPosts)  => set({ igPosts,  lastUpdated: now() }),
  setTtVideos: (ttVideos) => set({ ttVideos, lastUpdated: now() }),
  setAltPosts: (altPosts) => set({ altPosts, lastUpdated: now() }),
  setDms:      (dms)      => set({ dms,      lastUpdated: now() }),
  setIgCom:    (igCom)    => set({ igCom,    lastUpdated: now() }),
  setTtCom:    (ttCom)    => set({ ttCom,    lastUpdated: now() }),
  setCtx:      (ctx)      => set({ ctx,      lastUpdated: now() }),

  // Carga datos del servidor sin marcar lastUpdated — no dispara auto-save.
  hydrateForm: (data) => set({ ...data, lastUpdated: null }),

  resetForm: () => set({ ...INITIAL_FORM_DATA, lastUpdated: null }),

  setHasHydrated: (value) => set({ hasHydrated: value }),
}));

// ─── Selectors ────────────────────────────────────────────────────────────────

export const selectSocialFormData = (s: SocialFormStore): SocialFormData => ({
  meta:     s.meta,
  igG:      s.igG,
  ttG:      s.ttG,
  prevIg:   s.prevIg,
  prevTt:   s.prevTt,
  stories:  s.stories,
  igPosts:  s.igPosts,
  ttVideos: s.ttVideos,
  altPosts: s.altPosts,
  dms:      s.dms,
  igCom:    s.igCom,
  ttCom:    s.ttCom,
  ctx:      s.ctx,
});
