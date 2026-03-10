import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { PasswordForm } from "./PasswordForm";

const mockSignIn = vi.fn();
vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}));

describe("PasswordForm", () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignIn.mockResolvedValue(undefined);
  });

  it("renders email and password fields", () => {
    render(<PasswordForm />);
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("defaults to signIn mode with toggle button", () => {
    render(<PasswordForm />);
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create an account/i })).toBeInTheDocument();
  });

  it("toggles between signIn and signUp modes and back", async () => {
    render(<PasswordForm />);
    const user = userEvent.setup();

    // Toggle to signUp
    await user.click(screen.getByRole("button", { name: /create an account/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /already have an account/i })).toBeInTheDocument();

    // Toggle back to signIn
    await user.click(screen.getByRole("button", { name: /already have an account/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /create an account/i })).toBeInTheDocument();
  });

  it("validates email format on submit", async () => {
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "not-an-email");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Email").className).toContain("border-destructive");
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("validates password minimum length on submit", async () => {
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "short");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Password").className).toContain("border-destructive");
    });
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it("calls signIn with correct params for signIn flow", async () => {
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("password", {
        email: "test@example.com",
        password: "password123",
        flow: "signIn",
      });
    });
  });

  it("calls signIn with correct params for signUp flow", async () => {
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /create an account/i }));
    await user.type(screen.getByPlaceholderText("Email"), "new@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "newpassword123");

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign up/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith("password", {
        email: "new@example.com",
        password: "newpassword123",
        flow: "signUp",
      });
    });
  });

  it("shows forgot password button and calls handler", async () => {
    const onForgotPassword = vi.fn();
    render(<PasswordForm onForgotPassword={onForgotPassword} />);
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: /forgot password/i }));
    expect(onForgotPassword).toHaveBeenCalled();
  });

  it("calls onSuccess after successful signIn", async () => {
    const onSuccess = vi.fn();
    render(<PasswordForm onSuccess={onSuccess} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it("shows loading spinner during submission", async () => {
    let resolveSignIn!: () => void;
    mockSignIn.mockImplementation(
      () => new Promise<void>((resolve) => { resolveSignIn = resolve; }),
    );

    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
    });

    resolveSignIn();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
    });
  });
});
