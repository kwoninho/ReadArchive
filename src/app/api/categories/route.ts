import { requireAuth, isAuthError } from "@/lib/api/helpers";

export async function GET() {
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const { supabase } = auth;

  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .order("created_at", { ascending: true });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
