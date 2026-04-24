"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postVerifyEmailByCode } from "@/services/auth";
import { useAuthStore } from "@/store/use-auth-store";

export default function VerifyEmailCodePage() {
  const router     = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [code,      setCode]      = useState("");
  const [error,     setError]     = useState("");
  const [isPending, setIsPending] = useState(false);
  const [done,      setDone]      = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const clean = code.replace(/\s/g, "");
    if (clean.length !== 6 || !/^\d{6}$/.test(clean)) {
      setError("El código debe ser de 6 dígitos numéricos.");
      return;
    }

    setIsPending(true);
    setError("");
    try {
      const { user, token } = await postVerifyEmailByCode(clean);
      setSession(user, token);
      setDone(true);
      toast.success("¡Email verificado!");
      setTimeout(() => router.replace("/shop"), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Código inválido o ya utilizado.",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Kwinna</h1>
        </div>

        {done ? (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex justify-center mb-2">
                <CheckCircle2 className="h-10 w-10 text-green-500" />
              </div>
              <CardTitle className="text-center text-base">¡Email verificado!</CardTitle>
              <CardDescription className="text-center">
                Tu cuenta está activa. Te redirigimos al catálogo…
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Ingresar código</CardTitle>
              <CardDescription>
                Escribí el código de 6 dígitos que recibiste en tu email.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Código de verificación</Label>
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="847291"
                    value={code}
                    autoComplete="one-time-code"
                    className="text-center text-2xl font-bold tracking-[0.5em] h-14"
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                      setError("");
                    }}
                  />
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={isPending || code.length !== 6}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verificando…
                    </>
                  ) : (
                    "Verificar cuenta"
                  )}
                </Button>

                <div className="flex flex-col gap-2 pt-1">
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/verify-email/pending">Reenviar email</Link>
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/login">Volver al inicio de sesión</Link>
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

      </div>
    </main>
  );
}
