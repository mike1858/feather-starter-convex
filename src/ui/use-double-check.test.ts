// Test Matrix: useDoubleCheck hook
// | # | State                    | What to verify                               |
// |---|--------------------------|----------------------------------------------|
// | 1 | initial                  | doubleCheck is false                         |
// | 2 | first click              | doubleCheck becomes true, preventDefault      |
// | 3 | second click (confirmed) | user onClick called (not intercepted)        |
// | 4 | blur                     | resets doubleCheck to false                   |
// | 5 | Escape key               | resets doubleCheck to false                   |
// | 6 | non-Escape key           | doubleCheck stays true                        |
// | 7 | merged handlers          | user onBlur/onKeyUp called alongside hook's  |
// | 8 | no props argument        | returns object with onClick, onBlur, onKeyUp |

import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDoubleCheck } from "./use-double-check";

describe("useDoubleCheck", () => {
  it("starts with doubleCheck false", () => {
    const { result } = renderHook(() => useDoubleCheck());
    expect(result.current.doubleCheck).toBe(false);
  });

  it("sets doubleCheck to true on first click and prevents default", () => {
    const { result } = renderHook(() => useDoubleCheck());
    const props = result.current.getButtonProps();

    const preventDefault = vi.fn();
    act(() => {
      props.onClick?.({
        preventDefault,
      } as unknown as React.MouseEvent<HTMLButtonElement>);
    });

    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.doubleCheck).toBe(true);
  });

  it("does not override onClick once doubleCheck is true (onClick is undefined)", () => {
    const { result } = renderHook(() => useDoubleCheck());

    // First click to set doubleCheck = true
    act(() => {
      const props = result.current.getButtonProps();
      props.onClick?.({
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLButtonElement>);
    });

    expect(result.current.doubleCheck).toBe(true);

    // Second call: the internal onClick is undefined, so the user's onClick
    // should be the only handler. callAll(undefined, userOnClick) just calls userOnClick.
    const userOnClick = vi.fn();
    const props = result.current.getButtonProps({ onClick: userOnClick });
    act(() => {
      props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    });
    expect(userOnClick).toHaveBeenCalled();
  });

  it("resets doubleCheck on blur", () => {
    const { result } = renderHook(() => useDoubleCheck());

    // Set doubleCheck to true first
    act(() => {
      const props = result.current.getButtonProps();
      props.onClick?.({
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLButtonElement>);
    });
    expect(result.current.doubleCheck).toBe(true);

    // Blur should reset
    act(() => {
      const props = result.current.getButtonProps();
      props.onBlur?.({} as React.FocusEvent<HTMLButtonElement>);
    });
    expect(result.current.doubleCheck).toBe(false);
  });

  it("resets doubleCheck on Escape key", () => {
    const { result } = renderHook(() => useDoubleCheck());

    // Set doubleCheck to true first
    act(() => {
      const props = result.current.getButtonProps();
      props.onClick?.({
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLButtonElement>);
    });
    expect(result.current.doubleCheck).toBe(true);

    // Escape keyup should reset
    act(() => {
      const props = result.current.getButtonProps();
      props.onKeyUp?.({
        key: "Escape",
      } as React.KeyboardEvent<HTMLButtonElement>);
    });
    expect(result.current.doubleCheck).toBe(false);
  });

  it("does not reset on non-Escape key", () => {
    const { result } = renderHook(() => useDoubleCheck());

    // Set doubleCheck to true first
    act(() => {
      const props = result.current.getButtonProps();
      props.onClick?.({
        preventDefault: vi.fn(),
      } as unknown as React.MouseEvent<HTMLButtonElement>);
    });
    expect(result.current.doubleCheck).toBe(true);

    // Other key should not reset
    act(() => {
      const props = result.current.getButtonProps();
      props.onKeyUp?.({
        key: "Enter",
      } as React.KeyboardEvent<HTMLButtonElement>);
    });
    expect(result.current.doubleCheck).toBe(true);
  });

  it("merges user-provided onBlur and onKeyUp handlers", () => {
    const { result } = renderHook(() => useDoubleCheck());

    const userOnBlur = vi.fn();
    const userOnKeyUp = vi.fn();

    const props = result.current.getButtonProps({
      onBlur: userOnBlur,
      onKeyUp: userOnKeyUp,
    });

    act(() => {
      props.onBlur?.({} as React.FocusEvent<HTMLButtonElement>);
    });
    expect(userOnBlur).toHaveBeenCalled();

    act(() => {
      props.onKeyUp?.({
        key: "Enter",
      } as React.KeyboardEvent<HTMLButtonElement>);
    });
    expect(userOnKeyUp).toHaveBeenCalled();
  });

  it("works with no props argument", () => {
    const { result } = renderHook(() => useDoubleCheck());
    const props = result.current.getButtonProps();
    expect(props).toHaveProperty("onClick");
    expect(props).toHaveProperty("onBlur");
    expect(props).toHaveProperty("onKeyUp");
  });
});
