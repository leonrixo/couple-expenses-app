"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, { error: null, sent: false });

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
      {state.sent ? (
        <p className="text-sm text-muted-foreground">
          Si el correo existe, te enviamos un link para restablecer tu contraseña
        </p>
      ) : (
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Enviando..." : "Enviar link de recuperación"}
          </Button>
        </form>
      )}
      <p className="text-sm text-muted-foreground">
        <a href="/login" className="underline">Volver a iniciar sesión</a>
      </p>
    </div>
  );
}
