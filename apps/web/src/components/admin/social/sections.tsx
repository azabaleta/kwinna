"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  FormField, FormCard, MetricRow, PctRow, FormSelect,
  SectionTitle, AddButton, RemoveButton,
} from "./form-primitives";
import {
  newStory, newIGPost, newTTVideo, newAltPost,
} from "@/store/use-social-form-store";
import type {
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
} from "@kwinna/contracts";

// ─── Constants ────────────────────────────────────────────────────────────────

const SENTIMIENTOS = ["Muy positivo", "Positivo", "Neutro", "Negativo", "Mixto"];

// ─── SEC META ─────────────────────────────────────────────────────────────────

interface SecMetaProps {
  data: FormMeta;
  set: (meta: FormMeta) => void;
}

export function SecMeta({ data, set }: SecMetaProps) {
  const upd = (k: keyof FormMeta) => (val: string) => set({ ...data, [k]: val });
  return (
    <div>
      <SectionTitle icon="📋" title="Datos de la semana" />
      <FormCard>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Número de semana" hint="Ej: 21">
            <Input value={data.semana} onChange={(e) => upd("semana")(e.target.value)} placeholder="21" type="number" />
          </FormField>
          <FormField label="Quién carga los datos">
            <Input value={data.operador} onChange={(e) => upd("operador")(e.target.value)} placeholder="Tu nombre" />
          </FormField>
          <FormField label="Inicio del período" hint="Domingo">
            <Input value={data.periodoInicio} onChange={(e) => upd("periodoInicio")(e.target.value)} type="date" />
          </FormField>
          <FormField label="Cierre del período" hint="Sábado">
            <Input value={data.periodoFin} onChange={(e) => upd("periodoFin")(e.target.value)} type="date" />
          </FormField>
        </div>
      </FormCard>
    </div>
  );
}

// ─── SEC GENERAL ──────────────────────────────────────────────────────────────

interface SecGeneralProps {
  igG: IGGeneral; setIg: (v: IGGeneral) => void;
  ttG: TTGeneral; setTt: (v: TTGeneral) => void;
  prevIg: IGGeneral; setPrevIg: (v: IGGeneral) => void;
  prevTt: TTGeneral; setPrevTt: (v: TTGeneral) => void;
}

export function SecGeneral({ igG, setIg, ttG, setTt, prevIg, setPrevIg, prevTt, setPrevTt }: SecGeneralProps) {
  const updIg  = (k: keyof IGGeneral) => (val: string) => setIg({ ...igG, [k]: val });
  const updTt  = (k: keyof TTGeneral) => (val: string) => setTt({ ...ttG, [k]: val });
  const updPIg = (k: keyof IGGeneral) => (val: string) => setPrevIg({ ...prevIg, [k]: val });
  const updPTt = (k: keyof TTGeneral) => (val: string) => setPrevTt({ ...prevTt, [k]: val });

  const igRows: { label: string; key: keyof IGGeneral }[] = [
    { label: "Seguidores al inicio",          key: "segsInicio"    },
    { label: "Seguidores al cierre",          key: "segsFin"       },
    { label: "Nuevos seguidores",             key: "nuevosSegs"    },
    { label: "Seguidores perdidos",           key: "unfollows"     },
    { label: "Visitas al perfil",             key: "visitasPerfil" },
    { label: "Alcance total de la cuenta",    key: "alcanceTotal"  },
    { label: "Impresiones totales",           key: "impresiones"   },
    { label: "Clics en el link de bio",       key: "clicsBio"      },
  ];

  const ttRows: { label: string; key: keyof TTGeneral }[] = [
    { label: "Seguidores al inicio",          key: "segsInicio"    },
    { label: "Seguidores al cierre",          key: "segsFin"       },
    { label: "Nuevos seguidores",             key: "nuevosSegs"    },
    { label: "Seguidores perdidos",           key: "unfollows"     },
    { label: "Visitas al perfil",             key: "visitasPerfil" },
    { label: "Vistas totales de la cuenta",   key: "vistas"        },
    { label: "Me gusta totales recibidos",    key: "likes"         },
  ];

  return (
    <div>
      <SectionTitle icon="🔢" title="Resumen general de la semana" badge="sabado" />

      <FormCard>
        <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
          <span>📸</span> Instagram{" "}
          <span className="text-xs font-normal text-muted-foreground">@kwinnanqn</span>
        </h3>
        <div className="mb-1 grid grid-cols-3 px-1 text-xs font-semibold text-muted-foreground">
          <span>Métrica</span>
          <span className="text-right">Esta semana</span>
          <span className="text-right">Semana anterior</span>
        </div>
        {igRows.map(({ label, key }) => (
          <div key={key} className="grid grid-cols-3 items-center gap-2 border-b border-border py-2 last:border-0">
            <span className="text-sm text-foreground">{label}</span>
            <Input type="number" value={igG[key]} onChange={(e) => updIg(key)(e.target.value)} placeholder="—" className="text-right" />
            <Input type="number" value={prevIg[key]} onChange={(e) => updPIg(key)(e.target.value)} placeholder="—" className="bg-muted/40 text-right" />
          </div>
        ))}
      </FormCard>

      <FormCard>
        <h3 className="mb-3 flex items-center gap-2 font-bold text-foreground">
          <span>🎵</span> TikTok{" "}
          <span className="text-xs font-normal text-muted-foreground">@kwinnanqn</span>
        </h3>
        <div className="mb-1 grid grid-cols-3 px-1 text-xs font-semibold text-muted-foreground">
          <span>Métrica</span>
          <span className="text-right">Esta semana</span>
          <span className="text-right">Semana anterior</span>
        </div>
        {ttRows.map(({ label, key }) => (
          <div key={key} className="grid grid-cols-3 items-center gap-2 border-b border-border py-2 last:border-0">
            <span className="text-sm text-foreground">{label}</span>
            <Input type="number" value={ttG[key]} onChange={(e) => updTt(key)(e.target.value)} placeholder="—" className="text-right" />
            <Input type="number" value={prevTt[key]} onChange={(e) => updPTt(key)(e.target.value)} placeholder="—" className="bg-muted/40 text-right" />
          </div>
        ))}
      </FormCard>
    </div>
  );
}

