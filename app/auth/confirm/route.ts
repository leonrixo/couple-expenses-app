import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Intercambia el token/código que Supabase Auth manda en el enlace del
 * correo (recuperación de contraseña, confirmación de registro, etc.) por
 * una sesión real en las cookies del navegador, usando el cliente de
 * servidor (que sí puede escribir cookies en un Route Handler).
 *
 * Soporta los dos formatos que puede generar Supabase Auth según cómo esté
 * configurado el proyecto:
 * - PKCE (`?code=...`): es el flujo que usan por defecto los clientes de
 *   este proyecto (`lib/supabase/server.ts` y `lib/supabase/client.ts` se
 *   crean con `createServerClient`/`createBrowserClient` de `@supabase/ssr`,
 *   que fijan `flowType: "pkce"` internamente).
 * - OTP clásico (`?token_hash=...&type=...`): es el formato que se usa si
 *   la plantilla de correo en el dashboard de Supabase se personaliza para
 *   usar `{{ .TokenHash }}` en vez de `{{ .ConfirmationURL }}` (patrón
 *   recomendado por Supabase para apps SSR). No se pudo verificar el
 *   contenido real de la plantilla sin entrar al dashboard, así que se
 *   soportan ambos casos.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Solo se permite un destino relativo dentro de la propia app: evita que
  // el enlace del correo pueda usarse como open redirect (?next=https://...).
  const nextParam = searchParams.get("next");
  const next = nextParam && nextParam.startsWith("/") ? nextParam : "/reset-password";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirect(next);
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      redirect(next);
    }
  }

  redirect("/login?error=enlace_invalido");
}
