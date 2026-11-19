"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { PASSWORD_MIN } from "../domain/user";
import { useSession } from "./session-context";

const input =
  "border-border bg-surface-2 text-foreground h-10 w-full rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-ring";

/** Formulario de inicio de sesión y registro con email y contraseña, más GitHub si está configurado. */
export function LoginForm({ initialError }: { initialError?: string }) {
  const session = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);

  if (session.status !== "loading" && !session.capabilities.persistence) {
    return (
      <p className="text-muted text-sm" data-testid="persistence-disabled">
        Esta instalación no tiene base de datos configurada (<code>DATABASE_URL</code>): todo funciona en modo
        invitado y el progreso se guarda en este navegador. Con <code>docker compose up app</code> se levanta
        PostgreSQL local.
      </p>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mode === "login" ? { email, password } : { email, password, displayName }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
      await session.refresh();
      router.push("/account");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Tipo de acceso" className="border-border flex gap-1 border-b">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={
              mode === m
                ? "border-accent text-foreground -mb-px border-b-2 px-3 py-2 text-sm font-medium"
                : "text-muted hover:text-foreground -mb-px border-b-2 border-transparent px-3 py-2 text-sm"
            }
          >
            {m === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </button>
        ))}
      </div>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {mode === "register" ? (
          <label className="block text-sm">
            <span className="text-muted mb-1 block text-xs">Nombre visible</span>
            <input
              className={input}
              value={displayName}
              maxLength={80}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
            />
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="text-muted mb-1 block text-xs">Email</span>
          <input
            className={input}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted mb-1 block text-xs">
            Contraseña
            {mode === "register" ? ` (mínimo ${PASSWORD_MIN} caracteres; una frase funciona bien)` : ""}
          </span>
          <input
            className={input}
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
        </label>
        {error ? (
          <p role="alert" className="text-danger text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? <Loader2 aria-hidden className="animate-spin" /> : null}
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </Button>
        {mode === "register" && !session.capabilities.signupOpen ? (
          <p className="text-muted text-xs">
            Instalación personal: sólo se puede crear la primera cuenta, que será la administradora. Para
            abrir el registro, configurá <code>AUTH_ALLOW_SIGNUP=true</code>.
          </p>
        ) : null}
      </form>
      {session.capabilities.github ? (
        <Button variant="secondary" className="w-full" asChild>
          <a href="/api/auth/github">
            <KeyRound aria-hidden /> Continuar con GitHub
          </a>
        </Button>
      ) : (
        <p className="text-muted text-xs">
          Inicio de sesión con GitHub disponible configurando <code>GITHUB_CLIENT_ID</code> y{" "}
          <code>GITHUB_CLIENT_SECRET</code> (ver README).
        </p>
      )}
    </div>
  );
}
