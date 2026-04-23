"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Lock, XCircle } from "lucide-react";
import { ResetPasswordInputSchema } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postResetPassword } from "@/services/auth";

interface FieldErrors {
  password?: string;
  confirm?:  string;
}

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get("token") ?? "";

  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [errors,    setErrors]    = useState<FieldErrors>({});
  const [isPending, setIsPending] = useState(false);
  const [done,      setDone]      = useState(false);
  const [apiError,  setApiError]  = useState("");

  if (!token) {
    return (
      <PageShell>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-center mb-2">
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <CardTitle className="text-center text-base">Enlace no válido</CardTitle>
            <CardDescription className="text-center">
              No se encontró el token en la URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link href="/forgot-password">Solicitar nuevo enlace</Link>
            </Button>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  function validate(): boolean {
    const result = ResetPasswordInputSchema.safeParse({ token, password });
    const fieldErrors = result.success ? {} : result.error.flatten().fieldErrors;
    const confirmError = password !== confirm ? "Las contraseñas no coinciden" : undefined;

    setErrors({
      password: fieldErrors.password?.[0],
      confirm:  confirmError,
    });
    return result.success && !confirmError;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsPending(true);
    setApiError("");
    try {
      await postResetPassword({ token, password });
      setDone(true);
      toast.success("Contraseña actualizada");
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al restablecer la contraseña";
      setApiError(msg);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <PageShell>
      {done ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-center mb-2">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <CardTitle className="text-center text-base">¡Contraseña actualizada!</CardTitle>
            <CardDescription className="text-center">
              Te redirigimos al inicio de sesión…
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Nueva contraseña</CardTitle>
            <CardDescription>
              Ingresá tu nueva contraseña. Debe tener al menos 8 caracteres.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              <div className="space-y-1.5">
                <Label htmlFor="password">Nueva contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={password}
                  aria-invalid={!!errors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  value={confirm}
                  aria-invalid={!!errors.confirm}
                  onChange={(e) => {
                    setConfirm(e.target.value);
                    setErrors((prev) => ({ ...prev, confirm: undefined }));
                  }}
                />
                {errors.confirm && (
                  <p className="text-xs text-destructive">{errors.confirm}</p>
                )}
              </div>

              {apiError && (
                <p className="text-sm text-destructive text-center">{apiError}</p>
              )}

              <Button type="submit" className="w-full gap-2" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando…
                  </>
                ) : (
                  "Guardar contraseña"
                )}
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link href="/login">Volver al inicio de sesión</Link>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Kwinna</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageShell><div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></PageShell>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
