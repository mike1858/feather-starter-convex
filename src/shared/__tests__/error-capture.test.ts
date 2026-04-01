// Test Matrix: error-capture utility
// | #  | Function          | State                       | What to verify                                 |
// |----|-------------------|-----------------------------|-------------------------------------------------|
// | 1  | captureError      | with Convex client set      | calls mutation with correct args                |
// | 2  | captureError      | no Convex client            | logs to console, does not throw                 |
// | 3  | captureError      | mutation throws             | catches silently, no infinite loop              |
// | 4  | captureError      | non-Error value             | wraps in Error via String()                     |
// | 5  | sanitizeArgs      | with sensitive fields       | redacts password, token, secret, key, etc.      |
// | 6  | sanitizeArgs      | with safe fields            | passes through unchanged                        |
// | 7  | setConvexClient   | called with client          | sets module-level client reference               |
// | 8  | initErrorCapture  | VITE_SENTRY_DSN set         | dynamically imports and initializes Sentry      |
// | 9  | initErrorCapture  | no VITE_SENTRY_DSN          | does NOT import or initialize Sentry            |
// | 10 | captureError      | Sentry initialized          | calls Sentry.captureException with error+extra  |
// | 11 | captureError      | Sentry NOT initialized      | does NOT call Sentry.captureException           |

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  captureError,
  setConvexClient,
  sanitizeArgs,
  initErrorCapture,
  _resetSentryForTest,
} from "@/shared/error-capture";

// Mock the Convex API module
vi.mock("@cvx/_generated/api", () => ({
  api: {
    devErrors: {
      mutations: {
        store: "devErrors:mutations:store",
      },
    },
  },
}));

// Mock @sentry/react for Sentry tests
const mockSentryInit = vi.fn();
const mockSentryCaptureException = vi.fn();
vi.mock("@sentry/react", () => ({
  init: mockSentryInit,
  captureException: mockSentryCaptureException,
}));

