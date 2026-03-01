"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BookStatus } from "@/types";

const STATUS_OPTIONS: { value: BookStatus; label: string }[] = [
  { value: "WANT_TO_READ", label: "읽고 싶은 책" },
  { value: "READING", label: "읽는 중" },
  { value: "FINISHED", label: "다 읽은 책" },
];

interface StatusSelectProps {
  value: BookStatus;
  onChange: (status: BookStatus) => void;
  disabled?: boolean;
}

export function StatusSelect({ value, onChange, disabled }: StatusSelectProps) {
  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-[160px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
