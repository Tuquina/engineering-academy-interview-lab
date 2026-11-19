import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/infrastructure/composition/auth";
import { LoginForm } from "@/modules/auth/presentation/login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getCurrentUser()) redirect("/account");
  const { error } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-foreground mb-2 text-2xl font-bold tracking-tight">Tu cuenta</h1>
      <p className="text-muted mb-6 text-sm">
        Con una cuenta, tu progreso, notas, flashcards y laboratorios se guardan en PostgreSQL y se
        sincronizan entre navegadores. Sin cuenta podés seguir usando todo en modo invitado.
      </p>
      <LoginForm initialError={error?.slice(0, 200)} />
    </div>
  );
}
