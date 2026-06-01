#!/usr/bin/env python3
"""
generar_fichas.py — Kwinna Content Pipeline
Genera fichas de producción en PDF a partir del JSON intermedio.

Uso:
    python ContentSM/generar_fichas.py <NUMERO_SEMANA>

Ejemplo:
    python ContentSM/generar_fichas.py 21

Lee:    produccion_semanal/semana_21/fichas_data_semana21.json
Genera: produccion_semanal/semana_21/FICHAS_PRODUCCION_semana21.pdf
"""

import sys
import json
import os
from pathlib import Path

try:
    import requests
except ImportError:
    requests = None

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

# ─── Dependencias ────────────────────────────────────────────────────────────
try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.units import cm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        PageBreak, HRFlowable, KeepTogether
    )
    from reportlab.platypus.flowables import Flowable
except ImportError:
    print("[ERROR] reportlab no está instalado.")
    print("Ejecuta: pip install reportlab --break-system-packages")
    sys.exit(1)

# ─── Paleta de colores ────────────────────────────────────────────────────────
PLATAFORMA_COLORES = {
    "Instagram": colors.HexColor("#E1306C"),
    "TikTok":    colors.HexColor("#111111"),
    "YouTube":   colors.HexColor("#FF0000"),
    "Facebook":  colors.HexColor("#1877F2"),
}
COLOR_DEFAULT     = colors.HexColor("#0A7ABF")
COLOR_GANCHO_BG   = colors.HexColor("#FFFDE7")
COLOR_GANCHO_BORD = colors.HexColor("#F57F17")
COLOR_ROW_ALT     = colors.HexColor("#F8F8F8")
COLOR_KWINNA      = colors.HexColor("#70005E")
COLOR_TEXTO       = colors.HexColor("#1A1A1A")
COLOR_SUAVE       = colors.HexColor("#666666")
COLOR_TABLA_HEAD  = colors.HexColor("#2D2D2D")
COLOR_GANCHO_ROW  = colors.HexColor("#FFF9C4")
COLOR_LINEA       = colors.HexColor("#E0E0E0")

