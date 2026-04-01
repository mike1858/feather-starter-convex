import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  fetchFromRegistry,
  syncRegistry,
  getRegistryConfig,
} from "../lib/registry";
import { projectYamlSchema } from "../../templates/schema/feather-yaml.schema";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "registry-test-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// ── Helper: mock fetch ──────────────────────────────────────────────────────

function mockFetch(
  responses: Record<string, { ok: boolean; json?: unknown; status?: number }>,
) {
  const fetchSpy = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    const match = responses[urlStr];
    if (match) {
      return {
        ok: match.ok,
        status: match.status ?? (match.ok ? 200 : 404),
        json: async () => match.json,
      } as Response;
    }
    return { ok: false, status: 404, json: async () => ({}) } as Response;
  });
  vi.stubGlobal("fetch", fetchSpy);
  return fetchSpy;
}

// ── projectYamlSchema — registry field ─────────────────────────────────────

describe("projectYamlSchema registry field", () => {
  it("validates config with registry.url", () => {
    const result = projectYamlSchema.safeParse({
      name: "my-project",
      registry: { url: "https://raw.githubusercontent.com/org/repo/main/templates" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registry?.url).toBe(
        "https://raw.githubusercontent.com/org/repo/main/templates",
      );
    }
  });

  it("validates config without registry (optional)", () => {
    const result = projectYamlSchema.safeParse({
      name: "my-project",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.registry).toBeUndefined();
    }
  });

  it("rejects invalid registry URL", () => {
    const result = projectYamlSchema.safeParse({
      name: "my-project",
      registry: { url: "not-a-url" },
    });
    expect(result.success).toBe(false);
  });
});

// ── getRegistryConfig ──────────────────────────────────────────────────────

describe("getRegistryConfig", () => {
  it("reads registry.url from feather.yaml", () => {
    fs.writeFileSync(
      path.join(tmpDir, "feather.yaml"),
      "name: test\nregistry:\n  url: https://example.com/templates\n",
    );
    const config = getRegistryConfig(tmpDir);
    expect(config).toEqual({ url: "https://example.com/templates" });
  });

  it("returns null when no feather.yaml exists", () => {
    const config = getRegistryConfig(tmpDir);
    expect(config).toBeNull();
  });

  it("returns null when feather.yaml has no registry section", () => {
    fs.writeFileSync(
      path.join(tmpDir, "feather.yaml"),
      "name: test\nfeatures: []\n",
    );
    const config = getRegistryConfig(tmpDir);
    expect(config).toBeNull();
  });
});

// ── fetchFromRegistry ──────────────────────────────────────────────────────

describe("fetchFromRegistry", () => {
  const REGISTRY_URL = "https://raw.githubusercontent.com/org/repo/main/templates";

  it("fetches and caches a feature when manifest.json returns 200", async () => {
    const manifest = {
      name: "todos",
      label: "Todos",
      description: "A todo list",
      complexity: "simple",
      files: {
        frontend: "src/features/todos/",
        backend: "convex/todos/",
        schema: "src/shared/schemas/todos.ts",
        route: "src/routes/todos.tsx",
        locales: ["public/locales/en/todos.json"],
      },
      wiring: {
        schemaTable: "todos",
        navEntry: { label: "Todos", i18nKey: "todos.nav", to: "/dashboard/todos" },
        i18nNamespace: "todos",
      },
    };

    mockFetch({
      [`${REGISTRY_URL}/bundles/todos/bundle.json`]: { ok: false, status: 404 },
      [`${REGISTRY_URL}/features/todos/manifest.json`]: { ok: true, json: manifest },
    });

    const result = await fetchFromRegistry("todos", REGISTRY_URL, tmpDir);

    expect(result).not.toBeNull();
    expect(result!.type).toBe("feature");
    expect(result!.localPath).toBe(path.join(tmpDir, "templates/features/todos"));

    // Verify manifest.json was cached locally
    const cachedManifest = path.join(tmpDir, "templates/features/todos/manifest.json");
    expect(fs.existsSync(cachedManifest)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(cachedManifest, "utf-8"));
    expect(parsed.name).toBe("todos");
  });

  it("fetches and caches a bundle when bundle.json returns 200", async () => {
    const bundleJson = {
      name: "project-management",
      label: "Project Management",
      description: "Tasks and projects",
      complexity: "advanced",
      features: ["tasks", "projects"],
    };

    const tasksManifest = {
      name: "tasks",
      label: "Tasks",
      description: "Task management",
      complexity: "simple",
      files: { frontend: "src/features/tasks/", backend: "convex/tasks/" },
    };

    const projectsManifest = {
      name: "projects",
      label: "Projects",
      description: "Project management",
      complexity: "intermediate",
      files: { frontend: "src/features/projects/", backend: "convex/projects/" },
    };

    mockFetch({
      [`${REGISTRY_URL}/bundles/project-management/bundle.json`]: {
        ok: true,
        json: bundleJson,
      },
      [`${REGISTRY_URL}/features/tasks/manifest.json`]: {
        ok: true,
        json: tasksManifest,
      },
      [`${REGISTRY_URL}/features/projects/manifest.json`]: {
        ok: true,
        json: projectsManifest,
      },
    });

    const result = await fetchFromRegistry(
      "project-management",
      REGISTRY_URL,
      tmpDir,
    );

    expect(result).not.toBeNull();
    expect(result!.type).toBe("bundle");
    expect(result!.localPath).toBe(
      path.join(tmpDir, "templates/bundles/project-management"),
    );

    // Verify bundle.json cached locally
    const cachedBundle = path.join(
      tmpDir,
      "templates/bundles/project-management/bundle.json",
    );
    expect(fs.existsSync(cachedBundle)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(cachedBundle, "utf-8"));
    expect(parsed.features).toEqual(["tasks", "projects"]);

    // Verify feature manifests also cached
    expect(
      fs.existsSync(
        path.join(tmpDir, "templates/features/tasks/manifest.json"),
      ),
    ).toBe(true);
    expect(
      fs.existsSync(
        path.join(tmpDir, "templates/features/projects/manifest.json"),
      ),
    ).toBe(true);
  });

  it("returns null when both bundle.json and manifest.json return 404", async () => {
    mockFetch({
      [`${REGISTRY_URL}/bundles/nonexistent/bundle.json`]: { ok: false, status: 404 },
      [`${REGISTRY_URL}/features/nonexistent/manifest.json`]: {
        ok: false,
        status: 404,
      },
    });

    const result = await fetchFromRegistry("nonexistent", REGISTRY_URL, tmpDir);
    expect(result).toBeNull();
  });

  it("throws descriptive error on network failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(
      fetchFromRegistry("todos", REGISTRY_URL, tmpDir),
    ).rejects.toThrow("Network error");
    await expect(
      fetchFromRegistry("todos", REGISTRY_URL, tmpDir),
    ).rejects.toThrow(REGISTRY_URL);
  });

  it("sends Authorization: Bearer header when token provided", async () => {
    const fetchSpy = mockFetch({
      [`${REGISTRY_URL}/bundles/todos/bundle.json`]: { ok: false, status: 404 },
      [`${REGISTRY_URL}/features/todos/manifest.json`]: { ok: false, status: 404 },
    });

    await fetchFromRegistry("todos", REGISTRY_URL, tmpDir, "my-secret-token");

    // Check that fetch was called with Authorization header
    const calls = fetchSpy.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      const init = call[1] as RequestInit;
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer my-secret-token",
      );
    }
  });

  it("normalizes trailing slash on registry URL", async () => {
    const fetchSpy = mockFetch({
      [`${REGISTRY_URL}/bundles/todos/bundle.json`]: { ok: false, status: 404 },
      [`${REGISTRY_URL}/features/todos/manifest.json`]: { ok: false, status: 404 },
    });

    await fetchFromRegistry("todos", `${REGISTRY_URL}/`, tmpDir);

    // Verify no double slashes in URLs
    for (const call of fetchSpy.mock.calls) {
      const url = call[0] as string;
      expect(url).not.toContain("templates//");
    }
  });
});

