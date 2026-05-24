import { z } from "zod";

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const SocialFormMetaSchema = z.object({
  semana:        z.string(),
  periodoInicio: z.string(),
  periodoFin:    z.string(),
  operador:      z.string(),
});

export const IGGeneralSchema = z.object({
  segsInicio:    z.string(),
  segsFin:       z.string(),
  nuevosSegs:    z.string(),
  unfollows:     z.string(),
  visitasPerfil: z.string(),
  alcanceTotal:  z.string(),
  impresiones:   z.string(),
  clicsBio:      z.string(),
});

export const TTGeneralSchema = z.object({
  segsInicio:    z.string(),
  segsFin:       z.string(),
  nuevosSegs:    z.string(),
  unfollows:     z.string(),
  visitasPerfil: z.string(),
  vistas:        z.string(),
  likes:         z.string(),
});

export const SocialStorySchema = z.object({
  id:           z.string(),
  fecha:        z.string(),
  hora:         z.string(),
  tipo:         z.string(),
  tema:         z.string(),
  sticker:      z.boolean(),
  stickerTipo:  z.string(),
  link:         z.boolean(),
  repros:       z.string(),
  alcanzadas:   z.string(),
  respuestas:   z.string(),
  clicsSticker: z.string(),
  clicsLink:    z.string(),
  navSiguiente: z.string(),
  salidas:      z.string(),
  tasaSalida:   z.string(),
  nota:         z.string(),
});

export const SocialIGPostSchema = z.object({
  id:           z.string(),
  formato:      z.string(),
  fecha:        z.string(),
  hora:         z.string(),
  tema:         z.string(),
  gancho:       z.string(),
  duracion:     z.string(),
  audio:        z.string(),
  alcanceOrg:   z.string(),
  alcancePago:  z.string(),
  impresiones:  z.string(),
  likes:        z.string(),
  comentarios:  z.string(),
  guardados:    z.string(),
  compartidos:  z.string(),
  visitasPerfil:z.string(),
  clicsBio:     z.string(),
  repros:       z.string(),
  pctNoSeg:     z.string(),
  ret3s:        z.string(),
  ret25:        z.string(),
  ret50:        z.string(),
  ret75:        z.string(),
  ret100:       z.string(),
  segAbandono:  z.string(),
  nota:         z.string(),
});

export const SocialTTVideoSchema = z.object({
  id:             z.string(),
  fecha:          z.string(),
  hora:           z.string(),
  tema:           z.string(),
  gancho:         z.string(),
  audio:          z.string(),
  duracion:       z.string(),
  vistas:         z.string(),
  likes:          z.string(),
  comentarios:    z.string(),
  compartidos:    z.string(),
  guardados:      z.string(),
  nuevosSegs:     z.string(),
  pctNoSeg:       z.string(),
  tiempoPromedio: z.string(),
  pctCompletacion:z.string(),
  vistasFYP:      z.string(),
  vistasPerfil:   z.string(),
  vistasBusqueda: z.string(),
  vistasSegs:     z.string(),
  nota:           z.string(),
});

export const SocialAltPostSchema = z.object({
  id:          z.string(),
  plataforma:  z.string(),
  fecha:       z.string(),
  hora:        z.string(),
  tema:        z.string(),
  gancho:      z.string(),
  duracion:    z.string(),
  alcance:     z.string(),
  likes:       z.string(),
  comentarios: z.string(),
  compartidos: z.string(),
  guardados:   z.string(),
  nota:        z.string(),
});

export const SocialDMsSchema = z.object({
  volumen:     z.string(),
  temas:       z.array(z.string()),
  frases:      z.array(z.string()),
  sentimiento: z.string(),
  destacable:  z.string(),
});

export const SocialIGComSchema = z.object({
  postDestacado: z.string(),
  temas:         z.array(z.string()),
  frases:        z.array(z.string()),
  sentimiento:   z.string(),
});

export const SocialTTComSchema = z.object({
  videoDestacado: z.string(),
  temas:          z.array(z.string()),
  frases:         z.array(z.string()),
  sentimiento:    z.string(),
});

export const SocialFormContextSchema = z.object({
  eventoLocal:         z.string(),
  cambiosLocal:        z.string(),
  recursosProduccion:  z.string(),
  viralFlop:           z.string(),
  observaciones:       z.string(),
  fechaEspecial:       z.string(),
  eventoProximo:       z.string(),
  mercaderiaProxima:   z.string(),
  mercaderiaDetalle:   z.string(),
  promocionProxima:    z.string(),
  diasFilmacion:       z.string(),
  restricciones:       z.string(),
  instruccionLibre:    z.string(),
});

// ─── Root schema ──────────────────────────────────────────────────────────────

export const SocialFormDataSchema = z.object({
  meta:     SocialFormMetaSchema,
  igG:      IGGeneralSchema,
  ttG:      TTGeneralSchema,
  prevIg:   IGGeneralSchema,
  prevTt:   TTGeneralSchema,
  stories:  z.array(SocialStorySchema),
  igPosts:  z.array(SocialIGPostSchema),
  ttVideos: z.array(SocialTTVideoSchema),
  altPosts: z.array(SocialAltPostSchema),
  dms:      SocialDMsSchema,
  igCom:    SocialIGComSchema,
  ttCom:    SocialTTComSchema,
  ctx:      SocialFormContextSchema,
});

// ─── API response ─────────────────────────────────────────────────────────────

export const SocialFormDraftResponseSchema = z.object({
  data:      SocialFormDataSchema.nullable(),
  updatedAt: z.string().nullable(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type SocialFormMeta       = z.infer<typeof SocialFormMetaSchema>;
export type SocialIGGeneral      = z.infer<typeof IGGeneralSchema>;
export type SocialTTGeneral      = z.infer<typeof TTGeneralSchema>;
export type SocialStory          = z.infer<typeof SocialStorySchema>;
export type SocialIGPost         = z.infer<typeof SocialIGPostSchema>;
export type SocialTTVideo        = z.infer<typeof SocialTTVideoSchema>;
export type SocialAltPost        = z.infer<typeof SocialAltPostSchema>;
export type SocialDMs            = z.infer<typeof SocialDMsSchema>;
export type SocialIGCom          = z.infer<typeof SocialIGComSchema>;
export type SocialTTCom          = z.infer<typeof SocialTTComSchema>;
export type SocialFormContext    = z.infer<typeof SocialFormContextSchema>;
export type SocialFormData       = z.infer<typeof SocialFormDataSchema>;
export type SocialFormDraftResponse = z.infer<typeof SocialFormDraftResponseSchema>;
