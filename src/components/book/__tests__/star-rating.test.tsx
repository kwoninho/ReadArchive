import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StarRating } from "../star-rating";

describe("StarRating", () => {
  it("renders 5 star buttons", () => {
    render(<StarRating value={null} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("fills stars according to value", () => {
    const { container } = render(<StarRating value={3} />);
    const svgs = container.querySelectorAll("svg");
    const filled = Array.from(svgs).filter((svg) =>
      svg.classList.contains("fill-yellow-500")
    );
    expect(filled).toHaveLength(3);
  });

  it("calls onChange with star number on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={null} onChange={onChange} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]); // 3rd star

    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("calls onChange with null when clicking same star (toggle off)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} />);

    const buttons = screen.getAllByRole("button");
    await user.click(buttons[2]); // click star 3 when value is 3

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("does not call onChange when readOnly", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StarRating value={3} onChange={onChange} readOnly />);

    const buttons = screen.getAllByRole("button");
    // Disabled buttons won't fire click events via userEvent
    await user.click(buttons[0]).catch(() => {});

    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables buttons when readOnly", () => {
    render(<StarRating value={3} readOnly />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((btn) => expect(btn).toBeDisabled());
  });
});
