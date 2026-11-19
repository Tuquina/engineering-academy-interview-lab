"use client";

import { LogIn, UserRound } from "lucide-react";
import Link from "next/link";
import { useSession } from "./session-context";

/** Acceso a la cuenta en la barra superior: invitado, sesión iniciada o persistencia deshabilitada. */
export function AccountButton() {
  const session = useSession();
  if (session.status === "loading") {
    return <span className="text-muted hidden text-xs xl:inline">…</span>;
  }
  if (session.status === "authenticated" && session.user) {
    return (
      <Link
        href="/account"
        className="text-foreground hover:bg-surface-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm"
        data-testid="account-button"
      >
        <UserRound aria-hidden className="size-4" />
        <span className="hidden max-w-32 truncate sm:inline">{session.user.displayName}</span>
        {session.user.role === "admin" ? <span className="text-accent text-xs">admin</span> : null}
      </Link>
    );
  }
  if (!session.capabilities.persistence) {
    return <span className="text-muted hidden text-xs xl:inline">Modo invitado · progreso local</span>;
  }
  return (
    <Link
      href="/login"
      className="text-muted hover:text-foreground hover:bg-surface-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm"
    >
      <LogIn aria-hidden className="size-4" /> <span className="hidden sm:inline">Iniciar sesión</span>
    </Link>
  );
}
