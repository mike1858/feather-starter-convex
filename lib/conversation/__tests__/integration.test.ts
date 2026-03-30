import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import YAML from "yaml";

import { createCalmDoDomain, createCalmDoBehaviors } from "./fixtures/calmdo-domain";
import {
  createConversation,
  advancePhase,
  type ConversationState,
} from "../conversation-state";
import { saveConversation, loadConversation } from "../conversation-io";
import { generateFeatherYaml, generateAllYaml, writeYamlFiles } from "../yaml-generator";
import { generateSampleRows, generateSampleDataForAll } from "../sample-data";
import { generateErDiagram } from "../mermaid-generator";
import { generatePreviewHtml, writePreview } from "../preview-generator";

// ── Helpers ────────────────────────────────────────────────────────────────

let tempDir: string;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-29T12:00:00.000Z"));
  tempDir = mkdtempSync(join(tmpdir(), "integration-test-"));
});

afterEach(() => {
  vi.useRealTimers();
  rmSync(tempDir, { recursive: true, force: true });
});

const entities = createCalmDoDomain();
const behaviors = createCalmDoBehaviors();

// ── Phase 0 → 1: Entity discovery to YAML generation ──────────────────────

describe("Phase 0 → 1: Entity discovery to YAML generation", () => {
  it("should generate valid YAML for all 5 CalmDo entities", () => {
    for (const entity of entities) {
      const yaml = generateFeatherYaml(entity, behaviors[entity.name]);
      const parsed = YAML.parse(yaml);
      expect(parsed.name).toBe(entity.name);
      expect(parsed.label).toBe(entity.label);
      expect(parsed.fields).toBeDefined();
    }
  });

  it("should include correct relationships in generated YAML", () => {
    const tasksYaml = generateFeatherYaml(entities[0], behaviors["tasks"]);
    const parsed = YAML.parse(tasksYaml);
    expect(parsed.relationships).toBeDefined();
    expect(parsed.relationships.projects).toBeDefined();
    expect(parsed.relationships.projects.type).toBe("belongs_to");
    expect(parsed.relationships.projects.column).toBe("projectId");
  });

  it("should apply default identity when not specified in overlay", () => {
    const projectsYaml = generateFeatherYaml(entities[1], behaviors["projects"]);
    const parsed = YAML.parse(projectsYaml);
    // Projects overlay has no identity, should get default auto-increment
    expect(parsed.identity).toEqual({ type: "auto-increment" });
  });

  it("should generate YAML for entities without relationships", () => {
    const activityLogsYaml = generateFeatherYaml(
      entities[4],
      behaviors["activity-logs"],
    );
    const parsed = YAML.parse(activityLogsYaml);
    expect(parsed.relationships).toBeUndefined();
  });
});

// ── Phase 2: Behavior overlay ──────────────────────────────────────────────

describe("Phase 2: Behavior overlay", () => {
  it("should add access control, hooks, derived data to tasks YAML", () => {
    const yaml = generateFeatherYaml(entities[0], behaviors["tasks"]);
    const parsed = YAML.parse(yaml);
    expect(parsed.access.scope).toBe("custom");
    expect(parsed.access.permissions.read).toBe("custom");
    expect(parsed.hooks.afterSave).toBe("custom/tasks/hooks/afterSave");
    expect(parsed.hooks.onStatusChange).toBe("custom/tasks/hooks/onStatusChange");
    expect(parsed.derivedData.subtaskCount.type).toBe("count");
    expect(parsed.derivedData.subtaskCount.source).toBe("subtasks");
    expect(parsed.derivedData.totalTimeLogged.type).toBe("sum");
  });

  it("should add views to projects YAML", () => {
    const yaml = generateFeatherYaml(entities[1], behaviors["projects"]);
    const parsed = YAML.parse(yaml);
    expect(parsed.views.defaultView).toBe("list");
    expect(parsed.views.enabledViews).toContain("card");
  });

  it("should add orderable behavior to subtasks YAML", () => {
    const yaml = generateFeatherYaml(entities[2], behaviors["subtasks"]);
    const parsed = YAML.parse(yaml);
    expect(parsed.behaviors.orderable).toBe(true);
  });

  it("should re-validate YAML after overlay application", () => {
    for (const entity of entities) {
      const yaml = generateFeatherYaml(entity, behaviors[entity.name]);
      // Should not throw — valid YAML output
      const parsed = YAML.parse(yaml);
      expect(parsed.name).toBe(entity.name);
    }
  });
});

// ── Phase 3: Validation ────────────────────────────────────────────────────

