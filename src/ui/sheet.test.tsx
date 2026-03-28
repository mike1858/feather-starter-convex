// Test Matrix: Sheet component
// | # | State          | What to verify                              |
// |---|----------------|---------------------------------------------|
// | 1 | open=true      | title, description, content visible         |
// | 2 | open=false     | content not rendered                        |
// | 3 | close button   | sr-only "Close" text present                |
// | 4 | ARIA role      | dialog role on content                      |

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "./sheet";

describe("Sheet", () => {
  it("renders children when open", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Test Title</SheetTitle>
            <SheetDescription>Test Description</SheetDescription>
          </SheetHeader>
          <p>Panel content</p>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByText("Test Title")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
    expect(screen.getByText("Panel content")).toBeInTheDocument();
  });

  it("does not render children when closed", () => {
    render(
      <Sheet open={false}>
        <SheetContent>
          <p>Hidden content</p>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();
  });

  it("renders close button with sr-only text Close", () => {
    render(
      <Sheet open>
        <SheetContent>
          <p>Content</p>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByText("Close")).toBeInTheDocument();
    expect(screen.getByText("Close")).toHaveClass("sr-only");
  });

  it("has correct ARIA role dialog", () => {
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Dialog Title</SheetTitle>
          <p>Content</p>
        </SheetContent>
      </Sheet>,
    );

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
