import { Command } from "commander";
import * as fs from "node:fs";
import * as path from "node:path";
import * as clack from "@clack/prompts";
import { parseExcelWorkbook } from "../../templates/pipeline/excel/parser";
import { inferEntities } from "../../templates/pipeline/excel/type-inference";
import { classifyWorkbook } from "../../templates/pipeline/excel/entity-classifier";
import { generateAllYamls } from "../../templates/pipeline/excel/yaml-generator";
import { generateFeature } from "../../templates/pipeline/generate";

// ── Import action (testable) ────────────────────────────────────────────────

export interface ImportOptions {
  generate?: boolean;
  output: string;
  confirm: boolean;
}

export async function importAction(
  file: string,
  options: ImportOptions,
): Promise<void> {
  clack.intro("feather import");

  // 1. Validate file exists
  const filePath = path.resolve(file);
  if (!fs.existsSync(filePath)) {
    clack.cancel(`File not found: ${filePath}`);
    process.exit(1);
  }

  const extension = path.extname(filePath).toLowerCase();
  if (![".xlsx", ".xls"].includes(extension)) {
    clack.cancel("Only .xlsx and .xls files are supported");
    process.exit(1);
  }

  const spinner = clack.spinner();

  // 2. Parse Excel
  spinner.start("Parsing Excel file...");
  const data = fs.readFileSync(filePath);
  const parsed = parseExcelWorkbook(
    data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
    path.basename(filePath),
  );
  spinner.stop(
    `Found ${parsed.sheets.length} sheet(s) with ${parsed.sheets.reduce((sum, s) => sum + s.rowCount, 0)} total rows`,
  );

  // 3. Analyze
  spinner.start("Analyzing schema...");
  const entities = inferEntities(parsed.sheets);
  const classified = classifyWorkbook(entities, parsed.sheets);
  spinner.stop(`Detected ${classified.entities.length} entity/entities`);

  // 4. Show summary
  clack.note(
    classified.entities
      .map(
        (e) =>
          `  ${e.label} (${e.entityType}, ${Object.keys(e.fields).length} fields, ${e.confidence}% confidence)`,
      )
      .join("\n"),
    "Detected entities",
  );

  // 5. Interactive confirmation
  if (options.confirm) {
    for (const entity of classified.entities) {
      const shouldInclude = await clack.confirm({
        message: `Include entity "${entity.label}" (${entity.entityType})?`,
        initialValue: true,
      });

      if (clack.isCancel(shouldInclude)) {
        clack.cancel("Import cancelled");
        process.exit(0);
      }

      if (!shouldInclude) {
        classified.entities = classified.entities.filter(
          (e) => e.name !== entity.name,
        );
        continue;
      }

      // Show fields for review
      clack.note(
        Object.entries(entity.fields)
          .map(
            ([name, field]) =>
              `  ${name}: ${field.type}${field.required ? " (required)" : ""} — ${field.confidence}%`,
          )
          .join("\n"),
        `Fields for ${entity.label}`,
      );
    }
  }

  // 6. Generate YAMLs
  spinner.start("Generating feather.yaml files...");
  const yamls = generateAllYamls(classified.entities, classified.relationships);
  const projectRoot = path.resolve(options.output);

  for (const yaml of yamls) {
    const outputPath = path.join(projectRoot, yaml.filePath);
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(outputPath, yaml.yamlContent, "utf-8");
  }
  spinner.stop(`Generated ${yamls.length} feather.yaml file(s)`);

  // 7. Optional code generation
  if (options.generate) {
    spinner.start("Running code generation...");
    for (const yaml of yamls) {
      const yamlPath = path.join(projectRoot, yaml.filePath);
      await generateFeature({
        yamlPath,
        projectRoot,
        outputMode: "legacy",
      });
    }
    spinner.stop("Code generation complete");
  }

  // 8. Show import order
  if (classified.importOrder.length > 1) {
    clack.note(
      classified.importOrder.map((name, i) => `  ${i + 1}. ${name}`).join("\n"),
      "Recommended import order (dependencies first)",
    );
  }

  // 9. Summary
  clack.outro(
    `Import complete! Generated ${yamls.length} feather.yaml file(s).\n` +
      yamls.map((y) => `  ${y.filePath}`).join("\n") +
      (options.generate
        ? "\nCode generation complete."
        : "\nRun with --generate to also generate code."),
  );
}

// ── CLI command ──────────────────────────────────────────────────────────────

export const importCommand = new Command("import")
  .description("Import an Excel file and generate feather.yaml specs")
  .argument("<file>", "Path to .xlsx or .xls file")
  .option("--generate", "Also run code generation after YAML creation")
  .option("--output <dir>", "Output directory for YAML files", ".")
  .option("--no-confirm", "Skip interactive confirmation (use inferred schema as-is)")
  .action(async (file: string, options: ImportOptions) => {
    await importAction(file, options);
  });
