import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ManualInputForm } from "../manual-input-form";

describe("ManualInputForm", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    isSubmitting: false,
  };

  it("renders 4 input fields", () => {
    render(<ManualInputForm {...defaultProps} />);

    expect(screen.getByLabelText("제목 *")).toBeInTheDocument();
    expect(screen.getByLabelText("저자")).toBeInTheDocument();
    expect(screen.getByLabelText("출판사")).toBeInTheDocument();
    expect(screen.getByLabelText("요약")).toBeInTheDocument();
  });

  it("submit button is disabled when title is empty", () => {
    render(<ManualInputForm {...defaultProps} />);
    const button = screen.getByRole("button", { name: "등록" });
    expect(button).toBeDisabled();
  });

  it("submit button is enabled when title has value", async () => {
    const user = userEvent.setup();
    render(<ManualInputForm {...defaultProps} />);

    await user.type(screen.getByLabelText("제목 *"), "테스트 책");

    const button = screen.getByRole("button", { name: "등록" });
    expect(button).toBeEnabled();
  });

  it("calls onSubmit with trimmed title on form submit", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ManualInputForm onSubmit={onSubmit} isSubmitting={false} />);

    await user.type(screen.getByLabelText("제목 *"), "  테스트  ");
    await user.type(screen.getByLabelText("저자"), "저자명");
    await user.click(screen.getByRole("button", { name: "등록" }));

    expect(onSubmit).toHaveBeenCalledWith({
      title: "테스트",
      author: "저자명",
      publisher: "",
      summary: "",
    });
  });

  it("disables button when isSubmitting is true", () => {
    render(<ManualInputForm onSubmit={vi.fn()} isSubmitting={true} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
  });
});
