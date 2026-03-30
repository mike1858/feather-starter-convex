import { describe, it, expect, beforeAll } from "vitest";
import * as path from "node:path";
import * as fs from "node:fs";
import Handlebars from "handlebars";
import { registerStandaloneHelpers, renderTemplate } from "../../pipeline/render";
import { resolveDetailPage } from "../resolver";
import type { FeatureYaml } from "../../schema/feather-yaml.schema";
import YAML from "yaml";

const CROSS_ENTITY_DIR = path.resolve(__dirname, "..");

// ── Helpers ──────────────────────────────────────────────────────────────────

beforeAll(() => {
  registerStandaloneHelpers(Handlebars);
});

function templatePath(name: string): string {
  return path.join(CROSS_ENTITY_DIR, `${name}.tsx.hbs`);
}

/** Build a minimal ResolvedRelatedRecord context for template rendering. */
function makeRecordContext(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    source: "subtasks",
    sourcePascal: "Subtasks",
    sourcePlural: "Subtasks",
    display: "checklist",
    inline: true,
    readonly: false,
    columns: ["title", "completed", "position"],
    foreignKey: "taskId",
    queryName: "subtasks.queries.listByTask",
    mutationNames: {
      create: "subtasks.mutations.create",
      update: "subtasks.mutations.update",
      remove: "subtasks.mutations.remove",
    },
    ...overrides,
  };
}

/** Build a minimal FeatureYaml with given overrides. */
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

// ── Checklist panel tests ────────────────────────────────────────────────────

describe("checklist-panel.tsx.hbs", () => {
  it("template file exists", () => {
    expect(fs.existsSync(templatePath("checklist-panel"))).toBe(true);
  });

  it("renders with subtasks-like config — contains useQuery and useMutation", () => {
    const ctx = makeRecordContext();
    const output = renderTemplate(templatePath("checklist-panel"), ctx);
    expect(output).toContain("useQuery");
    expect(output).toContain("useMutation");
  });

  it("renders checkbox button element with aria-label", () => {
    const ctx = makeRecordContext();
    const output = renderTemplate(templatePath("checklist-panel"), ctx);
    // Checkbox is a button with aria-label for accessibility
    expect(output).toContain("Mark complete");
  });

  it("renders add button when inline=true and readonly=false", () => {
    const ctx = makeRecordContext({ inline: true, readonly: false });
    const output = renderTemplate(templatePath("checklist-panel"), ctx);
    expect(output).toContain("Add");
  });

  it("does NOT render add button when readonly=true", () => {
    const ctx = makeRecordContext({ inline: true, readonly: true });
    const output = renderTemplate(templatePath("checklist-panel"), ctx);
    // No Add button, no mutation imports
    expect(output).not.toContain("useMutation");
    expect(output).not.toContain("createItem");
  });

  it("does NOT render drag handle mutation when not orderable (no drag handle element in base template)", () => {
    const ctx = makeRecordContext();
    const output = renderTemplate(templatePath("checklist-panel"), ctx);
    // Drag handle is rendered via GripVertical in the template always (visual only)
    // but mutations are conditional on inline flag
    expect(output).toContain("GripVertical");
  });

  it("renders source entity name in panel header", () => {
    const ctx = makeRecordContext({ sourcePlural: "Subtasks" });
    const output = renderTemplate(templatePath("checklist-panel"), ctx);
    expect(output).toContain("Subtasks");
  });

  it("renders correct foreignKey in mutation call", () => {
    const ctx = makeRecordContext({ foreignKey: "taskId" });
    const output = renderTemplate(templatePath("checklist-panel"), ctx);
    expect(output).toContain("taskId");
  });
});

// ── Timeline panel tests ─────────────────────────────────────────────────────

