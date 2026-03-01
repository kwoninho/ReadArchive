"use client";

import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <h2 className="text-lg font-semibold">오류가 발생했습니다</h2>
        <p className="text-sm text-muted-foreground">
          연결에 실패했습니다. 다시 시도해주세요.
        </p>
        <Button onClick={reset}>다시 시도</Button>
      </div>
    </div>
  );
}
