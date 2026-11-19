"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { useSession } from "./session-context";

export function LogoutButton() {
  const session = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="secondary"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await session.logout();
        router.push("/");
        router.refresh();
      }}
    >
      <LogOut aria-hidden /> Cerrar sesión
    </Button>
  );
}
