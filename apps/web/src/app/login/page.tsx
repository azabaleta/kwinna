"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { AuthSchema } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postLogin } from "@/services/auth";
import { useAuthStore } from "@/store/use-auth-store";

// ─── Field-level error map ────────────────────────────────────────────────────

interface FieldErrors {
  email?: string;
  password?: string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isPending, setIsPending] = useState(false);

  function validate(): boolean {
    const result = AuthSchema.safeParse({ email, password });
    if (result.success) {
      setErrors({});
      return true;
    }
    const fieldErrors = result.error.flatten().fieldErrors;
    setErrors({
      email: fieldErrors.email?.[0],
      password: fieldErrors.password?.[0],
    });
    return false;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsPending(true);
    try {
      const { user, token } = await postLogin({ email, password });
      setSession(user, token);
      toast.success(`Bienvenido, ${user.name}`);
      router.replace("/inventory");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al iniciar sesión";
      toast.error("Acceso denegado", { description: message });
    } finally {
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* ── Brand ── */}
        <div className="flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Kwinna</h1>
          <p className="text-sm text-muted-foreground">
            Sistema de Gestión de Inventario
          </p>
        </div>

        {/* ── Card ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Iniciar sesión</CardTitle>
            <CardDescription>
              Ingresá tus credenciales para continuar
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@kwinna.com"
                  autoComplete="email"
                  value={email}
                  aria-invalid={!!errors.email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((err) => ({ ...err, email: undefined }));
                  }}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  aria-invalid={!!errors.password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((err) => ({ ...err, password: undefined }));
                  }}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verificando…
                  </>
                ) : (
                  "Ingresar"
                )}
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* ── Dev hint ── */}
        <p className="text-center text-xs text-muted-foreground">
          Demo: <code className="rounded bg-muted px-1">admin@kwinna.com</code>{" "}
          /{" "}
          <code className="rounded bg-muted px-1">admin123</code>
        </p>

      </div>
    </main>
  );
}
