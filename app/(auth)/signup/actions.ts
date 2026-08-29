"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signUpSchema } from "@/lib/validation/auth";

export async function signUp(
  prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // Mitigación de I3 (auditoría de seguridad 2026-08-29): antes se
    // distinguía "correo ya registrado" de cualquier otro error de Supabase
    // Auth, lo que permitía confirmar si un correo específico tiene cuenta.
    // Igual que forgot-password (que siempre responde sent: true sin
    // importar si el correo existe), aquí se responde un mensaje genérico
    // sin importar la causa exacta del error de Auth. Los errores de
    // VALIDACIÓN de formato (zod, arriba) siguen siendo específicos, esto
    // solo aplica a errores que ya llegaron a Supabase Auth.
    return { error: "No se pudo completar el registro, verifica tus datos e intenta de nuevo" };
  }

  redirect("/onboarding");
}