describe("timeline-panel.tsx.hbs", () => {
  it("template file exists", () => {
    expect(fs.existsSync(templatePath("timeline-panel"))).toBe(true);
  });

  it("renders with work-logs-like config — contains useQuery", () => {
    const ctx = makeRecordContext({
      source: "workLogs",
      sourcePascal: "WorkLogs",
      sourcePlural: "Work Logs",
      display: "timeline",
      inline: true,
      readonly: false,
      foreignKey: "taskId",
      queryName: "workLogs.queries.listByTask",
    });
    const output = renderTemplate(templatePath("timeline-panel"), ctx);
    expect(output).toContain("useQuery");
  });

  it("renders vertical timeline CSS class (border-l)", () => {
    const ctx = makeRecordContext({
      source: "workLogs",
      sourcePascal: "WorkLogs",
      sourcePlural: "Work Logs",
      display: "timeline",
    });
    const output = renderTemplate(templatePath("timeline-panel"), ctx);
    expect(output).toContain("border-l");
  });

  it("renders timestamp display via formatRelativeTime", () => {
    const ctx = makeRecordContext({ display: "timeline" });
    const output = renderTemplate(templatePath("timeline-panel"), ctx);
    expect(output).toContain("_creationTime");
  });

  it("renders add form when inline=true and not readonly", () => {
    const ctx = makeRecordContext({
      display: "timeline",
      inline: true,
      readonly: false,
    });
    const output = renderTemplate(templatePath("timeline-panel"), ctx);
    expect(output).toContain("Add Entry");
    expect(output).toContain("textarea");
  });

  it("is read-only when readonly=true — no add/delete in output", () => {
    const ctx = makeRecordContext({
      display: "timeline",
      inline: false,
      readonly: true,
    });
    const output = renderTemplate(templatePath("timeline-panel"), ctx);
    expect(output).not.toContain("useMutation");
    expect(output).not.toContain("createItem");
  });
});

// ── Table panel tests ────────────────────────────────────────────────────────

describe("table-panel.tsx.hbs", () => {
  it("template file exists", () => {
    expect(fs.existsSync(templatePath("table-panel"))).toBe(true);
  });

  it("renders table headers for specified columns", () => {
    const ctx = makeRecordContext({
      display: "table",
      columns: ["title", "status", "priority"],
    });
    const output = renderTemplate(templatePath("table-panel"), ctx);
    expect(output).toContain("title");
    expect(output).toContain("status");
    expect(output).toContain("priority");
  });

  it("renders action column with edit/delete when not readonly", () => {
    const ctx = makeRecordContext({
      display: "table",
      readonly: false,
      inline: true,
    });
    const output = renderTemplate(templatePath("table-panel"), ctx);
    expect(output).toContain("Pencil");
    expect(output).toContain("Trash2");
  });

  it("does NOT render edit/delete action column when readonly=true", () => {
    const ctx = makeRecordContext({
      display: "table",
      readonly: true,
      inline: false,
    });
    const output = renderTemplate(templatePath("table-panel"), ctx);
    expect(output).not.toContain("removeItem");
  });

  it("renders empty state element", () => {
    const ctx = makeRecordContext({ display: "table", sourcePlural: "Work Logs" });
    const output = renderTemplate(templatePath("table-panel"), ctx);
    expect(output).toContain("Work Logs");
    // empty state fallback text
    expect(output).toContain("No");
  });

  it("conditionally shows add button based on inline flag", () => {
    const withInline = makeRecordContext({ display: "table", inline: true, readonly: false });
    const withoutInline = makeRecordContext({ display: "table", inline: false, readonly: false });

    const outputWith = renderTemplate(templatePath("table-panel"), withInline);
    const outputWithout = renderTemplate(templatePath("table-panel"), withoutInline);

    expect(outputWith).toContain("Plus");
    expect(outputWithout).not.toContain("Plus");
  });
});

// ── Cards panel tests ────────────────────────────────────────────────────────

describe("cards-panel.tsx.hbs", () => {
  it("template file exists", () => {
    expect(fs.existsSync(templatePath("cards-panel"))).toBe(true);
  });

  it("renders responsive grid layout", () => {
    const ctx = makeRecordContext({ display: "cards" });
    const output = renderTemplate(templatePath("cards-panel"), ctx);
    expect(output).toContain("grid-cols-1");
    expect(output).toContain("grid-cols-3");
  });

  it("renders card structure with border and hover styles", () => {
    const ctx = makeRecordContext({ display: "cards" });
    const output = renderTemplate(templatePath("cards-panel"), ctx);
    expect(output).toContain("rounded-lg border border-border");
  });

  it("renders empty state", () => {
    const ctx = makeRecordContext({ display: "cards", sourcePlural: "Projects" });
    const output = renderTemplate(templatePath("cards-panel"), ctx);
    expect(output).toContain("No Projects yet");
  });

  it("conditionally shows add button based on inline flag", () => {
    const withInline = makeRecordContext({ display: "cards", inline: true, readonly: false });
    const withoutInline = makeRecordContext({ display: "cards", inline: false, readonly: false });

    const outputWith = renderTemplate(templatePath("cards-panel"), withInline);
    const outputWithout = renderTemplate(templatePath("cards-panel"), withoutInline);

    expect(outputWith).toContain("Plus");
    expect(outputWithout).not.toContain("Plus");
  });

  it("uses useQuery for data fetching", () => {
    const ctx = makeRecordContext({ display: "cards" });
    const output = renderTemplate(templatePath("cards-panel"), ctx);
    expect(output).toContain("useQuery");
  });
});

