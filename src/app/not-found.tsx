import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold">페이지를 찾을 수 없습니다</h2>
        <p className="text-sm text-muted-foreground">
          요청하신 페이지가 존재하지 않습니다.
        </p>
        <Button asChild>
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    </div>
  );
}