// ── syncRegistry ───────────────────────────────────────────────────────────

describe("syncRegistry", () => {
  const REGISTRY_URL = "https://raw.githubusercontent.com/org/repo/main/templates";

  it("returns early when config is null (noop)", async () => {
    const result = await syncRegistry(null, tmpDir);
    expect(result.synced).toBe(0);
    expect(result.message).toContain("No registry configured");
  });

  it("returns early when no feather.yaml exists", async () => {
    const result = await syncRegistry({ url: REGISTRY_URL }, tmpDir);
    expect(result.synced).toBe(0);
    expect(result.message).toContain("No feather.yaml");
  });

  it("syncs features and bundles listed in feather.yaml", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "feather.yaml"),
      `name: test\nfeatures:\n  - todos\nbundles:\n  - pm\nregistry:\n  url: ${REGISTRY_URL}\n`,
    );

    const todoManifest = {
      name: "todos",
      label: "Todos",
      description: "Todo feature",
      complexity: "simple",
      files: { frontend: "src/features/todos/" },
    };

    const pmBundle = {
      name: "pm",
      label: "PM",
      description: "PM bundle",
      complexity: "intermediate",
      features: ["todos"],
    };

    mockFetch({
      // For bundle "pm"
      [`${REGISTRY_URL}/bundles/pm/bundle.json`]: { ok: true, json: pmBundle },
      // For feature "todos" (fetched both as bundle member and standalone)
      [`${REGISTRY_URL}/bundles/todos/bundle.json`]: { ok: false, status: 404 },
      [`${REGISTRY_URL}/features/todos/manifest.json`]: {
        ok: true,
        json: todoManifest,
      },
    });

    const result = await syncRegistry({ url: REGISTRY_URL }, tmpDir);
    expect(result.synced).toBe(2); // pm bundle + todos feature
    expect(result.message).toContain("Synced 2 items");
  });

  it("reports errors for failed syncs", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "feather.yaml"),
      `name: test\nfeatures:\n  - broken\nregistry:\n  url: ${REGISTRY_URL}\n`,
    );

    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new TypeError("fetch failed");
      }),
    );

    const result = await syncRegistry({ url: REGISTRY_URL }, tmpDir);
    expect(result.synced).toBe(0);
    expect(result.message).toContain("Errors");
    expect(result.message).toContain("broken");
  });

  it("reads FEATHER_REGISTRY_TOKEN from env", async () => {
    fs.writeFileSync(
      path.join(tmpDir, "feather.yaml"),
      `name: test\nfeatures:\n  - todos\nregistry:\n  url: ${REGISTRY_URL}\n`,
    );

    const originalToken = process.env.FEATHER_REGISTRY_TOKEN;
    process.env.FEATHER_REGISTRY_TOKEN = "test-token-123";

    const fetchSpy = mockFetch({
      [`${REGISTRY_URL}/bundles/todos/bundle.json`]: { ok: false, status: 404 },
      [`${REGISTRY_URL}/features/todos/manifest.json`]: { ok: false, status: 404 },
    });

    await syncRegistry({ url: REGISTRY_URL }, tmpDir);

    // Verify token was passed through to fetch calls
    for (const call of fetchSpy.mock.calls) {
      const init = call[1] as RequestInit;
      expect((init.headers as Record<string, string>)["Authorization"]).toBe(
        "Bearer test-token-123",
      );
    }

    // Restore
    if (originalToken === undefined) {
      delete process.env.FEATHER_REGISTRY_TOKEN;
    } else {
      process.env.FEATHER_REGISTRY_TOKEN = originalToken;
    }
  });
});
