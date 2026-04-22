import { useState } from "react";
import { login } from "../services/auth";
import { useAuthStore } from "../store/use-auth-store";
import { ApiError } from "../lib/api";

export default function LoginView() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const loginStore = useAuthStore((s) => s.login);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.user.role !== "admin" && data.user.role !== "operator") {
        setError("Solo administradores y operadores pueden acceder al POS.");
        return;
      }
      loginStore(data.token, {
        id:    data.user.id,
        name:  data.user.name,
        email: data.user.email,
        role:  data.user.role,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Email o contraseña incorrectos.");
      } else {
        setError("No se pudo conectar con el servidor. Verificá la conexión.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex items-center justify-center bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">kwinna</h1>
          <p className="text-zinc-500 text-sm mt-1">Point of Sale</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900 rounded-2xl p-8 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none
                         border border-transparent focus:border-white/20 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-zinc-800 text-white rounded-lg px-4 py-2.5 text-sm outline-none
                         border border-transparent focus:border-white/20 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-white text-zinc-900 rounded-lg py-2.5 text-sm font-semibold
                       hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
