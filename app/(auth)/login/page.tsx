"use client";

import { useActionState } from "react";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signIn, { error: null });

  return (
    <div className="mx-auto mt-16 max-w-sm space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Iniciar sesión</h1>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Iniciando sesión..." : "Iniciar sesión"}
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        <a href="/forgot-password" className="underline">¿Olvidaste tu contraseña?</a>
      </p>
      <p className="text-sm text-muted-foreground">
        ¿No tienes cuenta? <a href="/signup" className="underline">Crea una</a>
      </p>
    </div>
  );
}
