import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import Handlebars from "handlebars";
import {
  registerStandaloneHelpers,
  renderTemplate,
  renderFeatureTemplates,
} from "../render";
import { mergeWithDefaults } from "../../schema/defaults-merger";
import YAML from "yaml";

const PROJECT_ROOT = path.resolve(__dirname, "../../..");
const TEMPLATE_DIR = path.join(PROJECT_ROOT, "templates", "feature");

// ── Minimal template data context ────────────────────────────────────────────

/** Minimal data context for direct renderTemplate calls. */
function minimalTemplateData(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name: "todos",
    pascalName: "Todos",
    camelName: "todos",
    label: "Todo",
    labelPlural: "Todos",
    i18nNamespace: "todos",
    fields: { title: { type: "string", required: true, max: 200 } },
    fieldsArray: [{ _key: "title", type: "string", required: true, max: 200 }],
    enumFields: [],
    requiredFields: [],
    nonStatusFields: [],
    hasStatusField: false,
    statusField: null,
    statusValues: [],
    hasTransitions: false,
    statusFieldKey: null,
    timestamps: "both",
    hasTimestamps: true,
    hasCreatedAt: true,
    hasUpdatedAt: true,
    behaviors: {
      softDelete: false,
      assignable: false,
      orderable: false,
      auditTrail: false,
      immutable: false,
    },
    access: {
      scope: "owner",
      permissions: {
        create: "authenticated",
        read: "owner",
        update: "owner",
        delete: "owner",
      },
    },
    views: {
      default: { defaultView: "list", enabledViews: ["list"] },
      filteredViews: [],
    },
    operations: { create: true, read: true, update: true, delete: true },
    indexes: [],
    search: false,
    searchFields: [],
    relationships: {},
    i18n: { languages: ["en", "es"] },
    ...overrides,
  };
}

// ── Minimal and enum FeatureYaml configs for pipeline tests ──────────────────

const minimalYaml: Record<string, unknown> = {
  name: "todos",
  label: "Todo",
  labelPlural: "Todos",
  fields: {
    title: { type: "string", required: true, max: 200 },
  },
};

const enumYaml: Record<string, unknown> = {
  name: "tickets",
  label: "Ticket",
  labelPlural: "Tickets",
  fields: {
    title: { type: "string", required: true, max: 200 },
    status: {
      type: "enum",
      values: ["open", "in_progress", "closed"],
      required: true,
      transitions: {
        open: ["in_progress"],
        in_progress: ["closed"],
        closed: [],
      },
      filterable: true,
    },
  },
};

// ── Helper registration tests ────────────────────────────────────────────────

