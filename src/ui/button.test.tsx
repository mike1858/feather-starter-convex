// Test Matrix: Button component
// | # | State             | What to verify                               |
// |---|-------------------|----------------------------------------------|
// | 1 | default render    | renders as <button> element                  |
// | 2 | asChild=true      | renders as child element with button classes  |

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Button } from "./button";

describe("Button", () => {
  it("renders as a button element by default", () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole("button", { name: /click me/i });
    expect(btn.tagName).toBe("BUTTON");
  });

  it("renders as child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>,
    );
    const link = screen.getByRole("link", { name: /link button/i });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/test");
    expect(link.className).toContain("inline-flex");
  });
});
