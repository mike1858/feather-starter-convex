import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { featureYamlSchema, projectYamlSchema } from "../feather-yaml.schema";
import { validateFeatureYaml, validateProjectYaml } from "../yaml-validator";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");

describe("featureYamlSchema", () => {
  it("validates minimal YAML (just name + label + fields)", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
      fields: {
        title: { type: "string", required: true },
      },
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults for timestamps, identity, operations", () => {
    const result = featureYamlSchema.parse({
      name: "widgets",
      label: "Widget",
      fields: { title: { type: "string" } },
    });
    expect(result.timestamps).toBe("both");
    expect(result.identity.type).toBe("auto-increment");
    expect(result.operations.create).toBe(true);
    expect(result.operations.read).toBe(true);
    expect(result.operations.update).toBe(true);
    expect(result.operations.delete).toBe(true);
  });

  it("validates full YAML with all 8 dimensions", () => {
    const result = featureYamlSchema.safeParse({
      name: "orders",
      label: "Order",
      labelPlural: "Orders",
      fields: {
        title: { type: "string", required: true, max: 200 },
        amount: { type: "currency", currency: { symbol: "$", precision: 2 } },
        status: {
          type: "enum",
          values: ["draft", "submitted", "approved"],
          transitions: { draft: ["submitted"], submitted: ["approved"] },
        },
      },
      access: { scope: "owner", permissions: { create: "authenticated" } },
      statusFlow: {
        field: "status",
        transitions: { draft: ["submitted"], submitted: ["approved"] },
      },
      hooks: { afterSave: "custom/orders/hooks" },
      derivedData: { lineItemCount: { type: "count", source: "lineItems" } },
      views: { defaultView: "table", enabledViews: ["table", "card"] },
      identity: { type: "expression", format: "ORD-{YYYY}-{###}" },
      schedules: {
        dailyReport: { cron: "0 8 * * *", action: "orders.sendDailyReport" },
      },
      integrations: {
        webhook: { type: "webhook-out", trigger: "onStatusChange" },
      },
      relationships: {
        customer: {
          type: "belongs_to",
          target: "customers",
          column: "customerId",
        },
      },
      children: {
        lineItems: {
          label: "Line Item",
          fields: {
            product: { type: "string", required: true },
            quantity: { type: "number", min: 1 },
          },
        },
      },
      detailView: {
        layout: "tabs",
        relatedRecords: [{ source: "lineItems", display: "table", inline: true }],
      },
      behaviors: { auditTrail: true },
      overrides: { form: "custom/orders/OrderForm.tsx" },
      search: true,
      searchFields: ["title"],
      indexes: [{ name: "by_customer", fields: ["customerId"] }],
      i18n: { languages: ["en", "es", "fr"] },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = featureYamlSchema.safeParse({
      label: "Widget",
      fields: { title: { type: "string" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing label", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      fields: { title: { type: "string" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid field type", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
      fields: { bad: { type: "unknown_type" } },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid access scope", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
      fields: { title: { type: "string" } },
      access: { scope: "invalid_scope" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid identity type", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
      fields: { title: { type: "string" } },
      identity: { type: "invalid" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid view type", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
      fields: { title: { type: "string" } },
      views: { defaultView: "invalid_view" },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid integration type", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
      fields: { title: { type: "string" } },
      integrations: {
        bad: { type: "invalid_type" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid derived data type", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
      fields: { title: { type: "string" } },
      derivedData: {
        bad: { type: "invalid_agg" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid detail view layout", () => {
    const result = featureYamlSchema.safeParse({
      name: "widgets",
      label: "Widget",
      fields: { title: { type: "string" } },
      detailView: { layout: "invalid" },
    });
    expect(result.success).toBe(false);
  });
});

describe("validateFeatureYaml", () => {
  it("validates a minimal YAML string", () => {
    const yaml = `
name: widgets
label: Widget
fields:
  title:
    type: string
    required: true
`;
    const result = validateFeatureYaml(yaml);
    expect(result.success).toBe(true);
  });

  it("returns errors with line numbers for invalid YAML", () => {
    const yaml = `
name: widgets
label: Widget
fields:
  bad:
    type: unknown_type
`;
    const result = validateFeatureYaml(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
      // Should have line number info
      const hasLineInfo = result.errors.some((e) => e.line !== null);
      expect(hasLineInfo).toBe(true);
    }
  });

  it("catches cross-field validation: transitions referencing non-existent states", () => {
    const yaml = `
name: widgets
label: Widget
fields:
  status:
    type: enum
    values: [a, b]
    transitions:
      a: [c]
`;
    const result = validateFeatureYaml(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain("c");
      expect(result.errors[0].message).toContain("not in values");
    }
  });

  it("catches cross-field validation: statusFlow references non-existent field", () => {
    const yaml = `
name: widgets
label: Widget
fields:
  title:
    type: string
statusFlow:
  field: nonexistent
  transitions:
    a: [b]
`;
    const result = validateFeatureYaml(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain("nonexistent");
    }
  });

  it("catches cross-field validation: statusFlow references non-enum field", () => {
    const yaml = `
name: widgets
label: Widget
fields:
  title:
    type: string
statusFlow:
  field: title
  transitions:
    a: [b]
`;
    const result = validateFeatureYaml(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain("not 'enum'");
    }
  });

  it("catches identity expression without format placeholder", () => {
    const yaml = `
name: widgets
label: Widget
fields:
  title:
    type: string
identity:
  type: expression
  format: PLAIN
`;
    const result = validateFeatureYaml(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].message).toContain("placeholder");
    }
  });

  it("validates the migrated tasks/feather.yaml file", () => {
    const yamlContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "src/features/tasks/feather.yaml"),
      "utf-8",
    );
    const result = validateFeatureYaml(yamlContent);
    expect(result.success).toBe(true);
  });

  it("handles unparseable input", () => {
    // YAML is very lenient; most strings parse. But the result will fail Zod.
    const result = validateFeatureYaml("{ bad yaml [[[");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it("returns formatted error paths", () => {
    const yaml = `
name: widgets
label: Widget
fields:
  status:
    type: enum
    values: [a, b]
    transitions:
      x: [y]
`;
    const result = validateFeatureYaml(yaml);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0].path).toContain("transitions");
    }
  });
});

describe("projectYamlSchema", () => {
  it("validates a minimal project YAML", () => {
    const result = projectYamlSchema.safeParse({
      name: "my-project",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.version).toBe("1.0.0");
      expect(result.data.features).toEqual([]);
    }
  });

  it("validates a full project YAML", () => {
    const result = projectYamlSchema.safeParse({
      name: "feather-starter-convex",
      version: "2.0.0",
      branding: { appName: "CalmDo", primaryColor: "#3b82f6" },
      features: ["tasks", "projects"],
      bundles: ["crm"],
      settings: {
        i18n: { languages: ["en", "es"] },
        auth: { providers: ["password", "otp"] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = projectYamlSchema.safeParse({ version: "1.0" });
    expect(result.success).toBe(false);
  });
});

describe("validateProjectYaml", () => {
  it("validates the root feather.yaml file", () => {
    const yamlContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "feather.yaml"),
      "utf-8",
    );
    const result = validateProjectYaml(yamlContent);
    expect(result.success).toBe(true);
  });

  it("rejects invalid project YAML", () => {
    const result = validateProjectYaml("features: not_an_array");
    expect(result.success).toBe(false);
  });
});
