/**
 * Auto-wiring Plop actions for shared files.
 * Registers custom action types that modify schema.ts, nav.ts, errors.ts, i18n.ts,
 * and create locale JSON files.
 *
 * Per D-32: each action prints a diff summary showing exactly what was changed.
 *
 * @typedef {import('plop').NodePlopAPI} NodePlopAPI
 * @typedef {import('./types.ts').FeatureConfig} FeatureConfig
 * @typedef {import('./types.ts').FieldConfig} FieldConfig
 */

import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";

// ANSI color codes for diff output
const GREEN = "\x1b[32m";
const RESET = "\x1b[0m";

/**
 * Print a diff summary showing added lines.
 * @param {string} filePath - Relative path to modified file
 * @param {string[]} addedLines - Lines that were added
 */
function printDiffSummary(filePath, addedLines) {
  console.log(`\n  ${filePath}:`);
  for (const line of addedLines) {
    console.log(`  ${GREEN}+ ${line}${RESET}`);
  }
}

/**
 * Get the Convex validator expression for a field.
 * @param {FieldConfig} field
 * @param {string} fieldName
 * @param {string} schemaImportName - Import name for enum reference
 * @returns {string}
 */
function getConvexValidator(field, fieldName, schemaImportName) {
  const wrapOptional = (expr) =>
    field.required === false ? `v.optional(${expr})` : expr;

  switch (field.type) {
    case "string":
    case "text":
      return wrapOptional("v.string()");
    case "boolean":
      return wrapOptional("v.boolean()");
    case "number":
      return wrapOptional("v.number()");
    case "enum":
      return `zodToConvex(${schemaImportName}_${fieldName})`;
    default:
      return wrapOptional("v.string()");
  }
}

/**
 * Register all auto-wiring custom action types on a Plop instance.
 * @param {NodePlopAPI} plop
 */
