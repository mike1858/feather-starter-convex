import * as fs from "node:fs";
import * as path from "node:path";
import Handlebars from "handlebars";
import {
  camelCase,
  pascalCase,
  kebabCase,
  snakeCase,
  noCase,
  sentenceCase,
} from "change-case";
import type { FeatureYaml } from "../schema/feather-yaml.schema";
import { resolveDetailPage } from "../cross-entity/resolver";

// ── Enum color palette ───────────────────────────────────────────────────────

const ENUM_PALETTE = [
  { dot: "bg-gray-400", text: "text-gray-600" },
  { dot: "bg-blue-500", text: "text-blue-600" },
  { dot: "bg-green-500", text: "text-green-600" },
  { dot: "bg-amber-500", text: "text-amber-600" },
  { dot: "bg-red-500", text: "text-red-600" },
  { dot: "bg-purple-500", text: "text-purple-600" },
  { dot: "bg-pink-500", text: "text-pink-600" },
  { dot: "bg-cyan-500", text: "text-cyan-600" },
];

// ── Helper utilities ─────────────────────────────────────────────────────────

function toUpperSnakeCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
}

// ── Register all custom Handlebars helpers ───────────────────────────────────

export function registerStandaloneHelpers(
  hbs: typeof Handlebars = Handlebars,
): void {
  // ── case-transformation helpers ──────────────────────────────────────────
  hbs.registerHelper("pascalCase", (str: unknown) =>
    str ? pascalCase(String(str)) : "",
  );
  hbs.registerHelper("camelCase", (str: unknown) =>
    str ? camelCase(String(str)) : "",
  );
  hbs.registerHelper("kebabCase", (str: unknown) =>
    str ? kebabCase(String(str)) : "",
  );
  hbs.registerHelper("snakeCase", (str: unknown) =>
    str ? snakeCase(String(str)) : "",
  );
  hbs.registerHelper("titleCase", (str: unknown) => {
    if (!str) return "";
    return noCase(String(str))
      .split(" ")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  });
  hbs.registerHelper("lowerCase", (str: unknown) =>
    str ? String(str).toLowerCase() : "",
  );
  hbs.registerHelper("upperCase", (str: unknown) =>
    str ? String(str).toUpperCase() : "",
  );
  hbs.registerHelper("sentenceCase", (str: unknown) =>
    str ? sentenceCase(String(str)) : "",
  );
  hbs.registerHelper("upperSnakeCase", (str: unknown) =>
    str ? toUpperSnakeCase(String(str)) : "",
  );

  // ── Zod type helpers ─────────────────────────────────────────────────────
  hbs.registerHelper("zodType", (field: Record<string, unknown>) => {
    let result: string;
    switch (field.type) {
      case "string":
        result = `z.string().max(${field.max ?? 200})`;
        break;
      case "text":
        result = `z.string().max(${field.max ?? 5000})`;
        break;
      case "boolean":
        result = `z.boolean().default(${field.default ?? false})`;
        break;
      case "number":
        result = "z.number()";
        break;
      case "enum": {
        const vals = (field.values as string[]).map((v) => `"${v}"`).join(", ");
        result = `z.enum([${vals}])`;
        break;
      }
      default:
        result = `z.string().max(${field.max ?? 200})`;
    }
    if (field.required === false) {
      result += ".optional()";
    }
    return result;
  });

  hbs.registerHelper(
    "zodTypeExport",
    (fieldName: string, field: Record<string, unknown>) => {
      if (field.type !== "enum" || !field.values) return "";
      const upperSnake = toUpperSnakeCase(fieldName);
      const vals = (field.values as string[])
        .map((v) => `"${v}"`)
        .join(", ");
      return (
        `export const ${upperSnake}_VALUES = [${vals}] as const;\n` +
        `export const ${fieldName} = z.enum(${upperSnake}_VALUES);`
      );
    },
  );

  // ── Convex validator helpers ─────────────────────────────────────────────
  hbs.registerHelper(
    "convexValidatorType",
    (field: Record<string, unknown>, schemaRef: string) => {
      switch (field.type) {
        case "string":
        case "text":
          return "v.string()";
        case "boolean":
          return "v.boolean()";
        case "number":
          return "v.number()";
        case "enum":
          return `zodToConvex(${schemaRef})`;
        default:
          return "v.string()";
      }
    },
  );

  // ── Form input helper ────────────────────────────────────────────────────
  hbs.registerHelper("formInputType", (field: Record<string, unknown>) => {
    switch (field.type) {
      case "string":
        return "Input";
      case "text":
        return "textarea";
      case "boolean":
        return "Switch";
      case "number":
        return 'Input type="number"';
      case "enum":
        return "Select";
      default:
        return "Input";
    }
  });

  // ── Logic helpers ─────────────────────────────────────────────────────────
  hbs.registerHelper(
    "ifEq",
    function (
      this: unknown,
      a: unknown,
      b: unknown,
      options: Handlebars.HelperOptions,
    ) {
      return a === b ? options.fn(this) : options.inverse(this);
    },
  );

  hbs.registerHelper("eq", (a: unknown, b: unknown) => a === b);

  hbs.registerHelper(
    "ifIn",
    function (
      this: unknown,
      value: unknown,
      array: unknown,
      options: Handlebars.HelperOptions,
    ) {
      if (Array.isArray(array) && array.includes(value)) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
  );

  hbs.registerHelper("or", (a: unknown, b: unknown) => Boolean(a) || Boolean(b));
  hbs.registerHelper("and", (a: unknown, b: unknown) => Boolean(a) && Boolean(b));
  hbs.registerHelper("not", (a: unknown) => !Boolean(a));

  // ── JSON helper ──────────────────────────────────────────────────────────
  hbs.registerHelper("json", (obj: unknown) => JSON.stringify(obj));

  // ── Enum badge helpers ───────────────────────────────────────────────────
  hbs.registerHelper(
    "enumBadgeColor",
    (field: Record<string, unknown>, value: string) => {
      if (!field.values) return "";
      let slot: number;
      if (field.colors && (field.colors as Record<string, number>)[value] !== undefined) {
        slot = (field.colors as Record<string, number>)[value];
      } else {
        const idx = (field.values as string[]).indexOf(value);
        slot = idx >= 0 ? idx % 8 : 0;
      }
      const palette = ENUM_PALETTE[slot % 8];
      return `${palette.dot} ${palette.text}`;
    },
  );

  hbs.registerHelper(
    "enumBadgeClasses",
    (field: Record<string, unknown>, value: string) => {
      if (!field.values) return "";
      let slot: number;
      if (field.colors && (field.colors as Record<string, number>)[value] !== undefined) {
        slot = (field.colors as Record<string, number>)[value];
      } else {
        const idx = (field.values as string[]).indexOf(value);
        slot = idx >= 0 ? idx % 8 : 0;
      }
      const palette = ENUM_PALETTE[slot % 8];
      return `${palette.dot} ${palette.text}`;
    },
  );

  hbs.registerHelper(
    "enumBadgeDot",
    (field: Record<string, unknown>, value: string) => {
      if (!field || !field.values) return "bg-gray-400";
      const idx = (field.values as string[]).indexOf(value);
      const slot = idx >= 0 ? idx % 8 : 0;
      return ENUM_PALETTE[slot].dot;
    },
  );

  hbs.registerHelper(
    "enumBadgeText",
    (field: Record<string, unknown>, value: string) => {
      if (!field || !field.values) return "text-gray-600";
      const idx = (field.values as string[]).indexOf(value);
      const slot = idx >= 0 ? idx % 8 : 0;
      return ENUM_PALETTE[slot].text;
    },
  );

  hbs.registerHelper(
    "enumColorEntries",
    (field: Record<string, unknown>) => {
      if (!field.values) return "";
      return (field.values as string[])
        .map((v, i) => {
          const slot = i % 8;
          const palette = ENUM_PALETTE[slot];
          return `  "${v}": { dot: "${palette.dot}", text: "${palette.text}" }`;
        })
        .join(",\n");
    },
  );

  // ── View visibility helper ───────────────────────────────────────────────
  hbs.registerHelper(
    "showOnView",
    function (
      this: unknown,
      field: Record<string, unknown>,
      viewName: string,
      options: Handlebars.HelperOptions,
    ) {
      if (Array.isArray(field.hideOn) && (field.hideOn as string[]).includes(viewName)) {
        return options.inverse(this);
      }
      if (field.showOn === "all" || !field.showOn) {
        return options.fn(this);
      }
      if (Array.isArray(field.showOn) && (field.showOn as string[]).includes(viewName)) {
        return options.fn(this);
      }
      return options.inverse(this);
    },
  );

  // ── API / error path helpers ─────────────────────────────────────────────
  hbs.registerHelper("apiPath", (name: string) => {
    if (name.includes("-")) {
      return `api["${name}"]`;
    }
    return `api.${name}`;
  });

  hbs.registerHelper("errorsPath", (name: string) => {
    if (name.includes("-")) {
      return `ERRORS["${name}"]`;
    }
    return `ERRORS.${name}`;
  });

  hbs.registerHelper("toUpperSnakeCase", (str: string) =>
    toUpperSnakeCase(str),
  );

  // ── Array helpers ─────────────────────────────────────────────────────────
  hbs.registerHelper("lastValue", (arr: unknown) => {
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[arr.length - 1];
    }
    return "";
  });

  hbs.registerHelper("firstValue", (arr: unknown) => {
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[0];
    }
    return "";
  });

  // ── Enum transition helpers ──────────────────────────────────────────────
  const hasEnumTransitionsImpl = function (
    this: unknown,
    fields: Record<string, Record<string, unknown>>,
    options: Handlebars.HelperOptions,
  ) {
    const hasTransitions = Object.values(fields).some(
      (f) => f.type === "enum" && f.transitions,
    );
    return hasTransitions ? options.fn(this) : options.inverse(this);
  };

  hbs.registerHelper("hasEnumTransitions", hasEnumTransitionsImpl);
  // Alias used by status-badge.tsx.hbs
  hbs.registerHelper("hasTransitions", hasEnumTransitionsImpl);

  hbs.registerHelper(
    "enumTransitionKeys",
    (fields: Record<string, Record<string, unknown>>) => {
      return Object.entries(fields)
        .filter(([, f]) => f.type === "enum" && f.transitions)
        .map(([key]) => `${key}: _${key}`)
        .join(", ");
    },
  );

  // ── Filter helpers ───────────────────────────────────────────────────────
  hbs.registerHelper(
    "hasFilterableFields",
    function (
      this: unknown,
      fields: Record<string, Record<string, unknown>>,
      options: Handlebars.HelperOptions,
    ) {
      const has = Object.values(fields).some((f) => f.filterable);
      return has ? options.fn(this) : options.inverse(this);
    },
  );

  hbs.registerHelper(
    "hasAnyFilters",
    function (
      this: unknown,
      fields: Record<string, Record<string, unknown>>,
      views: Record<string, unknown>,
      options: Handlebars.HelperOptions,
    ) {
      const hasFilteredViews =
        views &&
        Array.isArray(views.filteredViews) &&
        (views.filteredViews as unknown[]).length > 0;
      const hasFilterableFields = Object.values(fields).some((f) => f.filterable);
      return hasFilteredViews || hasFilterableFields
        ? options.fn(this)
        : options.inverse(this);
    },
  );

  hbs.registerHelper(
    "filterableEnumEntries",
    (fields: Record<string, Record<string, unknown>>) => {
      const entries: string[] = [];
      for (const [key, field] of Object.entries(fields)) {
        if (
          field.filterable &&
          field.type === "enum" &&
          Array.isArray(field.values)
        ) {
          for (const val of field.values as string[]) {
            entries.push(
              `  { key: "${key}:${val}", labelKey: "status.${val}" },`,
            );
          }
        }
      }
      return entries.join("\n");
    },
  );
}

