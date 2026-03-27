# Modular Patterns Research: Composable Feature Architectures

**Domain:** Modular monolith patterns, feature composition, plugin architectures
**Researched:** 2026-03-10
**Overall confidence:** HIGH (multiple real-world examples at scale, well-documented patterns)

---

## Table of Contents

1. [Modular Monolith Pattern](#1-modular-monolith-pattern)
2. [Feature Slices Architecture](#2-feature-slices-architecture)
3. [Plugin Architectures in JS/TS](#3-plugin-architectures-in-jsts)
4. [Nx/Turborepo Module Boundaries](#4-nxturborepo-module-boundaries)
5. [Dependency Injection in Frontend Apps](#5-dependency-injection-in-frontend-apps)
6. [Feature as a Package Pattern](#6-feature-as-a-package-pattern)
7. [Synthesis: What This Means for Our System](#7-synthesis-what-this-means-for-our-system)

---

## 1. Modular Monolith Pattern

### How Shopify Does It

**Scale context:** 2.8M lines of Ruby, 500K commits, handles 30TB/minute during flash sales.

Shopify's monolith was reorganized from traditional Rails structure (models/views/controllers) to **domain-driven organization** around business concepts (orders, shipping, inventory, billing). They catalogued ~6,000 Ruby classes and manually assigned each to a component, executing the migration in a single automated PR.

**Boundary definition and enforcement:**

- Each component is a self-contained mini Rails app within the monolith
- Components expose **explicit public APIs** only -- no reaching into internals
- Data ownership: each component has exclusive ownership of its associated data
- Cross-component ActiveRecord associations are always violations
- **Packwerk** (open-source static analysis tool) detects two violation types:
  - **Dependency violations:** Referencing a constant from an undeclared dependency
  - **Privacy violations:** Accessing a component's private constants (only `app/public/` is accessible)
- Any folder with a `package.yml` is recognized as a package boundary
- CI runs Packwerk to block boundary-violating PRs from merging

**Internal tooling:**

- **Wedge:** Uses Ruby tracepoints during CI to generate complete call graphs, compute isolation scores, and list violations per component
- **Packwerk:** Static analysis on constant references using the ConstantResolver gem -- no false positives (but possible false negatives)

**Inter-feature communication:** Direct method calls through public APIs. Since everything runs in one process, there's no need for event buses. The discipline is architectural, not infrastructural.

**Adding/removing features:** Features are directories. Adding a feature = adding a directory with a `package.yml`. Removing = deleting the directory (after resolving dependents via Packwerk).

**Testing:** Each component can be unit-tested in isolation. Integration tests validate cross-component flows. Packwerk violations are caught in CI before tests even run.

**What works:** Shopify successfully swapped their entire tax calculation engine after establishing proper component isolation. The pattern scales to enormous codebases.

**What breaks down:** Manual classification of 6,000 classes was painful. Cultural adoption takes time -- tooling alone doesn't create modularity; developers must internalize the mindset.

Sources:
- [Deconstructing the Monolith - Shopify Engineering](https://shopify.engineering/deconstructing-monolith-designing-software-maximizes-developer-productivity)
- [Under Deconstruction: The State of Shopify's Monolith](https://shopify.engineering/shopify-monolith)
- [Enforcing Modularity with Packwerk](https://shopify.engineering/enforcing-modularity-rails-apps-packwerk)
- [Packwerk Retrospective](https://shopify.engineering/a-packwerk-retrospective)

### How Basecamp/HEY Does It

**Scale context:** Basecamp 4 built on top of Basecamp 3, codebase ~9 years old, 400 controllers, 500 models, serves millions daily.

37signals takes a deliberately **simpler approach** than Shopify. They use "vanilla Rails" with domain-driven design but without additional architectural layers or boundary enforcement tooling.

**Boundary definition:** Boundaries are conceptual and cultural, not tooling-enforced. Domain models (both ActiveRecord and POROs) expose public interfaces invoked from controllers or jobs. There is no separate application layer orchestrating access -- models ARE the API.

**Inter-feature communication:** Direct method calls on domain models. Controllers invoke model methods. No event buses, no message queues, no DI containers.

**What works:** Extremely simple. Low ceremony. Fast to develop. The codebase has survived 9+ years of evolution serving millions.

**What breaks down:** Relies heavily on developer discipline and team culture. Works for 37signals' small, senior team. Would not scale to hundreds of developers without tooling enforcement.

**Key insight:** 37signals proves that for small-to-medium teams, cultural boundaries can work. But for our use case (composable features across multiple client codebases), we need something more explicit.

Sources:
- [Vanilla Rails is Plenty - 37signals Dev](https://dev.37signals.com/vanilla-rails-is-plenty/)
- [Domain-Driven Boldness - HEY World](https://world.hey.com/jorge/code-i-like-i-domain-driven-boldness-71456476)

### How GitLab Does It

**Scale context:** One of the largest Rails monoliths in the world, thousands of contributors.

GitLab is actively modularizing their monolith using a combination of bounded contexts, Packwerk, and hexagonal architecture principles.

**Boundary definition:**

- Bounded contexts defined in `config/bounded_contexts.yml` with namespaces for domain and infrastructure layers
- RuboCop enforces namespace rules via static analysis
- Non-standard Rails directories are autoloaded based on the bounded contexts list
- They use Packwerk (same as Shopify) for package boundary enforcement

**Architecture goal:** Hexagonal monolith -- separation of domains AND separation of application adapters. This enables future extraction to engines or different runtime profiles.

**What works:** Systematic approach with tooling. Bounded contexts are explicit and discoverable.

**What breaks down:** Massive effort to retrofit onto an existing codebase. The bounded contexts working group has been running since 2023+.

Sources:
- [Defining Bounded Contexts - GitLab Docs](https://docs.gitlab.com/ee/architecture/blueprints/modular_monolith/bounded_contexts.html)
- [GitLab Modular Monolith - Handbook](https://handbook.gitlab.com/handbook/engineering/architecture/design-documents/modular_monolith/)

---

## 2. Feature Slices Architecture

### Vertical Slice Architecture (Jimmy Bogard)

**Core principle:** "Minimize coupling between slices, maximize coupling within a slice."

Instead of horizontal layers (controllers -> services -> repositories -> database), VSA organizes code vertically: each feature/request is a self-contained slice that includes everything from UI to database.

**How it differs from feature folders:**

| Aspect | Feature Folders | Vertical Slices |
|--------|----------------|-----------------|
| Scope | Group files by feature, still share layers | Each slice IS the full stack for one operation |
| Sharing | Shared services, repositories across features | No shared abstractions; duplication preferred |
| Coupling | Features coupled through shared layer abstractions | Slices independent; coupling only within slice |
| Granularity | Feature = a domain area | Slice = a single request/command/query |

**Boundary definition:** Each slice is a handler (command or query) with its own request/response types, validation, data access, and business logic. There are no shared repositories or service layers.

**Inter-feature communication:** Slices don't communicate directly. If a feature needs data from another domain, it queries the database directly (no going through another slice's abstractions). This is the controversial part -- it accepts data coupling over behavioral coupling.

**Adding/removing features:** Add a new handler class. Done. Remove the handler. Done. No shared layers to modify.

**Testing:** Each slice is tested end-to-end (request in, response out). No mocking of service layers because there are no shared service layers. Integration tests are the primary test type.

**What works:** Extremely easy to add new features. No "where does this go?" decisions. New developers can be productive immediately.

**What breaks down:** At scale, duplication accumulates. Without discipline, slices start sharing code and you get accidental layered architecture again. Works best with CQRS (separate read/write models).

Sources:
- [Vertical Slice Architecture - Jimmy Bogard](https://www.jimmybogard.com/vertical-slice-architecture/)
- [Vertical Slice Architecture - Milan Jovanovic](https://www.milanjovanovic.tech/blog/vertical-slice-architecture)

### Feature-Sliced Design (FSD)

**Origin:** Russian-speaking frontend community, now gaining international traction. Purpose-built for frontend applications.

**Layer hierarchy (top to bottom, strict import direction):**

| Layer | Purpose | Has Slices? |
|-------|---------|-------------|
| **app** | Routing, entrypoints, global styles, providers | No |
| **processes** | Complex inter-page scenarios (deprecated) | Yes |
| **pages** | Full pages or large page sections | Yes |
| **widgets** | Large self-contained UI chunks delivering a use case | Yes |
| **features** | Reused implementations of product features | Yes |
| **entities** | Business entities (User, Task, Project) | Yes |
| **shared** | Reusable utilities detached from business specifics | No |

**Critical rule:** Modules on one layer can ONLY import from layers strictly below. No sideways imports (same layer), no upward imports.

**Segments within slices:**

- `ui/` -- Components, formatters, styles
- `api/` -- Backend interactions, request types, mappers
- `model/` -- Data schemas, interfaces, stores, business logic
- `lib/` -- Reusable library code within the slice
- `config/` -- Configuration and feature flags

**Boundary definition:** Layer hierarchy + no same-layer imports. Enforced by ESLint rules (e.g., `eslint-plugin-import` with custom boundaries, or dedicated FSD linting tools).

**Inter-feature communication:** Through shared entities layer. Features import from entities below them, never from other features. If two features need to interact, the interaction is composed at the widgets or pages layer above.

**Adding/removing features:** Add a directory at the appropriate layer with the standard segments. Remove the directory. The layer hierarchy means removal only affects layers above (pages/widgets that composed the feature).

**What works:** Very clear mental model. Scales well for large frontend teams. Makes dependency direction obvious.

**What breaks down:** Seven layers can feel like overkill for small apps. The strict hierarchy sometimes forces awkward workarounds when two entities genuinely need to reference each other. Community tooling is still maturing.

**Relevance to our project:** FSD's entity/feature/widget composition model maps well to our "tasks depend on entities, subtasks depend on tasks, projects optionally relate to tasks" requirement. The strict layer hierarchy prevents circular dependencies by construction.

Sources:
- [Feature-Sliced Design Overview](https://feature-sliced.design/docs/get-started/overview)
- [FSD Layers Reference](https://feature-sliced.design/docs/reference/layers)

---

## 3. Plugin Architectures in JS/TS

### Vite Plugin Architecture

**How plugins register:** Plugins are factory functions returning an object. Added to `vite.config.js` via the `plugins` array.

```typescript
// Plugin shape
export default function myPlugin(options = {}) {
  return {
    name: 'my-plugin',        // Required: unique identifier
    enforce?: 'pre' | 'post', // Optional: execution order
    apply?: 'build' | 'serve' | ((config, env) => boolean), // Optional: conditional

    // Vite-specific hooks
    config(config, env) {},           // Modify config before resolution
    configResolved(config) {},        // Access final resolved config
    configureServer(server) {},       // Add dev server middleware
    transformIndexHtml(html) {},      // Transform HTML
    handleHotUpdate(ctx) {},          // Custom HMR handling

    // Rollup-compatible hooks
    resolveId(source, importer) {},   // Custom module resolution
    load(id) {},                      // Custom module loading
    transform(code, id) {},           // Code transformation
    buildStart() {},                  // Initialization
    buildEnd() {},                    // Cleanup
  }
}
```

**Key patterns:**

- **Hook-based extension:** Host defines lifecycle hooks; plugins implement only what they need
- **Ordering control:** `enforce: 'pre'|'post'` controls execution order
- **Conditional application:** `apply` property enables dev-only or build-only plugins
- **Composition:** Plugins array = ordered pipeline; each plugin gets previous plugin's output

**What works:** Dead simple to write. No registration ceremony. TypeScript types guide implementors.

**What breaks down:** Plugins can conflict. No dependency declaration between plugins. No way to say "this plugin requires that plugin."

### ESLint Plugin Architecture (Flat Config)

**How plugins register:** Plugins are plain JavaScript objects with `rules`, `configs`, and `processors` keys.

```typescript
const plugin = {
  meta: { name: 'my-plugin', version: '1.0.0' },
  configs: {
    recommended: { /* config object referencing this plugin */ }
  },
  rules: {
    'my-rule': { create(context) { return { /* AST visitors */ } } }
  },
  processors: { /* file processors */ }
}
```

**Key patterns:**

- **Self-referencing configs:** Plugin configs reference the plugin object itself, creating a self-contained unit
- **Flat array composition:** Config is an array of objects; later entries override earlier ones
- **No runtime registration:** Plugins are just imports, composed via array concatenation

**What works:** Extremely composable. Easy to understand. No magic.

**What breaks down:** No dependency resolution between plugins. Plugin conflicts are user's problem.

### Docusaurus Plugin Architecture

**How plugins register:** Plugins are modules exporting a function that receives `(context, options)` and returns an object with lifecycle hooks.

```typescript
module.exports = function (context, options) {
  return {
    name: 'my-plugin',

    async loadContent() { /* fetch/compute data */ },
    async contentLoaded({ content, actions }) { /* create routes/pages */ },
    configureWebpack(config, isServer) { /* modify webpack */ },
    getClientModules() { /* return client-side imports */ },
    async postBuild({ siteConfig, outDir }) { /* post-build tasks */ },
  }
}
```

**Key patterns:**

- **Content pipeline:** `loadContent` -> `contentLoaded` -> build. Data flows through lifecycle phases.
- **Actions API:** `contentLoaded` receives `actions` (addRoute, createData, etc.) -- the host provides capabilities.
- **Theme components:** Plugins can provide React components that are swizzlable (overridable by users).
- **Plugin types:** Content plugins, theme plugins, and utility plugins all use the same interface.

**What works:** Clean lifecycle separation. The `actions` API pattern is excellent -- plugins request capabilities rather than mutating global state.

**What breaks down:** Complex plugin interactions are hard to debug. Plugin execution order matters but isn't always obvious.

### Common Plugin Patterns Summary

| Pattern | Vite | ESLint | Docusaurus |
|---------|------|--------|------------|
| Registration | `plugins: [fn()]` | `plugins: { obj }` | `plugins: [['path', opts]]` |
| Extension model | Lifecycle hooks | AST visitors + configs | Lifecycle hooks + actions |
| Ordering | `enforce` property | Array order | Array order |
| Dependencies | None declared | None declared | None declared |
| Configuration | Options param | Rule config | Options param |

**Critical insight for our project:** None of these plugin systems declare dependencies between plugins. They rely on documentation and convention. For our composable features with real dependencies (subtasks -> tasks), we need to go beyond plugin patterns and add explicit dependency declaration.

Sources:
- [Vite Plugin API](https://vite.dev/guide/api-plugin)
- [ESLint Plugin Migration to Flat Config](https://eslint.org/docs/latest/extend/plugin-migration-flat-config)
- [Docusaurus Plugins](https://docusaurus.io/docs/advanced/plugins)

---

## 4. Nx/Turborepo Module Boundaries

### Nx: Tag-Based Boundary Enforcement

**How boundaries are defined:**

1. Tag projects in `project.json` or `package.json`:
   ```json
   { "tags": ["scope:tasks", "type:feature"] }
   ```

2. Define constraints in ESLint config via `@nx/enforce-module-boundaries`:
   ```json
   {
     "depConstraints": [
       { "sourceTag": "type:feature", "onlyDependOnLibsWithTags": ["type:feature", "type:util", "type:model"] },
       { "sourceTag": "type:util", "onlyDependOnLibsWithTags": ["type:util"] },
       { "sourceTag": "scope:tasks", "onlyDependOnLibsWithTags": ["scope:tasks", "scope:shared"] }
     ]
   }
   ```

**Enforcement mechanism:**

- ESLint rule checks TypeScript imports AND `package.json` dependencies at lint time
- Conformance plugin checks the full Nx dependency graph (language-agnostic)
- Tag matching supports: exact strings, regex (`/^scope.*/`), globs (`scope:*`), wildcards (`*`)
- Logical operators: AND constraints (all must match), negation

**Inter-feature communication:** Nx doesn't prescribe communication patterns -- it only prevents unauthorized imports. Communication is through whatever the project decides (direct imports of allowed libraries, shared types, etc.).

**Adding/removing features:** `nx generate` creates new libraries with appropriate tags. Removal requires checking the dependency graph (`nx graph`) for dependents first.

**Testing:** Each library is independently testable. `nx affected:test` runs only tests impacted by changes, using the dependency graph.

**What works:** Scales to hundreds of libraries. The tag system is flexible enough for complex organizational rules. `nx graph` visualization makes dependencies visible.

**What breaks down:** Tag sprawl -- as organizations grow, tag taxonomies become complex. Initial setup overhead. The ESLint rule only catches import violations, not runtime coupling.

### Turborepo: Boundaries (Experimental)

**How boundaries work:**

Turborepo 2.4.2+ includes experimental Boundaries feature:

1. Default checks: no importing files outside package directory, no importing undeclared dependencies
2. Tag-based rules: packages get tags, rules constrain which tags can depend on which

```json
// turbo.json
{
  "boundaries": {
    "tags": {
      "packages/ui": ["internal"],
      "packages/api": ["public"]
    },
    "rules": [
      { "allow": ["public"], "deny": ["internal"] }
    ]
  }
}
```

**Current status:** Experimental. Less mature than Nx's approach but simpler to adopt (one line in `turbo.json`).

**What works:** Zero-config default boundaries catch real issues (undeclared deps, cross-package file access). Incremental adoption.

**What breaks down:** Still experimental. Tag system is less expressive than Nx's. No visualization equivalent to `nx graph`.

**Key insight for our project:** The Nx tag system is the closest existing pattern to what we need for declaring feature dependencies. A feature tagged `scope:subtasks` would declare `onlyDependOnLibsWithTags: ["scope:tasks", "scope:shared"]`. This is essentially a feature manifest.

Sources:
- [Enforce Module Boundaries - Nx](https://nx.dev/docs/features/enforce-module-boundaries)
- [Three Ways to Enforce Module Boundaries in Nx](https://www.stefanos-lignos.dev/posts/nx-module-boundaries)
- [Turborepo Boundaries Reference](https://turborepo.com/docs/reference/boundaries)

---

## 5. Dependency Injection in Frontend Apps

### NestJS Module System

NestJS modules are the closest analog to what we're building. Each module:

```typescript
@Module({
  imports: [TasksModule],           // Declares dependencies on other modules
  controllers: [SubtasksController], // Registers HTTP endpoints
  providers: [SubtasksService],      // Registers injectable services
  exports: [SubtasksService],        // Makes services available to importing modules
})
export class SubtasksModule {}
```

**Boundary definition:** The `@Module()` decorator creates an explicit boundary. Providers are scoped to their module unless exported. The `imports` array declares which other modules' exports are available.

**Inter-feature communication:** Through imported module exports. Module A imports Module B, gaining access to B's exported providers. Providers are injected via constructor injection.

**Feature registration:** Modules self-register by being included in the `imports` array of a parent module. Dynamic modules support runtime configuration:

```typescript
@Module({})
export class FeatureModule {
  static forRoot(config: FeatureConfig): DynamicModule {
    return {
      module: FeatureModule,
      providers: [{ provide: FEATURE_CONFIG, useValue: config }],
    }
  }
}
```

**Adding/removing features:** Add/remove the module from the parent's `imports` array. TypeScript compilation catches missing dependencies.

**Testing:** Replace modules in tests by overriding providers. Each module can be tested in isolation by mocking its imports.

**What works:** Explicit dependency graph. TypeScript enforces contracts. Dynamic modules enable configuration.

**What breaks down:** Circular dependencies between modules require `forwardRef()`. The DI container adds runtime overhead. Over-injection leads to "dependency hell."

### Angular Module System

Similar to NestJS (NestJS was inspired by Angular). Key difference: Angular is moving toward **standalone components** that don't require modules at all. This is a signal that heavy module systems add friction.

### React: No Built-in DI, But Patterns Exist

React doesn't have a module system. Options:

1. **Context + Providers (React's native pattern):**
   ```tsx
   // Feature provides its context
   <TasksProvider>
     <SubtasksProvider>
       <App />
     </SubtasksProvider>
   </TasksProvider>
   ```
   Provider nesting order = dependency order. Simple but doesn't enforce boundaries.

2. **InversifyJS / tsyringe:**
   Full DI containers for TypeScript. Constructor injection with decorators. Works but fights React's functional paradigm.

3. **Feature registry pattern (pragmatic choice for React):**
   ```typescript
   // Each feature registers itself
   const featureRegistry = {
     tasks: { routes, components, hooks, convexFunctions },
     subtasks: { routes, components, hooks, convexFunctions, requires: ['tasks'] },
   }
   ```
   This is what we should build -- a lightweight registry that declares dependencies without a heavy DI framework.

**Key insight for our project:** Don't adopt NestJS-style DI for React. Instead, use a feature registry pattern with explicit dependency declarations. React's Context + Providers pattern naturally composes features. The registry provides the manifest; React's component tree provides the runtime composition.

Sources:
- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [DI in React with InversifyJS](https://www.synergycodes.com/blog/dependency-injection-in-react-using-inversifyjs)
- [DI Beyond NestJS - tsyringe and InversifyJS](https://leapcell.io/blog/dependency-injection-beyond-nestjs-a-deep-dive-into-tsyringe-and-inversifyjs)

---

## 6. Feature as a Package Pattern

### How It Works

Each feature is a separate package in a monorepo workspace:

```
packages/
  feature-tasks/
    package.json          # declares dependencies including other features
    src/
      components/
      hooks/
      convex/             # feature's Convex functions
      index.ts            # public API
  feature-subtasks/
    package.json          # "dependencies": { "@app/feature-tasks": "workspace:*" }
    src/
      ...
  feature-projects/
    package.json          # "dependencies": { "@app/feature-tasks": "workspace:*" }  (optional)
    src/
      ...
  shared/
    package.json
    src/
      ...
  app/
    package.json          # imports only the features this client needs
    src/
      ...
```

**Boundary definition:** `package.json` dependencies ARE the feature manifest. You can only import what you've declared as a dependency. TypeScript + bundler enforcement.

**Inter-feature communication:** Through each package's public API (`index.ts` exports). Features import from other features' public API, never from internal paths.

**Adding/removing features:** Add/remove the dependency from the app's `package.json`. Run `npm install`. If TypeScript compiles, you're good.

**Testing:** Each package has its own test suite. Tests import only through the public API. Integration tests live in the app package.

### Trade-offs vs Feature Folders

| Aspect | Feature as Package | Feature Folders |
|--------|-------------------|-----------------|
| Boundary enforcement | Hard (package.json + bundler) | Soft (linting rules only) |
| Dependency declaration | Explicit in package.json | Implicit or via config |
| Build caching | Per-package (Turborepo/Nx) | Whole-app rebuild |
| Tooling overhead | Higher (workspace config, linking) | Lower (just directories) |
| Developer experience | More files to manage, slower IDE | Simpler navigation |
| Feature removal | Remove from package.json | Delete folder + grep for imports |
| Versioning | Can version independently | All at app version |
| Circular dependencies | Hard error from package manager | Silent until runtime |

### Real-World Examples

- **Vercel's Next.js monorepo:** Uses Turborepo with internal packages for shared code
- **Remix Indie/Blues Stack:** Feature folders, not packages (simpler approach)
- **Enterprise React apps:** Often use Nx with library per feature

### What Works

- **Hard boundaries:** Package managers won't let you import undeclared dependencies
- **Build performance:** Only rebuild changed packages
- **Independent testing:** Each package has isolated test suite
- **Clear public API:** `index.ts` exports define the contract

### What Breaks Down

- **Overhead for small features:** A feature that's 3 files doesn't need its own package.json
- **TypeScript project references:** Must be configured correctly or IDE performance suffers
- **Convex specifics:** Convex functions need to be in a specific directory structure. Splitting across packages requires careful orchestration of the `convex/` directory
- **Hot reload complexity:** Changes in a dependency package may require rebuilding before the app sees them (though workspace symlinks help)
- **Refactoring friction:** Moving code between packages is harder than moving between folders

Sources:
- [Monorepo with NPM Workspaces](https://nerdpress.org/2024/04/12/monorepo-with-npm-workspaces/)
- [TypeScript Monorepo with NPM Workspaces](https://yieldcode.blog/post/npm-workspaces/)
- [npm Workspaces for Monorepo Management](https://earthly.dev/blog/npm-workspaces-monorepo/)

---

## 7. Synthesis: What This Means for Our System

### The Problem Restated

We need composable features where:
- Each client gets a separate codebase with only their features
- Features have typed dependencies (subtasks -> tasks, projects ->? tasks)
- Features can be added/removed without breaking other features
- The system works with Convex (serverless backend with specific directory requirements)

### Recommended Approach: Feature Registry + Feature Folders (not packages)

**Why not feature-as-package:** Convex requires all functions in a single `convex/` directory. Splitting Convex functions across workspace packages would fight the framework. The overhead of package.json per feature is not justified for our scale.

**Why not full plugin architecture:** Our features aren't third-party extensible. We control all features. Plugin ceremony (hooks, lifecycle, registration) is overkill.

**Why feature folders with a registry:** Combines the simplicity of feature folders with the explicitness of a feature manifest. Boundaries are enforced through linting + the registry, not package managers.

### Proposed Pattern

```
src/
  features/
    tasks/
      _manifest.ts          # Feature declaration: name, dependencies, exports
      components/
      hooks/
      lib/
    subtasks/
      _manifest.ts          # declares dependency on 'tasks'
      components/
      hooks/
      lib/
    projects/
      _manifest.ts          # declares optional dependency on 'tasks'
      components/
      hooks/
      lib/
  registry/
    index.ts                # Collects manifests, validates dependency graph
    types.ts                # FeatureManifest type
convex/
  features/
    tasks/
    subtasks/
    projects/
```

**Manifest format (inspired by Vite plugins + Nx tags + NestJS modules):**

```typescript
// features/subtasks/_manifest.ts
export const subtasksFeature: FeatureManifest = {
  name: 'subtasks',
  requires: ['tasks'],                    // Hard dependencies
  optional: [],                           // Optional enhancements
  provides: {
    routes: () => import('./routes'),
    components: () => import('./components'),
    hooks: () => import('./hooks'),
  },
}
```

### Inter-Feature Communication Patterns (Ranked by Preference)

1. **Shared types/interfaces (best for our case):** Features import types from dependencies. `Subtask` type references `TaskId`. Compile-time safety.

2. **React Context composition:** Parent feature provides context; dependent feature consumes it. `<TasksProvider>` wraps `<SubtasksProvider>`.

3. **Event bus (only if needed):** For truly decoupled optional relationships. Projects could listen for "task-created" events without importing from tasks. Use only for optional dependencies.

4. **Shared database (via Convex):** Features can read each other's tables if declared in the manifest. Convex's query/mutation system already provides this naturally.

### Boundary Enforcement Strategy

| Layer | Enforcement | Tool |
|-------|------------|------|
| Import boundaries | Lint-time | ESLint `no-restricted-imports` or custom rule |
| Dependency declaration | Build-time | Registry validates manifest graph on app start |
| Circular dependency | Build-time | Registry topological sort detects cycles |
| Public API | Convention | Each feature exports only through `index.ts` |
| Convex function isolation | Convention | Each feature's Convex functions in `convex/features/{name}/` |

### Testing Strategy Across Boundaries

| Test Type | Scope | What It Validates |
|-----------|-------|-------------------|
| Unit tests | Single feature | Feature logic in isolation, mock dependencies |
| Integration tests | Feature + its declared dependencies | Cross-feature contracts work |
| Registry tests | All manifests | Dependency graph is valid, no cycles, no missing deps |
| E2E tests | Full app with selected features | Real user flows across features |

### What We Should Learn From Each Pattern

| Pattern | Take From It | Skip |
|---------|-------------|------|
| Shopify modular monolith | Explicit public APIs per feature, static analysis for boundaries | Packwerk (Ruby-specific), Wedge call-graph tracing |
| Basecamp vanilla approach | Keep it simple, don't over-architect | Relying purely on cultural enforcement |
| Feature-Sliced Design | Layer hierarchy (shared -> entities -> features -> widgets -> pages), segment structure | Seven layers (too many for our scale) |
| Vite plugins | Hook-based extension points, factory function pattern, `name` + hooks object | Plugin ordering concerns, no dependency declaration |
| Nx module boundaries | Tag-based dependency constraints, ESLint enforcement | Full Nx toolchain (overkill for single app) |
| NestJS modules | Explicit `imports`/`exports` declarations, the `forRoot()` config pattern | Runtime DI container, decorator-heavy approach |
| Feature as package | Hard boundaries via package.json, clear public API | Per-feature package.json overhead, workspace complexity |

### Critical Pitfall to Avoid

**Don't build a framework before building features.** The registry and manifest system should be ~50 lines of code initially. Start with 2-3 features, let the pattern prove itself, then add enforcement tooling. Shopify didn't build Packwerk on day one -- they built it after the pain was real.

---

## Inter-Module Communication Patterns (Deep Dive)

From Kamil Grzybek's definitive analysis, four integration styles exist for modular monoliths:

| Style | Coupling | Timeliness | Complexity | Our Use? |
|-------|----------|-----------|------------|----------|
| **Direct call** (via public API) | Medium | Immediate | Low | Primary -- for required dependencies |
| **Messaging/Events** | Low | Eventually consistent | Medium | For optional dependencies only |
| **Shared database** | High | Immediate | Low | Via Convex -- natural for data relationships |
| **Shared kernel** | Medium | N/A | Low | Shared types, IDs, and interfaces |

**Recommendation:** Use direct calls for required dependencies (subtasks imports from tasks). Use events only for optional relationships (projects might react to task events). Keep shared kernel minimal (just IDs, enums, and interfaces in `shared/`).

Sources:
- [Modular Monolith Integration Styles - Kamil Grzybek](https://www.kamilgrzybek.com/blog/posts/modular-monolith-integration-styles)
- [Modular Monolith Communication Patterns - Milan Jovanovic](https://www.milanjovanovic.tech/blog/modular-monolith-communication-patterns)
- [Testing Modular Monoliths - Milan Jovanovic](https://www.milanjovanovic.tech/blog/testing-modular-monoliths-system-integration-testing)
