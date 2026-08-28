import { describe, it, expect } from "vitest";
import { createServiceRoleClient } from "../../lib/supabase/server";

describe("migración 0002 — categories, household_invites", () => {
  it("las dos tablas existen y son consultables", async () => {
    const supabase = createServiceRoleClient();
    for (const table of ["categories", "household_invites"]) {
      const { error } = await supabase.from(table).select("*").limit(1);
      expect(error, `tabla ${table} debería existir`).toBeNull();
    }
  });
});
