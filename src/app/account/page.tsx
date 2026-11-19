import { Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/composition/auth";
import { LogoutButton } from "@/modules/auth/presentation/logout-button";
import { SyncPanel } from "@/modules/sync/presentation/sync-panel";
import { Badge } from "@/shared/ui/badge";
import { Card, CardDescription, CardTitle } from "@/shared/ui/card";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <header>
        <h1 className="text-foreground text-2xl font-bold tracking-tight">Mi cuenta</h1>
      </header>
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle data-testid="account-name">{user.displayName}</CardTitle>
          <Badge tone={user.role === "admin" ? "accent" : "neutral"}>
            {user.role === "admin" ? "Administrador" : "Usuario"}
          </Badge>
        </div>
        <CardDescription>
          {user.email ?? "Sin email"}
          {user.githubLogin ? ` · GitHub: ${user.githubLogin}` : ""} · cuenta creada el{" "}
          {new Date(user.createdAt).toLocaleDateString("es-AR")}
        </CardDescription>
        <div className="mt-4 flex flex-wrap gap-2">
          <LogoutButton />
          {user.role === "admin" ? (
            <Link
              href="/admin"
              className="border-border bg-surface-2 text-foreground hover:bg-surface-3 inline-flex h-9 items-center gap-2 rounded-md border px-4 text-sm font-medium"
            >
              <Shield aria-hidden className="size-4" /> Administración de contenido
            </Link>
          ) : null}
        </div>
      </Card>
      <SyncPanel />
    </div>
  );
}
