import type { NextFunction, Request, Response } from "express";

// ─── ANSI color helpers ───────────────────────────────────────────────────────

const c = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  bold: "\x1b[1m",
};

function colorMethod(method: string): string {
  const map: Record<string, string> = {
    GET: c.green,
    POST: c.cyan,
    PUT: c.yellow,
    PATCH: c.yellow,
    DELETE: c.red,
  };
  return `${map[method] ?? c.dim}${c.bold}${method}${c.reset}`;
}

function colorStatus(status: number): string {
  if (status < 300) return `${c.green}${status}${c.reset}`;
  if (status < 400) return `${c.cyan}${status}${c.reset}`;
  if (status < 500) return `${c.yellow}${status}${c.reset}`;
  return `${c.red}${status}${c.reset}`;
}

// ─── Request logger middleware ────────────────────────────────────────────────

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const ts = new Date().toISOString();

  res.on("finish", () => {
    const ms = Date.now() - start;
    console.log(
      `${c.dim}[${ts}]${c.reset} ` +
        `${colorMethod(req.method)} ` +
        `${c.magenta}${req.originalUrl}${c.reset} ` +
        `→ ${colorStatus(res.statusCode)} ` +
        `${c.dim}${ms}ms${c.reset}`
    );
  });

  next();
}

// ─── Error logger (usado dentro del error handler) ────────────────────────────

export function logError(err: Error, req: Request): void {
  const ts = new Date().toISOString();
  console.error(
    `\n${c.red}${c.bold}[ERROR]${c.reset} ${c.dim}[${ts}]${c.reset} ` +
      `${colorMethod(req.method)} ${req.originalUrl}\n` +
      `${c.red}${err.message}${c.reset}\n` +
      `${c.dim}${err.stack ?? "no stack trace"}${c.reset}\n`
  );
}
