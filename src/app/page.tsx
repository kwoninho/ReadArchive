import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      {user && <Header user={user} />}
      <main className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-muted-foreground">칸반 보드가 여기에 표시됩니다.</p>
      </main>
    </div>
  );
}
