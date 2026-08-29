"use client";

import { useActionState } from "react";
import { updateSplitPercentage } from "./split-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SplitPercentageForm({
  householdId,
  currentPercentage,
}: {
  householdId: string;
  currentPercentage: number;
}) {
  const [state, formAction, pending] = useActionState(updateSplitPercentage, { error: null });

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="householdId" value={householdId} />
      <div className="space-y-2">
        <Label htmlFor="newPercentage">Tu porcentaje (%)</Label>
        <Input
          id="newPercentage"
          name="newPercentage"
          type="number"
          min={0}
          max={100}
          required
          defaultValue={currentPercentage}
        />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Guardando..." : "Guardar"}
      </Button>
    </form>
  );
}