# ─── Estilos ──────────────────────────────────────────────────────────────────
def crear_estilos():
    base = getSampleStyleSheet()
    estilos = {}

    estilos["titulo_portada"] = ParagraphStyle(
        "titulo_portada",
        fontName="Helvetica-Bold",
        fontSize=32,
        textColor=COLOR_KWINNA,
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    estilos["subtitulo_portada"] = ParagraphStyle(
        "subtitulo_portada",
        fontName="Helvetica",
        fontSize=14,
        textColor=COLOR_SUAVE,
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    estilos["dato_portada"] = ParagraphStyle(
        "dato_portada",
        fontName="Helvetica-Bold",
        fontSize=12,
        textColor=COLOR_TEXTO,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
    estilos["seccion_header"] = ParagraphStyle(
        "seccion_header",
        fontName="Helvetica-Bold",
        fontSize=16,
        textColor=colors.white,
        alignment=TA_LEFT,
        leftIndent=6,
    )
    estilos["label"] = ParagraphStyle(
        "label",
        fontName="Helvetica-Bold",
        fontSize=8,
        textColor=COLOR_SUAVE,
        spaceAfter=1,
        spaceBefore=6,
        uppercase=True,
    )
    estilos["valor"] = ParagraphStyle(
        "valor",
        fontName="Helvetica",
        fontSize=10,
        textColor=COLOR_TEXTO,
        spaceAfter=4,
        leading=14,
    )
    estilos["gancho"] = ParagraphStyle(
        "gancho",
        fontName="Helvetica-Bold",
        fontSize=11,
        textColor=colors.HexColor("#5D4037"),
        leading=16,
        spaceAfter=4,
    )
    estilos["dialogo"] = ParagraphStyle(
        "dialogo",
        fontName="Helvetica-Oblique",
        fontSize=10,
        textColor=COLOR_TEXTO,
        leftIndent=8,
        leading=14,
        spaceAfter=4,
    )
    estilos["caption"] = ParagraphStyle(
        "caption",
        fontName="Helvetica",
        fontSize=9,
        textColor=COLOR_TEXTO,
        leading=13,
        spaceAfter=3,
    )
    estilos["hashtags"] = ParagraphStyle(
        "hashtags",
        fontName="Helvetica",
        fontSize=8,
        textColor=COLOR_SUAVE,
        leading=12,
        spaceAfter=2,
    )
    estilos["nota_ia"] = ParagraphStyle(
        "nota_ia",
        fontName="Helvetica-Oblique",
        fontSize=9,
        textColor=COLOR_SUAVE,
        alignment=TA_CENTER,
        spaceAfter=4,
    )
    estilos["tabla_header"] = ParagraphStyle(
        "tabla_header",
        fontName="Helvetica-Bold",
        fontSize=9,
        textColor=colors.white,
        alignment=TA_CENTER,
    )
    estilos["tabla_celda"] = ParagraphStyle(
        "tabla_celda",
        fontName="Helvetica",
        fontSize=9,
        textColor=COLOR_TEXTO,
        leading=13,
    )
    estilos["normal"] = ParagraphStyle(
        "normal_k",
        fontName="Helvetica",
        fontSize=10,
        textColor=COLOR_TEXTO,
        leading=14,
    )
    return estilos


# ─── Helpers de layout ────────────────────────────────────────────────────────
def color_plataforma(nombre: str) -> colors.Color:
    return PLATAFORMA_COLORES.get(nombre, COLOR_DEFAULT)


def bloque_header_pieza(pieza: dict, estilos: dict, ancho: float) -> list:
    """Genera la barra de header coloreada para cada pieza."""
    plat = pieza.get("plataforma", "")
    col  = color_plataforma(plat)
    tipo = pieza.get("tipo", "Humana")
    dia  = pieza.get("dia_hora", "")
    pid  = pieza.get("id", "")

    badge_tipo = f"[{'🎬 HUMANA' if tipo == 'Humana' else '🤖 IA'}]"

    data = [[
        Paragraph(f"<b>{plat.upper()}  {badge_tipo}</b>", estilos["seccion_header"]),
        Paragraph(f"<b>{dia}</b>", ParagraphStyle("rh", fontName="Helvetica-Bold",
                  fontSize=12, textColor=colors.white, alignment=TA_RIGHT)),
    ]]
    t = Table(data, colWidths=[ancho * 0.7, ancho * 0.3])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0, 0), (-1, -1), col),
        ("TOPPADDING",   (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
        ("LEFTPADDING",  (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [4]),
    ]))
    return [t, Spacer(1, 6)]


def bloque_gancho(texto: str, estilos: dict, ancho: float) -> list:
    """Bloque amarillo resaltado con el gancho visual."""
    data = [[Paragraph(f"🎯  GANCHO: {texto}", estilos["gancho"])]]
    t = Table(data, colWidths=[ancho])
    t.setStyle(TableStyle([
        ("BACKGROUND",     (0, 0), (-1, -1), COLOR_GANCHO_BG),
        ("TOPPADDING",     (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING",  (0, 0), (-1, -1), 8),
        ("LEFTPADDING",    (0, 0), (-1, -1), 12),
        ("RIGHTPADDING",   (0, 0), (-1, -1), 12),
        ("LINEAFTER",      (0, 0), (0, -1), 4, COLOR_GANCHO_BORD),
        ("BOX",            (0, 0), (-1, -1), 0.5, COLOR_GANCHO_BORD),
    ]))
    return [t, Spacer(1, 8)]


def tabla_secuencia(secuencia: list, estilos: dict, ancho: float) -> list:
    """Tabla de secuencia de rodaje con filas alternadas."""
    if not secuencia:
        return []

    headers = ["⏱ TIEMPO", "👁 VISUAL", "🎙 AUDIO / VO"]
    col_w = [ancho * 0.12, ancho * 0.44, ancho * 0.44]

    rows = [[Paragraph(h, estilos["tabla_header"]) for h in headers]]
    for i, paso in enumerate(secuencia):
        tiempo  = paso.get("tiempo", "")
        visual  = paso.get("visual", "")
        audio   = paso.get("audio", "")
        es_gancho = i == 0
        bg = COLOR_GANCHO_ROW if es_gancho else (COLOR_ROW_ALT if i % 2 == 0 else colors.white)
        rows.append([
            Paragraph(tiempo, estilos["tabla_celda"]),
            Paragraph(visual, estilos["tabla_celda"]),
            Paragraph(audio,  estilos["tabla_celda"]),
        ])

    t = Table(rows, colWidths=col_w, repeatRows=1)
    style_cmds = [
        ("BACKGROUND",    (0, 0), (-1, 0),  COLOR_TABLA_HEAD),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [COLOR_ROW_ALT, colors.white]),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("GRID",          (0, 0), (-1, -1), 0.25, COLOR_LINEA),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]
    # Destacar fila del gancho (fila 1)
    if len(rows) > 1:
        style_cmds.append(("BACKGROUND", (0, 1), (-1, 1), COLOR_GANCHO_ROW))

    t.setStyle(TableStyle(style_cmds))
    return [Paragraph("SECUENCIA DE RODAJE", estilos["label"]), t, Spacer(1, 8)]


def bloque_checklist_camara(pieza: dict, estilos: dict, ancho: float) -> list:
    """Checklist de producción + instrucciones de cámara en dos columnas."""
    checklist = pieza.get("checklist", {})
    camara    = pieza.get("camara", {})

    # Columna izquierda: checklist
    props    = checklist.get("props", "N/D")
    prendas  = checklist.get("prendas", "N/D")
    locacion = checklist.get("locacion", "N/D")

    checks_text = (
        f"<b>CHECKLIST DE PRODUCCIÓN</b><br/>"
        f"☐  <b>Props:</b> {props}<br/>"
        f"☐  <b>Prendas:</b> {prendas}<br/>"
        f"☐  <b>Locación/Luz:</b> {locacion}"
    )

    # Columna derecha: cámara
    angulo     = camara.get("angulo", "N/D")
    movimiento = camara.get("movimiento", "N/D")
    zona       = camara.get("zona_segura", "N/D")

    camara_text = (
        f"<b>INSTRUCCIONES DE CÁMARA</b><br/>"
        f"📐  <b>Ángulo:</b> {angulo}<br/>"
        f"🎥  <b>Movimiento:</b> {movimiento}<br/>"
        f"📏  <b>Zona segura:</b> {zona}"
    )

    col_style = ParagraphStyle("col_k", fontName="Helvetica", fontSize=9,
                               textColor=COLOR_TEXTO, leading=14)

    data = [[
        Paragraph(checks_text, col_style),
        Paragraph(camara_text,  col_style),
    ]]
    col_w = [ancho * 0.5 - 3, ancho * 0.5 - 3]
    t = Table(data, colWidths=col_w)
    t.setStyle(TableStyle([
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("BACKGROUND",    (0, 0), (0, 0),   colors.HexColor("#F3F3F3")),
        ("BACKGROUND",    (1, 0), (1, 0),   colors.HexColor("#EAF4FB")),
        ("BOX",           (0, 0), (-1, -1), 0.5, COLOR_LINEA),
        ("LINEBETWEEN",   (0, 0), (0, -1),  0.5, COLOR_LINEA),
    ]))
    return [t, Spacer(1, 8)]


def bloque_textos_pantalla(textos: list, estilos: dict) -> list:
    if not textos:
        return []
    items = "".join(f"▸  {t}<br/>" for t in textos)
    return [
        Paragraph("TEXTOS EN PANTALLA", estilos["label"]),
        Paragraph(items, estilos["valor"]),
    ]


def bloque_caption(pieza: dict, estilos: dict, ancho: float) -> list:
    cap_a = pieza.get("caption_a", "")
    cap_b = pieza.get("caption_b", "")
    hashtags = pieza.get("hashtags", "")
    cta   = pieza.get("cta", "")

    if not any([cap_a, cap_b, hashtags]):
        return []

    partes = [Paragraph("CAPTION & SEO", estilos["label"])]

    if cta:
        partes += [Paragraph(f"<b>CTA:</b> {cta}", estilos["valor"])]

    if cap_a:
        data_a = [[Paragraph(f"<b>Opción A (Lectura rápida)</b><br/>{cap_a}", estilos["caption"])]]
        t_a = Table(data_a, colWidths=[ancho])
        t_a.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#F9F9F9")),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),
            ("BOX",           (0,0),(-1,-1), 0.5, COLOR_LINEA),
        ]))
        partes += [t_a, Spacer(1, 4)]

    if cap_b:
        data_b = [[Paragraph(f"<b>Opción B (Storytelling)</b><br/>{cap_b}", estilos["caption"])]]
        t_b = Table(data_b, colWidths=[ancho])
        t_b.setStyle(TableStyle([
            ("BACKGROUND",    (0,0),(-1,-1), colors.HexColor("#F9F9F9")),
            ("TOPPADDING",    (0,0),(-1,-1), 6),
            ("BOTTOMPADDING", (0,0),(-1,-1), 6),
            ("LEFTPADDING",   (0,0),(-1,-1), 10),
            ("BOX",           (0,0),(-1,-1), 0.5, COLOR_LINEA),
        ]))
        partes += [t_b, Spacer(1, 4)]

    if hashtags:
        partes += [Paragraph(hashtags, estilos["hashtags"])]

    return partes


