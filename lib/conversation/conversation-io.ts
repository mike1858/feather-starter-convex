import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync, renameSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  type ConversationState,
  conversationStateSchema,
  CONVERSATION_SCHEMA_VERSION,
} from "./conversation-state";

// ── Constants ──────────────────────────────────────────────────────────────

export const CONVERSATIONS_DIR = ".feather/conversations";

// ── Helpers ────────────────────────────────────────────────────────────────

function getConversationsPath(projectRoot: string): string {
  return resolve(projectRoot, CONVERSATIONS_DIR);
}

function getConversationFilePath(projectRoot: string, id: string): string {
  return join(getConversationsPath(projectRoot), `${id}.json`);
}

// ── Save ───────────────────────────────────────────────────────────────────

export function saveConversation(
  projectRoot: string,
  state: ConversationState,
): void {
  const dir = getConversationsPath(projectRoot);
  mkdirSync(dir, { recursive: true });

  // Update timestamp before writing
  const stateToWrite: ConversationState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };

  // Validate before writing
  const result = conversationStateSchema.safeParse(stateToWrite);
  if (!result.success) {
    throw new Error(
      `Invalid conversation state: ${JSON.stringify(result.error.issues)}`,
    );
  }

  const filePath = getConversationFilePath(projectRoot, state.id);
  const tmpPath = `${filePath}.tmp`;
  const json = JSON.stringify(stateToWrite, null, 2);

  // Atomic write: write to temp file, then rename
  writeFileSync(tmpPath, json, "utf-8");
  renameSync(tmpPath, filePath);
}

// ── Load ───────────────────────────────────────────────────────────────────

export function loadConversation(
  projectRoot: string,
  id: string,
): ConversationState | null {
  const filePath = getConversationFilePath(projectRoot, id);

  if (!existsSync(filePath)) {
    return null;
  }

  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch {
    console.warn(`Failed to read conversation file: ${filePath}`);
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn(`Malformed JSON in conversation file: ${filePath}`);
    return null;
  }

  const result = conversationStateSchema.safeParse(parsed);
  if (!result.success) {
    console.warn(
      `Invalid conversation state in ${filePath}: ${JSON.stringify(result.error.issues)}`,
    );
    return null;
  }

  const state = result.data as ConversationState;

  if (state.schemaVersion > CONVERSATION_SCHEMA_VERSION) {
    console.warn(
      `Conversation ${id} has schema version ${state.schemaVersion}, ` +
        `current is ${CONVERSATION_SCHEMA_VERSION}. Migration may be needed.`,
    );
  }

  return state;
}

// ── List ───────────────────────────────────────────────────────────────────

export interface ConversationSummary {
  id: string;
  domain: string;
  currentPhase: number;
  updatedAt: string;
}

export function listConversations(
  projectRoot: string,
): ConversationSummary[] {
  const dir = getConversationsPath(projectRoot);

  if (!existsSync(dir)) {
    return [];
  }

  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const summaries: ConversationSummary[] = [];

  for (const file of files) {
    const filePath = join(dir, file);
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      // Minimal validation — just extract summary fields
      if (
        typeof parsed.id === "string" &&
        typeof parsed.domain === "string" &&
        typeof parsed.currentPhase === "number" &&
        typeof parsed.updatedAt === "string"
      ) {
        summaries.push({
          id: parsed.id as string,
          domain: parsed.domain as string,
          currentPhase: parsed.currentPhase as number,
          updatedAt: parsed.updatedAt as string,
        });
      }
    } catch {
      console.warn(`Skipping malformed conversation file: ${filePath}`);
    }
  }

  // Sort by updatedAt descending (most recent first)
  summaries.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return summaries;
}

// ── Delete ─────────────────────────────────────────────────────────────────

export function deleteConversation(
  projectRoot: string,
  id: string,
): boolean {
  const filePath = getConversationFilePath(projectRoot, id);

  if (!existsSync(filePath)) {
    return false;
  }

  unlinkSync(filePath);
  return true;
}
