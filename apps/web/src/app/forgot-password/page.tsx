"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { ForgotPasswordInputSchema } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postForgotPassword } from "@/services/auth";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);
  const [sent,      setSent]      = useState(false);

  function validate(): boolean {
    const result = ForgotPasswordInputSchema.safeParse({ email });
    if (result.success) {
      setEmailError(undefined);
      return true;
    }
    setEmailError(result.error.flatten().fieldErrors.email?.[0]);
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsPending(true);
    try {
      await postForgotPassword({ email });
      setSent(true);
    } catch {
      toast.error("Algo salió mal", { description: "Intentá de nuevo en unos minutos." });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Kwinna</h1>
        </div>

        {sent ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-center">Revisá tu email</CardTitle>
              <CardDescription className="text-center">
                Si existe una cuenta con <strong>{email}</strong>, vas a recibir un enlace para
                restablecer tu contraseña. El link expira en 1 hora.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Volver al inicio de sesión</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Olvidé mi contraseña</CardTitle>
              <CardDescription>
                Ingresá tu email y te enviaremos un link para crear una nueva contraseña.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tumail@email.com"
                    autoComplete="email"
                    value={email}
                    aria-invalid={!!emailError}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError(undefined);
                    }}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>

                <Button type="submit" className="w-full gap-2" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando…
                    </>
                  ) : (
                    "Enviar enlace"
                  )}
                </Button>

                <Button asChild variant="ghost" className="w-full">
                  <Link href="/login">Volver al inicio de sesión</Link>
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

      </div>
    </main>
  );
}
