// Test Matrix: PasswordForm
// | # | State                | Approach | What to verify                                 |
// |---|----------------------|----------|------------------------------------------------|
// | 1 | Sign-in mode         | Mock     | email + password fields, sign in button        |
// | 2 | Mode toggle          | Mock     | switches signIn <-> signUp and back            |
// | 3 | Email validation     | Mock     | border-destructive on invalid email            |
// | 4 | Password validation  | Mock     | border-destructive on short password            |
// | 5 | Sign-in submit       | Mock     | signIn called with correct params              |
// | 6 | Sign-up submit       | Mock     | signIn called with signUp flow                 |
// | 7 | Forgot password      | Mock     | calls onForgotPassword handler                 |
// | 8 | Default email        | Mock     | prefills email field                           |
// | 9 | Email change callback| Mock     | calls onEmailChange                            |
// |10 | Error clear on toggle| Mock     | error disappears when mode switches            |
// |11 | Duplicate account err| Mock     | "already exists" error message                 |
// |12 | No account error     | Mock     | "no account found" error message               |
// |13 | Generic error        | Mock     | "something went wrong" message                 |
// |14 | Non-Error throwable  | Mock     | "something went wrong" for string error        |
// |15 | Success callback     | Mock     | calls onSuccess after signIn                   |
// |16 | Loading spinner      | Mock     | button text hidden during submission           |

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
    expect(await screen.findByRole("button", { name: /sign up/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /already have an account/i })).toBeInTheDocument();

    // Toggle back to signIn
    await user.click(screen.getByRole("button", { name: /already have an account/i }));
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
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

    await screen.findByRole("button", { name: /sign up/i });
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

  it("uses defaultEmail when provided", () => {
    render(<PasswordForm defaultEmail="prefilled@example.com" />);
    expect(screen.getByPlaceholderText("Email")).toHaveValue("prefilled@example.com");
  });

  it("calls onEmailChange when email is typed", async () => {
    const onEmailChange = vi.fn();
    render(<PasswordForm onEmailChange={onEmailChange} />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "a");
    expect(onEmailChange).toHaveBeenCalledWith("a");
  });

  it("clears error when toggling mode", async () => {
    mockSignIn.mockRejectedValue(new Error("already exists"));
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();

    // Toggle mode should clear error
    await user.click(screen.getByRole("button", { name: /create an account/i }));
    await waitFor(() => {
      expect(screen.queryByText(/already exists/i)).not.toBeInTheDocument();
    });
  });

  it("shows 'already exists' error on duplicate account", async () => {
    mockSignIn.mockRejectedValue(new Error("Account already exists"));
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/already exists.*try signing in/i)).toBeInTheDocument();
  });

  it("shows 'no account found' error on InvalidAccountId", async () => {
    mockSignIn.mockRejectedValue(new Error("InvalidAccountId"));
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "missing@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/no account found.*try signing up/i)).toBeInTheDocument();
  });

  it("shows generic error for unknown errors", async () => {
    mockSignIn.mockRejectedValue(new Error("Network error"));
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
  });

  it("handles non-Error throwable in catch", async () => {
    mockSignIn.mockRejectedValue("string error");
    render(<PasswordForm />);
    const user = userEvent.setup();

    await user.type(screen.getByPlaceholderText("Email"), "test@example.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
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
    expect(await screen.findByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });
});
