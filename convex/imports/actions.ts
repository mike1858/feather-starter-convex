"use node";
import { action } from "@cvx/_generated/server";
import { v } from "convex/values";
import { auth } from "@cvx/auth";
import Anthropic from "@anthropic-ai/sdk";

import { parseExcelWorkbook } from "../../templates/pipeline/excel/parser";
import { inferEntities } from "../../templates/pipeline/excel/type-inference";
import { classifyWorkbook } from "../../templates/pipeline/excel/entity-classifier";
import type { InferredEntity } from "../../templates/pipeline/excel/type-inference";
import type { SheetMetadata } from "../../templates/pipeline/excel/parser";
import { api } from "@cvx/_generated/api";

const FIELD_TYPES = [
  "string", "text", "number", "boolean", "enum", "date",
  "reference", "email", "url", "currency", "percentage",
] as const;

export interface AnalysisResult {
  entities: InferredEntity[];
  relationships: Array<{
    sourceEntity: string;
    sourceField: string;
    targetEntity: string;
    targetField: string;
    type: "belongs_to" | "has_many";
    confidence: number;
  }>;
  importOrder: string[];
  method: "llm" | "heuristic";
}

export const analyzeExcel = action({
  args: {
    importId: v.id("imports"),
    fileStorageId: v.string(),
  },
  handler: async (ctx, args): Promise<AnalysisResult> => {
    const userId = await auth.getUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // 1. Download file from Convex storage
    const fileUrl = await ctx.storage.getUrl(args.fileStorageId);
    if (!fileUrl) throw new Error("File not found in storage");
    const response = await fetch(fileUrl);
    const arrayBuffer = await response.arrayBuffer();

    // 2. Parse with SheetJS
    const parsed = parseExcelWorkbook(arrayBuffer, "uploaded.xlsx");

    // 3. Try LLM analysis first, fall back to heuristics
    const apiKey = process.env.ANTHROPIC_API_KEY;
    let result: AnalysisResult;

    if (apiKey) {
      try {
        result = await analyzeWithLLM(apiKey, parsed.sheets);
      } catch (error) {
        console.warn("LLM analysis failed, falling back to heuristics:", error);
        result = analyzeWithHeuristics(parsed.sheets);
      }
    } else {
      result = analyzeWithHeuristics(parsed.sheets);
    }

    // 4. Store analysis result
    await ctx.runMutation(api.imports.mutations.saveAnalysis, {
      importId: args.importId,
      analysisResult: JSON.stringify(result),
    });

    return result;
  },
});

async function analyzeWithLLM(
  apiKey: string,
  sheets: SheetMetadata[],
): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey });

  const prompt = buildAnalysisPrompt(sheets);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
    system: `You are a database schema analyst. Given Excel sheet data, you classify entities and infer field types for a code generation system.

Available field types: ${FIELD_TYPES.join(", ")}

Entity classification rules:
- Low cardinality values (< 20 unique) + short strings = lookup entity (departments, statuses)
- Name + personal/contact data = master entity (employees, customers)
- Name + description/details = reference entity (products, categories)
- Dates + references + amounts = transaction entity (orders, invoices)

Output MUST be valid JSON matching the AnalysisResult schema.`,
  });

  const textContent = response.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in LLM response");
  }

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = textContent.text.match(/```json\n?([\s\S]*?)\n?```/) ||
    textContent.text.match(/(\{[\s\S]*\})/);

  if (!jsonMatch) {
    throw new Error("Could not extract JSON from LLM response");
  }

  const parsed = JSON.parse(jsonMatch[1]) as AnalysisResult;
  parsed.method = "llm";
  return parsed;
}

export function analyzeWithHeuristics(sheets: SheetMetadata[]): AnalysisResult {
  const entities = inferEntities(sheets);
  const classified = classifyWorkbook(entities, sheets);
  return {
    ...classified,
    method: "heuristic",
  };
}

export function buildAnalysisPrompt(sheets: SheetMetadata[]): string {
  const sheetsInfo = sheets.map((sheet) => ({
    name: sheet.name,
    rowCount: sheet.rowCount,
    columns: sheet.columns.map((col) => ({
      name: col.name,
      position: col.position,
      detectedType: col.detectedType,
      sampleValues: col.sampleValues.slice(0, 3),
      uniqueCount: col.uniqueCount,
      emptyCount: col.emptyCount,
    })),
    sampleRows: sheet.sampleRows.slice(0, 3),
  }));

  return `Analyze this Excel workbook and classify each sheet as an entity with typed fields.

Workbook data:
${JSON.stringify(sheetsInfo, null, 2)}

For each sheet/entity, provide:
1. Entity name (kebab-case)
2. Entity label (human-readable)
3. Entity type (lookup/master/transaction/reference)
4. For each column: field name (camelCase), field type (from available types), required (boolean), confidence (0-100)
5. For enum fields: include the unique values as enumValues
6. For reference fields: include the target entity name

Also detect relationships between entities:
- Look for columns that reference other sheets (by name patterns like "xId", "x_id", or matching sheet names)
- Classify as belongs_to or has_many

Provide an importOrder (topological sort: dependencies first).

Return ONLY valid JSON in this exact format:
{
  "entities": [
    {
      "name": "entity-name",
      "label": "Entity Name",
      "labelPlural": "Entity Names",
      "entityType": "master",
      "confidence": 85,
      "fields": {
        "fieldName": {
          "name": "fieldName",
          "type": "string",
          "required": true,
          "confidence": 90
        }
      },
      "sourceSheet": "Sheet Name"
    }
  ],
  "relationships": [
    {
      "sourceEntity": "orders",
      "sourceField": "customerId",
      "targetEntity": "customers",
      "targetField": "name",
      "type": "belongs_to",
      "confidence": 90
    }
  ],
  "importOrder": ["departments", "employees", "orders"]
}`;
}
