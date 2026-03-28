import { describe, it, expect } from "vitest";
import { resolveDetailPage } from "../resolver";
import type { FeatureYaml } from "../../schema/feather-yaml.schema";

// ── Helper to create minimal FeatureYaml ─────────────────────────────────────

function makeFeature(
  overrides: Partial<FeatureYaml> & { name: string; label: string },
): FeatureYaml {
  return {
    fields: { title: { type: "string", required: true } },
    timestamps: "both",
    identity: { type: "auto-increment" },
    operations: { create: true, read: true, update: true, delete: true },
    search: false,
    ...overrides,
  } as FeatureYaml;
}

describe("resolveDetailPage", () => {
  it("returns empty relatedRecords when no detailView config", () => {
    const parent = makeFeature({ name: "tasks", label: "Task" });
    const result = resolveDetailPage(parent, new Map());
    expect(result.relatedRecords).toHaveLength(0);
    expect(result.layout).toBe("panels");
    expect(result.hasInlineEditing).toBe(false);
  });

  it("resolves detail page with 1 related record", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "panels",
        relatedRecords: [
          { source: "subtasks", display: "checklist", inline: true },
        ],
      },
    });

    const subtasks = makeFeature({
      name: "subtasks",
      label: "Subtask",
      fields: {
        title: { type: "string", required: true },
        completed: { type: "boolean" },
        position: { type: "number" },
      },
      relationships: {
        task: {
          type: "belongs_to" as const,
          target: "tasks",
          column: "taskId",
        },
      },
    });

    const result = resolveDetailPage(
      parent,
      new Map([["subtasks", subtasks]]),
    );

    expect(result.relatedRecords).toHaveLength(1);
    const record = result.relatedRecords[0];
    expect(record.source).toBe("subtasks");
    expect(record.sourcePascal).toBe("Subtasks");
    expect(record.display).toBe("checklist");
    expect(record.inline).toBe(true);
    expect(record.foreignKey).toBe("taskId");
    expect(record.queryName).toBe("subtasks.queries.listByTasks");
    expect(record.mutationNames.create).toBe("subtasks.mutations.create");
  });

  it("resolves detail page with 3 related records", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "tabs",
        relatedRecords: [
          { source: "subtasks", display: "checklist", inline: true },
          { source: "workLogs", display: "timeline", inline: true },
          { source: "activityLogs", display: "timeline", readonly: true },
        ],
      },
    });

    const result = resolveDetailPage(parent, new Map());

    expect(result.relatedRecords).toHaveLength(3);
    expect(result.layout).toBe("tabs");
    expect(result.hasInlineEditing).toBe(true);
  });

  it("resolves with inline editing — has mutation names", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "panels",
        relatedRecords: [
          { source: "subtasks", display: "checklist", inline: true },
        ],
      },
    });

    const result = resolveDetailPage(parent, new Map());
    const record = result.relatedRecords[0];

    expect(record.inline).toBe(true);
    expect(record.mutationNames.create).toBeDefined();
    expect(record.mutationNames.update).toBeDefined();
    expect(record.mutationNames.remove).toBeDefined();
  });

  it("resolves with readonly panel — no mutation names", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "panels",
        relatedRecords: [
          { source: "activityLogs", display: "timeline", readonly: true },
        ],
      },
    });

    const result = resolveDetailPage(parent, new Map());
    const record = result.relatedRecords[0];

    expect(record.readonly).toBe(true);
    expect(record.mutationNames.create).toBeUndefined();
  });

  it("resolves with explicit columns — uses specified columns", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "panels",
        relatedRecords: [
          {
            source: "workLogs",
            display: "table",
            columns: ["body", "timeMinutes", "createdAt"],
          },
        ],
      },
    });

    const result = resolveDetailPage(parent, new Map());
    const record = result.relatedRecords[0];

    expect(record.columns).toEqual(["body", "timeMinutes", "createdAt"]);
  });

  it("resolves without columns — falls back to first 4 fields", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "panels",
        relatedRecords: [{ source: "workLogs", display: "table" }],
      },
    });

    const workLogs = makeFeature({
      name: "workLogs",
      label: "Work Log",
      fields: {
        body: { type: "text" },
        timeMinutes: { type: "number" },
        taskId: { type: "reference", target: "tasks" },
        creatorId: { type: "reference", target: "users" },
        createdAt: { type: "date" },
      },
    });

    const result = resolveDetailPage(
      parent,
      new Map([["workLogs", workLogs]]),
    );
    const record = result.relatedRecords[0];

    expect(record.columns).toHaveLength(4);
    expect(record.columns[0]).toBe("body");
  });

  it("resolves with tabs layout", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "tabs",
        relatedRecords: [
          { source: "subtasks", display: "checklist" },
        ],
      },
    });

    const result = resolveDetailPage(parent, new Map());
    expect(result.layout).toBe("tabs");
  });

  it("hasInlineEditing is false when all panels are readonly", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "panels",
        relatedRecords: [
          { source: "activityLogs", display: "timeline", readonly: true },
        ],
      },
    });

    const result = resolveDetailPage(parent, new Map());
    expect(result.hasInlineEditing).toBe(false);
  });
});
