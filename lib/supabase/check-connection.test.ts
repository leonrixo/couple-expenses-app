import { describe, it, expect } from "vitest";
import { createServiceRoleClient } from "./server";

describe("conexión a Supabase", () => {
  it("responde sin error de red ni de credenciales", async () => {
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("_realtime_dummy_check").select("*").limit(1);
    // Se espera un error de "tabla no existe", NO un error de red o de API key inválida.
    // Nota: vía el cliente JS + PostgREST (.from().select()), una tabla inexistente
    // responde con el código propio de PostgREST "PGRST205" (schema cache), no con
    // el código crudo de Postgres "42P01" (ese solo aparece vía .rpc() a una función
    // SQL que falle). Verificado en vivo contra el proyecto real antes de fijar esta
    // aserción — con URL o API key inválida el error es de red o de código distinto.
    expect(error).not.toBeNull();
    expect(error!.code).toBe("PGRST205");
  });
});