# ─── Portada ──────────────────────────────────────────────────────────────────
def generar_portada(data: dict, estilos: dict, ancho: float) -> list:
    semana  = data.get("semana", "?")
    periodo = data.get("periodo", "")
    piezas  = data.get("piezas", [])

    humanas = sum(1 for p in piezas if p.get("tipo", "Humana") == "Humana")
    ia_cnt  = sum(1 for p in piezas if p.get("tipo") == "IA")

    plataformas = sorted(set(p.get("plataforma", "") for p in piezas))

    flowables = [
        Spacer(1, 3 * cm),
        Paragraph("KWINNA", estilos["titulo_portada"]),
        Paragraph("Fichas de Producción de Contenido", estilos["subtitulo_portada"]),
        Spacer(1, 0.5 * cm),
        HRFlowable(width=ancho * 0.5, thickness=2, color=COLOR_KWINNA, hAlign="CENTER"),
        Spacer(1, 0.5 * cm),
        Paragraph(f"Semana {semana}  ·  {periodo}", estilos["dato_portada"]),
        Spacer(1, 0.3 * cm),
        Paragraph(f"{len(piezas)} piezas totales  ·  {humanas} para grabar  ·  {ia_cnt} generadas por IA", estilos["dato_portada"]),
        Spacer(1, 0.2 * cm),
        Paragraph("Plataformas: " + "  /  ".join(plataformas) if plataformas else "", estilos["dato_portada"]),
        Spacer(1, 2 * cm),
    ]

    # Tabla resumen de piezas
    if piezas:
        headers = ["#", "PLATAFORMA", "DÍA / HORA", "TIPO", "ID"]
        col_w = [ancho * 0.05, ancho * 0.2, ancho * 0.25, ancho * 0.12, ancho * 0.38]
        rows = [[Paragraph(h, estilos["tabla_header"]) for h in headers]]
        for i, p in enumerate(piezas):
            rows.append([
                Paragraph(str(i + 1), estilos["tabla_celda"]),
                Paragraph(p.get("plataforma", ""), estilos["tabla_celda"]),
                Paragraph(p.get("dia_hora", ""), estilos["tabla_celda"]),
                Paragraph(p.get("tipo", ""), estilos["tabla_celda"]),
                Paragraph(p.get("id", ""), estilos["tabla_celda"]),
            ])
        t = Table(rows, colWidths=col_w)
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  COLOR_TABLA_HEAD),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [COLOR_ROW_ALT, colors.white]),
            ("TOPPADDING",    (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
            ("GRID",          (0, 0), (-1, -1), 0.25, COLOR_LINEA),
            ("VALIGN",        (0, 0), (-1, -1), "MIDDLE"),
        ]))
        flowables += [
            Paragraph("ÍNDICE DE CONTENIDO", estilos["label"]),
            t,
        ]

    flowables.append(PageBreak())
    return flowables