// ── Template rendering ───────────────────────────────────────────────────────

// Singleton Handlebars instance with helpers registered
let _helpersRegistered = false;

function ensureHelpers(): void {
  if (!_helpersRegistered) {
    registerStandaloneHelpers(Handlebars);
    _helpersRegistered = true;
  }
}

/**
 * Render a single .hbs template file with the provided data context.
 */
export function renderTemplate(
  templatePath: string,
  data: Record<string, unknown>,
): string {
  const templateSource = fs.readFileSync(templatePath, "utf-8");
  ensureHelpers();
  const template = Handlebars.compile(templateSource, { noEscape: true });
  return template(data);
}

// ── Template data context ────────────────────────────────────────────────────

/**
 * Build the Handlebars data context from a FeatureYaml config.
 * Matches the data context that Plop generators build.
 */
function buildTemplateData(
  config: FeatureYaml,
): Record<string, unknown> {
  const name = config.name;
  const fieldsObj = config.fields as Record<string, Record<string, unknown>>;

  // Derive computed arrays used in templates
  const fieldsArray = Object.entries(fieldsObj).map(([key, field]) => ({
    ...field,
    _key: key,
  }));

  const enumFields = fieldsArray.filter((f) => f.type === "enum");

  const hasStatusField = enumFields.some(
    (f) => f.transitions !== undefined && f.transitions !== null,
  );
  const statusField = enumFields.find(
    (f) => f.transitions !== undefined && f.transitions !== null,
  );

  const statusValues = statusField
    ? (statusField.values as string[] | undefined) ?? []
    : [];

  const hasTransitions = hasStatusField;
  const hasTimestamps = config.timestamps !== false && config.timestamps !== "none";
  const hasCreatedAt =
    config.timestamps === "both" ||
    config.timestamps === true ||
    config.timestamps === "created";
  const hasUpdatedAt =
    config.timestamps === "both" ||
    config.timestamps === true ||
    config.timestamps === "updated";

  const requiredFields = fieldsArray.filter((f) => f.required);
  const nonStatusFields = fieldsArray.filter(
    (f) => !(f.type === "enum" && f.transitions),
  );

  // Normalize views for template access
  const views = config.views as Record<string, unknown> | undefined;
  const viewsNormalized = views
    ? {
        ...views,
        // Some templates access views.default.enabledViews
        default: (views.default as Record<string, unknown>) ?? {
          defaultView: "list",
          enabledViews: ["list"],
        },
        filteredViews: views.filteredViews ?? [],
      }
    : {
        default: { defaultView: "list", enabledViews: ["list"] },
        filteredViews: [],
      };

  return {
    // Identity
    name,
    pascalName: pascalCase(name),
    camelName: camelCase(name),
    label: config.label,
    labelPlural:
      (config.labelPlural as string | undefined) ?? config.label + "s",
    i18nNamespace: name,

    // Fields
    fields: fieldsObj,
    fieldsArray,
    enumFields,
    requiredFields,
    nonStatusFields,

    // Status / enum
    hasStatusField,
    statusField: statusField ?? null,
    statusValues,
    hasTransitions,
    statusFieldKey: (config as Record<string, unknown>).statusFieldKey ?? null,

    // Timestamps
    hasTimestamps,
    hasCreatedAt,
    hasUpdatedAt,
    timestamps: config.timestamps,

    // Behaviors
    behaviors: config.behaviors ?? {
      softDelete: false,
      auditTrail: false,
      immutable: false,
      assignable: false,
      orderable: false,
    },

    // Access
    access: config.access ?? {
      scope: "owner",
      permissions: {
        create: "authenticated",
        read: "owner",
        update: "owner",
        delete: "owner",
      },
      sharing: false,
    },

    // Views
    views: viewsNormalized,

    // Operations
    operations: config.operations ?? {
      create: true,
      read: true,
      update: true,
      delete: true,
    },

    // Indexes
    indexes: config.indexes ?? [],

    // Search
    search: config.search ?? false,
    searchFields: config.searchFields ?? [],

    // Relationships
    relationships: config.relationships ?? {},

    // i18n
    i18n: config.i18n ?? { languages: ["en", "es"] },
  };
}

