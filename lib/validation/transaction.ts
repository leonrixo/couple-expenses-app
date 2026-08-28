import { z } from "zod";

export const createTransactionSchema = z
  .object({
    amount: z.coerce.number().positive("El monto debe ser mayor a cero"),
    concept: z.string().trim().min(1, "El concepto es requerido"),
    categoryId: z.string().uuid("Categoría inválida"),
    paidBy: z.string().uuid("Quién pagó es requerido"),
    date: z.string().min(1, "La fecha es requerida"),
    splitType: z.enum(["regular", "big", "custom"]),
    customSplitPercentage: z.coerce.number().min(0).max(100).optional(),
  })
  .refine((data) => data.splitType !== "custom" || data.customSplitPercentage !== undefined, {
    message: "El reparto personalizado requiere un porcentaje",
    path: ["customSplitPercentage"],
  });
