import { describe, it, expect } from "vitest";
import {
  extractCustomRegions,
  injectCustomRegions,
} from "../utils/marked-regions.js";

describe("marked-regions", () => {
  describe("extractCustomRegions", () => {
    it("returns empty map for file with no custom blocks", () => {
      const content = `import { something } from "somewhere";
export const foo = "bar";
`;
      const regions = extractCustomRegions(content);
      expect(regions.size).toBe(0);
    });

    it("extracts single custom block", () => {
      const content = `// some code
// @custom-start imports
import { customHelper } from "./helpers";
// @custom-end imports
// more code
`;
      const regions = extractCustomRegions(content);
      expect(regions.size).toBe(1);
      expect(regions.get("imports")).toBe(
        'import { customHelper } from "./helpers";\n',
      );
    });

    it("extracts multiple custom blocks with different keys", () => {
      const content = `// @custom-start imports
import { a } from "a";
// @custom-end imports

// @generated-start main
const x = 1;
// @generated-end main

// @custom-start helpers
function helper() { return true; }
// @custom-end helpers
`;
      const regions = extractCustomRegions(content);
      expect(regions.size).toBe(2);
      expect(regions.has("imports")).toBe(true);
      expect(regions.has("helpers")).toBe(true);
    });

    it("preserves content including newlines and indentation", () => {
      const content = `// @custom-start body
  if (condition) {
    doSomething();

    doMore();
  }
// @custom-end body
`;
      const regions = extractCustomRegions(content);
      const body = regions.get("body")!;
      expect(body).toContain("  if (condition) {");
      expect(body).toContain("    doSomething();");
      expect(body).toContain("");
      expect(body).toContain("    doMore();");
    });

    it("handles TSX/JSX files with angle brackets in custom blocks", () => {
      const content = `{/* @custom-start jsx-imports */}
import { Button } from "@/ui/button";
{/* @custom-end jsx-imports */}

{/* @custom-start extra-ui */}
<div className="custom">
  <Button>Click me</Button>
</div>
{/* @custom-end extra-ui */}
`;
      const regions = extractCustomRegions(content);
      expect(regions.size).toBe(2);
      expect(regions.get("jsx-imports")).toContain("Button");
      expect(regions.get("extra-ui")).toContain("<div");
      expect(regions.get("extra-ui")).toContain("<Button>");
    });
  });

  describe("injectCustomRegions", () => {
    it("replaces empty custom blocks with saved content", () => {
      const newContent = `// code
// @custom-start imports
// @custom-end imports
// more code
`;
      const customRegions = new Map([
        ["imports", 'import { helper } from "./helper";\n'],
      ]);

      const result = injectCustomRegions(newContent, customRegions);
      expect(result).toContain('import { helper } from "./helper";');
      expect(result).toContain("// @custom-start imports");
      expect(result).toContain("// @custom-end imports");
    });

    it("preserves generated blocks between @generated-start/@generated-end", () => {
      const newContent = `// @generated-start main
const generatedCode = true;
// @generated-end main
// @custom-start extra
// @custom-end extra
`;
      const customRegions = new Map([
        ["extra", "const myCode = true;\n"],
      ]);

      const result = injectCustomRegions(newContent, customRegions);
      expect(result).toContain("const generatedCode = true;");
      expect(result).toContain("const myCode = true;");
    });

    it("handles file with only generated blocks (no custom) - no-op", () => {
      const content = `// @generated-start all
const everything = "generated";
// @generated-end all
`;
      const customRegions = new Map();
      const result = injectCustomRegions(content, customRegions);
      expect(result).toBe(content);
    });
  });

  describe("round-trip", () => {
    it("extract from file A, inject into regenerated file B, custom content preserved", () => {
      // Original file with custom additions
      const fileA = `// @generated-start imports
import { query } from "@cvx/_generated/server";
// @generated-end imports

// @custom-start imports
import { specialHelper } from "./special";
// @custom-end imports

// @generated-start handler
export const list = query({ handler: async (ctx) => {} });
// @generated-end handler

// @custom-start handler-extension
// Custom filtering logic
const filtered = results.filter(r => r.active);
// @custom-end handler-extension
`;

      // Extract custom regions from file A
      const regions = extractCustomRegions(fileA);
      expect(regions.size).toBe(2);

      // Regenerated file B (updated generated code, empty custom blocks)
      const fileB = `// @generated-start imports
import { query } from "@cvx/_generated/server";
import { auth } from "@cvx/auth";
// @generated-end imports

// @custom-start imports
// @custom-end imports

// @generated-start handler
export const list = query({ handler: async (ctx) => { const userId = await auth.getUserId(ctx); } });
// @generated-end handler

// @custom-start handler-extension
// @custom-end handler-extension
`;

      // Inject preserved custom content into file B
      const result = injectCustomRegions(fileB, regions);

      // Generated code should be the NEW version
      expect(result).toContain('import { auth } from "@cvx/auth";');
      expect(result).toContain("auth.getUserId(ctx)");

      // Custom code should be preserved
      expect(result).toContain('import { specialHelper } from "./special";');
      expect(result).toContain("const filtered = results.filter(r => r.active);");
    });

    it("handles nested-looking content inside custom blocks without confusion", () => {
      const content = `// @custom-start complex
// This looks like a marker but isn't: @custom-start fake
const regex = /\\/\\/ @custom-start/;
// @custom-end complex
`;
      const regions = extractCustomRegions(content);
      expect(regions.size).toBe(1);
      const value = regions.get("complex")!;
      expect(value).toContain("@custom-start fake");
      expect(value).toContain("regex");
    });

    it("handles JSX inject round-trip", () => {
      const original = `{/* @custom-start jsx-block */}
<CustomComponent prop="value" />
{/* @custom-end jsx-block */}
`;
      const regions = extractCustomRegions(original);
      expect(regions.size).toBe(1);

      const newContent = `{/* @custom-start jsx-block */}
{/* @custom-end jsx-block */}
`;
      const result = injectCustomRegions(newContent, regions);
      expect(result).toContain('<CustomComponent prop="value" />');
    });
  });
});
