import Link from "next/link";
import { Button } from "@/shared/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <p className="text-muted font-mono text-sm">404</p>
      <h1 className="text-foreground text-2xl font-semibold">No encontramos esta página</h1>
      <p className="text-muted">Puede que el contenido haya cambiado de ubicación o que todavía no exista.</p>
      <Button asChild>
        <Link href="/library">Ir a la biblioteca</Link>
      </Button>
    </div>
  );
}
