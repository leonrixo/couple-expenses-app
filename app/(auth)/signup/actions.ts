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
    return { error: error.message === "User already registered" ? "Ese correo ya está registrado" : error.message };
  }

  redirect("/onboarding");
}
