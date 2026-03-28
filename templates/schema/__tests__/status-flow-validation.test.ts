import { describe, it, expect } from "vitest";
import { statusFlowSchema } from "../status-flow.schema";

describe("statusFlowSchema", () => {
  it("validates linear transitions", () => {
    const result = statusFlowSchema.safeParse({
      field: "status",
      transitions: {
        todo: ["in_progress"],
        in_progress: ["done"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates branching transitions", () => {
    const result = statusFlowSchema.safeParse({
      field: "status",
      transitions: {
        open: ["in_progress", "won", "lost"],
        in_progress: ["won", "lost"],
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates transitions with guards", () => {
    const result = statusFlowSchema.safeParse({
      field: "status",
      transitions: { draft: ["submitted"] },
      guards: {
        "draft->submitted": {
          condition: "allFieldsComplete",
          message: "All required fields must be filled",
        },
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates transitions with hooks", () => {
    const result = statusFlowSchema.safeParse({
      field: "status",
      transitions: { submitted: ["approved"] },
      hooks: { "submitted->approved": "custom/orders/onApproval" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing field", () => {
    const result = statusFlowSchema.safeParse({
      transitions: { a: ["b"] },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing transitions", () => {
    const result = statusFlowSchema.safeParse({
      field: "status",
    });
    expect(result.success).toBe(false);
  });
});
