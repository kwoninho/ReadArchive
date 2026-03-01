"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number | null) => void;
  readOnly?: boolean;
}

export function StarRating({ value, onChange, readOnly }: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);
  const displayValue = hoverValue ?? value ?? 0;

  const handleClick = (star: number) => {
    if (readOnly || !onChange) return;
    // 동일 별점 클릭 시 제거
    onChange(star === value ? null : star);
  };

  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const star = i + 1;
        const filled = star <= displayValue;

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readOnly && setHoverValue(star)}
            onMouseLeave={() => !readOnly && setHoverValue(null)}
            disabled={readOnly}
            className={`${
              readOnly ? "cursor-default" : "cursor-pointer"
            } p-0.5 transition-colors`}
          >
            <Star
              className={`h-5 w-5 ${
                filled
                  ? "fill-yellow-500 text-yellow-500"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
