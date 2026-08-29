import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z.string().min(1, "El nombre del hogar es requerido"),
  ownerSplitPercentage: z.coerce.number().min(0).max(100),
});

export const joinHouseholdSchema = z.object({
  code: z.string().min(1, "El código es requerido"),
});
