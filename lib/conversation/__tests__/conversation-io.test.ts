import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import {
  saveConversation,
  loadConversation,
  listConversations,
  deleteConversation,
  CONVERSATIONS_DIR,
} from "../conversation-io";
import { createConversation, type ConversationState } from "../conversation-state";

// ── Temp directory helpers ─────────────────────────────────────────────────

let tempDir: string;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-29T12:00:00.000Z"));
  tempDir = mkdtempSync(join(tmpdir(), "conv-io-test-"));
});

afterEach(() => {
  vi.useRealTimers();
  rmSync(tempDir, { recursive: true, force: true });
});

// ── saveConversation ───────────────────────────────────────────────────────

describe("saveConversation", () => {
  it("should create conversations directory if missing", () => {
    const state = createConversation("test");
    saveConversation(tempDir, state);
    expect(existsSync(join(tempDir, CONVERSATIONS_DIR))).toBe(true);
  });

  it("should write valid JSON file", () => {
    const state = createConversation("test");
    saveConversation(tempDir, state);
    const filePath = join(tempDir, CONVERSATIONS_DIR, `${state.id}.json`);
    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.id).toBe("test-2026-03-29");
    expect(parsed.domain).toBe("test");
  });

  it("should update updatedAt timestamp on save", () => {
    const state = createConversation("test");
    const originalUpdatedAt = state.updatedAt;

    // Advance time by 1 hour
    vi.setSystemTime(new Date("2026-03-29T13:00:00.000Z"));
    saveConversation(tempDir, state);

    const filePath = join(tempDir, CONVERSATIONS_DIR, `${state.id}.json`);
    const saved = JSON.parse(readFileSync(filePath, "utf-8"));
    expect(saved.updatedAt).not.toBe(originalUpdatedAt);
  });

  it("should use atomic write (no .tmp file left behind)", () => {
    const state = createConversation("test");
    saveConversation(tempDir, state);
    const tmpPath = join(tempDir, CONVERSATIONS_DIR, `${state.id}.json.tmp`);
    expect(existsSync(tmpPath)).toBe(false);
  });

  it("should throw on invalid state", () => {
    const badState = { schemaVersion: 1, id: "bad" } as ConversationState;
    expect(() => saveConversation(tempDir, badState)).toThrow(
      "Invalid conversation state",
    );
  });
});

// ── loadConversation ───────────────────────────────────────────────────────

describe("loadConversation", () => {
  it("should round-trip (save then load)", () => {
    const state = createConversation("roundtrip");
    saveConversation(tempDir, state);
    const loaded = loadConversation(tempDir, state.id);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe(state.id);
    expect(loaded!.domain).toBe("roundtrip");
    expect(loaded!.currentPhase).toBe(0);
  });

  it("should return null for non-existent ID", () => {
    const result = loadConversation(tempDir, "nonexistent-2026-01-01");
    expect(result).toBeNull();
  });

  it("should return null for malformed JSON", () => {
    const dir = join(tempDir, CONVERSATIONS_DIR);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "bad.json"), "not json!", "utf-8");
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = loadConversation(tempDir, "bad");
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Malformed JSON"),
    );
    warnSpy.mockRestore();
  });

  it("should return null for JSON that fails schema validation", () => {
    const dir = join(tempDir, CONVERSATIONS_DIR);
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "invalid.json"),
      JSON.stringify({ schemaVersion: 1, id: "invalid" }),
      "utf-8",
    );
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = loadConversation(tempDir, "invalid");
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Invalid conversation state"),
    );
    warnSpy.mockRestore();
  });

  it("should warn about newer schema versions", () => {
    const state = createConversation("future");
    saveConversation(tempDir, state);

    // Manually bump schema version in the file
    const filePath = join(tempDir, CONVERSATIONS_DIR, `${state.id}.json`);
    const data = JSON.parse(readFileSync(filePath, "utf-8"));
    data.schemaVersion = 999;
    writeFileSync(filePath, JSON.stringify(data), "utf-8");

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const loaded = loadConversation(tempDir, state.id);
    expect(loaded).not.toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("schema version 999"),
    );
    warnSpy.mockRestore();
  });
});

// ── listConversations ──────────────────────────────────────────────────────

describe("listConversations", () => {
  it("should return empty array if directory does not exist", () => {
    const result = listConversations(join(tempDir, "nonexistent"));
    expect(result).toEqual([]);
  });

  it("should return empty array for empty directory", () => {
    mkdirSync(join(tempDir, CONVERSATIONS_DIR), { recursive: true });
    const result = listConversations(tempDir);
    expect(result).toEqual([]);
  });

  it("should list multiple conversations sorted by updatedAt descending", () => {
    const state1 = createConversation("alpha");
    saveConversation(tempDir, state1);

    vi.setSystemTime(new Date("2026-03-29T14:00:00.000Z"));
    const state2 = createConversation("beta");
    saveConversation(tempDir, state2);

    const result = listConversations(tempDir);
    expect(result).toHaveLength(2);
    // beta is more recent, should be first
    expect(result[0].domain).toBe("beta");
    expect(result[1].domain).toBe("alpha");
  });

  it("should return summary with id, domain, currentPhase, updatedAt", () => {
    const state = createConversation("test");
    saveConversation(tempDir, state);

    const result = listConversations(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty("id");
    expect(result[0]).toHaveProperty("domain", "test");
    expect(result[0]).toHaveProperty("currentPhase", 0);
    expect(result[0]).toHaveProperty("updatedAt");
  });

  it("should skip malformed files gracefully", () => {
    const state = createConversation("good");
    saveConversation(tempDir, state);

    // Write a bad file
    writeFileSync(
      join(tempDir, CONVERSATIONS_DIR, "bad.json"),
      "not valid json",
      "utf-8",
    );

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = listConversations(tempDir);
    expect(result).toHaveLength(1);
    expect(result[0].domain).toBe("good");
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// ── deleteConversation ─────────────────────────────────────────────────────

describe("deleteConversation", () => {
  it("should delete existing conversation and return true", () => {
    const state = createConversation("doomed");
    saveConversation(tempDir, state);
    const result = deleteConversation(tempDir, state.id);
    expect(result).toBe(true);
    expect(loadConversation(tempDir, state.id)).toBeNull();
  });

  it("should return false for non-existent conversation", () => {
    const result = deleteConversation(tempDir, "nonexistent-2026-01-01");
    expect(result).toBe(false);
  });
});
