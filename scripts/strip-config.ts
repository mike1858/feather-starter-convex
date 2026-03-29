/**
 * Configuration for stripping feature code to produce a clean base branch.
 *
 * Features listed here are removed from the project during base branch generation.
 * Infrastructure (auth, dashboard, onboarding, settings, uploads) is always kept.
 */

export interface StripConfig {
  /** Feature names to strip (each has frontend dir, backend dir, schema, routes, locales) */
  features: string[];

  /** Infrastructure features to KEEP (never strip these) */
  infraFeatures: string[];

  /** Wiring files that need surgical editing (not full deletion) */
  wiringFiles: {
    schema: string;
    nav: string;
    errors: string;
    i18n: string;
  };

  /**
   * Map from feature name to its backend directory name.
   * Most features use kebab-case frontend and camelCase backend (e.g., "work-logs" -> "workLogs").
   */
  backendDirMap: Record<string, string>;

  /**
   * Map from feature name to its route file names.
   * Features without dedicated routes (subtasks, work-logs, activity-logs) have empty arrays.
   */
  routeFileMap: Record<string, string[]>;

  /**
   * Map from feature name to its schema table name in convex/schema.ts.
   * Most use camelCase (e.g., "work-logs" -> "workLogs", "activity-logs" -> "activityLogs").
   */
  schemaTableMap: Record<string, string>;

  /**
   * Map from feature name to its i18n namespace.
   * Most match the feature name (kebab-case).
   */
  i18nNamespaceMap: Record<string, string>;

  /**
   * Nav entry paths to remove. Each entry is the `to` path of a nav item.
   */
  navPathsToStrip: string[];

  /**
   * Error groups to remove from errors.ts. Each is the key in the ERRORS object.
   */
  errorGroupsToStrip: string[];
}

export const defaultStripConfig: StripConfig = {
  features: [
    "tasks",
    "projects",
    "subtasks",
    "work-logs",
    "activity-logs",
    "todos",
    "tickets",
    "contacts",
  ],

  infraFeatures: [
    "auth",
    "dashboard",
    "onboarding",
    "settings",
    "uploads",
  ],

  wiringFiles: {
    schema: "convex/schema.ts",
    nav: "src/shared/nav.ts",
    errors: "src/shared/errors.ts",
    i18n: "src/i18n.ts",
  },

  backendDirMap: {
    tasks: "tasks",
    projects: "projects",
    subtasks: "subtasks",
    "work-logs": "workLogs",
    "activity-logs": "activityLogs",
    todos: "todos",
    tickets: "tickets",
    contacts: "contacts",
  },

  routeFileMap: {
    tasks: ["_layout.tasks.tsx", "_layout.team-pool.tsx"],
    projects: ["_layout.projects.index.tsx", "_layout.projects.$projectId.tsx"],
    subtasks: [],
    "work-logs": [],
    "activity-logs": [],
    todos: ["_layout.todos.tsx"],
    tickets: ["_layout.tickets.tsx"],
    contacts: ["_layout.contacts.tsx"],
  },

  schemaTableMap: {
    tasks: "tasks",
    projects: "projects",
    subtasks: "subtasks",
    "work-logs": "workLogs",
    "activity-logs": "activityLogs",
    todos: "todos",
    tickets: "tickets",
    contacts: "contacts",
  },

  i18nNamespaceMap: {
    tasks: "tasks",
    projects: "projects",
    subtasks: "subtasks",
    "work-logs": "work-logs",
    "activity-logs": "activity-logs",
    todos: "todos",
    tickets: "tickets",
    contacts: "contacts",
  },

  navPathsToStrip: [
    "/dashboard/tasks",
    "/dashboard/team-pool",
    "/dashboard/projects",
    "/dashboard/todos",
    "/dashboard/tickets",
    "/dashboard/contacts",
  ],

  errorGroupsToStrip: [
    "tasks",
    "projects",
    "subtasks",
    "workLogs",
    "activityLogs",
    "todos",
    "tickets",
    "contacts",
  ],
};
