import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { KanbanBoard } from "@/components/board/kanban-board";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // 서버에서 초기 데이터 조회
  const { data: books } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <Header user={user} />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <KanbanBoard initialBooks={books ?? []} />
      </main>
    </div>
  );
}