// ── Template directory to output path mapping ─────────────────────────────────

interface TemplateEntry {
  templateFile: string;
  outputKey: string;
  /** If set, only include this template when condition is true */
  condition?: (data: Record<string, unknown>) => boolean;
}

function buildTemplateEntries(
  config: FeatureYaml,
  templateDir: string,
): TemplateEntry[] {
  const name = config.name;
  const pascalName = pascalCase(name);
  const fieldsObj = config.fields as Record<string, Record<string, unknown>>;
  const hasEnum = Object.values(fieldsObj).some((f) => f.type === "enum");
  const views = config.views as Record<string, unknown> | undefined;
  const enabledViews: string[] =
    (views?.default as Record<string, unknown> | undefined)?.enabledViews as string[] ??
    ["list"];

  const f = (file: string) => path.join(templateDir, file);

  const entries: TemplateEntry[] = [
    // ── Backend ───────────────────────────────────────────────────────────
    {
      templateFile: f("schema.ts.hbs"),
      outputKey: "schema.fragment.ts",
    },
    {
      templateFile: f("mutations.ts.hbs"),
      outputKey: "mutations.ts",
    },
    {
      templateFile: f("queries.ts.hbs"),
      outputKey: "queries.ts",
    },
    {
      templateFile: f("mutations.test.ts.hbs"),
      outputKey: "mutations.test.ts",
    },
    {
      templateFile: f("queries.test.ts.hbs"),
      outputKey: "queries.test.ts",
    },

    // ── Frontend components ───────────────────────────────────────────────
    {
      templateFile: f("component.tsx.hbs"),
      outputKey: `components/${pascalName}Page.tsx`,
    },
    {
      templateFile: f("form.tsx.hbs"),
      outputKey: `components/${pascalName}Form.tsx`,
    },
    {
      templateFile: f("item.tsx.hbs"),
      outputKey: `components/${pascalName}Item.tsx`,
    },
    {
      templateFile: f("title-bar.tsx.hbs"),
      outputKey: `components/${pascalName}TitleBar.tsx`,
    },
    {
      templateFile: f("status-badge.tsx.hbs"),
      outputKey: `components/${pascalName}StatusBadge.tsx`,
      condition: () => hasEnum,
    },
    {
      templateFile: f("view-switcher.tsx.hbs"),
      outputKey: `components/${pascalName}ViewSwitcher.tsx`,
      condition: () => enabledViews.length > 1,
    },
    {
      templateFile: f("empty-state.tsx.hbs"),
      outputKey: `components/${pascalName}EmptyState.tsx`,
    },
    {
      templateFile: f("filter-bar.tsx.hbs"),
      outputKey: `components/${pascalName}FilterBar.tsx`,
    },
    {
      templateFile: f("loading-skeleton.tsx.hbs"),
      outputKey: `components/${pascalName}LoadingSkeleton.tsx`,
    },
    {
      templateFile: f("list-view.tsx.hbs"),
      outputKey: `components/${pascalName}ListView.tsx`,
    },
    {
      templateFile: f("card-view.tsx.hbs"),
      outputKey: `components/${pascalName}CardView.tsx`,
      condition: () => enabledViews.includes("card"),
    },
    {
      templateFile: f("table-view.tsx.hbs"),
      outputKey: `components/${pascalName}TableView.tsx`,
      condition: () => enabledViews.includes("table"),
    },
    {
      templateFile: f("detail-page.tsx.hbs"),
      outputKey: `components/${pascalName}DetailPage.tsx`,
    },
    {
      templateFile: f("page.tsx.hbs"),
      outputKey: `components/${pascalName}PageContainer.tsx`,
    },

    // ── Frontend non-component files ──────────────────────────────────────
    {
      templateFile: f("hook.ts.hbs"),
      outputKey: `hooks/use${pascalName}.ts`,
    },
    {
      templateFile: f("index.ts.hbs"),
      outputKey: "index.ts",
    },
    {
      templateFile: f("test.tsx.hbs"),
      outputKey: `${name}.test.tsx`,
    },
    {
      templateFile: f("readme.md.hbs"),
      outputKey: "README.md",
    },

    // ── Locale files ──────────────────────────────────────────────────────
    {
      templateFile: f("locale-en.json.hbs"),
      outputKey: `locales/en/${name}.json`,
    },
    {
      templateFile: f("locale-es.json.hbs"),
      outputKey: `locales/es/${name}.json`,
    },

    // NOTE: route.tsx.hbs is intentionally skipped here — route wiring is
    // handled separately by the wire step (wirePipeline).
  ];

  return entries.filter(
    (entry) => !entry.condition || entry.condition({}),
  );
}