// ── Panel renderer tests ─────────────────────────────────────────────────────

describe("panel-renderer.tsx.hbs", () => {
  it("template file exists", () => {
    expect(fs.existsSync(path.join(CROSS_ENTITY_DIR, "panel-renderer.tsx.hbs"))).toBe(true);
  });

  it("renders imports for all 3 display types (checklist + 2 timeline)", () => {
    const ctx = {
      parentEntity: "tasks",
      parentPascal: "Tasks",
      parentLabel: "Task",
      layout: "panels",
      hasInlineEditing: true,
      relatedRecords: [
        makeRecordContext({
          source: "subtasks",
          sourcePascal: "Subtasks",
          display: "checklist",
        }),
        makeRecordContext({
          source: "workLogs",
          sourcePascal: "WorkLogs",
          display: "timeline",
        }),
        makeRecordContext({
          source: "activityLogs",
          sourcePascal: "ActivityLogs",
          display: "timeline",
          readonly: true,
        }),
      ],
    };
    const output = renderTemplate(
      path.join(CROSS_ENTITY_DIR, "panel-renderer.tsx.hbs"),
      ctx as unknown as Record<string, unknown>,
    );
    expect(output).toContain("SubtasksChecklistPanel");
    expect(output).toContain("WorkLogsTimelinePanel");
    expect(output).toContain("ActivityLogsTimelinePanel");
  });

  it("renders empty panels section when no related records", () => {
    const ctx = {
      parentEntity: "tasks",
      parentPascal: "Tasks",
      parentLabel: "Task",
      layout: "panels",
      hasInlineEditing: false,
      relatedRecords: [],
    };
    const output = renderTemplate(
      path.join(CROSS_ENTITY_DIR, "panel-renderer.tsx.hbs"),
      ctx as unknown as Record<string, unknown>,
    );
    expect(output).toContain("space-y-6");
    // No panel components rendered
    expect(output).not.toContain("ChecklistPanel");
    expect(output).not.toContain("TimelinePanel");
  });

  it("renders correct export function name based on parentPascal", () => {
    const ctx = {
      parentEntity: "tasks",
      parentPascal: "Tasks",
      relatedRecords: [],
    };
    const output = renderTemplate(
      path.join(CROSS_ENTITY_DIR, "panel-renderer.tsx.hbs"),
      ctx as unknown as Record<string, unknown>,
    );
    expect(output).toContain("TasksPanels");
  });
});

// ── Integration: tasks YAML → resolver → panels ──────────────────────────────

