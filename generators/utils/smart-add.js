/**
 * Smart file creation with marked region preservation.
 * Registers a custom Plop action type `smartAdd` that:
 * - On first run: renders template and creates the file
 * - On re-run: extracts custom regions from existing file, regenerates from template,
 *   then re-injects the custom regions into the fresh output.
 *
 * @typedef {import('plop').NodePlopAPI} NodePlopAPI
 */

import fs from "node:fs";
import path from "node:path";
import Handlebars from "handlebars";
import {
  extractCustomRegions,
  injectCustomRegions,
} from "./marked-regions.js";

/**
 * Render a Handlebars template file against the given data.
 * Uses the Plop-registered Handlebars instance (with all custom helpers)
 * by compiling the raw template with the same Handlebars import.
 * @param {string} templateFile - Relative path to .hbs template
 * @param {Record<string, unknown>} data - Template context (answers + resolved config)
 * @param {NodePlopAPI} plop - Plop instance for renderString
 * @returns {string} Rendered template content
 */
function renderTemplate(templateFile, data, plop) {
  const templatePath = path.resolve(process.cwd(), templateFile);
  const raw = fs.readFileSync(templatePath, "utf8");
  // Use plop.renderString which has all registered helpers
  return plop.renderString(raw, data);
}

/**
 * Ensure a directory exists, creating it recursively if needed.
 * @param {string} dirPath
 */
function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Register the `smartAdd` custom action type on a Plop instance.
 * @param {NodePlopAPI} plop
 */
export function registerSmartAdd(plop) {
  plop.setActionType("smartAdd", (answers, config, plop) => {
    const targetPath = path.resolve(
      process.cwd(),
      plop.renderString(config.path, answers),
    );
    const templateContent = renderTemplate(config.templateFile, answers, plop);

    if (fs.existsSync(targetPath)) {
      // Re-run mode: preserve custom regions
      const existing = fs.readFileSync(targetPath, "utf8");
      const customRegions = extractCustomRegions(existing);
      const merged = injectCustomRegions(templateContent, customRegions);
      fs.writeFileSync(targetPath, merged);
      return `Updated ${path.relative(process.cwd(), targetPath)} (preserved ${customRegions.size} custom regions)`;
    }

    // First run: write template as-is
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, templateContent);
    return `Created ${path.relative(process.cwd(), targetPath)}`;
  });
}
