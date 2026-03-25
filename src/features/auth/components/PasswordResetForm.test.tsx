import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { PasswordResetForm } from "./PasswordResetForm";

const mockSignIn = vi.fn();
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}));

describe("PasswordResetForm", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignIn.mockResolvedValue(undefined);
    mockOnBack.mockReset();
  });

  it("renders forgot step with email field and send button", () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset code/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /back to sign in/i }),
    ).toBeInTheDocument();
  });

  it("validates email on forgot step", async () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "not-an-email");
    await user.click(
      screen.getByRole("button", { name: /send reset code/i }),
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Email").className).toContain(
        "border-destructive",
      );
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("calls signIn with reset flow and transitions to verify step", async () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    const user = userEvent.setup();

    await user.type(
      screen.getByPlaceholderText("Email"),
      "test@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /send reset code/i }),
    );

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("password", {
        email: "test@example.com",
        flow: "reset",
      });
    });

    // Should transition to verify step
    await waitFor(() => {
      expect(screen.getByPlaceholderText("8-digit reset code")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("New Password"),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /reset password/i }),
      ).toBeInTheDocument();
    });
  });

  it("renders verify step with code and new password fields", async () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    const user = userEvent.setup();

    // Navigate to verify step
    await user.type(
      screen.getByPlaceholderText("Email"),
      "test@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /send reset code/i }),
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("8-digit reset code")).toBeInTheDocument();
    });

    expect(screen.getByPlaceholderText("New Password")).toBeInTheDocument();
    expect(
      screen.getByText(/we sent a code to test@example.com/i),
    ).toBeInTheDocument();
  });

  it("validates code minimum length on verify step", async () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    const user = userEvent.setup();

    // Navigate to verify step
    await user.type(
      screen.getByPlaceholderText("Email"),
      "test@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /send reset code/i }),
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("8-digit reset code")).toBeInTheDocument();
    });

    // Reset mock to track only the verify step calls
    mockSignIn.mockClear();

    await user.type(screen.getByPlaceholderText("8-digit reset code"), "short");
    await user.type(
      screen.getByPlaceholderText("New Password"),
      "newpassword123",
    );
    await user.click(
      screen.getByRole("button", { name: /reset password/i }),
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("8-digit reset code").className).toContain(
        "border-destructive",
      );
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("validates new password minimum length on verify step", async () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    const user = userEvent.setup();

    // Navigate to verify step
    await user.type(
      screen.getByPlaceholderText("Email"),
      "test@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /send reset code/i }),
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("8-digit reset code")).toBeInTheDocument();
    });

    mockSignIn.mockClear();

    await user.type(
      screen.getByPlaceholderText("8-digit reset code"),
      "12345678",
    );
    await user.type(screen.getByPlaceholderText("New Password"), "short");
    await user.click(
      screen.getByRole("button", { name: /reset password/i }),
    );

    await waitFor(() => {
      expect(
        screen.getByPlaceholderText("New Password").className,
      ).toContain("border-destructive");
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("calls signIn with reset-verification flow on verify step", async () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    const user = userEvent.setup();

    // Navigate to verify step
    await user.type(
      screen.getByPlaceholderText("Email"),
      "test@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /send reset code/i }),
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("8-digit reset code")).toBeInTheDocument();
    });

    mockSignIn.mockClear();

    await user.type(
      screen.getByPlaceholderText("8-digit reset code"),
      "12345678",
    );
    await user.type(
      screen.getByPlaceholderText("New Password"),
      "newpassword123",
    );
    await user.click(
      screen.getByRole("button", { name: /reset password/i }),
    );

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("password", {
        email: "test@example.com",
        code: "12345678",
        newPassword: "newpassword123",
        flow: "reset-verification",
      });
    });
  });

  it("uses defaultEmail when provided", () => {
    render(<PasswordResetForm onBack={mockOnBack} defaultEmail="prefilled@example.com" />);
    expect(screen.getByPlaceholderText("Email")).toHaveValue("prefilled@example.com");
  });

  it("calls onBack when back button is clicked on forgot step", async () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    const user = userEvent.setup();

    await user.click(
      screen.getByRole("button", { name: /back to sign in/i }),
    );
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("calls onBack when back button is clicked on verify step", async () => {
    render(<PasswordResetForm onBack={mockOnBack} />);
    const user = userEvent.setup();

    // Navigate to verify step
    await user.type(
      screen.getByPlaceholderText("Email"),
      "test@example.com",
    );
    await user.click(
      screen.getByRole("button", { name: /send reset code/i }),
    );

    await waitFor(() => {
      expect(screen.getByPlaceholderText("8-digit reset code")).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole("button", { name: /back to sign in/i }),
    );
    expect(mockOnBack).toHaveBeenCalled();
  });
});