export function registerWiringActions(plop) {
  // ─── appendToSchema ────────────────────────────────────────────────
  plop.setActionType("appendToSchema", (answers) => {
    const schemaPath = path.resolve(process.cwd(), "convex/schema.ts");
    let content = fs.readFileSync(schemaPath, "utf8");
    const name = answers.name;
    const fields = answers.fields || {};
    const indexes = answers.indexes || [];

    // Check if already wired (handle both quoted and unquoted keys)
    if (content.includes(`${name}: defineTable(`) || content.includes(`"${name}": defineTable(`)) {
      return `convex/schema.ts already contains ${name} table`;
    }

    const addedLines = [];

    // 1. Add schema import (Zod enum references — aliased to avoid cross-feature collisions)
    const enumFields = Object.entries(fields).filter(
      ([, f]) => f.type === "enum",
    );
    if (enumFields.length > 0) {
      const imports = enumFields.map(([fieldName]) => `${fieldName} as ${name}_${fieldName}`);
      const importLine = `import {\n  ${imports.join(",\n  ")},\n} from "../src/shared/schemas/${name}";`;

      // Insert before defineSchema
      const defineSchemaIdx = content.indexOf("const schema = defineSchema(");
      if (defineSchemaIdx === -1) {
        return "Could not find defineSchema in convex/schema.ts";
      }

      content =
        content.slice(0, defineSchemaIdx) +
        importLine +
        "\n\n" +
        content.slice(defineSchemaIdx);
      addedLines.push(...importLine.split("\n"));
    }

    // Ensure zodToConvex import exists (for enum fields)
    if (
      enumFields.length > 0 &&
      !content.includes('import { zodToConvex }')
    ) {
      const convexValuesImport = 'import { v } from "convex/values";';
      const insertAfter = content.indexOf(convexValuesImport);
      if (insertAfter !== -1) {
        const zodImport =
          '\nimport { zodToConvex } from "convex-helpers/server/zod4";';
        content =
          content.slice(0, insertAfter + convexValuesImport.length) +
          zodImport +
          content.slice(insertAfter + convexValuesImport.length);
        addedLines.push(zodImport.trim());
      }
    }

    // 2. Build table definition
    const fieldLines = [];
    for (const [fieldName, fieldConfig] of Object.entries(fields)) {
      const validator = getConvexValidator(
        fieldConfig,
        fieldName,
        name,
      );
      fieldLines.push(`    ${fieldName}: ${validator},`);
    }

    // Add userId and timestamps
    fieldLines.push("    userId: v.id(\"users\"),");
    if (
      answers.timestamps === "both" ||
      answers.timestamps === "createdAt" ||
      answers.timestamps === undefined
    ) {
      // Timestamps are handled by Convex's _creationTime, but we add explicit ones if needed
    }
    if (answers.behaviors?.orderable) {
      fieldLines.push("    position: v.number(),");
    }

    // Add FK columns from belongs_to relationships (Bug #1)
    if (answers.relationships) {
      for (const [, rel] of Object.entries(answers.relationships)) {
        if (rel.type === "belongs_to" && rel.column && rel.target) {
          const validator = rel.required === true
            ? `v.id("${rel.target}")`
            : `v.optional(v.id("${rel.target}"))`;
          fieldLines.push(`    ${rel.column}: ${validator},`);
        }
      }
    }

    // Build index chains
    const indexChains = indexes
      .map((idx) => `.index("${idx.name}", [${idx.fields.map((f) => `"${f}"`).join(", ")}])`)
      .map((chain) => `    ${chain}`);

    const tableKey = name.includes("-") ? `"${name}"` : name;
    const tableLines = [
      `  ${tableKey}: defineTable({`,
      ...fieldLines,
      "  })",
      ...indexChains.map((c) => c),
    ];
    const tableBlock = tableLines.join("\n") + ",";

    // Find insertion point: before closing of defineSchema
    // Look for the last table definition's closing comma before the final })
    const closingPattern = /\n(}\);?\s*\n\nexport default schema)/;
    const closingMatch = content.match(closingPattern);

    if (closingMatch) {
      const insertIdx = content.indexOf(closingMatch[0]);
      content =
        content.slice(0, insertIdx) +
        "\n" +
        tableBlock +
        "\n" +
        content.slice(insertIdx);
    } else {
      // Fallback: insert before the closing });
      const lastClosing = content.lastIndexOf("});");
      if (lastClosing !== -1) {
        content =
          content.slice(0, lastClosing) +
          tableBlock +
          "\n" +
          content.slice(lastClosing);
      }
    }

    addedLines.push(...tableBlock.split("\n"));

    fs.writeFileSync(schemaPath, content);
    printDiffSummary("convex/schema.ts", addedLines);
    return `Updated convex/schema.ts with ${name} table definition`;
  });

  // ─── appendToNav ───────────────────────────────────────────────────
  plop.setActionType("appendToNav", (answers) => {
    const navPath = path.resolve(process.cwd(), "src/shared/nav.ts");
    let content = fs.readFileSync(navPath, "utf8");
    const { name, label, labelPlural } = answers;

    // Check if already wired
    if (content.includes(`to: "/dashboard/${name}"`)) {
      return `src/shared/nav.ts already contains ${name} entry`;
    }

    const addedLines = [];

    // Build main nav entry
    const navEntry = `  {
    label: "${labelPlural}",
    i18nKey: "${name}.nav.${name}",
    to: "/dashboard/${name}",
  },`;

    // Also add filtered view nav entries if configured
    const filteredNavEntries = [];
    if (answers.views?.filteredViews) {
      for (const view of answers.views.filteredViews) {
        if (view.navEntry) {
          filteredNavEntries.push(`  {
    label: "${view.label}",
    i18nKey: "${name}.nav.${view.name}",
    to: "/dashboard/${view.name}",
  },`);
        }
      }
    }

    const allEntries = [navEntry, ...filteredNavEntries].join("\n");

    // Insert before the Settings entry
    const settingsIdx = content.indexOf(
      '    label: "Settings"',
    );
    if (settingsIdx !== -1) {
      // Find the opening { of the Settings entry
      const settingsObjStart = content.lastIndexOf("{", settingsIdx);
      content =
        content.slice(0, settingsObjStart) +
        allEntries +
        "\n  " +
        content.slice(settingsObjStart);
    } else {
      // Fallback: insert before closing ] of navItems
      const closingBracket = content.lastIndexOf("];");
      if (closingBracket !== -1) {
        content =
          content.slice(0, closingBracket) +
          allEntries +
          "\n" +
          content.slice(closingBracket);
      }
    }

    addedLines.push(...allEntries.split("\n"));
    fs.writeFileSync(navPath, content);
    printDiffSummary("src/shared/nav.ts", addedLines);
    return `Updated src/shared/nav.ts with ${name} navigation entry`;
  });

  // ─── appendToErrors ────────────────────────────────────────────────
  plop.setActionType("appendToErrors", (answers) => {
    const errorsPath = path.resolve(process.cwd(), "src/shared/errors.ts");
    let content = fs.readFileSync(errorsPath, "utf8");
    const { name, label } = answers;

    // Check if already wired (handle both quoted and unquoted keys)
    if (content.includes(`${name}: {`) || content.includes(`"${name}": {`)) {
      return `src/shared/errors.ts already contains ${name} group`;
    }

    const errorKey = name.includes("-") ? `"${name}"` : name;
    const errorGroup = `  ${errorKey}: {
    NOT_FOUND: "${label} not found.",
    INVALID_STATUS_TRANSITION: "Invalid status transition.",
  },`;

    // Insert before } as const
    const asConstIdx = content.indexOf("} as const");
    if (asConstIdx !== -1) {
      content =
        content.slice(0, asConstIdx) +
        errorGroup +
        "\n" +
        content.slice(asConstIdx);
    }

    const addedLines = errorGroup.split("\n");
    fs.writeFileSync(errorsPath, content);
    printDiffSummary("src/shared/errors.ts", addedLines);
    return `Updated src/shared/errors.ts with ${name} error group`;
  });

  // ─── appendToI18n ──────────────────────────────────────────────────
  plop.setActionType("appendToI18n", (answers) => {
    const i18nPath = path.resolve(process.cwd(), "src/i18n.ts");
    let content = fs.readFileSync(i18nPath, "utf8");
    const { name } = answers;

    // Check if already wired
    if (content.includes(`"${name}"`)) {
      return `src/i18n.ts already contains "${name}" namespace`;
    }

    // Find the ns array and append the namespace
    const nsPattern = /const ns = \[([^\]]*)\]/;
    const nsMatch = content.match(nsPattern);
    if (nsMatch) {
      const existingNs = nsMatch[1].trim();
      const newNs = existingNs
        ? `${existingNs}, "${name}"`
        : `"${name}"`;
      content = content.replace(nsPattern, `const ns = [${newNs}]`);
    }

    const addedLine = `"${name}"`;
    fs.writeFileSync(i18nPath, content);
    printDiffSummary("src/i18n.ts", [addedLine]);
    return `Updated src/i18n.ts with "${name}" namespace`;
  });

  // ─── createLocales ─────────────────────────────────────────────────
  plop.setActionType("createLocales", (answers, config, plop) => {
    const { name } = answers;
    const languages = answers.i18n?.languages || ["en", "es"];
    const createdFiles = [];

    for (const lang of languages) {
      const localePath = path.resolve(
        process.cwd(),
        `public/locales/${lang}/${name}.json`,
      );
      const templateFile = `templates/feature/locale-${lang}.json.hbs`;
      const templatePath = path.resolve(process.cwd(), templateFile);

      if (!fs.existsSync(templatePath)) {
        // Skip languages without templates
        continue;
      }

      const raw = fs.readFileSync(templatePath, "utf8");
      const rendered = plop.renderString(raw, answers);

      fs.mkdirSync(path.dirname(localePath), { recursive: true });
      fs.writeFileSync(localePath, rendered);
      createdFiles.push(`public/locales/${lang}/${name}.json`);
    }

    if (createdFiles.length > 0) {
      printDiffSummary("locales", createdFiles);
    }
    return `Created locale files: ${createdFiles.join(", ")}`;
  });
}
