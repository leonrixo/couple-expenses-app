import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InviteCodeButton } from "./invite-code-button";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect("/login");
  }

  const { data: memberships } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userData.user.id)
    .limit(1);

  const householdId = memberships?.[0]?.household_id;
  if (!householdId) {
    redirect("/onboarding");
  }

  return (
    <div className="mx-auto mt-16 max-w-md space-y-6 px-4">
      <h1 className="text-2xl font-semibold">Configuración</h1>
      <Card>
        <CardHeader>
          <CardTitle>Invitar a tu pareja</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Genera un código para que tu pareja se una a este hogar desde la pantalla de bienvenida.
          </p>
          <div className="mt-3">
            <InviteCodeButton householdId={householdId} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
