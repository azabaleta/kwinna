interface Secuencia {
  tiempo?: string;
  visual?: string;
  audio?:  string;
}

interface Camara {
  angulo?:      string;
  movimiento?:  string;
  zona_segura?: string;
}

interface Checklist {
  props?:   string;
  prendas?: string;
  locacion?:string;
}

interface Pieza {
  plataforma?:     string;
  tipo?:           string;
  dia_hora?:       string;
  gancho?:         string;
  secuencia?:      Secuencia[];
  dialogo?:        string;
  textos_pantalla?:string[];
  checklist?:      Checklist;
  camara?:         Camara;
  caption_a?:      string;
  caption_b?:      string;
  hashtags?:       string;
}

interface FichasData {
  semana?:  number | string;
  periodo?: string;
  piezas?:  Pieza[];
}

const COLORES: Record<string, string> = {
  Instagram: "#E1306C",
  TikTok:    "#111111",
  default:   "#0A7ABF",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function safe(s: string | undefined | null): string {
  return esc(s ?? "");
}

export function renderFichasHTML(data: FichasData): string {
  const { semana, periodo, piezas = [] } = data;

  const fichas = piezas.map((p) => {
    const color = COLORES[p.plataforma ?? ""] ?? COLORES["default"]!;
    const esIA  = p.tipo === "IA";

    const filasSec = (p.secuencia ?? []).map((s, idx) => `
      <tr style="background:${idx === 0 ? "#FFF9C4" : idx % 2 === 0 ? "#f8f8f8" : "#fff"}">
        <td style="padding:6px 8px;font-size:12px;white-space:nowrap;font-weight:${idx === 0 ? "bold" : "normal"}">${safe(s.tiempo)}</td>
        <td style="padding:6px 8px;font-size:12px">${safe(s.visual)}</td>
        <td style="padding:6px 8px;font-size:12px">${safe(s.audio)}</td>
      </tr>`).join("");

    const textosPantalla = (p.textos_pantalla ?? [])
      .map((t) => `<li style="margin:4px 0;font-size:13px">${safe(t)}</li>`)
      .join("");

    return `
    <div class="ficha" style="margin-bottom:32px;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12)">

      <div style="background:${color};padding:14px 18px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <span style="color:white;font-size:16px;font-weight:bold">${safe(p.plataforma)}</span>
          <span style="color:rgba(255,255,255,.75);font-size:12px;margin-left:10px">${esIA ? "🤖 IA" : "🎬 Para grabar"}</span>
        </div>
        <span style="color:rgba(255,255,255,.9);font-size:13px;font-weight:600">${safe(p.dia_hora)}</span>
      </div>

      <div style="padding:18px;background:#fff">
        ${esIA ? `<p style="color:#888;font-style:italic;font-size:13px;margin:0 0 12px">Este contenido se produce con IA — no requiere grabación.</p>` : ""}

        <div style="background:#FFFDE7;border-left:4px solid #F57F17;padding:12px 16px;border-radius:0 6px 6px 0;margin-bottom:16px">
          <div style="font-size:10px;font-weight:bold;color:#F57F17;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px">⚡ GANCHO — Primeros 2 segundos</div>
          <div style="font-size:14px;font-weight:bold;color:#5D4037">${safe(p.gancho) || "—"}</div>
        </div>

        ${!esIA && filasSec ? `
        <div style="font-size:10px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">🎬 SECUENCIA DE GRABACIÓN</div>
        <div style="overflow-x:auto;margin-bottom:16px">
          <table style="width:100%;border-collapse:collapse;font-family:inherit">
            <thead>
              <tr style="background:#2d2d2d">
                <th style="padding:7px 8px;color:white;font-size:11px;text-align:left;white-space:nowrap">TIEMPO</th>
                <th style="padding:7px 8px;color:white;font-size:11px;text-align:left">QUÉ SE VE</th>
                <th style="padding:7px 8px;color:white;font-size:11px;text-align:left">QUÉ SE ESCUCHA</th>
              </tr>
            </thead>
            <tbody>${filasSec}</tbody>
          </table>
        </div>` : ""}

        ${!esIA && p.dialogo ? `
        <div style="font-size:10px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">🗣 QUÉ DECIR</div>
        <div style="background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:12px;font-style:italic;font-size:13px;margin-bottom:16px">${safe(p.dialogo)}</div>` : ""}

        ${!esIA && textosPantalla ? `
        <div style="font-size:10px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">📲 TEXTOS EN PANTALLA</div>
        <ul style="margin:0 0 16px;padding-left:20px">${textosPantalla}</ul>` : ""}

        ${!esIA ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          <div style="background:#f3f3f3;border-radius:6px;padding:12px">
            <div style="font-size:10px;font-weight:bold;color:#888;text-transform:uppercase;margin-bottom:8px">✅ ANTES DE GRABAR</div>
            <label style="display:block;margin:6px 0;font-size:12px"><input type="checkbox" style="margin-right:6px"><b>Props:</b> ${safe((p.checklist ?? {}).props) || "—"}</label>
            <label style="display:block;margin:6px 0;font-size:12px"><input type="checkbox" style="margin-right:6px"><b>Prendas:</b> ${safe((p.checklist ?? {}).prendas) || "—"}</label>
            <label style="display:block;margin:6px 0;font-size:12px"><input type="checkbox" style="margin-right:6px"><b>Locación:</b> ${safe((p.checklist ?? {}).locacion) || "—"}</label>
          </div>
          <div style="background:#EAF4FB;border-radius:6px;padding:12px">
            <div style="font-size:10px;font-weight:bold;color:#888;text-transform:uppercase;margin-bottom:8px">📱 CÁMARA</div>
            <div style="font-size:12px;margin:4px 0">📐 <b>Ángulo:</b> ${safe((p.camara ?? {}).angulo) || "—"}</div>
            <div style="font-size:12px;margin:4px 0">🎥 <b>Movimiento:</b> ${safe((p.camara ?? {}).movimiento) || "—"}</div>
            <div style="font-size:12px;margin:4px 0">📏 <b>Zona segura:</b> ${safe((p.camara ?? {}).zona_segura) || "—"}</div>
          </div>
        </div>` : ""}

        ${p.caption_a || p.caption_b ? `
        <div style="background:#f9f9f9;border-radius:6px;padding:12px">
          <div style="font-size:10px;font-weight:bold;color:#888;text-transform:uppercase;margin-bottom:8px">📝 CAPTION — copiar al publicar</div>
          ${p.caption_a ? `<div style="margin-bottom:8px"><span style="font-size:11px;font-weight:bold;color:#555">Opción A (corta):</span><br><span style="font-size:12px">${safe(p.caption_a)}</span></div>` : ""}
          ${p.caption_b ? `<div style="margin-bottom:8px"><span style="font-size:11px;font-weight:bold;color:#555">Opción B (historia):</span><br><span style="font-size:12px">${safe(p.caption_b)}</span></div>` : ""}
          ${p.hashtags  ? `<div style="font-size:11px;color:#999">${safe(p.hashtags)}</div>` : ""}
        </div>` : ""}
      </div>
    </div>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Fichas Kwinna — Semana ${semana ?? ""}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f0f0f0; color: #1a1a1a; }
    .ficha { max-width: 680px; margin: 0 auto 28px; }
    @media (max-width: 480px) { body { padding: 10px; } }
  </style>
</head>
<body>
  <div style="max-width:680px;margin:0 auto 24px;text-align:center;padding:20px 0 12px">
    <div style="font-size:24px;font-weight:bold;color:#70005E">KWINNA</div>
    <div style="font-size:14px;color:#888;margin-top:4px">Fichas de producción — Semana ${semana ?? ""} · ${safe(periodo ?? "")}</div>
    <div style="font-size:12px;color:#aaa;margin-top:4px">${piezas.length} piezas · ${piezas.filter((p) => p.tipo !== "IA").length} para grabar</div>
  </div>
  ${fichas}
</body>
</html>`;
}
