/**
 * Custom Handlebars helpers for CRUD generator templates.
 * Registers helpers for Zod types, Convex validators, form inputs,
 * enum badge colors, and view visibility logic.
 *
 * @typedef {import('./types.ts').FieldConfig} FieldConfig
 */

/** 8-slot color palette for enum badges. */
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

/**
 * Convert a string to UPPER_SNAKE_CASE.
 * @param {string} str
 * @returns {string}
 */
function toUpperSnakeCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[-\s]+/g, "_")
    .toUpperCase();
}

/**
 * Register all custom Handlebars helpers on a Plop instance.
 * @param {import('plop').NodePlopAPI} plop
 */
export function registerHelpers(plop) {
  /**
   * Returns the Zod type string for a field configuration.
   * Usage: {{zodType field}}
   */
  plop.setHelper("zodType", (field) => {
    let result;

    switch (field.type) {
      case "string":
        result = `z.string().max(${field.max || 200})`;
        break;
      case "text":
        result = `z.string().max(${field.max || 5000})`;
        break;
      case "boolean":
        result = `z.boolean().default(${field.default ?? false})`;
        break;
      case "number":
        result = "z.number()";
        break;
      case "enum": {
        const vals = field.values.map((v) => `"${v}"`).join(", ");
        result = `z.enum([${vals}])`;
        break;
      }
      default:
        result = `z.string().max(${field.max || 200})`;
    }

    if (field.required === false) {
      result += ".optional()";
    }

    return result;
  });

  /**
   * For enum fields, returns the named export (const + z.enum).
   * For non-enum fields, returns empty string.
   * Usage: {{zodTypeExport fieldName field}}
   */
  plop.setHelper("zodTypeExport", (fieldName, field) => {
    if (field.type !== "enum" || !field.values) return "";

    const upperSnake = toUpperSnakeCase(fieldName);
    const vals = field.values.map((v) => `"${v}"`).join(", ");

    return (
      `export const ${upperSnake}_VALUES = [${vals}] as const;\n` +
      `export const ${fieldName} = z.enum(${upperSnake}_VALUES);`
    );
  });

  /**
   * Returns the Convex validator type for schema.ts.
   * Usage: {{convexValidatorType field schemaRef}}
   */
  plop.setHelper("convexValidatorType", (field, schemaRef) => {
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
  });

  /**
   * Returns the React component name/type for form inputs.
   * Usage: {{formInputType field}}
   */
  plop.setHelper("formInputType", (field) => {
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

  /**
   * Equality conditional helper.
   * Block usage: {{#ifEq a b}}...{{else}}...{{/ifEq}}
   * Subexpression usage: {{#unless (eq a b)}}...{{/unless}}
   */
  plop.setHelper("ifEq", function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  });

  /**
   * Equality comparison helper for subexpressions.
   * Usage: {{#if (eq a b)}}...{{/if}} or {{#unless (eq a b)}}...{{/unless}}
   */
  plop.setHelper("eq", (a, b) => a === b);

  /**
   * Array membership conditional helper.
   * Usage: {{#ifIn value array}}...{{else}}...{{/ifIn}}
   */
  plop.setHelper("ifIn", function (value, array, options) {
    if (Array.isArray(array) && array.includes(value)) {
      return options.fn(this);
    }
    return options.inverse(this);
  });

  /**
   * Returns CSS classes for enum badge coloring.
   * Usage: {{enumBadgeClasses field value}}
   */
  plop.setHelper("enumBadgeClasses", (field, value) => {
    if (!field.values) return "";

    let slot;
    if (field.colors && field.colors[value] !== undefined) {
      slot = field.colors[value];
    } else {
      const idx = field.values.indexOf(value);
      slot = idx >= 0 ? idx % 8 : 0;
    }

    const palette = ENUM_PALETTE[slot % 8];
    return `${palette.dot} ${palette.text}`;
  });

  /**
   * Returns the dot CSS class for an enum badge.
   * Usage: {{enumBadgeDot field value}}
   */
  plop.setHelper("enumBadgeDot", (field, value) => {
    if (!field || !field.values) return "bg-gray-400";
    const idx = field.values.indexOf(value);
    const slot = idx >= 0 ? idx % 8 : 0;
    return ENUM_PALETTE[slot].dot;
  });

  /**
   * Returns the text CSS class for an enum badge.
   * Usage: {{enumBadgeText field value}}
   */
  plop.setHelper("enumBadgeText", (field, value) => {
    if (!field || !field.values) return "text-gray-600";
    const idx = field.values.indexOf(value);
    const slot = idx >= 0 ? idx % 8 : 0;
    return ENUM_PALETTE[slot].text;
  });

  /**
   * Convert string to UPPER_SNAKE_CASE.
   * Usage: {{upperSnakeCase "camelCase"}}
   */
  plop.setHelper("upperSnakeCase", (str) => toUpperSnakeCase(str));

  /**
   * JSON.stringify helper.
   * Usage: {{json obj}}
   */
  plop.setHelper("json", (obj) => JSON.stringify(obj));

  /**
   * Returns the API path for a feature name.
   * Handles kebab-case names using bracket notation: api["my-feature"]
   * For simple names uses dot notation: api.myFeature
   * Usage: {{apiPath name}}
   */
  plop.setHelper("apiPath", (name) => {
    if (name.includes("-")) {
      return `api["${name}"]`;
    }
    return `api.${name}`;
  });

  /**
   * Returns the ERRORS access path for a feature name.
   * Handles kebab-case names: ERRORS["my-feature"]
   * For simple names: ERRORS.myFeature
   * Usage: {{errorsPath name}}
   */
  plop.setHelper("errorsPath", (name) => {
    if (name.includes("-")) {
      return `ERRORS["${name}"]`;
    }
    return `ERRORS.${name}`;
  });

  /**
   * Returns the last element of an array.
   * Usage: {{lastValue array}}
   */
  plop.setHelper("lastValue", (arr) => {
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[arr.length - 1];
    }
    return "";
  });

  /**
   * Returns the first element of an array.
   * Usage: {{firstValue array}}
   */
  plop.setHelper("firstValue", (arr) => {
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[0];
    }
    return "";
  });

  /**
   * Check if a field should be shown on a given view.
   * Usage: {{#showOnView field "list"}}...{{/showOnView}}
   */
  plop.setHelper("showOnView", function (field, viewName, options) {
    // Check hideOn first
    if (Array.isArray(field.hideOn) && field.hideOn.includes(viewName)) {
      return options.inverse(this);
    }

    // Check showOn
    if (field.showOn === "all" || !field.showOn) {
      return options.fn(this);
    }

    if (Array.isArray(field.showOn) && field.showOn.includes(viewName)) {
      return options.fn(this);
    }

    return options.inverse(this);
  });
}
