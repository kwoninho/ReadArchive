import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CategoryBadge } from "../category-badge";

describe("CategoryBadge", () => {
  it("renders nothing when categories is empty", () => {
    const { container } = render(<CategoryBadge categories={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when categories is undefined", () => {
    const { container } = render(<CategoryBadge categories={undefined as never} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a badge for each category", () => {
    const categories = [
      { id: "1", name: "Fiction" },
      { id: "2", name: "Science" },
    ];
    render(<CategoryBadge categories={categories} />);

    expect(screen.getByText("Fiction")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
  });

  it("has accessible list role", () => {
    const categories = [{ id: "1", name: "Fiction" }];
    render(<CategoryBadge categories={categories} />);

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  it("has aria-label on the list", () => {
    const categories = [{ id: "1", name: "Fiction" }];
    render(<CategoryBadge categories={categories} />);

    expect(screen.getByRole("list")).toHaveAttribute("aria-label", "카테고리");
  });

  it("renders with maxCount limiting visible badges", () => {
    const categories = [
      { id: "1", name: "Fiction" },
      { id: "2", name: "Science" },
      { id: "3", name: "History" },
    ];
    render(<CategoryBadge categories={categories} maxCount={2} />);

    expect(screen.getByText("Fiction")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.queryByText("History")).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("does not show +N badge when count equals maxCount", () => {
    const categories = [
      { id: "1", name: "Fiction" },
      { id: "2", name: "Science" },
    ];
    render(<CategoryBadge categories={categories} maxCount={2} />);

    expect(screen.getByText("Fiction")).toBeInTheDocument();
    expect(screen.getByText("Science")).toBeInTheDocument();
    expect(screen.queryByText("+0")).not.toBeInTheDocument();
  });
});
