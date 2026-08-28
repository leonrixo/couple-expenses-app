"use server";

import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export async function requestPasswordReset(
  prevState: { error: string | null; sent: boolean },
  formData: FormData
): Promise<{ error: string | null; sent: boolean }> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message, sent: false };
  }

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
  });

  // Siempre se responde "enviado", exista o no el correo (no revelar qué correos están registrados)
  return { error: null, sent: true };
}
