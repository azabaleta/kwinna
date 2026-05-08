"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { postResendVerification } from "@/services/auth";

const COOLDOWN_S = 60;

function VerifyEmailPendingForm() {
  const searchParams = useSearchParams();
  const emailParam   = searchParams.get("email") ?? "";

  const [email,      setEmail]      = useState(emailParam);
  const [isPending,  setIsPending]  = useState(false);
  const [cooldown,   setCooldown]   = useState(0); // segundos restantes

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function handleResend() {
    const trimmed = email.trim();
    if (!trimmed || isPending || cooldown > 0) return;
    setIsPending(true);
    try {
      await postResendVerification(trimmed);
      setCooldown(COOLDOWN_S);
      toast.success("Email reenviado", {
        description: "Revisá tu casilla (y la carpeta de spam).",
      });
    } catch {
      toast.error("No se pudo reenviar el email. Intentá de nuevo en un momento.");
    } finally {
      setIsPending(false);
    }
  }

  const canResend = !!email.trim() && !isPending && cooldown === 0;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Kwinna</h1>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Verificá tu email</CardTitle>
            <CardDescription>
              {emailParam
                ? "Te enviamos un enlace de confirmación"
                : "Ingresá tu email para recibir un nuevo enlace"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {emailParam ? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Revisá tu casilla en{" "}
                <span className="font-medium text-foreground">{emailParam}</span>{" "}
                y hacé clic en el enlace para activar tu cuenta.
                No olvides revisar la carpeta de spam.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ingresá el email con el que te registraste para recibir un nuevo enlace de verificación.
                </p>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void handleResend(); }}
                  placeholder="tu@email.com"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            )}

            {cooldown > 0 ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 px-3 py-2.5 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  Email reenviado.{" "}
                  <span className="text-green-600/70 dark:text-green-500/70">
                    Podés volver a intentarlo en {cooldown}s.
                  </span>
                </span>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => void handleResend()}
                disabled={!canResend}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Reenviando…
                  </>
                ) : (
                  "Reenviar email de verificación"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          ¿Tu email anterior tenía un código de 6 dígitos?{" "}
          <Link href="/verify-email/code" className="font-medium text-primary hover:underline">
            Ingresarlo acá
          </Link>
        </p>

        <p className="text-center text-xs text-muted-foreground">
          ¿Ya verificaste?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>

      </div>
    </main>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></main>}>
      <VerifyEmailPendingForm />
    </Suspense>
  );
}
