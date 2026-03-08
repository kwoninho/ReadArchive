import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReadingProgress } from "../reading-progress";

describe("ReadingProgress (T-10.09)", () => {
  it("shows progress bar with percentage when pageCount exists", () => {
    render(
      <ReadingProgress currentPage={50} pageCount={200} onSave={vi.fn()} />
    );

    expect(screen.getByText("50 / 200p (25%)")).toBeInTheDocument();
  });

  it("shows 0% when currentPage is null", () => {
    render(
      <ReadingProgress currentPage={null} pageCount={200} onSave={vi.fn()} />
    );

    expect(screen.getByText("0 / 200p (0%)")).toBeInTheDocument();
  });

  it("caps percentage at 100%", () => {
    render(
      <ReadingProgress currentPage={200} pageCount={200} onSave={vi.fn()} />
    );

    expect(screen.getByText("200 / 200p (100%)")).toBeInTheDocument();
  });

  it("shows info message when pageCount is null", () => {
    render(
      <ReadingProgress currentPage={30} pageCount={null} onSave={vi.fn()} />
    );

    expect(
      screen.getByText(/전체 페이지 수가 등록되지 않아/)
    ).toBeInTheDocument();
    expect(screen.getByText(/현재 30p 읽는 중/)).toBeInTheDocument();
  });

  it("calls onSave with parsed page number on button click", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReadingProgress currentPage={50} pageCount={200} onSave={onSave} />
    );

    const input = screen.getByPlaceholderText("현재 페이지");
    await user.clear(input);
    await user.type(input, "75");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(onSave).toHaveBeenCalledWith(75);
  });

  it("calls onSave on Enter key", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReadingProgress currentPage={50} pageCount={200} onSave={onSave} />
    );

    const input = screen.getByPlaceholderText("현재 페이지");
    await user.clear(input);
    await user.type(input, "100{Enter}");

    expect(onSave).toHaveBeenCalledWith(100);
  });

  it("does not call onSave for negative values", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReadingProgress currentPage={50} pageCount={200} onSave={onSave} />
    );

    const input = screen.getByPlaceholderText("현재 페이지");
    await user.clear(input);
    await user.type(input, "-1");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(onSave).not.toHaveBeenCalled();
  });

  it("does not call onSave when value exceeds pageCount", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <ReadingProgress currentPage={50} pageCount={200} onSave={onSave} />
    );

    const input = screen.getByPlaceholderText("현재 페이지");
    await user.clear(input);
    await user.type(input, "201");
    await user.click(screen.getByRole("button", { name: "저장" }));

    expect(onSave).not.toHaveBeenCalled();
  });
});
