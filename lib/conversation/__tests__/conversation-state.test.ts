import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createConversation,
  advancePhase,
  revisitPhase,
  getPhaseLabel,
  summarizeState,
  conversationStateSchema,
  CONVERSATION_SCHEMA_VERSION,
  type ConversationState,
} from "../conversation-state";

// Pin Date.now for deterministic IDs
const FIXED_DATE = new Date("2026-03-29T12:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_DATE);
});

afterEach(() => {
  vi.useRealTimers();
});

// ── createConversation ─────────────────────────────────────────────────────

describe("createConversation", () => {
  it("should create conversation with domain-date ID format", () => {
    const state = createConversation("calmdo");
    expect(state.id).toBe("calmdo-2026-03-29");
  });

  it("should set initial phase to 0 (Entity Discovery)", () => {
    const state = createConversation("test");
    expect(state.currentPhase).toBe(0);
  });

  it("should set schema version to current", () => {
    const state = createConversation("test");
    expect(state.schemaVersion).toBe(CONVERSATION_SCHEMA_VERSION);
  });

  it("should initialize all collections as empty", () => {
    const state = createConversation("test");
    expect(state.entities).toEqual([]);
    expect(state.yamlFiles).toEqual({});
    expect(state.validationResults).toEqual([]);
    expect(state.behaviors).toEqual({});
    expect(state.sampleData).toEqual({});
    expect(state.dryRunResult).toBeNull();
    expect(state.phaseHistory).toEqual([]);
  });

  it("should set domain and timestamps", () => {
    const state = createConversation("my-project");
    expect(state.domain).toBe("my-project");
    expect(state.createdAt).toBe(FIXED_DATE.toISOString());
    expect(state.updatedAt).toBe(FIXED_DATE.toISOString());
  });
});

// ── advancePhase ───────────────────────────────────────────────────────────

describe("advancePhase", () => {
  it("should increment currentPhase from 0 to 1", () => {
    const state = createConversation("test");
    const advanced = advancePhase(state);
    expect(advanced.currentPhase).toBe(1);
  });

  it("should record phase completion in phaseHistory", () => {
    const state = createConversation("test");
    state.entities = [
      {
        name: "tasks",
        label: "Task",
        labelPlural: "Tasks",
        description: "A task",
        fields: {},
        relationships: [],
      },
    ];
    const advanced = advancePhase(state);
    expect(advanced.phaseHistory).toHaveLength(1);
    expect(advanced.phaseHistory[0].phase).toBe(0);
    expect(advanced.phaseHistory[0].entityCount).toBe(1);
  });

  it("should advance through all phases 0->1->2->3", () => {
    let state = createConversation("test");
    state = advancePhase(state); // 0 -> 1
    expect(state.currentPhase).toBe(1);
    state = advancePhase(state); // 1 -> 2
    expect(state.currentPhase).toBe(2);
    state = advancePhase(state); // 2 -> 3
    expect(state.currentPhase).toBe(3);
    expect(state.phaseHistory).toHaveLength(3);
  });

  it("should not advance past phase 3", () => {
    let state = createConversation("test");
    state = advancePhase(state); // 0 -> 1
    state = advancePhase(state); // 1 -> 2
    state = advancePhase(state); // 2 -> 3
    const same = advancePhase(state); // 3 -> 3 (no change)
    expect(same.currentPhase).toBe(3);
    expect(same.phaseHistory).toHaveLength(3); // no new entry
  });
});

// ── revisitPhase ───────────────────────────────────────────────────────────

