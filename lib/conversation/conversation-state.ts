import { z } from "zod";

// ── Schema Version ──────────────────────────────────────────────────────────

export const CONVERSATION_SCHEMA_VERSION = 1;

// ── Entity Draft (Phase 0 output) ──────────────────────────────────────────

export interface EntityDraftField {
  type: string;
  required?: boolean;
  max?: number;
  min?: number;
  default?: unknown;
  values?: string[];
}

export interface EntityDraftRelationship {
  type: "belongs_to" | "has_many";
  target: string;
  required?: boolean;
  column?: string;
}

export interface EntityDraft {
  name: string;
  label: string;
  labelPlural: string;
  description: string;
  fields: Record<string, EntityDraftField>;
  relationships: EntityDraftRelationship[];
}

// ── Behavior Overlay (Phase 2 output) ──────────────────────────────────────

export interface BehaviorOverlay {
  access?: {
    scope: string;
    permissions: Record<string, string>;
  };
  statusFlow?: {
    field: string;
    transitions: Record<string, string[]>;
  };
  hooks?: Record<string, string>;
  derivedData?: Record<
    string,
    { type: string; source?: string; field?: string }
  >;
  views?: {
    defaultView: string;
    enabledViews: string[];
    filteredViews?: unknown[];
  };
  schedules?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
  identity?: { type: string; format?: string };
  behaviors?: {
    assignable?: boolean;
    orderable?: boolean;
    softDelete?: boolean;
    auditTrail?: boolean;
  };
}

// ── Phase History Entry ────────────────────────────────────────────────────

interface PhaseHistoryEntry {
  phase: number;
  completedAt: string;
  entityCount: number;
}

// ── Validation Result ──────────────────────────────────────────────────────

interface ValidationResult {
  entity: string;
  valid: boolean;
  errors: string[];
}

// ── Dry Run Result ─────────────────────────────────────────────────────────

interface DryRunResult {
  success: boolean;
  errors: string[];
  filesGenerated: string[];
}

// ── Conversation State (main type) ─────────────────────────────────────────

export type ConversationPhase = 0 | 1 | 2 | 3;

export interface ConversationState {
  schemaVersion: number;
  id: string;
  domain: string;
  createdAt: string;
  updatedAt: string;
  currentPhase: ConversationPhase;

  // Phase 0: Entity Discovery
  entities: EntityDraft[];

  // Phase 1: Schema + CRUD
  yamlFiles: Record<string, string>;
  validationResults: ValidationResult[];

  // Phase 2: Behavior Overlay
  behaviors: Record<string, BehaviorOverlay>;

  // Phase 3: Validation
  sampleData: Record<string, Record<string, unknown>[]>;
  dryRunResult: DryRunResult | null;

  // Metadata
  phaseHistory: PhaseHistoryEntry[];
}

// ── Zod Validation Schema ──────────────────────────────────────────────────

const entityDraftFieldSchema = z.object({
  type: z.string(),
  required: z.boolean().optional(),
  max: z.number().optional(),
  min: z.number().optional(),
  default: z.unknown().optional(),
  values: z.array(z.string()).optional(),
});

const entityDraftRelationshipSchema = z.object({
  type: z.enum(["belongs_to", "has_many"]),
  target: z.string(),
  required: z.boolean().optional(),
  column: z.string().optional(),
});

const entityDraftSchema = z.object({
  name: z.string(),
  label: z.string(),
  labelPlural: z.string(),
  description: z.string(),
  fields: z.record(z.string(), entityDraftFieldSchema),
  relationships: z.array(entityDraftRelationshipSchema),
});

const behaviorOverlaySchema = z.object({
  access: z
    .object({
      scope: z.string(),
      permissions: z.record(z.string(), z.string()),
    })
    .optional(),
  statusFlow: z
    .object({
      field: z.string(),
      transitions: z.record(z.string(), z.array(z.string())),
    })
    .optional(),
  hooks: z.record(z.string(), z.string()).optional(),
  derivedData: z
    .record(
      z.string(),
      z.object({
        type: z.string(),
        source: z.string().optional(),
        field: z.string().optional(),
      }),
    )
    .optional(),
  views: z
    .object({
      defaultView: z.string(),
      enabledViews: z.array(z.string()),
      filteredViews: z.array(z.unknown()).optional(),
    })
    .optional(),
  schedules: z.record(z.string(), z.unknown()).optional(),
  integrations: z.record(z.string(), z.unknown()).optional(),
  identity: z
    .object({ type: z.string(), format: z.string().optional() })
    .optional(),
  behaviors: z
    .object({
      assignable: z.boolean().optional(),
      orderable: z.boolean().optional(),
      softDelete: z.boolean().optional(),
      auditTrail: z.boolean().optional(),
    })
    .optional(),
});