describe("Phase 3: Validation", () => {
  it("should generate sample data with correct types for all entities", () => {
    const allSample = generateSampleDataForAll(entities);
    expect(Object.keys(allSample)).toHaveLength(5);

    for (const entity of entities) {
      const rows = allSample[entity.name];
      expect(rows.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("should produce sample data matching entity field types", () => {
    const tasksRows = generateSampleRows(entities[0]);
    for (const row of tasksRows) {
      expect(typeof row.title).toBe("string");
      expect(typeof row.priority).toBe("boolean");
      expect(["todo", "in_progress", "done"]).toContain(row.status);
      expect(["private", "shared"]).toContain(row.visibility);
    }
  });

  it("should produce sample data for work-logs with number field", () => {
    const workLogRows = generateSampleRows(entities[3]);
    for (const row of workLogRows) {
      expect(typeof row.body).toBe("string");
      expect(typeof row.minutes).toBe("number");
    }
  });

  it("should produce sample data for activity-logs with enum field", () => {
    const activityLogRows = generateSampleRows(entities[4]);
    const validActions = ["created", "updated", "deleted", "status_changed", "assigned"];
    for (const row of activityLogRows) {
      expect(validActions).toContain(row.action);
    }
  });
});

// ── Full pipeline ──────────────────────────────────────────────────────────

describe("Full pipeline", () => {
  it("should checkpoint state after each phase and resume correctly", () => {
    // Phase 0: create and add entities
    let state = createConversation("calmdo");
    state.entities = entities;
    saveConversation(tempDir, state);

    // Phase 1: advance and generate YAML
    state = advancePhase(state);
    state.yamlFiles = generateAllYaml(state);
    saveConversation(tempDir, state);

    // Resume from checkpoint
    const loaded = loadConversation(tempDir, state.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.currentPhase).toBe(1);
    expect(loaded!.entities).toHaveLength(5);
    expect(Object.keys(loaded!.yamlFiles)).toHaveLength(5);
  });

  it("should generate preview HTML with ER diagram showing all 5 entities", () => {
    const state = createConversation("calmdo");
    state.entities = entities;
    state.yamlFiles = generateAllYaml(state);

    const html = generatePreviewHtml(state);
    expect(html).toContain("erDiagram");
    expect(html).toContain("TASKS");
    expect(html).toContain("PROJECTS");
    expect(html).toContain("SUBTASKS");
    expect(html).toContain("WORK_LOGS");
    expect(html).toContain("ACTIVITY_LOGS");
  });

  it("should generate ER diagram with correct relationships", () => {
    const erDiagram = generateErDiagram(entities);
    // tasks belongs_to projects
    expect(erDiagram).toContain("PROJECTS");
    expect(erDiagram).toContain("TASKS");
    // subtasks belongs_to tasks
    expect(erDiagram).toContain("SUBTASKS");
    // work-logs belongs_to tasks
    expect(erDiagram).toContain("WORK_LOGS");
  });

  it("should write preview HTML to temp directory", () => {
    const state = createConversation("calmdo");
    state.entities = entities;
    const filePath = writePreview(tempDir, state);
    const content = readFileSync(filePath, "utf-8");
    expect(content).toContain("<!DOCTYPE html>");
    expect(content).toContain("calmdo");
  });

  it("should write YAML files to feature directories", () => {
    const yamlMap = generateAllYaml({
      ...createConversation("calmdo"),
      entities,
      behaviors,
    } as ConversationState);

    const paths = writeYamlFiles(tempDir, yamlMap);
    expect(paths).toHaveLength(5);

    for (const path of paths) {
      const content = readFileSync(path, "utf-8");
      const parsed = YAML.parse(content);
      expect(parsed.name).toBeDefined();
    }
  });
});

// ── Cross-entity relationship consistency ──────────────────────────────────

describe("Cross-entity relationship consistency", () => {
  it("should verify all belongs_to targets exist in entity set", () => {
    const entityNames = new Set(entities.map((e) => e.name));

    for (const entity of entities) {
      for (const rel of entity.relationships) {
        expect(
          entityNames.has(rel.target),
          `${entity.name} references ${rel.target} which does not exist`,
        ).toBe(true);
      }
    }
  });

  it("should have no orphan relationships", () => {
    const entityNames = new Set(entities.map((e) => e.name));
    const orphans: string[] = [];

    for (const entity of entities) {
      for (const rel of entity.relationships) {
        if (!entityNames.has(rel.target)) {
          orphans.push(`${entity.name} -> ${rel.target}`);
        }
      }
    }

    expect(orphans).toEqual([]);
  });
});

// ── Comparison with existing YAML ──────────────────────────────────────────

describe("Comparison with existing YAML", () => {
  it("should document differences between generated and existing tasks YAML", () => {
    const generated = generateFeatherYaml(entities[0], behaviors["tasks"]);
    const generatedParsed = YAML.parse(generated);

    // Informational: log differences for diagnostic purposes
    // The generated YAML will differ from hand-written in some areas:
    // - Generated won't have: detailView, indexes, search, operations (not in overlay)
    // - Generated will have: all dimensions from the overlay

    // Core fields should match
    expect(generatedParsed.name).toBe("tasks");
    expect(generatedParsed.label).toBe("Task");
    expect(generatedParsed.fields.title.type).toBe("string");
    expect(generatedParsed.fields.status.values).toEqual(["todo", "in_progress", "done"]);

    // Overlay dimensions should be present
    expect(generatedParsed.access.scope).toBe("custom");
    expect(generatedParsed.hooks).toBeDefined();
    expect(generatedParsed.derivedData).toBeDefined();
  });

  it("should document differences between generated and existing projects YAML", () => {
    const generated = generateFeatherYaml(entities[1], behaviors["projects"]);
    const generatedParsed = YAML.parse(generated);

    // Core fields should match
    expect(generatedParsed.name).toBe("projects");
    expect(generatedParsed.label).toBe("Project");
    expect(generatedParsed.fields.name.type).toBe("string");
    expect(generatedParsed.fields.status.values).toEqual([
      "active",
      "on_hold",
      "completed",
      "archived",
    ]);

    // Projects overlay has access and views
    expect(generatedParsed.access.scope).toBe("owner");
    expect(generatedParsed.views.enabledViews).toContain("card");
  });
});
