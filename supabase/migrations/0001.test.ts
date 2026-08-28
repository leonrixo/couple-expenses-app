import { describe, it, expect } from "vitest";
import { createServiceRoleClient } from "../../lib/supabase/server";

describe("migración 0001 — households, profiles, household_members", () => {
  it("las tres tablas existen y son consultables", async () => {
    const supabase = createServiceRoleClient();
    for (const table of ["households", "profiles", "household_members"]) {
      const { error } = await supabase.from(table).select("*").limit(1);
      expect(error, `tabla ${table} debería existir`).toBeNull();
    }
  });
});
