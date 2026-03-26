import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  loadFeatureYaml,
  resolveDefaults,
  writeResolvedYaml,
} from "../utils/yaml-resolver.js";

describe("yaml-resolver", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "yaml-resolver-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("resolveDefaults", () => {
    it("merges feature YAML with defaults - text field gets max 5000 from defaults", () => {
      const feature = {
        name: "notes",
        label: "Note",
        labelPlural: "Notes",
        fields: {
          content: { type: "text" },
        },
      };

      const resolved = resolveDefaults(feature);
      expect(resolved.fields.content.max).toBe(5000);
    });

    it("applies field_type_defaults - boolean field gets default false", () => {
      const feature = {
        name: "items",
        label: "Item",
        labelPlural: "Items",
        fields: {
          isActive: { type: "boolean" },
        },
      };

      const resolved = resolveDefaults(feature);
      expect(resolved.fields.isActive.default).toBe(false);
    });

    it("keeps feature overrides - max 100 in feature overrides default max 200", () => {
      const feature = {
        name: "posts",
        label: "Post",
        labelPlural: "Posts",
        fields: {
          title: { type: "string", max: 100 },
        },
      };

      const resolved = resolveDefaults(feature);
      expect(resolved.fields.title.max).toBe(100);
    });

    it("bare field syntax - field with no properties gets all defaults", () => {
      const feature = {
        name: "tags",
        label: "Tag",
        labelPlural: "Tags",
        fields: {
          label: {},
        },
      };

      const resolved = resolveDefaults(feature);
      expect(resolved.fields.label.type).toBe("string");
      expect(resolved.fields.label.required).toBe(false);
      expect(resolved.fields.label.max).toBe(200);
    });

    it("computes auto-indexes - by_userId always present, by_{field} for filterable/enum fields", () => {
      const feature = {
        name: "orders",
        label: "Order",
        labelPlural: "Orders",
        fields: {
          status: { type: "enum", values: ["pending", "shipped", "delivered"] },
          priority: { type: "number", filterable: true },
          title: { type: "string" },
        },
      };

      const resolved = resolveDefaults(feature);
      const indexNames = resolved.indexes!.map(
        (idx: { name: string }) => idx.name,
      );

      expect(indexNames).toContain("by_userId");
      expect(indexNames).toContain("by_status");
      expect(indexNames).toContain("by_priority");
      expect(indexNames).not.toContain("by_title");
    });

    it("assigns enum color palette slots round-robin by declaration order", () => {
      const feature = {
        name: "tickets",
        label: "Ticket",
        labelPlural: "Tickets",
        fields: {
          priority: {
            type: "enum",
            values: [
              "low",
              "medium",
              "high",
              "critical",
              "urgent",
              "normal",
              "minor",
              "trivial",
              "blocker",
            ],
          },
        },
      };

      const resolved = resolveDefaults(feature);
      const colors = resolved.fields.priority.colors!;

      // Slot assignment: index % 8
      expect(colors.low).toBe(0);
      expect(colors.medium).toBe(1);
      expect(colors.high).toBe(2);
      expect(colors.critical).toBe(3);
      expect(colors.urgent).toBe(4);
      expect(colors.normal).toBe(5);
      expect(colors.minor).toBe(6);
      expect(colors.trivial).toBe(7);
      // Wraps around
      expect(colors.blocker).toBe(0);
    });

    it("adds timestamps (createdAt + updatedAt) when timestamps: both", () => {
      const feature = {
        name: "events",
        label: "Event",
        labelPlural: "Events",
        fields: {
          title: { type: "string" },
        },
      };

      const resolved = resolveDefaults(feature);
      // timestamps defaults to "both"
      expect(resolved.timestamps).toBe("both");
    });

    it("preserves enum color overrides from feature YAML", () => {
      const feature = {
        name: "tasks",
        label: "Task",
        labelPlural: "Tasks",
        fields: {
          status: {
            type: "enum",
            values: ["open", "closed"],
            colors: { open: 2, closed: 4 },
          },
        },
      };

      const resolved = resolveDefaults(feature);
      expect(resolved.fields.status.colors!.open).toBe(2);
      expect(resolved.fields.status.colors!.closed).toBe(4);
    });

    it("merges top-level defaults (behaviors, access, views, operations)", () => {
      const feature = {
        name: "docs",
        label: "Doc",
        labelPlural: "Docs",
        fields: { title: { type: "string" } },
        behaviors: { softDelete: true },
      };

      const resolved = resolveDefaults(feature);
      expect(resolved.behaviors.softDelete).toBe(true);
      expect(resolved.behaviors.auditTrail).toBe(false);
      expect(resolved.access.scope).toBe("owner");
      expect(resolved.operations.create).toBe(true);
    });

    it("adds by_{column} index for belongs_to relationships", () => {
      const feature = {
        name: "comments",
        label: "Comment",
        labelPlural: "Comments",
        fields: { body: { type: "text" } },
        relationships: {
          post: {
            type: "belongs_to",
            column: "postId",
          },
        },
      };

      const resolved = resolveDefaults(feature);
      const indexNames = resolved.indexes!.map(
        (idx: { name: string }) => idx.name,
      );
      expect(indexNames).toContain("by_postId");
    });
  });

  describe("loadFeatureYaml", () => {
    it("reads a YAML file and returns parsed object", () => {
      const yamlContent = `name: projects\nlabel: Project\nfields:\n  title:\n    type: string\n`;
      const filePath = path.join(tmpDir, "test.gen.yaml");
      fs.writeFileSync(filePath, yamlContent, "utf8");

      const result = loadFeatureYaml(filePath);
      expect(result.name).toBe("projects");
      expect(result.fields.title.type).toBe("string");
    });

    it("throws on missing file", () => {
      expect(() => loadFeatureYaml("/nonexistent/path.yaml")).toThrow();
    });
  });

  describe("writeResolvedYaml", () => {
    it("writes merged config to {name}.resolved.yaml", () => {
      const config = {
        name: "widgets",
        label: "Widget",
        labelPlural: "Widgets",
        fields: { title: { type: "string", required: false, max: 200 } },
        timestamps: "both",
      };

      const outputPath = path.join(tmpDir, "widgets.resolved.yaml");
      writeResolvedYaml(config, outputPath);

      expect(fs.existsSync(outputPath)).toBe(true);
      const content = fs.readFileSync(outputPath, "utf8");
      expect(content).toContain("name: widgets");
      expect(content).toContain("title:");
    });
  });
});
