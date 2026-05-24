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

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MarkdownInput {
  meta:     FormMeta;
  igG:      IGGeneral;
  ttG:      TTGeneral;
  prevIg:   IGGeneral;
  prevTt:   TTGeneral;
  stories:  Story[];
  igPosts:  IGPost[];
  ttVideos: TTVideo[];
  altPosts: AltPost[];
  dms:      DMsData;
  igCom:    IGComData;
  ttCom:    TTComData;
  ctx:      FormContextData;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function v(x: string | boolean | undefined | null): string {
  if (x === true) return "Sí";
  if (x === false) return "No";
  return x && x.toString().trim() ? x.toString().trim() : "N/D";
}

function delta(cur: string, prev: string): string {
  if (!cur || !prev) return "";
  const d = parseInt(cur) - parseInt(prev);
  return isNaN(d) ? "" : d >= 0 ? `+${d}` : `${d}`;
}

// ─── Generator ────────────────────────────────────────────────────────────────

export function generateMarkdown({
  meta, igG, ttG, prevIg, prevTt, stories, igPosts, ttVideos, altPosts, dms, igCom, ttCom, ctx,
}: MarkdownInput): string {
  const today = new Date().toISOString().split("T")[0];

  const igRows = (
    [
      ["Seguidores al INICIO del período",    igG.segsInicio,    prevIg.segsInicio],
      ["Seguidores al CIERRE del período",    igG.segsFin,       prevIg.segsFin],
      ["Nuevos seguidores ganados",           igG.nuevosSegs,    prevIg.nuevosSegs],
      ["Seguidores perdidos (unfollows)",     igG.unfollows,     prevIg.unfollows],
      ["Visitas al perfil (total semana)",    igG.visitasPerfil, prevIg.visitasPerfil],
      ["Alcance total de la cuenta",          igG.alcanceTotal,  prevIg.alcanceTotal],
      ["Impresiones totales de la cuenta",    igG.impresiones,   prevIg.impresiones],
      ["Clics en enlace de bio",              igG.clicsBio,      prevIg.clicsBio],
    ] as [string, string, string][]
  ).map(([label, cur, prev]) => `| ${label} | ${v(cur)} | ${v(prev)} | ${delta(cur, prev)} |`).join("\n");

  const ttRows = (
    [
      ["Seguidores al INICIO del período",   ttG.segsInicio,    prevTt.segsInicio],
      ["Seguidores al CIERRE del período",   ttG.segsFin,       prevTt.segsFin],
      ["Nuevos seguidores ganados",          ttG.nuevosSegs,    prevTt.nuevosSegs],
      ["Seguidores perdidos (unfollows)",    ttG.unfollows,     prevTt.unfollows],
      ["Visitas al perfil (total semana)",   ttG.visitasPerfil, prevTt.visitasPerfil],
      ["Vistas totales de la cuenta",        ttG.vistas,        prevTt.vistas],
      ["Me gusta totales recibidos",         ttG.likes,         prevTt.likes],
    ] as [string, string, string][]
  ).map(([label, cur, prev]) => `| ${label} | ${v(cur)} | ${v(prev)} | ${delta(cur, prev)} |`).join("\n");

  const storyBlocks = stories.map((s, i) => `
### STORY IG-S${String(i + 1).padStart(2, "0")}

\`\`\`
Fecha y hora de publicación : ${v(s.fecha)} ${v(s.hora)}
Tipo de contenido           : ${s.tipo}${s.sticker ? ` | Sticker: ${v(s.stickerTipo)}` : ""}${s.link ? " | Con link" : ""}
Tema / Concepto             : ${v(s.tema)}
\`\`\`

| Métrica | Valor |
| :--- | :---: |
| Reproducciones (Vistas) | ${v(s.repros)} |
| Cuentas alcanzadas | ${v(s.alcanzadas)} |
| Respuestas (replies) | ${v(s.respuestas)} |
| Clics en sticker / encuesta | ${v(s.clicsSticker)} |
| Clics en link (si aplica) | ${v(s.clicsLink)} |
| Navegación: Siguiente historia | ${v(s.navSiguiente)} |
| Navegación: Salida (Exits) | ${v(s.salidas)} |
| Tasa de salida (%) | ${v(s.tasaSalida)} |

**Nota del operador**
> ${v(s.nota)}

---`).join("\n");

  const igPostBlocks = igPosts.map((p, i) => {
    const isReel = p.formato === "Reel";
    return `
### POST IG-${String(i + 1).padStart(2, "0")}

\`\`\`
Tipo de formato : ${p.formato}
Fecha y hora    : ${v(p.fecha)} ${v(p.hora)}
Tema / Concepto : ${v(p.tema)}
Gancho visual   : ${v(p.gancho)}
Duración total  : ${isReel ? v(p.duracion) + " segundos" : "N/D"}
Audio utilizado : ${isReel ? v(p.audio) : "N/D"}
\`\`\`

**Métricas de Alcance e Interacción**

| Métrica | Valor |
| :--- | :---: |
| Alcance orgánico (cuentas únicas) | ${v(p.alcanceOrg)} |
| Alcance de pago | ${v(p.alcancePago)} |
| Impresiones totales | ${v(p.impresiones)} |
| Likes (Me gusta) | ${v(p.likes)} |
| Comentarios | ${v(p.comentarios)} |
| Guardados (Saves) | ${v(p.guardados)} |
| Compartidos (Shares) | ${v(p.compartidos)} |
| Visitas al perfil generadas por este post | ${v(p.visitasPerfil)} |
| Clics en enlace bio desde este post | ${v(p.clicsBio)} |

**Métricas de Retención de Video** *(Solo Reels)*

| Métrica de Retención | Valor |
| :--- | :---: |
| Reproducciones totales | ${isReel ? v(p.repros) : "N/A"} |
| % cuentas alcanzadas que NO te siguen | ${isReel ? v(p.pctNoSeg) : "N/A"} |
| % retención al segundo 3 | ${isReel ? v(p.ret3s) : "N/A"} |
| % retención al 25% del video | ${isReel ? v(p.ret25) : "N/A"} |
| % retención al 50% del video | ${isReel ? v(p.ret50) : "N/A"} |
| % retención al 75% del video | ${isReel ? v(p.ret75) : "N/A"} |
| % retención al 100% (completion rate) | ${isReel ? v(p.ret100) : "N/A"} |
| Segundo promedio de abandono | ${isReel ? v(p.segAbandono) : "N/A"} |

**Nota del operador**
> ${v(p.nota)}

---`;
  }).join("\n");

  const ttBlocks = ttVideos.map((t, i) => `
### VIDEO TT-${String(i + 1).padStart(2, "0")}

\`\`\`
Fecha y hora    : ${v(t.fecha)} ${v(t.hora)}
Tema / Concepto : ${v(t.tema)}
Gancho visual   : ${v(t.gancho)}
Audio utilizado : ${v(t.audio)}
Duración total  : ${v(t.duracion)} segundos
\`\`\`

**Métricas de Rendimiento TikTok**

| Métrica | Valor |
| :--- | :---: |
| Vistas totales | ${v(t.vistas)} |
| Likes (Me gusta) | ${v(t.likes)} |
| Comentarios | ${v(t.comentarios)} |
| Compartidos | ${v(t.compartidos)} |
| Guardados (Favoritos) | ${v(t.guardados)} |
| Nuevos seguidores desde este video | ${v(t.nuevosSegs)} |
| % vistas de cuentas que NO te siguen | ${v(t.pctNoSeg)} |
| Tiempo de reproducción promedio (segundos) | ${v(t.tiempoPromedio)} |
| % de completación del video | ${v(t.pctCompletacion)} |
| Vistas desde el For You Page (FYP) | ${v(t.vistasFYP)} |
| Vistas desde el perfil | ${v(t.vistasPerfil)} |
| Vistas desde búsqueda | ${v(t.vistasBusqueda)} |
| Vistas desde seguidores | ${v(t.vistasSegs)} |

**Nota del operador**
> ${v(t.nota)}

---`).join("\n");

  const altBlocks = altPosts.length === 0
    ? "\n> No se registraron publicaciones en canales alternativos esta semana.\n"
    : altPosts.map((p, i) => `
### ALT-${String(i + 1).padStart(2, "0")} — ${p.plataforma}

\`\`\`
Plataforma      : ${v(p.plataforma)}
Fecha y hora    : ${v(p.fecha)} ${v(p.hora)}
Tema / Concepto : ${v(p.tema)}
Gancho visual   : ${v(p.gancho)}
Duración total  : ${v(p.duracion)} segundos
\`\`\`

| Métrica | Valor |
| :--- | :---: |
| Alcance / Vistas | ${v(p.alcance)} |
| Likes (Me gusta) | ${v(p.likes)} |
| Comentarios | ${v(p.comentarios)} |
| Compartidos | ${v(p.compartidos)} |
| Guardados / Favoritos | ${v(p.guardados)} |

**Nota del operador**
> ${v(p.nota)}

---`).join("\n");

  const igSummaryRows = [
    ...stories.map((s, i) =>
      `| IG-S${String(i + 1).padStart(2, "0")} | Story | ${v(s.tema)} | ${v(s.alcanzadas)} | — | — | — | |`
    ),
    ...igPosts.map((p, i) =>
      `| IG-${String(i + 1).padStart(2, "0")} | ${p.formato} | ${v(p.tema)} | ${v(p.alcanceOrg)} | ${v(p.guardados)} | ${v(p.compartidos)} | ${p.formato === "Reel" ? v(p.segAbandono) : "—"} | |`
    ),
  ].join("\n");

  const ttSummaryRows = ttVideos.map((t, i) =>
    `| TT-${String(i + 1).padStart(2, "0")} | ${v(t.tema)} | ${v(t.vistas)} | ${v(t.vistasFYP)} | ${v(t.pctCompletacion)} | ${v(t.tiempoPromedio)} | |`
  ).join("\n");

  return `---
semana: ${v(meta.semana)}
periodo_inicio: ${v(meta.periodoInicio)}
periodo_fin: ${v(meta.periodoFin)}
operador: "${v(meta.operador)}"
ultima_actualizacion: ${today}
estado_carga: LISTO
---

---

# 📊 DATOS SEMANALES — KWINNA — Semana ${v(meta.semana)}

---

## ✅ CHECKLIST DE CIERRE SEMANAL

- [x] Sección 0 — Pulso general completada con datos del dashboard
- [x] Todas las Stories de IG de la semana cargadas en Sección 1-A
- [x] Todos los Reels/Posts de IG de la semana cargados en Sección 1-B
- [x] Todos los videos de TikTok de la semana cargados en Sección 2
- [x] Sección 3 — Escucha social completada (DMs y comentarios)
- [x] Sección 4 — Contexto de la semana completada
- [x] Sección 5 — Tabla resumen rápido completada
- [x] Campo \`estado_carga\` cambiado a \`LISTO\` en el encabezado YAML

---

---

## 🔢 SECCIÓN 0: PULSO GENERAL DE LA SEMANA

### Instagram \`@kwinnanqn\`

| Métrica | Valor semana actual | Valor semana anterior | Δ Variación |
| :--- | :---: | :---: | :---: |
${igRows}

### TikTok \`@kwinnanqn\`

| Métrica | Valor semana actual | Valor semana anterior | Δ Variación |
| :--- | :---: | :---: | :---: |
${ttRows}

---

---

## 📲 SECCIÓN 1-A: INSTAGRAM — STORIES
${storyBlocks}

---

---

## 📸 SECCIÓN 1-B: INSTAGRAM — REELS Y POSTS DE FEED
${igPostBlocks}

---

---

## 🎵 SECCIÓN 2: TIKTOK — DETALLE POR VIDEO
${ttBlocks}

---

---

## 🌐 SECCIÓN 2-C: CANAL ALTERNATIVO
${altBlocks}

---

---

## 💬 SECCIÓN 3: ESCUCHA SOCIAL — DMs Y COMENTARIOS

### 3.1 Mensajes Directos (DMs) de Instagram

**Volumen estimado de DMs recibidos esta semana:** ${v(dms.volumen)}

**Temas/preguntas más repetidas**
${dms.temas.filter(Boolean).map((t, i) => `- Tema ${i + 1}: ${t}`).join("\n") || "- N/D"}

**Frases textuales que se repitieron**
${dms.frases.filter(Boolean).map((f) => `- "${f}"`).join("\n") || "- N/D"}

**Sentimiento general de los DMs:** ${v(dms.sentimiento)}

**Algo destacable que ocurrió en DMs esta semana:**
> ${v(dms.destacable)}

---

### 3.2 Comentarios en Instagram

**Post con más comentarios esta semana:** ${v(igCom.postDestacado)}

**Temas/debates que surgieron en comentarios**
${igCom.temas.filter(Boolean).map((t, i) => `- Tema ${i + 1}: ${t}`).join("\n") || "- N/D"}

**Palabras o frases que aparecieron repetidamente**
${igCom.frases.filter(Boolean).map((f) => `- ${f}`).join("\n") || "- N/D"}

**Sentimiento general de los comentarios:** ${v(igCom.sentimiento)}

---

### 3.3 Comentarios en TikTok

**Video con más comentarios esta semana:** ${v(ttCom.videoDestacado)}

**Temas/debates que surgieron en comentarios**
${ttCom.temas.filter(Boolean).map((t, i) => `- Tema ${i + 1}: ${t}`).join("\n") || "- N/D"}

**Palabras o frases que aparecieron repetidamente**
${ttCom.frases.filter(Boolean).map((f) => `- ${f}`).join("\n") || "- N/D"}

**Sentimiento general de los comentarios:** ${v(ttCom.sentimiento)}

---

---

## 🌡️ SECCIÓN 4: CONTEXTO DE LA SEMANA

### 4-A: Semana que cierra

**¿Hubo algún evento local o nacional que afectara el consumo de contenido?**
> ${v(ctx.eventoLocal)}

**¿Hubo cambios en el local físico o en el stock esta semana?**
> ${v(ctx.cambiosLocal)}

**¿Se usaron recursos especiales de producción?**
> ${v(ctx.recursosProduccion)}

**¿Hubo alguna publicación que flop o se viralizó inesperadamente?**
> ${v(ctx.viralFlop)}

**Observaciones libres del operador:**
> ${v(ctx.observaciones)}

---

### 4-B: Semana entrante *(inputs para el Agente IV — Planificador y Agente V — Diseñador)*

**¿Hay alguna fecha especial o efeméride la semana que viene?**
> ${v(ctx.fechaEspecial)}

**¿Habrá algún evento local en Neuquén o el Alto Valle?**
> ${v(ctx.eventoProximo)}

**¿Llega mercadería o colección nueva?**
> ${v(ctx.mercaderiaProxima)}${ctx.mercaderiaDetalle ? ` — ${ctx.mercaderiaDetalle}` : ""}

**¿Habrá alguna promoción o lanzamiento especial?**
> ${v(ctx.promocionProxima)}

**Días de filmación disponibles:**
> ${v(ctx.diasFilmacion)}

**¿Hay restricciones o condiciones especiales para la producción?**
> ${v(ctx.restricciones)}

**Instrucción libre para los agentes:**
> ${v(ctx.instruccionLibre)}

---

---

## ⚡ SECCIÓN 5: TABLA RESUMEN RÁPIDO

### Instagram

| ID Post | Formato | Tema (1 línea) | Alcance orgánico | Guardados | Compartidos | Seg. abandono | ¿Destacado? |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :---: |
${igSummaryRows}

### TikTok

| ID Video | Tema (1 línea) | Vistas totales | % FYP | % Completación | Seg. promedio | ¿Destacado? |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
${ttSummaryRows}

---

*\`DatosSemanales.md\` v2.0 — Pipeline de contenido Kwinna*
*Generado automáticamente desde el panel de administración*
*Período: domingo a sábado · Rutina de agentes: domingo 01:00 AM*
`;
}