# ─── Ficha por pieza ──────────────────────────────────────────────────────────
def generar_ficha_humana(pieza: dict, estilos: dict, ancho: float) -> list:
    """Ficha completa para piezas filmadas por el equipo."""
    flowables = []
    flowables += bloque_header_pieza(pieza, estilos, ancho)
    flowables += bloque_gancho(pieza.get("gancho", "Sin gancho definido"), estilos, ancho)

    if pieza.get("secuencia"):
        flowables += tabla_secuencia(pieza["secuencia"], estilos, ancho)

    if pieza.get("dialogo"):
        flowables += [
            Paragraph("DIÁLOGO / VOZ EN OFF", estilos["label"]),
            Paragraph(pieza["dialogo"], estilos["dialogo"]),
        ]

    if pieza.get("textos_pantalla"):
        flowables += bloque_textos_pantalla(pieza["textos_pantalla"], estilos)

    flowables += bloque_checklist_camara(pieza, estilos, ancho)
    flowables += bloque_caption(pieza, estilos, ancho)
    flowables.append(PageBreak())
    return flowables


def generar_ficha_ia(pieza: dict, estilos: dict, ancho: float) -> list:
    """Ficha simplificada para contenido generado por IA (no requiere filmación)."""
    flowables = []
    flowables += bloque_header_pieza(pieza, estilos, ancho)

    flowables.append(Paragraph(
        "Este contenido es generado por IA y no requiere sesión de filmación.",
        estilos["nota_ia"]
    ))
    flowables.append(Spacer(1, 6))

    if pieza.get("gancho"):
        flowables += bloque_gancho(pieza["gancho"], estilos, ancho)

    flowables += bloque_caption(pieza, estilos, ancho)
    flowables.append(PageBreak())
    return flowables


