"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { postVerifyEmail } from "@/services/auth";
import { useAuthStore } from "@/store/use-auth-store";

type State = "loading" | "success" | "error";

function VerifyEmailForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const setSession   = useAuthStore((s) => s.setSession);
  const token        = searchParams.get("token") ?? "";

  const [state,   setState]   = useState<State>("loading");
  const [message, setMessage] = useState("");
  const called = useRef(false);

  useEffect(() => {
    if (!token || called.current) return;
    called.current = true;

    postVerifyEmail(token)
      .then(({ user, token: jwt }) => {
        setSession(user, jwt);
        setState("success");
        // Redirigir al shop tras un breve momento para que el usuario vea el mensaje
        setTimeout(() => router.replace("/shop"), 2500);
      })
      .catch((err: Error) => {
        setState("error");
        setMessage(err.message || "El enlace no es válido o ya expiró.");
      });
  }, [token, setSession, router]);

  if (!token) {
    return (
      <PageShell>
        <ErrorCard message="No se encontró el token de verificación en la URL." />
      </PageShell>
    );
  }

  return (
    <PageShell>
      {state === "loading" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Verificando tu email…</p>
          </CardContent>
        </Card>
      )}

      {state === "success" && (
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
      )}

      {state === "error" && <ErrorCard message={message} />}
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">Kwinna</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-center mb-2">
          <XCircle className="h-10 w-10 text-destructive" />
        </div>
        <CardTitle className="text-center text-base">Enlace no válido</CardTitle>
        <CardDescription className="text-center">{message}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Button asChild variant="outline" className="w-full">
          <Link href="/verify-email/pending">Solicitar nuevo enlace</Link>
        </Button>
        <Button asChild variant="ghost" className="w-full">
          <Link href="/login">Volver al login</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<PageShell><Card><CardContent className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></CardContent></Card></PageShell>}>
      <VerifyEmailForm />
    </Suspense>
  );
}
