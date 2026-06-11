import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-Client (Server Components, Route Handlers)
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: any }[],
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Aufruf aus Server Component — Cookies werden über die
            // Middleware aktualisiert. Kann hier ignoriert werden.
          }
        },
      },
    },
  );
}
