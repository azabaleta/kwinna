"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { RegisterInputSchema } from "@kwinna/contracts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { postRegister } from "@/services/auth";
import { ApiError } from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FieldErrors {
  name?:     string;
  email?:    string;
  password?: string;
  confirm?:  string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  const [name,      setName]      = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [errors,    setErrors]    = useState<FieldErrors>({});
  const [isPending, setIsPending] = useState(false);

  function clearError(field: keyof FieldErrors) {
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): boolean {
    const newErrors: FieldErrors = {};

    const result = RegisterInputSchema.safeParse({ name, email, password });
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors;
      newErrors.name     = flat.name?.[0];
      newErrors.email    = flat.email?.[0];
      newErrors.password = flat.password?.[0];
    }

    if (password !== confirm) {
      newErrors.confirm = "Las contraseñas no coinciden";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsPending(true);
    try {
      await postRegister({ name, email, password });
      router.replace(`/verify-email/pending?email=${encodeURIComponent(email)}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setErrors({ email: "Ya existe una cuenta con ese email" });
      } else {
        const message = err instanceof Error ? err.message : "Error al crear la cuenta";
        toast.error("No se pudo crear la cuenta", { description: message });
      }
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
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Kwinna</h1>
          <p className="text-sm text-muted-foreground">
            Creá tu cuenta y descubrí la colección
          </p>
        </div>

        {/* ── Card ── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Nueva cuenta</CardTitle>
            <CardDescription>
              Solo tomará un momento
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="space-y-4">

              {/* Nombre */}
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Tu nombre"
                  autoComplete="name"
                  value={name}
                  aria-invalid={!!errors.name}
                  onChange={(e) => { setName(e.target.value); clearError("name"); }}
                />
                {errors.name && (
                  <p className="text-xs text-destructive">{errors.name}</p>
                )}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  value={email}
                  aria-invalid={!!errors.email}
                  onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  autoComplete="new-password"
                  value={password}
                  aria-invalid={!!errors.password}
                  onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Confirmar contraseña */}
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar contraseña</Label>
                <Input
                  id="confirm"
                  type="password"
                  placeholder="Repetí la contraseña"
                  autoComplete="new-password"
                  value={confirm}
                  aria-invalid={!!errors.confirm}
                  onChange={(e) => { setConfirm(e.target.value); clearError("confirm"); }}
                />
                {errors.confirm && (
                  <p className="text-xs text-destructive">{errors.confirm}</p>
                )}
              </div>

              <Button type="submit" className="w-full gap-2" disabled={isPending}>
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando cuenta…
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </Button>

            </form>
          </CardContent>
        </Card>

        {/* ── Link login ── */}
        <p className="text-center text-xs text-muted-foreground">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Iniciar sesión
          </Link>
        </p>

      </div>
    </main>
  );
}
