"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface TransactionFormValues {
  amount: string;
  concept: string;
  categoryId: string;
  paidBy: string;
  date: string;
  splitType: "regular" | "big" | "custom";
  customSplitPercentage?: string;
}

interface TransactionFormProps {
  categories: { id: string; name: string }[];
  members: { userId: string; displayName: string }[];
  action: (prevState: { error: string | null }, formData: FormData) => Promise<{ error: string | null }>;
  defaultValues?: TransactionFormValues;
  submitLabel: string;
}

export function TransactionForm({ categories, members, action, defaultValues, submitLabel }: TransactionFormProps) {
  const [state, formAction, pending] = useActionState(action, { error: null });
  const [splitType, setSplitType] = useState(defaultValues?.splitType ?? "regular");

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="amount">Monto</Label>
        <Input id="amount" name="amount" type="number" step="0.01" min="0.01" required defaultValue={defaultValues?.amount} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="concept">Concepto</Label>
        <Input id="concept" name="concept" required defaultValue={defaultValues?.concept} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoryId">Categoría</Label>
        <Select name="categoryId" defaultValue={defaultValues?.categoryId}>
          <SelectTrigger id="categoryId"><SelectValue placeholder="Elige una categoría" /></SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="paidBy">Quién pagó</Label>
        <Select name="paidBy" defaultValue={defaultValues?.paidBy}>
          <SelectTrigger id="paidBy"><SelectValue placeholder="Elige quién pagó" /></SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.userId} value={m.userId}>{m.displayName}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="date">Fecha</Label>
        <Input id="date" name="date" type="date" required defaultValue={defaultValues?.date ?? new Date().toISOString().slice(0, 10)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="splitType">Tipo de reparto</Label>
        <Select name="splitType" defaultValue={splitType} onValueChange={(v) => setSplitType(v as typeof splitType)}>
          <SelectTrigger id="splitType"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">Regular (según % del hogar)</SelectItem>
            <SelectItem value="big">Grande / súbito (50/50)</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {splitType === "custom" && (
        <div className="space-y-2">
          <Label htmlFor="customSplitPercentage">% para el owner del hogar</Label>
          <Input
            id="customSplitPercentage"
            name="customSplitPercentage"
            type="number"
            min={0}
            max={100}
            defaultValue={defaultValues?.customSplitPercentage}
          />
        </div>
      )}
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Guardando..." : submitLabel}
      </Button>
    </form>
  );
}