describe("registerStandaloneHelpers", () => {
  let hbs: typeof Handlebars;

  beforeAll(() => {
    hbs = Handlebars.create();
    registerStandaloneHelpers(hbs);
  });

  it("registers all required helpers (>= 17)", () => {
    const helperNames = Object.keys(hbs.helpers);
    const expectedHelpers = [
      "pascalCase",
      "camelCase",
      "kebabCase",
      "snakeCase",
      "titleCase",
      "lowerCase",
      "upperCase",
      "sentenceCase",
      "upperSnakeCase",
      "zodType",
      "zodTypeExport",
      "convexValidatorType",
      "formInputType",
      "ifEq",
      "eq",
      "ifIn",
      "or",
      "and",
      "not",
      "json",
      "enumBadgeColor",
      "apiPath",
      "errorsPath",
      "showOnView",
      "hasEnumTransitions",
      "hasTransitions",
    ];

    for (const name of expectedHelpers) {
      expect(helperNames, `Expected helper "${name}" to be registered`).toContain(name);
    }
    expect(expectedHelpers.length).toBeGreaterThanOrEqual(17);
  });

  it("pascalCase produces correct output", () => {
    const template = hbs.compile("{{pascalCase name}}");
    expect(template({ name: "work-logs" })).toBe("WorkLogs");
    expect(template({ name: "todos" })).toBe("Todos");
  });

  it("camelCase produces correct output", () => {
    const template = hbs.compile("{{camelCase name}}");
    expect(template({ name: "work-logs" })).toBe("workLogs");
  });

  it("kebabCase produces correct output", () => {
    const template = hbs.compile("{{kebabCase name}}");
    expect(template({ name: "workLogs" })).toBe("work-logs");
  });

  it("zodType returns z.string().max() for string field", () => {
    const template = hbs.compile("{{zodType field}}");
    expect(template({ field: { type: "string", max: 200, required: true } })).toBe(
      "z.string().max(200)",
    );
  });

  it("zodType returns z.enum([...]) for enum field", () => {
    // Use triple-braces to prevent HTML entity escaping in test assertions
    const template = hbs.compile("{{{zodType field}}}");
    expect(
      template({ field: { type: "enum", values: ["a", "b"], required: true } }),
    ).toBe('z.enum(["a", "b"])');
  });

  it("zodType appends .optional() for non-required fields", () => {
    const template = hbs.compile("{{zodType field}}");
    expect(
      template({ field: { type: "string", max: 100, required: false } }),
    ).toBe("z.string().max(100).optional()");
  });

  it("eq helper returns true for equal values, false for unequal", () => {
    const template = hbs.compile("{{#if (eq a b)}}yes{{else}}no{{/if}}");
    expect(template({ a: "owner", b: "owner" })).toBe("yes");
    expect(template({ a: "owner", b: "team" })).toBe("no");
  });

  it("apiPath helper uses bracket notation for kebab-case", () => {
    const template = hbs.compile("{{{apiPath name}}}");
    expect(template({ name: "work-logs" })).toBe('api["work-logs"]');
    expect(template({ name: "tasks" })).toBe("api.tasks");
  });

  it("errorsPath helper uses bracket notation for kebab-case", () => {
    const template = hbs.compile("{{{errorsPath name}}}");
    expect(template({ name: "work-logs" })).toBe('ERRORS["work-logs"]');
    expect(template({ name: "tasks" })).toBe("ERRORS.tasks");
  });

  it("upperSnakeCase converts to UPPER_SNAKE_CASE", () => {
    const template = hbs.compile("{{upperSnakeCase str}}");
    expect(template({ str: "myField" })).toBe("MY_FIELD");
    expect(template({ str: "status" })).toBe("STATUS");
  });

  it("ifEq block helper: fn branch on equal, inverse on unequal", () => {
    const template = hbs.compile(
      '{{#ifEq scope "owner"}}is-owner{{else}}not-owner{{/ifEq}}',
    );
    expect(template({ scope: "owner" })).toBe("is-owner");
    expect(template({ scope: "team" })).toBe("not-owner");
  });

  it("sentenceCase converts underscore_case to Sentence case", () => {
    const template = hbs.compile("{{sentenceCase str}}");
    expect(template({ str: "in_progress" })).toBe("In progress");
  });
});

// ── renderTemplate tests ─────────────────────────────────────────────────────

describe("renderTemplate", () => {
  it("renders schema.ts.hbs with minimal context and contains Zod types", () => {
    const output = renderTemplate(
      path.join(TEMPLATE_DIR, "schema.ts.hbs"),
      minimalTemplateData(),
    );
    // name appears as pascalCase in identifiers like createTodosInput
    expect(output).toContain("Todos");
    expect(output).toContain("title");
    expect(output).toContain("z.string()");
    expect(output).toContain("createTodosInput");
  });

  it("renders mutations.ts.hbs containing mutation function exports", () => {
    const output = renderTemplate(
      path.join(TEMPLATE_DIR, "mutations.ts.hbs"),
      minimalTemplateData(),
    );
    expect(output).toContain("export const create");
    expect(output).toContain("export const update");
    expect(output).toContain("export const remove");
  });

  it("renders component.tsx.hbs containing React component", () => {
    const output = renderTemplate(
      path.join(TEMPLATE_DIR, "component.tsx.hbs"),
      minimalTemplateData(),
    );
    expect(output).toContain("function TodosPage");
    expect(output).toContain("useTranslation");
  });

  it("throws when template file does not exist", () => {
    expect(() =>
      renderTemplate(path.join(TEMPLATE_DIR, "nonexistent-file.hbs"), {}),
    ).toThrow();
  });
});

// ── renderFeatureTemplates tests ─────────────────────────────────────────────

