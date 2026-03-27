# LLM-Powered Code Assembly Research

**Domain:** Code generation and assembly patterns for composable applications
**Researched:** 2026-03-10
**Overall confidence:** MEDIUM-HIGH (multiple verified sources, active ecosystem)

---

## Executive Summary

The code generation landscape has converged on a clear pattern: **templates for structure, LLMs for intelligence**. Every successful system -- from v0 to shadcn to Aider -- draws a deliberate boundary between deterministic template output and LLM-generated logic. The systems that work well constrain the LLM aggressively; the systems that fail give the LLM too much freedom.

The most important finding for our assembler: **the "shared dependencies" pattern is the critical coordination mechanism**. Whether it's Smol Developer's `shared_dependencies.md`, Aider's repository map, or v0's dynamic system prompt, every multi-file generation system needs a single source of truth about cross-file contracts before generating individual files. Without this, files hallucinate incompatible interfaces.

---

## 1. v0 by Vercel

**Sources:** [How we made v0 an effective coding agent](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent), [v0 composite model family](https://vercel.com/blog/v0-composite-model-family), [v0 design systems docs](https://v0.app/docs/design-systems)
**Confidence:** HIGH (first-party engineering blog)

### Architecture: Three-Stage Pipeline

1. **Dynamic System Prompt** -- Not a static prompt. v0 uses embeddings + keyword matching to detect what the user needs (e.g., AI SDK usage, routing patterns), then injects relevant knowledge from hand-curated code sample directories. These directories are "designed for LLM consumption" -- not raw docs, but optimized examples.

2. **LLM Suspense (Streaming Manipulation)** -- A real-time streaming post-processor that transforms output as it streams. Simple use: replacing long URLs with tokens. Sophisticated use: when the LLM requests a non-existent Lucide icon, the system runs an embedding search against the actual icon library exports and substitutes the closest match -- all within 100ms.

3. **Autofixers** -- Post-generation error correction, both deterministic (AST-based: e.g., checking that `useQuery` is wrapped in `QueryClientProvider`) and model-driven (a fine-tuned model for JSX/TypeScript error repair). Runs in ~250ms when triggered.

### Where Templates vs LLMs

| Aspect | Template/Deterministic | LLM |
|--------|----------------------|-----|
| Component structure | -- | Full LLM generation |
| Icon resolution | Embedding search + export validation | -- |
| Dependency detection | AST parsing of imports | -- |
| Error fixing | Deterministic rules first | Fine-tuned model fallback |
| Knowledge injection | Curated code samples (RAG) | Frontier model reasoning |

### Key Lessons for Our Assembler

- **LLMs generate code ~10% of the time with errors** -- you need a post-processing pipeline, not just generation
- **Curated examples beat documentation** -- v0 maintains hand-crafted code samples optimized for LLM consumption rather than pointing at raw docs
- **Model routing matters** -- large changes get a frontier model, small edits get a fast model. Our assembler should distinguish "generate new feature" from "wire existing features"
- **AST-based validation catches what prompts can't** -- checking structural correctness deterministically is more reliable than asking the LLM to "be correct"

---

## 2. Coding Agents (Cursor, Claude Code, Aider)

**Sources:** [Cursor agent best practices](https://cursor.com/blog/agent-best-practices), [Aider repository map](https://aider.chat/docs/repomap.html), [Claude Code memory docs](https://code.claude.com/docs/en/memory), [Cursor limitations analysis](https://www.augmentcode.com/tools/cursor-ai-limitations-why-multi-file-refactors-fail-in-enterprise)
**Confidence:** HIGH (official docs + direct experience)

### Multi-File Generation Patterns

**Aider's Repository Map** is the most instructive pattern:
- Uses tree-sitter to extract symbol definitions (classes, functions, signatures) from every file
- Builds a dependency graph where files are nodes, edges are import/reference relationships
- Ranks files by relevance using graph algorithms (similar to PageRank)
- Dynamically adjusts how much of the map to include based on available context budget
- Default budget: 1,000 tokens for the entire repo map -- forces compression

**Aider's Architect Mode** splits generation into two phases:
1. An "architect" model proposes changes at a high level (what to change, where, why)
2. An "editor" model generates the actual file diffs

This two-step approach produces more reliable multi-file edits because the architect can reason about cross-file impacts before any code is written.

**Cursor's .cursor/rules/** scopes constraints to file patterns:
- Rules without path scoping load globally (like project conventions)
- Rules with path patterns (e.g., `*.test.ts`) only activate for matching files
- Key insight: "Reference canonical examples in your codebase rather than copying code"

**Claude Code's CLAUDE.md** uses progressive disclosure:
- Don't dump everything into context -- tell Claude where to find information
- Three-tier hierarchy: global > project > local (most specific wins)
- Rules files for topic-specific constraints (code style, testing, security)

### Reliability Patterns That Work

1. **Plan before code** -- Cursor's Plan Mode, Aider's Architect Mode. Always have the LLM reason about the change before writing code
2. **Typed languages + tests** -- provide verifiable success criteria the agent can check against
3. **Chunk large changes** -- commit after each logical chunk, run tests per chunk
4. **Fresh conversations** -- long chat histories accumulate noise and confuse the model
5. **Specific file references** -- tag exact files when you know them; let the agent search otherwise

### Failure Modes

| Failure | Cause | Mitigation |
|---------|-------|------------|
| Context window overflow | Large repos exceed token budget | Repo map compression, chunked changes |
| Cascading errors | One wrong edit breaks imports across files | Type checking after each step |
| Lost coherence | Long conversations | Fresh conversations per task |
| Hallucinated APIs | Model invents non-existent functions | Typed languages, AST validation |
| Circular dependencies | AI doesn't understand module boundaries | Explicit architecture rules |

### Key Lessons for Our Assembler

- **The repository map pattern is directly applicable** -- our assembler should build a dependency graph of all features/templates before generating, so the LLM knows what connects to what
- **Two-phase generation (plan then code) produces better results** -- our assembler should have the LLM plan wiring before generating wiring code
- **Rules files are the right constraint mechanism** -- provide conventions as rules, not as part of the generation prompt
- **Context budget management is critical** -- don't dump the entire codebase into context; use a compressed map

---

## 3. Template Generators (Plop.js, Hygen, Yeoman)

**Sources:** [Plop.js documentation](https://plopjs.com/documentation/), [Hygen docs](https://www.hygen.io/docs/faq/), [Code generation tools comparison](https://github.com/Ofadiman/code-generation-tools-comparison)
**Confidence:** HIGH (direct documentation, well-established tools)

### Capabilities Comparison

| Feature | Plop.js | Hygen | Yeoman |
|---------|---------|-------|--------|
| Template engine | Handlebars | EJS | EJS |
| Conditional sections | `{{#if}}` blocks | EJS `<% if %>` | EJS `<% if %>` |
| Optional files | Action config with conditionals | Frontmatter conditions | Generator config |
| Interactive prompts | Inquirer.js built-in | Frontmatter prompts | Yeoman adapter |
| File injection | `append`/`modify` actions | Inject action with markers | Full generator API |
| Custom helpers | Handlebars helpers | JS helpers | Full Node API |
| Complexity | Low | Low | High |

### Where Templates Work

- **Boilerplate structure** -- file skeletons, directory layouts, import patterns
- **Naming conventions** -- PascalCase components, camelCase hooks, consistent prefixes
- **Standard patterns** -- CRUD operations, form components, API routes with known shapes
- **Conditional inclusion** -- "if auth feature is enabled, include auth middleware file"
- **File injection** -- adding imports/exports to barrel files, adding routes to a router

### Where Templates Break Down

1. **Cross-template dependencies** -- Plop/Hygen have no concept of "this template depends on that template." Each generator runs independently. Wiring features together (e.g., "add this nav item to the sidebar AND register this route AND update the type union") requires multiple separate actions that don't coordinate.

2. **Complex conditional logic** -- Handlebars is "logic-less" by design. When you need "if feature A AND feature B but NOT feature C, generate this variant," you hit the wall. Workaround: custom Handlebars helpers, but they become a second codebase.

3. **Type-aware generation** -- Templates don't understand TypeScript types. They can't check that a generated component's props match the interface expected by its parent.

4. **Dynamic wiring** -- "Connect these 5 features in the right order with the right data flow" is a reasoning task, not a template task.

### The Template Ceiling

Templates excel at **per-file generation** but fail at **inter-file coordination**. This is exactly the gap our assembler needs the LLM to fill.

### Key Lessons for Our Assembler

- **Use Plop.js for deterministic per-file generation** -- it's the right tool for "generate a Convex function file with these fields"
- **Don't try to make templates coordinate** -- that's the LLM's job
- **Handlebars helpers can bridge simple gaps** -- date formatting, case conversion, pluralization
- **File injection (append/modify) is critical** -- many wiring tasks are "add a line to an existing file"

---

## 4. shadcn/ui's "Copy Not Dependency" Model

**Sources:** [shadcn/ui CLI docs](https://ui.shadcn.com/docs/cli), [Package installation internals](https://deepwiki.com/shadcn-ui/ui/9.1-package-installation), [Registry specification](https://ui.shadcn.com/docs/registry)
**Confidence:** HIGH (official docs + DeepWiki analysis)

### How the Registry Works

Each component is a JSON endpoint (e.g., `ui.shadcn.com/r/styles/new-york-v4/button.json`) containing:
- **Source code** as strings
- **npm dependencies** (e.g., `@radix-ui/react-dialog`)
- **Component dependencies** (e.g., button depends on nothing, dialog depends on button)
- **File type classification** (`registry:ui`, `registry:hook`, `registry:lib`) determining target directory
- **Metadata** for transformations

### Dependency Resolution

```
User runs: npx shadcn add dialog
  1. Fetch dialog.json from registry
  2. Discover dialog depends on button
  3. Fetch button.json from registry
  4. Resolve transitively (recursive tree-building)
  5. Deduplicate npm dependencies across all components
  6. Apply transformation pipeline
  7. Write files to configured directories
```

The resolution is **recursive and cross-registry** -- a component from `@magicui` can depend on `@shadcn/button`, and the CLI resolves across registries using namespace URLs in `components.json`.

### Transformation Pipeline

After fetching, the CLI applies sequential transforms:
1. **Import path rewriting** -- matches user's tsconfig aliases
2. **Icon library conversion** -- lucide-react vs tabler vs radix
3. **CSS variable remapping** -- to match user's theme
4. **API conversion** -- radix vs base-ui
5. **RSC directive injection** -- `"use client"` where needed

### Why Copy > Dependency

| Copy (shadcn model) | Dependency (npm model) |
|---------------------|----------------------|
| User owns the code, can modify freely | Locked behind version pins |
| No runtime dependency tree bloat | Transitive deps multiply |
| Tailored to project conventions | One-size-fits-all API |
| Breaking changes don't propagate | Major version bumps break users |
| Easy to understand and debug | Black box internals |
| Works with any build system | May conflict with bundler configs |

### Key Lessons for Our Assembler

- **The registry pattern is our model** -- our assembler is essentially a registry that serves feature code with dependency metadata
- **Transformation pipelines are essential** -- generated code needs project-specific adaptation (import paths, conventions, style)
- **Recursive dependency resolution is the right approach** -- feature A depends on feature B, which depends on core, and the assembler should resolve this automatically
- **File type classification determines destination** -- `registry:ui` -> components, `registry:hook` -> hooks. Our features should declare their file types similarly
- **JSON schema for registry items** -- validates what gets generated before it's written

---

## 5. Schema-Driven Generators (OpenAPI, GraphQL Codegen)

**Sources:** [OpenAPI Generator templating](https://openapi-generator.tech/docs/templating/), [GraphQL Codegen config](https://the-guild.dev/graphql/codegen/docs/config-reference/codegen-config), [Near-operation-file preset](https://the-guild.dev/graphql/codegen/plugins/presets/near-operation-file-preset)
**Confidence:** HIGH (official documentation)

### OpenAPI Generator Architecture

- Uses **Mustache templates** (logic-less) with a Java-based code generation engine
- Schema properties are exposed in multiple "sets" enabling conditional iteration (e.g., iterate only required fields, only readonly fields)
- **Vendor extensions** (`x-*` prefixes) pass custom metadata through the schema that templates can conditionally process
- Since v4.0.0, supports Handlebars and user-defined template engines via plugins
- **90% of customization** is template-only; 10% requires extending the Java generator class

### GraphQL Codegen Architecture

- **Plugin system** -- each output type (types, hooks, operations) is a separate plugin
- **Presets** bundle plugins with configuration (e.g., `near-operation-file` puts generated types next to their source operations)
- **Hierarchical config** -- root-level options cascade to per-output overrides
- Config file (`codegen.ts`) defines: schema source, document sources, output targets, plugins per target

### Config Patterns Worth Adopting

**OpenAPI's vendor extensions:**
```yaml
# In schema
x-generate-admin-crud: true
x-auth-required: true
```
Templates check these flags to conditionally generate code. This is a clean mechanism for feature flags in schemas.

**GraphQL Codegen's preset system:**
```typescript
// codegen.ts
{
  generates: {
    'src/': {
      preset: 'near-operation-file',
      presetConfig: { baseTypesPath: 'types.ts' },
      plugins: ['typescript-operations', 'typescript-react-query']
    }
  }
}
```
Presets compose plugins with configuration, similar to how our features compose templates with config.

### Key Lessons for Our Assembler

- **Schema as source of truth** -- the config file (like an OpenAPI spec) drives all generation. No imperative logic.
- **Plugin/preset composition** -- features should compose like GraphQL Codegen plugins, each contributing specific output
- **Vendor extensions for feature flags** -- custom metadata in the config that templates check conditionally
- **File proximity matters** -- generated types should live near their usage (near-operation-file pattern), not in a distant `generated/` folder

---

## 6. AI-Assisted Scaffolding (Smol Developer, GPT Engineer, Agiflow)

**Sources:** [Smol Developer GitHub](https://github.com/smol-ai/developer), [Agiflow scaffold MCP](https://dev.to/vuong_ngo/scaling-ai-assisted-development-how-scaffolding-solved-my-monorepo-chaos-1g1k)
**Confidence:** MEDIUM (open source repos + blog posts)

### Smol Developer's Shared Dependencies Pattern

The most important architectural insight from any of these tools:

```
Step 1: plan()
  -> LLM creates shared_dependencies.md listing all cross-file contracts
     (function names, variable names, data shapes, API endpoints)

Step 2: specify_file_paths()
  -> LLM determines which files need to exist

Step 3: generate_code_sync(prompt, shared_deps, file_path)
  -> For each file, generate code WITH shared_deps in context
  -> Each file references the same contracts
```

**Why this works:** The LLM "talks to itself" through the shared dependencies document. File A and File B both see the same contract specifications, so they generate compatible interfaces.

**Why it's imperfect:** The shared_dependencies.md sometimes misses hard dependencies. The fix: explicit naming conventions in prompts (tell the LLM exactly what names to use).

### Agiflow's MCP Scaffold Generator

The most mature hybrid approach found in this research:

1. **Templates define structure** with pattern-enforcement headers:
   ```typescript
   /**
    * PATTERN: Injectable Service with Dependency Injection
    * - MUST use @injectable() decorator
    * - MUST inject dependencies via @inject(TYPES.*)
    */
   @injectable()
   export class {{ ServiceName }}Service {
     // AI fills in methods contextually
   }
   ```

2. **JSON Schema validates inputs** before generation (PascalCase names via regex, required fields, type constraints)

3. **Template configuration** (`scaffold.yaml`) declares which files are generated together and share variables:
   ```yaml
   includes:
     - "{{ serviceName | camelCase }}Service.ts"
     - "{{ serviceName | camelCase }}Service.test.ts"
   ```

4. **MCP integration** exposes templates as tools the AI can call, making scaffolding a first-class agent action

### GPT Engineer's Approach

- Single prompt -> Q&A clarification -> technical plan -> full codebase generation
- Works for greenfield but struggles with existing codebases
- No incremental assembly; it's all-or-nothing generation

### Key Lessons for Our Assembler

- **Shared dependencies document is essential** -- before generating any files, create a manifest of cross-file contracts
- **"Fill-in-the-blanks" > "write from scratch"** -- templates with LLM-filled gaps produce more reliable code than pure LLM generation
- **Pattern enforcement headers** -- JSDoc comments in templates that tell the LLM what patterns to follow
- **MCP integration** -- exposing generation as tools lets AI agents orchestrate assembly

---

## Synthesis: The Assembler Architecture

### The Template/LLM Boundary

Based on all research, here is where the boundary should be:

| Task | Template (Plop.js) | LLM | Why |
|------|-------------------|-----|-----|
| File structure/skeleton | X | | Deterministic, no reasoning needed |
| Naming conventions | X | | Handlebars helpers handle this |
| Standard CRUD operations | X | | Known patterns, no variation |
| Import statements (known) | X | | Deterministic from dependency graph |
| Feature wiring (connecting features) | | X | Requires reasoning about data flow |
| Complex conditional logic | | X | Too many combinations for templates |
| Type composition | | X | Understanding type relationships |
| Config-to-code translation | | X | Interpreting intent from config |
| Error detection/fixing | Both | Both | AST for structure, LLM for semantics |

### The Recommended Pipeline

```
Config File (features.yaml)
    |
    v
[1. Dependency Resolution]  -- Recursive, like shadcn
    Resolve feature dependencies into ordered generation plan
    |
    v
[2. Shared Dependencies]  -- Like Smol Developer
    LLM generates cross-feature contract document
    (shared types, function signatures, data shapes)
    |
    v
[3. Template Generation]  -- Like Plop.js
    For each feature, run Handlebars templates
    Produces file skeletons with pattern-enforcement headers
    |
    v
[4. LLM Wiring]  -- Like v0's generation
    LLM fills in inter-feature connections
    Uses shared dependencies + repo map as context
    |
    v
[5. Validation]  -- Like v0's Autofixers
    AST parsing for structural correctness
    TypeScript compiler for type checking
    Deterministic fixes first, LLM fixes second
    |
    v
[6. Transformation]  -- Like shadcn's pipeline
    Import path rewriting
    Convention adaptation
    Project-specific adjustments
    |
    v
[7. Human Review]
    Developer reviews generated code
    Accepts, rejects, or requests changes
```

### Reliability Mechanisms

From all tools studied, these mechanisms improve reliability:

1. **Constrained generation** -- Don't ask the LLM to write a whole file. Give it a skeleton and ask it to fill gaps.
2. **AST-based validation** -- Parse generated code into AST, check structural properties deterministically.
3. **Type checking as verification** -- Run `tsc --noEmit` on generated code. If it fails, the generation failed.
4. **Curated examples over docs** -- Like v0, maintain hand-crafted examples optimized for LLM consumption, not raw documentation.
5. **Context budget management** -- Like Aider's repo map, compress the codebase into a dependency graph that fits in context.
6. **Two-phase generation** -- Plan the change, then implement it. Architect mode.
7. **Deterministic fixes before LLM fixes** -- Like v0's autofixer pipeline: try regex/AST fixes first, only use LLM for remaining errors.

### Anti-Patterns to Avoid

| Anti-Pattern | Why It Fails | What To Do Instead |
|-------------|-------------|-------------------|
| Pure LLM generation (no templates) | 10%+ error rate, inconsistent structure | Templates for structure, LLM for logic |
| All-at-once generation | Context overflow, lost coherence | Feature-by-feature with shared deps |
| No validation pipeline | Errors reach the developer | AST + TypeScript + deterministic fixes |
| Raw docs as context | Too verbose, LLM misinterprets | Curated code examples |
| Single-model pipeline | Slow for simple fixes, weak for complex ones | Route by complexity (v0's composite model) |
| Templates for everything | Combinatorial explosion of conditionals | LLM for complex conditional logic |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| v0 architecture | HIGH | First-party Vercel engineering blog |
| Coding agent patterns | HIGH | Official docs + widely documented |
| Template generator limits | HIGH | Well-established tools, direct docs |
| shadcn registry model | HIGH | Official docs + DeepWiki analysis |
| Schema-driven generators | MEDIUM-HIGH | Official docs, less depth on internals |
| AI scaffolding tools | MEDIUM | Open source + blog posts, rapidly evolving |
| Recommended pipeline | MEDIUM | Synthesis of patterns, untested as a whole |

## Open Questions

- **LLM model selection for wiring tasks** -- Which model is best for the "fill in the gaps" wiring step? Frontier models (Claude Opus/Sonnet) vs specialized fine-tuned models? Needs benchmarking.
- **Shared dependencies format** -- What's the optimal schema for the cross-feature contract document? Smol Developer uses markdown; a typed schema might be more reliable.
- **Incremental regeneration** -- When a feature config changes, can we regenerate just that feature's files, or do all connected features need regeneration? The dependency graph should answer this, but needs validation.
- **Error recovery UX** -- When the LLM wiring step produces invalid code, what's the developer experience for fixing it? Retry with different prompt? Manual edit? Guided correction?

## Sources

- [How we made v0 an effective coding agent - Vercel](https://vercel.com/blog/how-we-made-v0-an-effective-coding-agent)
- [Introducing the v0 composite model family - Vercel](https://vercel.com/blog/v0-composite-model-family)
- [Cursor Agent Best Practices](https://cursor.com/blog/agent-best-practices)
- [Aider Repository Map](https://aider.chat/docs/repomap.html)
- [Claude Code Memory Docs](https://code.claude.com/docs/en/memory)
- [shadcn/ui CLI Docs](https://ui.shadcn.com/docs/cli)
- [shadcn/ui Package Installation Internals](https://deepwiki.com/shadcn-ui/ui/9.1-package-installation)
- [shadcn/ui Registry Specification](https://ui.shadcn.com/docs/registry)
- [Plop.js Documentation](https://plopjs.com/documentation/)
- [OpenAPI Generator Templating](https://openapi-generator.tech/docs/templating/)
- [GraphQL Codegen Configuration](https://the-guild.dev/graphql/codegen/docs/config-reference/codegen-config)
- [Smol Developer GitHub](https://github.com/smol-ai/developer)
- [Scaling AI-Assisted Development with Scaffolding MCP](https://dev.to/vuong_ngo/scaling-ai-assisted-development-how-scaffolding-solved-my-monorepo-chaos-1g1k)
- [Cursor AI Limitations in Enterprise](https://www.augmentcode.com/tools/cursor-ai-limitations-why-multi-file-refactors-fail-in-enterprise)
