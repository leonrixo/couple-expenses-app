"use client";

import { useActionState } from "react";
import { createHousehold } from "./create-household-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function OnboardingPage() {
  const [state, formAction, pending] = useActionState(createHousehold, { error: "" });

  return (
    <div className="mx-auto mt-16 max-w-md space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Bienvenido</h1>
      <Card>
        <CardHeader>
          <CardTitle>Crear un hogar nuevo</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del hogar</Label>
              <Input id="name" name="name" required placeholder="Ej. Casa Gustavo y Esperanza" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerSplitPercentage">Tu porcentaje en gastos regulares (%)</Label>
              <Input id="ownerSplitPercentage" name="ownerSplitPercentage" type="number" min={0} max={100} required defaultValue={50} />
            </div>
            {state.error && <p className="text-sm text-red-600">{state.error}</p>}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Creando..." : "Crear hogar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">— o —</p>
      <Card>
        <CardHeader>
          <CardTitle>Unirse a un hogar existente</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Pide el código de invitación a tu pareja.</p>
          {/* Formulario de unirse: Task 9 */}
        </CardContent>
      </Card>
    </div>
  );
}