# ─── Upload al backend ───────────────────────────────────────────────────────
def subir_al_backend(data: dict, env_path: Path) -> bool:
    """POST del JSON al backend Railway. Devuelve True si fue exitoso."""
    if requests is None:
        print("[AVISO] 'requests' no está instalado. Saltando upload.")
        print("        Ejecuta: pip install requests --break-system-packages")
        return False

    # Cargar .env
    if load_dotenv is not None:
        load_dotenv(env_path)
    else:
        # Parseo manual si python-dotenv no está instalado
        if env_path.exists():
            for line in env_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

    api_url = os.environ.get("RAILWAY_API_URL", "").rstrip("/")
    api_key = os.environ.get("PIPELINE_API_KEY", "")

    if not api_url or not api_key:
        print("[ERROR] RAILWAY_API_URL o PIPELINE_API_KEY no están definidos en el .env")
        return False

    endpoint = f"{api_url}/planificacion/upload"
    semana_num = data.get("semana", "")
    payload = {
        "semana":     int(semana_num) if str(semana_num).isdigit() else semana_num,
        "semana_str": str(semana_num).zfill(2),
        "periodo":    data.get("periodo", ""),
        "piezas":     data.get("piezas", []),
    }

    print(f"\n[UPLOAD] Enviando datos a {endpoint} ...")
    try:
        resp = requests.post(
            endpoint,
            json=payload,
            headers={"x-api-key": api_key, "Content-Type": "application/json"},
            timeout=30,
        )
        if resp.status_code == 200:
            print(f"[OK] Backend respondió 200: {resp.json()}")
            return True
        else:
            print(f"[ERROR] Backend respondió {resp.status_code}: {resp.text[:200]}")
            return False
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] No se pudo conectar con {endpoint}. Verificá que Railway esté activo.")
        return False
    except requests.exceptions.Timeout:
        print("[ERROR] Timeout al conectar con el backend (>30s).")
        return False
    except Exception as e:
        print(f"[ERROR] Error inesperado al subir datos: {e}")
        return False