describe("error-capture", () => {
  let mockMutation: ReturnType<typeof vi.fn>;
  let mockClient: { mutation: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockMutation = vi.fn().mockResolvedValue(undefined);
    mockClient = { mutation: mockMutation };
    // Reset the module-level client before each test
    setConvexClient(null as any);
    // Reset Sentry state
    _resetSentryForTest();
    mockSentryInit.mockClear();
    mockSentryCaptureException.mockClear();
  });

  describe("captureError", () => {
    it("calls mutation with correct args when client is set", () => {
      setConvexClient(mockClient as any);
      const testError = new Error("Test failure");
      testError.stack = "Error: Test failure\n  at test.ts:42";

      captureError("frontend", testError, {
        functionName: "MyComponent.render",
      });

      expect(mockMutation).toHaveBeenCalledOnce();
      const callArgs = mockMutation.mock.calls[0];
      expect(callArgs[0]).toBe("devErrors:mutations:store");
      expect(callArgs[1]).toMatchObject({
        source: "frontend",
        message: "Test failure",
        stack: expect.stringContaining("Test failure"),
        functionName: "MyComponent.render",
      });
      expect(callArgs[1].timestamp).toBeTypeOf("number");
    });

    it("logs to console and does not throw when no client is set", () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Should not throw
      expect(() =>
        captureError("backend", new Error("No client")),
      ).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[error-capture] No Convex client set, logging to console:",
        expect.any(Error),
      );
      expect(mockMutation).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("catches mutation errors silently to prevent infinite loops", () => {
      const throwingClient = {
        mutation: vi.fn().mockImplementation(() => {
          throw new Error("Mutation failed");
        }),
      };
      setConvexClient(throwingClient as any);
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Should not throw
      expect(() =>
        captureError("frontend", new Error("Original error")),
      ).not.toThrow();
      expect(consoleSpy).toHaveBeenCalledWith(
        "[error-capture] Failed to capture error:",
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });

    it("wraps non-Error values in Error via String()", () => {
      setConvexClient(mockClient as any);

      captureError("silent", "string error message");

      const callArgs = mockMutation.mock.calls[0];
      expect(callArgs[1].message).toBe("string error message");
    });

    it("sanitizes args when context.args is provided", () => {
      setConvexClient(mockClient as any);

      captureError("backend", new Error("fail"), {
        args: { userId: "123", password: "secret123", name: "test" },
      });

      const callArgs = mockMutation.mock.calls[0];
      const parsedArgs = JSON.parse(callArgs[1].args);
      expect(parsedArgs.userId).toBe("123");
      expect(parsedArgs.password).toBe("[REDACTED]");
      expect(parsedArgs.name).toBe("test");
    });

    it("calls Sentry.captureException when Sentry is initialized", async () => {
      // Initialize Sentry (mocked)
      import.meta.env.VITE_SENTRY_DSN = "https://test@sentry.io/123";
      await initErrorCapture();

      setConvexClient(mockClient as any);
      const testError = new Error("Dual report error");

      captureError("frontend", testError, { functionName: "TestFn" });

      // Layer 1: devErrors mutation called
      expect(mockMutation).toHaveBeenCalledOnce();
      // Layer 2: Sentry captureException called
      expect(mockSentryCaptureException).toHaveBeenCalledOnce();
      expect(mockSentryCaptureException).toHaveBeenCalledWith(testError, {
        extra: { source: "frontend", functionName: "TestFn" },
      });

      // Clean up
      delete import.meta.env.VITE_SENTRY_DSN;
    });

    it("does NOT call Sentry.captureException when Sentry is not initialized", () => {
      setConvexClient(mockClient as any);

      captureError("frontend", new Error("No Sentry"));

      // Layer 1 works
      expect(mockMutation).toHaveBeenCalledOnce();
      // Layer 2: NOT called
      expect(mockSentryCaptureException).not.toHaveBeenCalled();
    });
  });

  describe("sanitizeArgs", () => {
    it("redacts fields matching sensitive patterns", () => {
      const result = JSON.parse(
        sanitizeArgs({
          password: "secret",
          apiToken: "tok_123",
          secretKey: "sk_abc",
          authorizationHeader: "Bearer xyz",
          sessionId: "sess_123",
          cookieValue: "abc=def",
        }),
      );

      expect(result.password).toBe("[REDACTED]");
      expect(result.apiToken).toBe("[REDACTED]");
      expect(result.secretKey).toBe("[REDACTED]");
      expect(result.authorizationHeader).toBe("[REDACTED]");
      expect(result.sessionId).toBe("[REDACTED]");
      expect(result.cookieValue).toBe("[REDACTED]");
    });

    it("passes through non-sensitive fields unchanged", () => {
      const result = JSON.parse(
        sanitizeArgs({
          userId: "123",
          name: "test",
          email: "a@b.com",
          count: 42,
        }),
      );

      expect(result.userId).toBe("123");
      expect(result.name).toBe("test");
      expect(result.email).toBe("a@b.com");
      expect(result.count).toBe(42);
    });
  });

  describe("setConvexClient", () => {
    it("sets the client reference so captureError can use it", () => {
      // First verify no client = no mutation call
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      captureError("frontend", new Error("test"));
      expect(mockMutation).not.toHaveBeenCalled();
      consoleSpy.mockRestore();

      // Now set client and verify mutation is called
      setConvexClient(mockClient as any);
      captureError("frontend", new Error("test"));
      expect(mockMutation).toHaveBeenCalledOnce();
    });
  });

  describe("initErrorCapture", () => {
    it("initializes Sentry when VITE_SENTRY_DSN is set", async () => {
      import.meta.env.VITE_SENTRY_DSN = "https://test@sentry.io/123";

      await initErrorCapture();

      expect(mockSentryInit).toHaveBeenCalledOnce();
      expect(mockSentryInit).toHaveBeenCalledWith({
        dsn: "https://test@sentry.io/123",
        enabled: import.meta.env.PROD,
      });

      // Clean up
      delete import.meta.env.VITE_SENTRY_DSN;
    });

    it("does NOT initialize Sentry when VITE_SENTRY_DSN is not set", async () => {
      delete import.meta.env.VITE_SENTRY_DSN;

      await initErrorCapture();

      expect(mockSentryInit).not.toHaveBeenCalled();
    });
  });
});