// ── Main public API ──────────────────────────────────────────────────────────

/**
 * Render all applicable feature templates for the given config.
 *
 * @param config - Validated + defaults-merged FeatureYaml
 * @param templateDir - Absolute path to `templates/feature/` directory
 * @returns Map from relative output key (e.g. "mutations.ts") to rendered content
 */
export function renderFeatureTemplates(
  config: FeatureYaml,
  templateDir: string,
): Map<string, string> {
  ensureHelpers();

  const data = buildTemplateData(config);
  const entries = buildTemplateEntries(config, templateDir);
  const result = new Map<string, string>();

  for (const entry of entries) {
    const rendered = renderTemplate(entry.templateFile, data);
    result.set(entry.outputKey, rendered);
  }

  return result;
}

/**
 * Render cross-entity panel templates for a feature with detailView.relatedRecords.
 *
 * @param config - Validated + defaults-merged FeatureYaml (must have detailView)
 * @param relatedYamls - Map of source entity name → FeatureYaml for each related entity
 * @param crossEntityTemplateDir - Absolute path to `templates/cross-entity/` directory
 * @returns Map from relative output key (e.g. "components/subtasks-checklist-panel.tsx")
 *          to rendered content. Empty map if no detailView or no relatedRecords.
 */
export function renderCrossEntityPanels(
  config: FeatureYaml,
  relatedYamls: Map<string, FeatureYaml>,
  crossEntityTemplateDir: string,
): Map<string, string> {
  if (!config.detailView) {
    return new Map();
  }

  ensureHelpers();

  const context = resolveDetailPage(config, relatedYamls);
  const result = new Map<string, string>();

  const f = (file: string) => path.join(crossEntityTemplateDir, file);

  // Render per-panel templates for each related record
  for (const record of context.relatedRecords) {
    const templateFile = f(`${record.display}-panel.tsx.hbs`);
    if (!fs.existsSync(templateFile)) continue;

    const rendered = renderTemplate(templateFile, record as unknown as Record<string, unknown>);
    result.set(`components/${record.source}-${record.display}-panel.tsx`, rendered);
  }

  // Render the panel-renderer (aggregator component)
  const rendererTemplate = f("panel-renderer.tsx.hbs");
  if (fs.existsSync(rendererTemplate)) {
    const parentPascal = pascalCase(config.name);
    const rendererContext = {
      ...context,
      parentPascal,
    };
    const rendered = renderTemplate(rendererTemplate, rendererContext as unknown as Record<string, unknown>);
    result.set(`components/${config.name}-panels.tsx`, rendered);
  }

  return result;
}