// ─── SEC STORIES ──────────────────────────────────────────────────────────────

interface SecStoriesProps {
  stories: Story[];
  setStories: (v: Story[]) => void;
}

export function SecStories({ stories, setStories }: SecStoriesProps) {
  const upd = (id: string, k: keyof Story) => (val: string | boolean) =>
    setStories(stories.map((s) => s.id === id ? { ...s, [k]: val } : s));
  const remove = (id: string) => setStories(stories.filter((s) => s.id !== id));
  const add = () => setStories([...stories, newStory()]);

  return (
    <div>
      <SectionTitle icon="📲" title="Stories de Instagram" badge="critico" />
      <p className="mb-4 text-sm text-muted-foreground">
        Cargá cada Story antes de que cumpla 24 hs — después desaparecen de Insights.
      </p>

      {stories.map((s, i) => (
        <FormCard key={s.id}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-foreground">Story {i + 1}</h3>
            {stories.length > 1 && <RemoveButton onClick={() => remove(s.id)} />}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <FormField label="Fecha">
              <Input type="date" value={s.fecha} onChange={(e) => upd(s.id, "fecha")(e.target.value)} />
            </FormField>
            <FormField label="Hora de publicación">
              <Input type="time" value={s.hora} onChange={(e) => upd(s.id, "hora")(e.target.value)} />
            </FormField>
            <FormField label="Tipo de contenido">
              <FormSelect
                value={s.tipo}
                onChange={(val) => upd(s.id, "tipo")(val)}
                options={["Video", "Foto", "Encuesta", "Quiz", "Link", "Otro"]}
              />
            </FormField>
            <FormField label="Tema / ¿Qué mostraba?">
              <Input value={s.tema} onChange={(e) => upd(s.id, "tema")(e.target.value)} placeholder="Ej: Calza negra con outfit de trabajo" />
            </FormField>
          </div>

          <div className="mb-4 flex gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id={`sticker-${s.id}`}
                checked={s.sticker}
                onCheckedChange={(checked) => upd(s.id, "sticker")(checked)}
              />
              <Label htmlFor={`sticker-${s.id}`} className="cursor-pointer text-sm">
                Tenía sticker interactivo
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id={`link-${s.id}`}
                checked={s.link}
                onCheckedChange={(checked) => upd(s.id, "link")(checked)}
              />
              <Label htmlFor={`link-${s.id}`} className="cursor-pointer text-sm">
                Tenía link
              </Label>
            </div>
          </div>

          {s.sticker && (
            <div className="mb-4">
              <FormField label="¿Qué tipo de sticker?">
                <Input
                  value={s.stickerTipo}
                  onChange={(e) => upd(s.id, "stickerTipo")(e.target.value)}
                  placeholder="Ej: Encuesta, Pregunta, Cuenta regresiva..."
                />
              </FormField>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6">
            <MetricRow label="Reproducciones" value={s.repros} onChange={(v) => upd(s.id, "repros")(v)} />
            <MetricRow label="Cuentas alcanzadas" value={s.alcanzadas} onChange={(v) => upd(s.id, "alcanzadas")(v)} />
            <MetricRow label="Respuestas (replies)" value={s.respuestas} onChange={(v) => upd(s.id, "respuestas")(v)} />
            <MetricRow label="Clics en sticker" value={s.clicsSticker} onChange={(v) => upd(s.id, "clicsSticker")(v)} />
            <MetricRow label="Clics en link" value={s.clicsLink} onChange={(v) => upd(s.id, "clicsLink")(v)} />
            <MetricRow label="Pasó a la siguiente" value={s.navSiguiente} onChange={(v) => upd(s.id, "navSiguiente")(v)} hint="navegación" />
            <MetricRow label="Salidas (abandonaron)" value={s.salidas} onChange={(v) => upd(s.id, "salidas")(v)} />
            <MetricRow label="Tasa de salida (%)" value={s.tasaSalida} onChange={(v) => upd(s.id, "tasaSalida")(v)} />
          </div>

          <div className="mt-3">
            <FormField label="Nota (opcional)" hint="Algo inusual o destacable de esta Story">
              <Textarea
                value={s.nota}
                onChange={(e) => upd(s.id, "nota")(e.target.value)}
                placeholder="Ej: Generó muchas respuestas preguntando por talles"
                rows={2}
              />
            </FormField>
          </div>
        </FormCard>
      ))}
      <AddButton onClick={add} label="Agregar otra Story" />
    </div>
  );
}

// ─── SEC IG POSTS ─────────────────────────────────────────────────────────────

interface SecIGPostsProps {
  posts: IGPost[];
  setPosts: (v: IGPost[]) => void;
}

export function SecIGPosts({ posts, setPosts }: SecIGPostsProps) {
  const upd = (id: string, k: keyof IGPost) => (val: string) =>
    setPosts(posts.map((p) => p.id === id ? { ...p, [k]: val } : p));
  const remove = (id: string) => setPosts(posts.filter((p) => p.id !== id));
  const add = () => setPosts([...posts, newIGPost()]);

  return (
    <div>
      <SectionTitle icon="📸" title="Posts y Reels de Instagram" badge="urgente" />
      <p className="mb-4 text-sm text-muted-foreground">
        Para los Reels, cargá las métricas de retención dentro de las primeras 48 hs — son más precisas en ese período.
      </p>

      {posts.map((p, i) => {
        const isReel = p.formato === "Reel";
        return (
          <FormCard key={p.id}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-foreground">Post {i + 1}</h3>
              {posts.length > 1 && <RemoveButton onClick={() => remove(p.id)} />}
            </div>

            <div className="mb-4 grid grid-cols-2 gap-4">
              <FormField label="Tipo de publicación">
                <FormSelect
                  value={p.formato}
                  onChange={(val) => upd(p.id, "formato")(val)}
                  options={["Reel", "Carrusel", "Foto estática"]}
                />
              </FormField>
              <FormField label="Fecha">
                <Input type="date" value={p.fecha} onChange={(e) => upd(p.id, "fecha")(e.target.value)} />
              </FormField>
              <FormField label="Hora de publicación">
                <Input type="time" value={p.hora} onChange={(e) => upd(p.id, "hora")(e.target.value)} />
              </FormField>
              {isReel && (
                <FormField label="Duración" hint="en segundos">
                  <Input type="number" value={p.duracion} onChange={(e) => upd(p.id, "duracion")(e.target.value)} placeholder="30" />
                </FormField>
              )}
              <FormField label="Tema / ¿Qué mostraba?">
                <Input value={p.tema} onChange={(e) => upd(p.id, "tema")(e.target.value)} placeholder="Ej: Outfits con calza negra para el trabajo" />
              </FormField>
              <FormField label="Gancho visual" hint="¿Qué pasaba en los primeros 2 segundos?">
                <Input value={p.gancho} onChange={(e) => upd(p.id, "gancho")(e.target.value)} placeholder="Ej: Mano tapando la cámara con la prenda" />
              </FormField>
              {isReel && (
                <FormField label="Audio / Música usada" className="col-span-2">
                  <Input value={p.audio} onChange={(e) => upd(p.id, "audio")(e.target.value)} placeholder="Ej: 'Espresso' de Sabrina Carpenter / voz propia" />
                </FormField>
              )}
            </div>

            <h4 className="mb-2 mt-4 text-sm font-bold text-foreground">Alcance e interacciones</h4>
            <div className="grid grid-cols-2 gap-x-6">
              <MetricRow label="Alcance orgánico" hint="personas únicas" value={p.alcanceOrg} onChange={(v) => upd(p.id, "alcanceOrg")(v)} />
              <MetricRow label="Alcance de pago" value={p.alcancePago} onChange={(v) => upd(p.id, "alcancePago")(v)} />
              <MetricRow label="Impresiones totales" value={p.impresiones} onChange={(v) => upd(p.id, "impresiones")(v)} />
              <MetricRow label="Me gusta" value={p.likes} onChange={(v) => upd(p.id, "likes")(v)} />
              <MetricRow label="Comentarios" value={p.comentarios} onChange={(v) => upd(p.id, "comentarios")(v)} />
              <MetricRow label="Guardados" value={p.guardados} onChange={(v) => upd(p.id, "guardados")(v)} />
              <MetricRow label="Compartidos" value={p.compartidos} onChange={(v) => upd(p.id, "compartidos")(v)} />
              <MetricRow label="Visitas al perfil desde este post" value={p.visitasPerfil} onChange={(v) => upd(p.id, "visitasPerfil")(v)} />
              <MetricRow label="Clics en link de bio desde este post" value={p.clicsBio} onChange={(v) => upd(p.id, "clicsBio")(v)} />
            </div>

            {isReel && (
              <>
                <h4 className="mb-2 mt-5 flex items-center gap-2 text-sm font-bold text-foreground">
                  Retención del Reel
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-normal text-amber-600">
                    ⏱ Cargar dentro de 48 hs
                  </span>
                </h4>
                <div className="grid grid-cols-2 gap-x-6">
                  <MetricRow label="Reproducciones totales" value={p.repros} onChange={(v) => upd(p.id, "repros")(v)} />
                  <PctRow label="Vistas de personas que NO te siguen" value={p.pctNoSeg} onChange={(v) => upd(p.id, "pctNoSeg")(v)} />
                  <PctRow label="Retención al segundo 3" value={p.ret3s} onChange={(v) => upd(p.id, "ret3s")(v)} />
                  <PctRow label="Retención al 25% del video" value={p.ret25} onChange={(v) => upd(p.id, "ret25")(v)} />
                  <PctRow label="Retención al 50% del video" value={p.ret50} onChange={(v) => upd(p.id, "ret50")(v)} />
                  <PctRow label="Retención al 75% del video" value={p.ret75} onChange={(v) => upd(p.id, "ret75")(v)} />
                  <PctRow label="Retención al 100% (lo vieron completo)" value={p.ret100} onChange={(v) => upd(p.id, "ret100")(v)} />
                  <MetricRow label="Segundo en que más abandonan" hint="promedio" value={p.segAbandono} onChange={(v) => upd(p.id, "segAbandono")(v)} />
                </div>
              </>
            )}

            <div className="mt-4">
              <FormField label="Nota (opcional)" hint="Algo inusual o destacable">
                <Textarea
                  value={p.nota}
                  onChange={(e) => upd(p.id, "nota")(e.target.value)}
                  placeholder="Ej: Lo grabamos en el probador y tuvo el doble de guardados que lo normal"
                  rows={2}
                />
              </FormField>
            </div>
          </FormCard>
        );
      })}
      <AddButton onClick={add} label="Agregar otro post" />
    </div>
  );
}

// ─── SEC TIKTOK ───────────────────────────────────────────────────────────────

interface SecTikTokProps {
  videos: TTVideo[];
  setVideos: (v: TTVideo[]) => void;
}

export function SecTikTok({ videos, setVideos }: SecTikTokProps) {
  const upd = (id: string, k: keyof TTVideo) => (val: string) =>
    setVideos(videos.map((t) => t.id === id ? { ...t, [k]: val } : t));
  const remove = (id: string) => setVideos(videos.filter((t) => t.id !== id));
  const add = () => setVideos([...videos, newTTVideo()]);

  return (
    <div>
      <SectionTitle icon="🎵" title="Videos de TikTok" badge="urgente" />
      <p className="mb-4 text-sm text-muted-foreground">
        Cargá los datos de retención dentro de las primeras 48 hs de publicado.
      </p>

      {videos.map((t, i) => (
        <FormCard key={t.id}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-foreground">Video {i + 1}</h3>
            {videos.length > 1 && <RemoveButton onClick={() => remove(t.id)} />}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <FormField label="Fecha">
              <Input type="date" value={t.fecha} onChange={(e) => upd(t.id, "fecha")(e.target.value)} />
            </FormField>
            <FormField label="Hora">
              <Input type="time" value={t.hora} onChange={(e) => upd(t.id, "hora")(e.target.value)} />
            </FormField>
            <FormField label="Duración" hint="segundos">
              <Input type="number" value={t.duracion} onChange={(e) => upd(t.id, "duracion")(e.target.value)} placeholder="30" />
            </FormField>
            <FormField label="Audio / Música">
              <Input value={t.audio} onChange={(e) => upd(t.id, "audio")(e.target.value)} placeholder="Nombre del audio en tendencia o 'voz propia'" />
            </FormField>
            <FormField label="Tema / ¿Qué mostraba?">
              <Input value={t.tema} onChange={(e) => upd(t.id, "tema")(e.target.value)} placeholder="Ej: Transformación outfit con calza" />
            </FormField>
            <FormField label="Gancho visual" hint="Primeros 2 segundos">
              <Input value={t.gancho} onChange={(e) => upd(t.id, "gancho")(e.target.value)} placeholder="Ej: Texto polémico aparece en pantalla" />
            </FormField>
          </div>

          <h4 className="mb-2 mt-2 text-sm font-bold text-foreground">Métricas del video</h4>
          <div className="grid grid-cols-2 gap-x-6">
            <MetricRow label="Vistas totales" value={t.vistas} onChange={(v) => upd(t.id, "vistas")(v)} />
            <MetricRow label="Me gusta" value={t.likes} onChange={(v) => upd(t.id, "likes")(v)} />
            <MetricRow label="Comentarios" value={t.comentarios} onChange={(v) => upd(t.id, "comentarios")(v)} />
            <MetricRow label="Compartidos" value={t.compartidos} onChange={(v) => upd(t.id, "compartidos")(v)} />
            <MetricRow label="Guardados (favoritos)" value={t.guardados} onChange={(v) => upd(t.id, "guardados")(v)} />
            <MetricRow label="Nuevos seguidores desde este video" value={t.nuevosSegs} onChange={(v) => upd(t.id, "nuevosSegs")(v)} />
            <PctRow label="Vistas de personas que NO te siguen" value={t.pctNoSeg} onChange={(v) => upd(t.id, "pctNoSeg")(v)} />
            <MetricRow label="Tiempo de reproducción promedio" hint="segundos" value={t.tiempoPromedio} onChange={(v) => upd(t.id, "tiempoPromedio")(v)} />
            <PctRow label="% del video que ven en promedio" value={t.pctCompletacion} onChange={(v) => upd(t.id, "pctCompletacion")(v)} />
          </div>

          <h4 className="mb-2 mt-4 text-sm font-bold text-foreground">Origen de las vistas</h4>
          <div className="grid grid-cols-2 gap-x-6">
            <MetricRow label="Para vos (FYP)" value={t.vistasFYP} onChange={(v) => upd(t.id, "vistasFYP")(v)} />
            <MetricRow label="Desde tu perfil" value={t.vistasPerfil} onChange={(v) => upd(t.id, "vistasPerfil")(v)} />
            <MetricRow label="Búsqueda" value={t.vistasBusqueda} onChange={(v) => upd(t.id, "vistasBusqueda")(v)} />
            <MetricRow label="Desde seguidores" value={t.vistasSegs} onChange={(v) => upd(t.id, "vistasSegs")(v)} />
          </div>

          <div className="mt-4">
            <FormField label="Nota (opcional)">
              <Textarea
                value={t.nota}
                onChange={(e) => upd(t.id, "nota")(e.target.value)}
                placeholder="Algo inusual o destacable de este video"
                rows={2}
              />
            </FormField>
          </div>
        </FormCard>
      ))}
      <AddButton onClick={add} label="Agregar otro video" />
    </div>
  );
}

// ─── SEC ALTERNATIVO ──────────────────────────────────────────────────────────

const ALT_PLATAFORMAS = ["YouTube Shorts", "Pinterest", "Facebook", "Threads", "WhatsApp Status", "Otra"];

interface SecAlternativoProps {
  posts: AltPost[];
  setPosts: (v: AltPost[]) => void;
}

export function SecAlternativo({ posts, setPosts }: SecAlternativoProps) {
  const upd = (id: string, k: keyof AltPost) => (val: string) =>
    setPosts(posts.map((p) => p.id === id ? { ...p, [k]: val } : p));
  const remove = (id: string) => setPosts(posts.filter((p) => p.id !== id));
  const add = () => setPosts([...posts, newAltPost()]);

  return (
    <div>
      <SectionTitle icon="🌐" title="Canal alternativo" />
      <p className="mb-4 text-sm text-muted-foreground">
        Registrá publicaciones en plataformas fuera de Instagram y TikTok. El Agente IV las usa para evaluar si conviene sostener o cambiar el canal de diversificación.
      </p>

      {posts.length === 0 && (
        <FormCard className="py-8 text-center">
          <p className="mb-3 text-sm text-muted-foreground">No hay publicaciones alternativas esta semana.</p>
          <AddButton onClick={add} label="Agregar una" />
        </FormCard>
      )}

      {posts.map((p, i) => (
        <FormCard key={p.id}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-bold text-foreground">Publicación alternativa {i + 1}</h3>
            {posts.length > 1 && <RemoveButton onClick={() => remove(p.id)} />}
          </div>

          <div className="mb-4 grid grid-cols-2 gap-4">
            <FormField label="Plataforma">
              <FormSelect value={p.plataforma} onChange={(val) => upd(p.id, "plataforma")(val)} options={ALT_PLATAFORMAS} />
            </FormField>
            <FormField label="Fecha">
              <Input type="date" value={p.fecha} onChange={(e) => upd(p.id, "fecha")(e.target.value)} />
            </FormField>
            <FormField label="Hora">
              <Input type="time" value={p.hora} onChange={(e) => upd(p.id, "hora")(e.target.value)} />
            </FormField>
            <FormField label="Duración" hint="segundos (si aplica)">
              <Input type="number" value={p.duracion} onChange={(e) => upd(p.id, "duracion")(e.target.value)} placeholder="—" />
            </FormField>
            <FormField label="Tema / ¿Qué mostraba?">
              <Input value={p.tema} onChange={(e) => upd(p.id, "tema")(e.target.value)} placeholder="Ej: Lookbook calzas invierno" />
            </FormField>
            <FormField label="Gancho visual" hint="Primeros 2 segundos o imagen principal">
              <Input value={p.gancho} onChange={(e) => upd(p.id, "gancho")(e.target.value)} placeholder="Ej: Miniatura con frase en pantalla" />
            </FormField>
          </div>

          <h4 className="mb-2 text-sm font-bold text-foreground">Métricas</h4>
          <div className="grid grid-cols-2 gap-x-6">
            <MetricRow label="Alcance / Vistas" value={p.alcance} onChange={(v) => upd(p.id, "alcance")(v)} />
            <MetricRow label="Me gusta" value={p.likes} onChange={(v) => upd(p.id, "likes")(v)} />
            <MetricRow label="Comentarios" value={p.comentarios} onChange={(v) => upd(p.id, "comentarios")(v)} />
            <MetricRow label="Compartidos" value={p.compartidos} onChange={(v) => upd(p.id, "compartidos")(v)} />
            <MetricRow label="Guardados / Favoritos" value={p.guardados} onChange={(v) => upd(p.id, "guardados")(v)} />
          </div>

          <div className="mt-4">
            <FormField label="Nota (opcional)" hint="¿Valió la pena publicar en esta plataforma? ¿Traccionó tráfico al local o a IG?">
              <Textarea
                value={p.nota}
                onChange={(e) => upd(p.id, "nota")(e.target.value)}
                placeholder="Ej: El Short de YouTube generó 3 consultas nuevas que llegaron por perfil de IG"
                rows={2}
              />
            </FormField>
          </div>
        </FormCard>
      ))}

      {posts.length > 0 && <AddButton onClick={add} label="Agregar otra publicación alternativa" />}
    </div>
  );
}

// ─── SEC ESCUCHA ──────────────────────────────────────────────────────────────

interface SecEscuchaProps {
  dms: DMsData;     setDms: (v: DMsData) => void;
  igCom: IGComData; setIgCom: (v: IGComData) => void;
  ttCom: TTComData; setTtCom: (v: TTComData) => void;
}

export function SecEscucha({ dms, setDms, igCom, setIgCom, ttCom, setTtCom }: SecEscuchaProps) {
  const updDms = (k: keyof DMsData) => (val: string) => setDms({ ...dms, [k]: val });
  const updDmsTema = (idx: number) => (val: string) => {
    const arr = [...dms.temas] as DMsData["temas"];
    arr[idx] = val;
    setDms({ ...dms, temas: arr });
  };
  const updDmsFrase = (idx: number) => (val: string) => {
    const arr = [...dms.frases] as DMsData["frases"];
    arr[idx] = val;
    setDms({ ...dms, frases: arr });
  };

  const updIg = (k: keyof IGComData) => (val: string) => setIgCom({ ...igCom, [k]: val });
  const updIgTema = (idx: number) => (val: string) => {
    const arr = [...igCom.temas] as IGComData["temas"];
    arr[idx] = val;
    setIgCom({ ...igCom, temas: arr });
  };
  const updIgFrase = (idx: number) => (val: string) => {
    const arr = [...igCom.frases] as IGComData["frases"];
    arr[idx] = val;
    setIgCom({ ...igCom, frases: arr });
  };

  const updTt = (k: keyof TTComData) => (val: string) => setTtCom({ ...ttCom, [k]: val });
  const updTtTema = (idx: number) => (val: string) => {
    const arr = [...ttCom.temas] as TTComData["temas"];
    arr[idx] = val;
    setTtCom({ ...ttCom, temas: arr });
  };
  const updTtFrase = (idx: number) => (val: string) => {
    const arr = [...ttCom.frases] as TTComData["frases"];
    arr[idx] = val;
    setTtCom({ ...ttCom, frases: arr });
  };

  return (
    <div>
      <SectionTitle icon="💬" title="DMs y Comentarios" />
      <p className="mb-4 text-sm text-muted-foreground">
        No hace falta copiar mensajes literales, solo resumir los patrones que notaste.
      </p>

      <FormCard>
        <h3 className="mb-4 font-bold text-foreground">Mensajes directos (DMs) de Instagram</h3>
        <FormField label="¿Cuántos DMs recibiste esta semana (aproximado)?">
          <Input type="number" value={dms.volumen} onChange={(e) => updDms("volumen")(e.target.value)} placeholder="20" />
        </FormField>
        <FormField label="Temas o preguntas que se repitieron (hasta 5)">
          {dms.temas.map((t, i) => (
            <div key={i} className="mb-2">
              <Input value={t} onChange={(e) => updDmsTema(i)(e.target.value)} placeholder={`Tema ${i + 1} — Ej: Preguntan por envíos al Alto Valle`} />
            </div>
          ))}
        </FormField>
        <FormField label="Frases textuales que se repetieron" hint="copia fragmentos exactos si los hay">
          {dms.frases.map((f, i) => (
            <div key={i} className="mb-2">
              <Input value={f} onChange={(e) => updDmsFrase(i)(e.target.value)} placeholder={`"${i === 0 ? "¿Tienen en talle XL?" : i === 1 ? "¿Hacen envíos?" : "Otra frase..."}`} />
            </div>
          ))}
        </FormField>
        <FormField label="Sentimiento general de los DMs">
          <FormSelect value={dms.sentimiento} onChange={updDms("sentimiento")} options={SENTIMIENTOS} />
        </FormField>
        <FormField label="Algo destacable que pasó en los DMs esta semana">
          <Textarea value={dms.destacable} onChange={(e) => updDms("destacable")(e.target.value)} placeholder="Ej: Alguien mandó una foto con la calza puesta y la compartimos en stories" rows={2} />
        </FormField>
      </FormCard>

      <FormCard>
        <h3 className="mb-4 font-bold text-foreground">Comentarios en Instagram</h3>
        <FormField label="¿En qué post hubo más comentarios?" hint="Ej: Post 2">
          <Input value={igCom.postDestacado} onChange={(e) => updIg("postDestacado")(e.target.value)} placeholder="Post 2 — el Reel de los outfits de trabajo" />
        </FormField>
        <FormField label="Temas o debates que surgieron">
          {igCom.temas.map((t, i) => (
            <div key={i} className="mb-2">
              <Input value={t} onChange={(e) => updIgTema(i)(e.target.value)} placeholder={`Tema ${i + 1}`} />
            </div>
          ))}
        </FormField>
        <FormField label="Palabras o frases que aparecieron repetidamente">
          {igCom.frases.map((f, i) => (
            <div key={i} className="mb-2">
              <Input value={f} onChange={(e) => updIgFrase(i)(e.target.value)} placeholder={`Frase ${i + 1}`} />
            </div>
          ))}
        </FormField>
        <FormField label="Sentimiento general">
          <FormSelect value={igCom.sentimiento} onChange={updIg("sentimiento")} options={SENTIMIENTOS} />
        </FormField>
      </FormCard>

      <FormCard>
        <h3 className="mb-4 font-bold text-foreground">Comentarios en TikTok</h3>
        <FormField label="¿En qué video hubo más comentarios?" hint="Ej: Video 1">
          <Input value={ttCom.videoDestacado} onChange={(e) => updTt("videoDestacado")(e.target.value)} placeholder="Video 1 — el de la transformación outfit" />
        </FormField>
        <FormField label="Temas o debates que surgieron">
          {ttCom.temas.map((t, i) => (
            <div key={i} className="mb-2">
              <Input value={t} onChange={(e) => updTtTema(i)(e.target.value)} placeholder={`Tema ${i + 1}`} />
            </div>
          ))}
        </FormField>
        <FormField label="Palabras o frases que aparecieron repetidamente">
          {ttCom.frases.map((f, i) => (
            <div key={i} className="mb-2">
              <Input value={f} onChange={(e) => updTtFrase(i)(e.target.value)} placeholder={`Frase ${i + 1}`} />
            </div>
          ))}
        </FormField>
        <FormField label="Sentimiento general">
          <FormSelect value={ttCom.sentimiento} onChange={updTt("sentimiento")} options={SENTIMIENTOS} />
        </FormField>
      </FormCard>
    </div>
  );
}

// ─── SEC CONTEXTO ─────────────────────────────────────────────────────────────

interface SecContextoProps {
  ctx: FormContextData;
  setCtx: (v: FormContextData) => void;
}

export function SecContexto({ ctx, setCtx }: SecContextoProps) {
  const upd = (k: keyof FormContextData) => (val: string) => setCtx({ ...ctx, [k]: val });

  return (
    <div>
      <SectionTitle icon="🌡️" title="Contexto de la semana" badge="sabado" />

      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Semana que cierra
      </p>
      <p className="mb-4 text-sm text-muted-foreground">
        Esta info ayuda a los agentes a entender por qué algunas publicaciones funcionaron diferente. 1 a 3 líneas por punto, o dejá en blanco si no aplica.
      </p>

      <FormCard>
        <FormField
          label="¿Hubo algún evento local o nacional que pudo afectar el consumo de contenido?"
          hint="Feriado, lluvia, evento deportivo, corte de luz..."
        >
          <Textarea value={ctx.eventoLocal} onChange={(e) => upd("eventoLocal")(e.target.value)} rows={2} />
        </FormField>
        <FormField
          label="¿Hubo cambios en el local o en el stock?"
          hint="Nueva colección, cambio de layout, llegada de calzas nuevas, promoción..."
        >
          <Textarea value={ctx.cambiosLocal} onChange={(e) => upd("cambiosLocal")(e.target.value)} rows={2} />
        </FormField>
        <FormField
          label="¿Se usaron recursos especiales de producción?"
          hint="Iluminación extra, modelo externa, locación fuera del local, equipo nuevo..."
        >
          <Textarea value={ctx.recursosProduccion} onChange={(e) => upd("recursosProduccion")(e.target.value)} rows={2} />
        </FormField>
        <FormField
          label="¿Alguna publicación flop o se viralizó inesperadamente?"
          hint="Describí brevemente qué pasó y tu hipótesis de por qué"
        >
          <Textarea value={ctx.viralFlop} onChange={(e) => upd("viralFlop")(e.target.value)} rows={3} />
        </FormField>
        <FormField label="Observaciones libres" hint="Cualquier cosa relevante que no entre en las categorías anteriores">
          <Textarea value={ctx.observaciones} onChange={(e) => upd("observaciones")(e.target.value)} rows={3} />
        </FormField>
      </FormCard>

      <p className="mb-1 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Semana que empieza
      </p>
      <p className="mb-4 text-sm text-muted-foreground">
        El Agente IV (planificador de grilla) y el Agente V (diseñador conceptual) leen esta sección para adaptar los temas y formatos a lo que viene.
      </p>

      <FormCard>
        <FormField
          label="¿Hay alguna fecha especial o efeméride la semana entrante?"
          hint="Día de la Madre, San Valentín, inicio de estación, día de la mujer, feriado, etc."
        >
          <Textarea
            value={ctx.fechaEspecial}
            onChange={(e) => upd("fechaEspecial")(e.target.value)}
            rows={2}
            placeholder="Ej: El jueves es Día del Trabajador — feriado largo, mucho scroll"
          />
        </FormField>
        <FormField
          label="¿Habrá algún evento local en Neuquén o el Alto Valle?"
          hint="Recital, feria, evento deportivo, festival, expo..."
        >
          <Textarea
            value={ctx.eventoProximo}
            onChange={(e) => upd("eventoProximo")(e.target.value)}
            rows={2}
            placeholder="Ej: Feria de ropa en el Paseo de la Costa el fin de semana"
          />
        </FormField>
        <FormField
          label="¿Llega mercadería o colección nueva la semana que viene?"
          hint="Esto define si hay producto nuevo para mostrar en los videos"
        >
          <FormSelect
            value={ctx.mercaderiaProxima}
            onChange={upd("mercaderiaProxima")}
            options={[
              { value: "Sí — calzas nuevas",          label: "Sí — llegan calzas nuevas" },
              { value: "Sí — colección completa",      label: "Sí — llega colección completa" },
              { value: "Sí — accesorios/complementos", label: "Sí — llegan accesorios/complementos" },
              { value: "No llega mercadería nueva",    label: "No llega nada nuevo" },
              { value: "No sé todavía",                label: "No sé todavía" },
            ]}
          />
          {ctx.mercaderiaProxima.startsWith("Sí") && (
            <Input
              className="mt-2"
              value={ctx.mercaderiaDetalle}
              onChange={(e) => upd("mercaderiaDetalle")(e.target.value)}
              placeholder="Describí brevemente qué llega — colores, modelos, cantidad..."
            />
          )}
        </FormField>
        <FormField
          label="¿Habrá alguna promoción o lanzamiento especial la semana que viene?"
          hint="Descuento, 2x1, preventa, colaboración, live de ventas..."
        >
          <Textarea
            value={ctx.promocionProxima}
            onChange={(e) => upd("promocionProxima")(e.target.value)}
            rows={2}
            placeholder="Ej: El viernes hacemos live de Instagram con descuento del 15% en calzas termicas"
          />
        </FormField>
        <FormField
          label="¿Cuántos días de filmación hay disponibles la semana que viene?"
          hint="Esto le dice al planificador cuántas piezas de 'Contenido Humano' puede planificar"
        >
          <FormSelect
            value={ctx.diasFilmacion}
            onChange={upd("diasFilmacion")}
            options={[
              { value: "1 día",                        label: "1 día" },
              { value: "2 días",                       label: "2 días" },
              { value: "3 días",                       label: "3 días" },
              { value: "4 días o más",                 label: "4 días o más" },
              { value: "Ninguno — semana sin filmación", label: "Ninguno — semana sin filmación" },
            ]}
          />
        </FormField>
        <FormField
          label="¿Hay alguna restricción o condición especial para la semana que viene?"
          hint="Personal reducido, local cerrado algún día, equipo en reparación, obra en el local..."
        >
          <Textarea
            value={ctx.restricciones}
            onChange={(e) => upd("restricciones")(e.target.value)}
            rows={2}
            placeholder="Ej: El martes no hay empleadas disponibles para filmar"
          />
        </FormField>
        <FormField
          label="Instrucción libre para los agentes"
          hint="Cualquier cosa que querés que tengan en cuenta al planificar la grilla de la semana entrante"
        >
          <Textarea
            value={ctx.instruccionLibre}
            onChange={(e) => upd("instruccionLibre")(e.target.value)}
            rows={3}
            placeholder="Ej: Esta semana quiero priorizar contenido que muestre las calzas termicas porque tenemos stock alto. Evitar contenido de humor, solo looks y outfits."
          />
        </FormField>
      </FormCard>
    </div>
  );
}