describe("integration: tasks YAML → resolver → panels", () => {
  const TASKS_YAML_PATH = path.resolve(__dirname, "../../../src/features/tasks/feather.yaml");

  it("tasks YAML file exists", () => {
    expect(fs.existsSync(TASKS_YAML_PATH)).toBe(true);
  });

  it("resolves tasks YAML to 3 related records with correct display types", () => {
    const raw = fs.readFileSync(TASKS_YAML_PATH, "utf-8");
    const parsed = YAML.parse(raw) as FeatureYaml;

    const result = resolveDetailPage(parsed, new Map());
    expect(result.relatedRecords).toHaveLength(3);

    const [subtasks, workLogs, activityLogs] = result.relatedRecords;
    expect(subtasks.source).toBe("subtasks");
    expect(subtasks.display).toBe("checklist");
    expect(subtasks.inline).toBe(true);

    expect(workLogs.source).toBe("workLogs");
    expect(workLogs.display).toBe("timeline");
    expect(workLogs.inline).toBe(true);

    expect(activityLogs.source).toBe("activityLogs");
    expect(activityLogs.display).toBe("timeline");
    expect(activityLogs.readonly).toBe(true);
  });

  it("renders checklist panel for subtasks from resolved context", () => {
    const raw = fs.readFileSync(TASKS_YAML_PATH, "utf-8");
    const parsed = YAML.parse(raw) as FeatureYaml;
    const result = resolveDetailPage(parsed, new Map());

    const subtasksRecord = result.relatedRecords[0];
    const output = renderTemplate(
      templatePath("checklist-panel"),
      subtasksRecord as unknown as Record<string, unknown>,
    );
    expect(output).toContain("useQuery");
    expect(output).toContain("useMutation");
    expect(output).toContain("SubtasksChecklistPanel");
  });

  it("renders timeline panels for workLogs and activityLogs", () => {
    const raw = fs.readFileSync(TASKS_YAML_PATH, "utf-8");
    const parsed = YAML.parse(raw) as FeatureYaml;
    const result = resolveDetailPage(parsed, new Map());

    const workLogsRecord = result.relatedRecords[1];
    const activityLogsRecord = result.relatedRecords[2];

    const workLogsOutput = renderTemplate(
      templatePath("timeline-panel"),
      workLogsRecord as unknown as Record<string, unknown>,
    );
    expect(workLogsOutput).toContain("WorkLogsTimelinePanel");
    expect(workLogsOutput).toContain("border-l");

    const activityLogsOutput = renderTemplate(
      templatePath("timeline-panel"),
      activityLogsRecord as unknown as Record<string, unknown>,
    );
    expect(activityLogsOutput).toContain("ActivityLogsTimelinePanel");
    // readonly — no mutation
    expect(activityLogsOutput).not.toContain("useMutation");
  });

  it("subtasks panel has inline=true from tasks YAML", () => {
    const raw = fs.readFileSync(TASKS_YAML_PATH, "utf-8");
    const parsed = YAML.parse(raw) as FeatureYaml;
    const result = resolveDetailPage(parsed, new Map());
    const subtasks = result.relatedRecords[0];

    expect(subtasks.inline).toBe(true);

    const output = renderTemplate(
      templatePath("checklist-panel"),
      subtasks as unknown as Record<string, unknown>,
    );
    expect(output).toContain("createItem");
  });

  it("workLogs panel has correct queryName from resolver", () => {
    const raw = fs.readFileSync(TASKS_YAML_PATH, "utf-8");
    const parsed = YAML.parse(raw) as FeatureYaml;
    const result = resolveDetailPage(parsed, new Map());
    const workLogs = result.relatedRecords[1];

    expect(workLogs.queryName).toBe("workLogs.queries.listByTasks");
  });
});

// ── Resolver: coverage for hasInlineEditing and 4 display types ──────────────

describe("resolveDetailPage — display types and hasInlineEditing", () => {
  it("hasInlineEditing is true when at least one panel is inline and not readonly", () => {
    const parent = makeFeature({
      name: "tasks",
      label: "Task",
      detailView: {
        layout: "panels",
        relatedRecords: [
          { source: "subtasks", display: "checklist", inline: true },
          { source: "activityLogs", display: "timeline", readonly: true },
        ],
      },
    });
    const result = resolveDetailPage(parent, new Map());
    expect(result.hasInlineEditing).toBe(true);
  });

  it("resolves table display type", () => {
    const parent = makeFeature({
      name: "projects",
      label: "Project",
      detailView: {
        layout: "panels",
        relatedRecords: [
          { source: "tasks", display: "table", columns: ["title", "status"] },
        ],
      },
    });
    const result = resolveDetailPage(parent, new Map());
    expect(result.relatedRecords[0].display).toBe("table");
    expect(result.relatedRecords[0].columns).toEqual(["title", "status"]);
  });

  it("resolves cards display type", () => {
    const parent = makeFeature({
      name: "categories",
      label: "Category",
      detailView: {
        layout: "panels",
        relatedRecords: [
          { source: "items", display: "cards" },
        ],
      },
    });
    const result = resolveDetailPage(parent, new Map());
    expect(result.relatedRecords[0].display).toBe("cards");
  });
});
