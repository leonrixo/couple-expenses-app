import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  return (
    <header className="flex items-center justify-between border-b px-4 py-3">
      <a href="/" className="font-semibold">
        Gastos en pareja
      </a>
      {data.user && (
        <form action="/auth/logout" method="post">
          <button type="submit" className="text-sm text-muted-foreground underline">
            Cerrar sesión
          </button>
        </form>
      )}
    </header>
  );
}