describe("revisitPhase", () => {
  function buildFullState(): ConversationState {
    let state = createConversation("test");
    state.entities = [
      {
        name: "t",
        label: "T",
        labelPlural: "Ts",
        description: "d",
        fields: {},
        relationships: [],
      },
    ];
    state = advancePhase(state);
    state.yamlFiles = { t: "yaml-content" };
    state.validationResults = [{ entity: "t", valid: true, errors: [] }];
    state = advancePhase(state);
    state.behaviors = { t: { access: { scope: "owner", permissions: {} } } };
    state = advancePhase(state);
    state.sampleData = { t: [{ field: "value" }] };
    state.dryRunResult = { success: true, errors: [], filesGenerated: [] };
    return state;
  }

  it("should set currentPhase backward", () => {
    const state = buildFullState();
    expect(state.currentPhase).toBe(3);
    const revisited = revisitPhase(state, 1, false);
    expect(revisited.currentPhase).toBe(1);
  });

  it("should preserve downstream data when clearDownstream is false", () => {
    const state = buildFullState();
    const revisited = revisitPhase(state, 1, false);
    expect(Object.keys(revisited.behaviors)).toHaveLength(1);
    expect(Object.keys(revisited.sampleData)).toHaveLength(1);
    expect(revisited.dryRunResult).not.toBeNull();
  });

  it("should clear downstream data when clearDownstream is true and target is 0", () => {
    const state = buildFullState();
    const revisited = revisitPhase(state, 0, true);
    expect(revisited.currentPhase).toBe(0);
    expect(revisited.yamlFiles).toEqual({});
    expect(revisited.validationResults).toEqual([]);
    expect(revisited.behaviors).toEqual({});
    expect(revisited.sampleData).toEqual({});
    expect(revisited.dryRunResult).toBeNull();
  });

  it("should clear only downstream of target when clearDownstream is true and target is 1", () => {
    const state = buildFullState();
    const revisited = revisitPhase(state, 1, true);
    expect(revisited.currentPhase).toBe(1);
    // Phase 1 data (yamlFiles, validationResults) preserved
    expect(Object.keys(revisited.yamlFiles)).toHaveLength(1);
    // Phase 2+ data cleared
    expect(revisited.behaviors).toEqual({});
    expect(revisited.sampleData).toEqual({});
    expect(revisited.dryRunResult).toBeNull();
  });

  it("should clear only phase 3 data when revisiting phase 2", () => {
    const state = buildFullState();
    const revisited = revisitPhase(state, 2, true);
    expect(revisited.currentPhase).toBe(2);
    expect(Object.keys(revisited.yamlFiles)).toHaveLength(1);
    expect(Object.keys(revisited.behaviors)).toHaveLength(1);
    expect(revisited.sampleData).toEqual({});
    expect(revisited.dryRunResult).toBeNull();
  });
});

// ── getPhaseLabel ──────────────────────────────────────────────────────────

describe("getPhaseLabel", () => {
  it("should return 'Entity Discovery' for phase 0", () => {
    expect(getPhaseLabel(0)).toBe("Entity Discovery");
  });

  it("should return 'Schema + CRUD' for phase 1", () => {
    expect(getPhaseLabel(1)).toBe("Schema + CRUD");
  });

  it("should return 'Behavior Overlay' for phase 2", () => {
    expect(getPhaseLabel(2)).toBe("Behavior Overlay");
  });

  it("should return 'Validation' for phase 3", () => {
    expect(getPhaseLabel(3)).toBe("Validation");
  });

  it("should return 'Unknown Phase' for invalid phase number", () => {
    expect(getPhaseLabel(99)).toBe("Unknown Phase (99)");
  });
});

// ── summarizeState ─────────────────────────────────────────────────────────

describe("summarizeState", () => {
  it("should mention domain, phase, and entity count", () => {
    const state = createConversation("calmdo");
    state.entities = [
      {
        name: "tasks",
        label: "Task",
        labelPlural: "Tasks",
        description: "A task",
        fields: {},
        relationships: [],
      },
      {
        name: "projects",
        label: "Project",
        labelPlural: "Projects",
        description: "A project",
        fields: {},
        relationships: [],
      },
    ];
    const summary = summarizeState(state);
    expect(summary).toContain("calmdo");
    expect(summary).toContain("Entity Discovery");
    expect(summary).toContain("Entities: 2");
  });

  it("should mention YAML count when present", () => {
    const state = createConversation("test");
    state.yamlFiles = { tasks: "yaml" };
    const summary = summarizeState(state);
    expect(summary).toContain("YAML files: 1");
  });

  it("should mention behavior count when present", () => {
    const state = createConversation("test");
    state.behaviors = { tasks: {} };
    const summary = summarizeState(state);
    expect(summary).toContain("Behavior overlays: 1");
  });

  it("should not mention empty sections", () => {
    const state = createConversation("test");
    const summary = summarizeState(state);
    expect(summary).not.toContain("YAML");
    expect(summary).not.toContain("Behavior");
    expect(summary).not.toContain("Sample");
  });
});

// ── Zod validation ─────────────────────────────────────────────────────────

describe("conversationStateSchema", () => {
  it("should validate a well-formed state", () => {
    const state = createConversation("test");
    const result = conversationStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("should reject state with missing required fields", () => {
    const incomplete = { schemaVersion: 1, id: "test" };
    const result = conversationStateSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("should reject state with wrong currentPhase type", () => {
    const state = createConversation("test");
    const broken = { ...state, currentPhase: "zero" };
    const result = conversationStateSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("should reject state with currentPhase out of range", () => {
    const state = createConversation("test");
    const broken = { ...state, currentPhase: 5 };
    const result = conversationStateSchema.safeParse(broken);
    expect(result.success).toBe(false);
  });

  it("should validate state with populated entities", () => {
    const state = createConversation("test");
    state.entities = [
      {
        name: "tasks",
        label: "Task",
        labelPlural: "Tasks",
        description: "A task",
        fields: { title: { type: "string", required: true } },
        relationships: [
          { type: "belongs_to", target: "projects", required: false },
        ],
      },
    ];
    const result = conversationStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });
});
