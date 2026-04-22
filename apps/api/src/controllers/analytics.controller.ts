import type { NextFunction, Request, Response } from "express";
import {
  getAnalyticsSummary,
  insertAnalyticsEvent,
  type AnalyticsEventType,
} from "../db/repositories";

const VALID_TYPES: AnalyticsEventType[] = [
  "shop_view",
  "cart_add",
  "checkout_start",
  "sale_complete",
];

/** POST /analytics/event — registra un evento de analítica (público, fire-and-forget). */
export async function postEvent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { eventType, sessionId, userId } = req.body as {
      eventType: string;
      sessionId: string;
      userId?:   string;
    };

    if (!VALID_TYPES.includes(eventType as AnalyticsEventType) || !sessionId) {
      res.status(400).json({ error: "eventType y sessionId son requeridos" });
      return;
    }

    // Fire-and-forget: no bloqueamos la respuesta esperando el insert
    insertAnalyticsEvent(
      eventType as AnalyticsEventType,
      sessionId,
      userId ?? req.user?.sub,
    ).catch(() => { /* silencioso — analytics no debe romper el flujo */ });

    res.status(202).json({ ok: true });
  } catch (err) {
    next(err);
  }
}

/** GET /analytics/summary?from=ISO&to=ISO — resumen para el dashboard (admin/operator). */
export async function getSummary(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const from = req.query["from"] ? new Date(req.query["from"] as string) : (() => {
      const d = new Date(); d.setMonth(d.getMonth() - 1); return d;
    })();
    const to = req.query["to"] ? new Date(req.query["to"] as string) : new Date();

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      res.status(400).json({ error: "Fechas inválidas" });
      return;
    }

    const summary = await getAnalyticsSummary(from, to);
    res.json({ data: summary });
  } catch (err) {
    next(err);
  }
}