describe("renderFeatureTemplates", () => {
  it("returns Map with >= 20 entries for minimal config", () => {
    const config = mergeWithDefaults(minimalYaml, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    expect(result.size).toBeGreaterThanOrEqual(20);
  });

  it("includes StatusBadge template when enum field with transitions present", () => {
    const config = mergeWithDefaults(enumYaml, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const keys = Array.from(result.keys());
    expect(keys.some((k) => k.includes("StatusBadge"))).toBe(true);
  });

  it("does NOT include StatusBadge when no enum field", () => {
    const config = mergeWithDefaults(
      {
        name: "notes",
        label: "Note",
        fields: { body: { type: "text", required: true } },
      },
      PROJECT_ROOT,
    );
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const keys = Array.from(result.keys());
    expect(keys.some((k) => k.includes("StatusBadge"))).toBe(false);
  });

  it("all output values are non-empty strings", () => {
    const config = mergeWithDefaults(minimalYaml, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    for (const [key, value] of result) {
      expect(typeof value, `${key} should be string`).toBe("string");
      expect(value.length, `${key} should be non-empty`).toBeGreaterThan(0);
    }
  });

  it("output keys include expected backend file paths", () => {
    const config = mergeWithDefaults(minimalYaml, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const keys = Array.from(result.keys());
    expect(keys).toContain("schema.fragment.ts");
    expect(keys).toContain("mutations.ts");
    expect(keys).toContain("queries.ts");
    expect(keys).toContain("mutations.test.ts");
    expect(keys).toContain("queries.test.ts");
  });

  it("output keys include expected frontend component paths", () => {
    const config = mergeWithDefaults(minimalYaml, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const keys = Array.from(result.keys());
    expect(keys).toContain("components/TodosPage.tsx");
    expect(keys).toContain("components/TodosForm.tsx");
    expect(keys).toContain("index.ts");
    expect(keys).toContain("todos.test.tsx");
  });

  it("output keys include locale files for en and es", () => {
    const config = mergeWithDefaults(minimalYaml, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const keys = Array.from(result.keys());
    expect(keys).toContain("locales/en/todos.json");
    expect(keys).toContain("locales/es/todos.json");
  });

  it("schema output contains Zod create input and field names", () => {
    const config = mergeWithDefaults(minimalYaml, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const schema = result.get("schema.fragment.ts")!;
    expect(schema).toContain("createTodosInput");
    expect(schema).toContain("title");
    expect(schema).toContain("z.string()");
  });

  it("mutations output contains create, update, remove for todos", () => {
    const config = mergeWithDefaults(minimalYaml, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const mutations = result.get("mutations.ts")!;
    expect(mutations).toContain("export const create");
    expect(mutations).toContain("export const update");
    expect(mutations).toContain("export const remove");
  });
});

// ── Tasks YAML fixture tests ─────────────────────────────────────────────────

describe("renderFeatureTemplates with tasks YAML fixture", () => {
  it("renders >= 20 files for tasks YAML", () => {
    const yamlContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "src", "features", "tasks", "feather.yaml"),
      "utf-8",
    );
    const parsed = YAML.parse(yamlContent) as Record<string, unknown>;
    const config = mergeWithDefaults(parsed, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    expect(result.size).toBeGreaterThanOrEqual(20);
  });

  it("schema output contains all task field names", () => {
    const yamlContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "src", "features", "tasks", "feather.yaml"),
      "utf-8",
    );
    const parsed = YAML.parse(yamlContent) as Record<string, unknown>;
    const config = mergeWithDefaults(parsed, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const schema = result.get("schema.fragment.ts")!;
    expect(schema).toContain("title");
    expect(schema).toContain("status");
    expect(schema).toContain("priority");
  });

  it("mutations output contains assign function (tasks has assignable behavior)", () => {
    const yamlContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "src", "features", "tasks", "feather.yaml"),
      "utf-8",
    );
    const parsed = YAML.parse(yamlContent) as Record<string, unknown>;
    const config = mergeWithDefaults(parsed, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const mutations = result.get("mutations.ts")!;
    expect(mutations).toContain("export const create");
    expect(mutations).toContain("export const assign");
  });

  it("mutations output contains updateStatus function for tasks (has transitions)", () => {
    const yamlContent = fs.readFileSync(
      path.join(PROJECT_ROOT, "src", "features", "tasks", "feather.yaml"),
      "utf-8",
    );
    const parsed = YAML.parse(yamlContent) as Record<string, unknown>;
    const config = mergeWithDefaults(parsed, PROJECT_ROOT);
    const result = renderFeatureTemplates(config, TEMPLATE_DIR);
    const mutations = result.get("mutations.ts")!;
    // Tasks has status enum with transitions → updateStatus mutation generated
    expect(mutations).toContain("updateStatus");
  });
});