# ─── Función principal ────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print("Uso: python ContentSM/generar_fichas.py <NUMERO_SEMANA>")
        print("Ej:  python ContentSM/generar_fichas.py 21")
        sys.exit(1)

    semana_num = sys.argv[1].lstrip("0") or "0"
    semana_str = sys.argv[1].zfill(2)  # "21" → "21", "5" → "05"

    # Buscar la carpeta de la semana
    script_dir  = Path(__file__).parent
    base_dir    = script_dir.parent
    semana_dir  = base_dir / "ContentSM" / "produccion_semanal" / f"semana_{semana_str}"

    # Intentar también sin zero-padding si no existe
    if not semana_dir.exists():
        semana_dir = base_dir / "ContentSM" / "produccion_semanal" / f"semana_{semana_num}"
    if not semana_dir.exists():
        # Último intento: buscar relativo al directorio actual
        semana_dir = Path("ContentSM") / "produccion_semanal" / f"semana_{semana_str}"
    if not semana_dir.exists():
        semana_dir = Path("ContentSM") / "produccion_semanal" / f"semana_{semana_num}"
    if not semana_dir.exists():
        print(f"[ERROR] No se encontró la carpeta de la semana {semana_str}.")
        print(f"Buscado en: {semana_dir.resolve()}")
        sys.exit(1)

    json_path = semana_dir / f"fichas_data_semana{semana_str}.json"
    if not json_path.exists():
        json_path = semana_dir / f"fichas_data_semana{semana_num}.json"
    if not json_path.exists():
        print(f"[ERROR] No se encontró el archivo JSON de datos:")
        print(f"  Buscado: {json_path}")
        print(f"  Verificá que Rutina 2 generó el archivo fichas_data_semanaXX.json")
        sys.exit(1)

    print(f"[OK] Leyendo datos: {json_path}")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    output_path = semana_dir / f"FICHAS_PRODUCCION_semana{semana_str}.pdf"

    # Configurar documento A4
    doc = SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=1.5 * cm,
        rightMargin=1.5 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
        title=f"Kwinna — Fichas de Producción Semana {semana_str}",
        author="Pipeline Kwinna",
    )

    ancho_util = A4[0] - 3 * cm  # ancho menos márgenes
    estilos    = crear_estilos()
    piezas     = data.get("piezas", [])

    if not piezas:
        print("[AVISO] El JSON no contiene piezas. El PDF estará vacío.")

    # Armar contenido
    story = []
    story += generar_portada(data, estilos, ancho_util)

    for i, pieza in enumerate(piezas):
        tipo = pieza.get("tipo", "Humana")
        print(f"  [{i+1}/{len(piezas)}] {pieza.get('id', '?')} — {tipo}")
        if tipo == "IA":
            story += generar_ficha_ia(pieza, estilos, ancho_util)
        else:
            story += generar_ficha_humana(pieza, estilos, ancho_util)

    doc.build(story)
    print(f"\n✅  PDF generado exitosamente:")
    print(f"   {output_path.resolve()}")
    print(f"   {len(piezas)} fichas  ·  {len(story)} elementos")

    # Buscar el .env en la raíz del proyecto (carpeta padre de ContentSM)
    env_path = base_dir / ".env"
    upload_ok = subir_al_backend(data, env_path)
    if not upload_ok:
        print("\n[AVISO] El PDF se generó correctamente pero el upload al backend falló.")
        print(f"        Verificá {env_path} (PIPELINE_API_KEY y RAILWAY_API_URL)")


if __name__ == "__main__":
    main()