const phaseHistoryEntrySchema = z.object({
  phase: z.number(),
  completedAt: z.string(),
  entityCount: z.number(),
});

const validationResultSchema = z.object({
  entity: z.string(),
  valid: z.boolean(),
  errors: z.array(z.string()),
});

const dryRunResultSchema = z.object({
  success: z.boolean(),
  errors: z.array(z.string()),
  filesGenerated: z.array(z.string()),
});

export const conversationStateSchema = z.object({
  schemaVersion: z.number(),
  id: z.string(),
  domain: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentPhase: z.number().int().min(0).max(3),
  entities: z.array(entityDraftSchema),
  yamlFiles: z.record(z.string(), z.string()),
  validationResults: z.array(validationResultSchema),
  behaviors: z.record(z.string(), behaviorOverlaySchema),
  sampleData: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  dryRunResult: dryRunResultSchema.nullable(),
  phaseHistory: z.array(phaseHistoryEntrySchema),
});

// ── Factory Function ───────────────────────────────────────────────────────

export function createConversation(domain: string): ConversationState {
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  return {
    schemaVersion: CONVERSATION_SCHEMA_VERSION,
    id: `${domain}-${dateStr}`,
    domain,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    currentPhase: 0,
    entities: [],
    yamlFiles: {},
    validationResults: [],
    behaviors: {},
    sampleData: {},
    dryRunResult: null,
    phaseHistory: [],
  };
}

// ── Phase Labels ───────────────────────────────────────────────────────────

const PHASE_LABELS: Record<number, string> = {
  0: "Entity Discovery",
  1: "Schema + CRUD",
  2: "Behavior Overlay",
  3: "Validation",
};

export function getPhaseLabel(phase: number): string {
  return PHASE_LABELS[phase] ?? `Unknown Phase (${phase})`;
}

// ── Phase Transition Helpers ───────────────────────────────────────────────

export function advancePhase(state: ConversationState): ConversationState {
  if (state.currentPhase >= 3) {
    return state;
  }
  const now = new Date().toISOString();
  return {
    ...state,
    currentPhase: (state.currentPhase + 1) as ConversationPhase,
    updatedAt: now,
    phaseHistory: [
      ...state.phaseHistory,
      {
        phase: state.currentPhase,
        completedAt: now,
        entityCount: state.entities.length,
      },
    ],
  };
}

export function revisitPhase(
  state: ConversationState,
  targetPhase: ConversationPhase,
  clearDownstream: boolean,
): ConversationState {
  const updated: ConversationState = {
    ...state,
    currentPhase: targetPhase,
    updatedAt: new Date().toISOString(),
  };

  if (clearDownstream) {
    // Clear data from phases after the target
    if (targetPhase < 1) {
      updated.yamlFiles = {};
      updated.validationResults = [];
    }
    if (targetPhase < 2) {
      updated.behaviors = {};
    }
    if (targetPhase < 3) {
      updated.sampleData = {};
      updated.dryRunResult = null;
    }
  }

  return updated;
}

// ── State Summary ──────────────────────────────────────────────────────────

export function summarizeState(state: ConversationState): string {
  const parts: string[] = [];
  parts.push(`Domain: ${state.domain}`);
  parts.push(`Current phase: ${getPhaseLabel(state.currentPhase)}`);
  parts.push(`Entities: ${state.entities.length}`);

  const yamlCount = Object.keys(state.yamlFiles).length;
  if (yamlCount > 0) {
    parts.push(`YAML files: ${yamlCount}`);
  }

  const behaviorCount = Object.keys(state.behaviors).length;
  if (behaviorCount > 0) {
    parts.push(`Behavior overlays: ${behaviorCount}`);
  }

  const sampleCount = Object.keys(state.sampleData).length;
  if (sampleCount > 0) {
    parts.push(`Sample data sets: ${sampleCount}`);
  }

  return parts.join(" | ");
}
