"use client";

import { useState } from "react";
import { generateInviteCode } from "./invite-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function InviteCodeButton({ householdId }: { householdId: string }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    setError(null);
    const result = await generateInviteCode(householdId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    setCode(result.code);
    setOpen(true);
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={pending}>
        {pending ? "Generando..." : "Generar código de invitación"}
      </Button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Código de invitación</DialogTitle>
            <DialogDescription>
              Comparte este código con tu pareja para que se una desde la pantalla de bienvenida.
              Vence en 7 días y solo se puede usar una vez.
            </DialogDescription>
          </DialogHeader>
          <p className="text-center font-mono text-3xl font-semibold tracking-widest">{code}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
