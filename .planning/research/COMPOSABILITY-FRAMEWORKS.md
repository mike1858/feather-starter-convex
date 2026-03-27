# Composable Feature Systems: How Established Frameworks Do It

**Researched:** 2026-03-10
**Overall confidence:** HIGH (all findings from official docs and verified sources)
**Purpose:** Inform the design of a "lego-style" feature composition system for our task management platform

---

## Executive Summary

Five established frameworks were analyzed for how they handle composable, optional features. The approaches fall on a spectrum from **metadata-driven** (Frappe) to **convention-driven** (Django, Rails) to **code-generation-driven** (Bullet Train) to **content-composition** (Wagtail). Each offers different tradeoffs between flexibility, developer experience, and brittleness.

The strongest pattern across all systems: **features declare themselves through a registry mechanism, and the host system discovers and wires them automatically.** The weakest area across all systems: **removing features is always harder than adding them.**

---

## 1. Frappe/ERPNext -- Metadata-First DocType System

### How Features Are Defined

DocTypes are the atomic unit of everything. A single DocType JSON file drives:
- **Schema**: Field definitions map to database columns (`Data` -> `VARCHAR(140)`, `Link` -> foreign key, `Table` -> child table relationship)
- **UI**: Field properties like `in_list_view`, `depends_on`, `label` auto-generate forms and list views
- **Permissions**: A `permissions` child table within the DocType defines role-based access, enforced at both save-time and query-time
- **API**: REST endpoints are auto-generated with permission checks derived from the same DocType definition

Apps are organized into **modules** (listed in `modules.txt`), and each DocType belongs to a module.

### How Features Discover and Register Themselves

The **hooks.py** file is the central registration mechanism. When `frappe.get_hooks()` is called, it collects hook values from ALL installed apps, merging them into lists. This enables cascading composition:

```python
# hooks.py in a custom app
doc_events = {
    "ToDo": {
        "after_insert": "my_app.handlers.on_todo_created"
    }
}
app_include_js = "/assets/my_app/js/custom.js"
scheduler_events = {
    "hourly": ["my_app.tasks.cleanup"]
}
override_whitelisted_methods = {
    "frappe.client.get_list": "my_app.overrides.custom_get_list"
}
```

Key hook types: `doc_events` (lifecycle hooks on any DocType), `override_whitelisted_methods` (last-one-wins override), `scheduler_events`, `doctype_js` (extend form scripts), `override_doctype_class`.

### Inter-Feature Dependencies

Apps declare dependencies in `hooks.py` via `required_apps`. When running `bench get-app`, the system parses this, creates a resolution plan via `make_resolution_plan()`, and installs dependencies in order using `OrderedDict` to prevent circular dependencies.

### Optional Relationships

DocTypes compose through two mechanisms:
- **Child Tables** (`istable=1`): Parent-child relationships where children exist only within the parent document
- **Link Fields**: Foreign key references to other DocTypes, with optional cascading deletion

Custom Fields and Property Setters allow apps to extend DocTypes defined by other apps **without modifying the original**. This is the killer feature -- App B can add fields to App A's DocTypes declaratively.

### Developer Experience for Adding/Removing

**Adding**: `bench get-app <repo-url>` then `bench --site <site> install-app <app-name>`. Dependencies are auto-resolved. Database tables are auto-created.

**Removing**: `bench --site <site> uninstall-app <app-name>`. Tables are dropped. But if other apps added Custom Fields referencing this app's DocTypes, or if Link fields point to now-missing DocTypes, things break.

### What Breaks When You Remove a Feature

- Link fields pointing to removed DocTypes cause validation errors
- Custom Fields added by the removed app to other DocTypes may persist as orphans
- `doc_events` hooks referencing removed code cause import errors
- Scheduled tasks from removed apps fail silently or loudly depending on error handling

### Strengths
- **True metadata-first**: Change JSON, get schema + UI + permissions + API automatically
- **Cross-app extensibility**: Any app can extend any DocType without modifying original code
- **Cascading hooks**: Multiple apps can hook into the same events

### Weaknesses
- **Tight coupling to Frappe runtime**: The composability pattern is inseparable from the framework
- **Removal is messy**: No formal "dependency impact analysis" before uninstall
- **Global namespace for DocTypes**: Two apps cannot define a DocType with the same name

### Sources
- [Frappe DocType System (DeepWiki)](https://deepwiki.com/frappe/frappe/2.3-doctype-system-and-metadata-management)
- [Frappe Apps Documentation](https://docs.frappe.io/framework/user/en/basics/apps)
- [Frappe Hooks API](https://docs.frappe.io/framework/v15/user/en/python-api/hooks)

---

## 2. Django -- Apps as Reusable Modules

### How Features Are Defined

A Django "app" is a Python package containing some combination of models, views, templates, template tags, static files, URLs, and middleware. Registration happens via `INSTALLED_APPS` in settings:

```python
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "oscar.apps.catalogue",
    "my_project.tasks",  # your custom app
]
```

Each app defines an `AppConfig` class in `apps.py` with metadata (`name`, `label`, `verbose_name`) and a `ready()` method for initialization.

### How Features Discover and Register Themselves

Django uses a **3-stage initialization** process:

1. **Import AppConfigs**: Each entry in `INSTALLED_APPS` is imported; `AppConfig` subclass is found
2. **Import Models**: Django imports the `models` submodule of each app
3. **Call `ready()`**: Each app's `AppConfig.ready()` executes -- this is where signals are registered, autodiscovery happens, etc.

**Autodiscovery** is the key mechanism: `django.utils.module_loading.autodiscover_modules("admin")` scans every installed app for an `admin.py` module and imports it. The admin site does this automatically. Apps can define their own autodiscovery for custom module names.

Convention-based discovery:
- `models.py` or `models/` -- auto-imported in Stage 2
- `admin.py` -- auto-discovered by admin contrib app
- `urls.py` -- manually included via `include("myapp.urls")` in project URLconf
- `signals.py` / `receivers.py` -- imported in `ready()` by convention

### Inter-Feature Dependencies

Django has **no formal dependency declaration** between apps. Dependencies are implicit:
- Model ForeignKeys create hard dependencies
- Signal connections create soft dependencies
- URL includes create routing dependencies

The order of `INSTALLED_APPS` matters for template resolution and migration ordering, but there is no `required_apps` equivalent.

### Optional Relationships

Django handles optional cross-app relationships through:
- **Signals**: Fully decoupled. App A emits a signal; App B connects to it in `ready()`. If App B is removed, the signal just has no receivers.
- **`get_model()` with try/except**: Code can attempt to load a model and gracefully handle its absence
- **Swappable models**: `AUTH_USER_MODEL` pattern lets you swap the User model entirely
- **Abstract base classes**: Share behavior without hard model dependencies

Django-Oscar uses a distinctive **"fork" pattern**: to customize a built-in app, you run a management command that copies it into your project, then replace the Oscar entry in `INSTALLED_APPS` with your forked version.

### Developer Experience for Adding/Removing

**Adding**: `pip install django-allauth`, add entries to `INSTALLED_APPS`, add URL includes, run `migrate`. Multiple manual steps.

**Removing**: Remove from `INSTALLED_APPS`, remove URL includes, remove any references in templates/views, create a migration to drop tables. **Manual and error-prone.**

### What Breaks When You Remove a Feature

- ForeignKey references to removed app's models cause migration/runtime errors
- Templates referencing removed app's template tags fail
- URL reversal (`{% url "app:view" %}`) raises `NoReverseMatch`
- Signal receivers in other apps that reference removed app's sender models break
- Admin registrations for removed models cause import errors

### Strengths
- **Mature ecosystem**: Thousands of reusable apps with established conventions
- **Signals for decoupling**: Clean way to handle optional inter-app communication
- **Autodiscovery is extensible**: Any app can define its own discovery pattern
- **AppConfig.ready()**: Clean initialization hook

### Weaknesses
- **No formal dependency declaration**: Everything is implicit
- **Manual wiring**: URLs must be manually included, middleware manually ordered
- **Removal requires manual cleanup**: No "uninstall" command
- **Template/static file conflicts**: Apps can silently override each other's templates based on `INSTALLED_APPS` order

### Sources
- [Django Applications Reference](https://docs.djangoproject.com/en/6.0/ref/applications/)
- [Django Autodiscovery Deep Dive](https://nikhilakki.in/understanding-djangos-auto-discovery-a-deep-dive)
- [Django Oscar Customization](https://django-oscar.readthedocs.io/en/latest/topics/customisation.html)
- [Django Reusable Apps Tutorial](https://docs.djangoproject.com/en/6.0/intro/reusable-apps/)

---

## 3. Rails Engines -- Mountable Feature Encapsulation

### How Features Are Defined

A Rails engine is a miniature Rails application packaged as a gem. It can contain:
- Models, controllers, helpers, views (in `app/`)
- Routes (drawn on the `Engine` class)
- Migrations, assets, tests
- Configuration and initializers

The `--mountable` flag creates a **namespace-isolated engine** where all components are namespaced (e.g., `Blorgh::Article`, not `Article`).

```ruby
# In host app's routes.rb
mount Blorgh::Engine, at: "/blog"
```

### How Features Discover and Register Themselves

Rails engines self-register through Ruby's gem/autoloading system:
- Adding a gem to `Gemfile` and running `bundle install` makes the engine available
- The engine's `lib/<engine>/engine.rb` defines an `Engine` class that inherits from `Rails::Engine`
- Rails autoloads models, controllers, etc. from the engine's `app/` directory
- The engine's initializers run during the host application's boot process

Engines that don't expose routes (backend-only) don't even need to be mounted -- adding the gem to `Gemfile` is sufficient to make models and rake tasks available.

### Inter-Feature Dependencies

Dependencies are declared in the engine's `.gemspec` file:
```ruby
s.add_dependency "rails", ">= 7.0"
s.add_dependency "another_engine", "~> 2.0"
```

Bundler resolves the dependency graph. This is robust because it uses the Ruby ecosystem's standard dependency resolution.

### Optional Relationships

Rails engines handle cross-engine relationships through several patterns:

- **Decorators / `class_eval`**: Engine B can reopen Engine A's models to add associations. Solidus (Spree successor) uses this pattern extensively but it's fragile.
- **Concerns**: A pattern where functionality is broken into `ActiveSupport::Concern` modules with a configuration point to include/exclude them.
- **`config.to_prepare`**: Engine initializer hook that runs before each request in development, used to load decorators that extend other engines' classes.
- **Configurable class references**: Devise uses `Devise.user_model` so the engine doesn't hardcode which model is the "user."

### Developer Experience for Adding/Removing

**Adding**: Add gem to `Gemfile`, `bundle install`, mount in routes, copy migrations with `bin/rails engine_name:install:migrations`, run `bin/rails db:migrate`.

**Removing**: Remove gem, remove mount point, revert migrations, remove any references to engine's models/controllers in host app code. Migration reversal is the tricky part.

### What Breaks When You Remove a Feature

- Associations added via decorators to host models cause `NameError`
- Routes referencing engine's URL helpers fail
- Views rendering engine partials break
- Migrations can't be reverted if the engine's migration files are gone (since they were copied)
- Any `has_many` or `belongs_to` pointing at engine models cause class-not-found errors

### Strengths
- **Full isolation via namespacing**: Models, controllers, views, routes all namespaced
- **Standard dependency resolution**: Bundler handles version constraints and conflicts
- **Battle-tested at scale**: Devise (authentication), Spree/Solidus (e-commerce), ActiveAdmin all prove the pattern works for complex features
- **Migration management**: Explicit copy-and-run model keeps host in control

### Weaknesses
- **Cross-engine model extension is fragile**: Decorator/monkey-patching pattern is a known pain point (Solidus has an open RFC to move away from it)
- **Namespace overhead**: Every reference needs full qualification
- **Migration coupling**: Copied migrations create permanent artifacts even after engine removal
- **No conditional mounting**: An engine is either fully included or not -- no partial feature inclusion

### Sources
- [Rails Engines Guide](https://guides.rubyonrails.org/engines.html)
- [Rails Engines Edge Guide](https://edgeguides.rubyonrails.org/engines.html)
- [Solidus Decorator RFC](https://github.com/solidusio/solidus/issues/3010)
- [Modular Rails Engines](https://devblast.com/b/modular-rails-engines)

---

## 4. Bullet Train (Ruby on Rails) -- Gem-Based SaaS Features

### How Features Are Defined

Bullet Train distributes functionality as a collection of `bullet_train-*` Ruby gems:

**Core gems** (always included):
- `bullet_train` -- base framework
- `bullet_train-super_scaffolding` -- code generation
- `bullet_train-api` -- API layer
- `bullet_train-themes` / `bullet_train-themes-light` -- UI theming

**Optional gems** (opt-in):
- `bullet_train-outgoing_webhooks`
- `bullet_train-incoming_webhooks`
- `bullet_train-integrations-stripe`
- `bullet_train-sortable`
- `bullet_train-obfuscates_id`

**Dependency gems** (pulled in automatically):
- `bullet_train-fields`, `bullet_train-has_uuid`, `bullet_train-roles`, `bullet_train-scope_validator`

### How Features Discover and Register Themselves

Features register through two mechanisms:

1. **Gem inclusion**: Adding a gem to `Gemfile` activates its Rails engine, which auto-registers models, controllers, views, etc.

2. **Environment variable toggles**: Runtime features are enabled by setting env vars. Each maps to a helper method:
   - `CLOUDINARY_URL` -> `cloudinary_enabled?`
   - `STRIPE_CLIENT_ID` -> Stripe integration active
   - `OPENAI_ACCESS_TOKEN` -> AI features active
   - `HIDE_THINGS` -> removes demo scaffolding

### Inter-Feature Dependencies

Standard Bundler/gemspec dependency resolution. Core gems declare dependencies on each other. Optional gems declare which core gems they require.

### Optional Relationships

Bullet Train's `bin/resolve` workflow is its unique contribution: it lets you "eject" any framework file into your local application for customization. You can override any view, controller, or model by copying it locally. The framework checks local files first, falling back to gem-provided files.

Super Scaffolding generates code with flags: `--sortable`, `--targets-with-many`, etc. These generate different code paths based on which optional features are present.

### Developer Experience for Adding/Removing

**Adding**: Add gem to `Gemfile`, `bundle install`, configure env var if needed. Super Scaffolding generates code that integrates with available features.

**Removing**: Remove gem, remove env var, find and remove any generated code that references the feature. Since Super Scaffolding generates code into your app (not the gem), you have to manually clean up generated references.

### What Breaks When You Remove a Feature

- Generated code referencing removed gem's classes fails
- Helper methods (`cloudinary_enabled?`) may still be called in views
- Generated views referencing removed partials break
- Less fragile than raw Rails engines because env var checks provide runtime guards

### Strengths
- **Code generation over runtime magic**: Super Scaffolding generates visible, editable code rather than hiding behavior in gems
- **Environment variable toggles**: Simple, runtime-checkable feature flags
- **`bin/resolve` ejection**: Clean override mechanism without forking
- **Explicit opt-in**: Optional gems moved from "included by default" to "opt-in" in recent versions

### Weaknesses
- **Generated code creates coupling**: Unlike runtime composition, generated code bakes in assumptions about available features
- **No automatic cleanup on feature removal**: Manual grep-and-delete required
- **Limited to Rails ecosystem**: Pattern is Rails-specific, not transferable
- **Upgrade complexity**: `bundle update` updates gems, but generated code may need manual updates

### Sources
- [Bullet Train Documentation](https://bullettrain.co/docs)
- [Bullet Train Application Options](https://bullettrain.co/docs/application-options)
- [Bullet Train Core (GitHub)](https://github.com/bullet-train-co/bullet_train-core)
- [Bullet Train Overriding Docs](https://bullettrain.co/docs/overriding)

---

## 5. Wagtail CMS -- StreamField Content Composition

### How Features Are Defined

Wagtail's StreamField uses a **block-based composition model** for page content. Blocks are Python classes that define their own:
- **Data structure** (what fields they contain)
- **Admin UI** (form rendering)
- **Frontend rendering** (template)
- **Validation** (via `clean()` method)
- **JavaScript behavior** (via telepath library mapping)

Block types compose hierarchically:
- **StructBlock**: Groups child blocks as a single unit (like a form with fields)
- **ListBlock**: Repeatable instances of one block type
- **StreamBlock**: Mixed, reorderable sequence of different block types (recursive composition)

```python
class BlogPage(Page):
    body = StreamField([
        ("heading", blocks.CharBlock(form_classname="title")),
        ("paragraph", blocks.RichTextBlock()),
        ("image", ImageChooserBlock()),
        ("person", blocks.StructBlock([
            ("first_name", blocks.CharBlock()),
            ("surname", blocks.CharBlock()),
            ("photo", ImageChooserBlock(required=False)),
        ])),
    ])
```

### How Features Discover and Register Themselves

Blocks are **not globally registered**. They are defined inline on each page model's StreamField, or as reusable Python classes that are imported where needed. There is no autodiscovery.

The `group` parameter clusters related blocks under menu headings in the editor UI. The `icon` parameter assigns visual identifiers.

### Inter-Feature Dependencies

Block dependencies are expressed through Python's import system. A StructBlock that uses an `ImageChooserBlock` depends on `wagtail.images` being in `INSTALLED_APPS`. This is a Django-level dependency, not a Wagtail-specific mechanism.

### Optional Relationships

Blocks handle optional content through:
- `required=False` on any block within a StructBlock
- StreamBlock naturally supports optional composition -- users simply don't add blocks they don't need
- Blocks can be added or removed from StreamField definitions without breaking existing content (the JSON storage is forward-compatible)

### Developer Experience for Adding/Removing

**Adding a new block type**: Define the block class, add it to the StreamField tuple list, create a template, run `makemigrations` and `migrate`. Existing pages are unaffected -- they just don't have the new block type in their content.

**Removing a block type**: Remove from StreamField definition, run `makemigrations` and `migrate`. Existing pages that used the removed block type retain the data in JSON but it won't render (and editing the page will strip it). **This is remarkably graceful** -- no data loss, no crashes.

### What Breaks When You Remove a Feature

- Almost nothing at the data level -- JSON storage means old block data persists harmlessly
- Templates for removed blocks are no longer invoked (they just don't render)
- If you remove a block class that other blocks reference (e.g., a StructBlock used inside a StreamBlock), you get import errors
- Custom validation in `clean()` that references removed blocks will fail

### Strengths
- **Graceful degradation**: Removing block types doesn't break existing content
- **Recursive composition**: StreamBlock inside StructBlock inside StreamBlock -- unlimited nesting
- **JSON storage**: Content is stored as structured data, not HTML, so it's queryable and transformable
- **Migration safety**: Block class definitions are deconstructed to plain instances in migrations, avoiding hard references to custom classes

### Weaknesses
- **Content-level composition only**: This pattern works for page content but doesn't address application-level feature composition (models, routes, permissions)
- **No block registry**: Blocks must be explicitly imported and listed -- no autodiscovery
- **QuerySet limitations**: You can't efficiently query "all pages containing block type X" without scanning JSON
- **Performance**: Deep nesting with many blocks can slow down the admin editor

### Sources
- [Wagtail StreamField Documentation](https://docs.wagtail.org/en/stable/topics/streamfield.html)
- [Wagtail Block Reference](https://docs.wagtail.org/en/stable/reference/streamfield/blocks.html)
- [StreamField Blocks API (GitHub Wiki)](https://github.com/wagtail/wagtail/wiki/StreamField-blocks-API)

---

## Cross-System Comparison Matrix

| Dimension | Frappe | Django | Rails Engines | Bullet Train | Wagtail StreamField |
|-----------|--------|--------|---------------|--------------|---------------------|
| **Feature unit** | DocType + hooks.py | App (Python package) | Engine (gem) | Gem + env var | Block (Python class) |
| **Registration** | hooks.py merge | INSTALLED_APPS + autodiscovery | Gemfile + mount | Gemfile + env var | Inline on model field |
| **Discovery** | `frappe.get_hooks()` collects from all apps | `autodiscover_modules()` | Rails autoloading | Bundler + Rails autoloading | Manual import |
| **Dependencies** | `required_apps` in hooks.py | Implicit (no formal system) | gemspec `add_dependency` | gemspec | Python imports |
| **Cross-feature extension** | Custom Fields + Property Setters | Signals + abstract models | Decorators / Concerns | `bin/resolve` ejection | N/A (content only) |
| **Removal safety** | Low -- Link fields break | Low -- ForeignKeys break | Low -- decorators break | Medium -- env var guards help | High -- JSON degrades gracefully |
| **Schema from definition** | Full (auto-migrate) | Partial (makemigrations) | Partial (copy migrations) | Generated code | N/A |
| **UI from definition** | Full (auto-generate) | None (manual views) | None (manual views) | Generated (scaffolding) | Full (block renders itself) |

---

## Key Patterns Extracted for Our System

### Pattern 1: Registry with Hook Merging (from Frappe)

**The idea**: Each feature declares its hooks/extensions in a single config file. The system merges all features' hooks at runtime, collecting lists of handlers.

**Applicable to us**: Each feature module could have a `feature.config.ts` that declares its Convex functions, UI components, schema extensions, and event handlers. A central registry merges these at build time.

**Caution**: Frappe's "last one wins" for overrides is dangerous. Prefer explicit priority or composition over override.

### Pattern 2: Convention-Based Autodiscovery (from Django)

**The idea**: The system looks for well-known file names (`models.py`, `admin.py`) in each feature directory and auto-imports them.

**Applicable to us**: A feature directory structure like `features/tasks/schema.ts`, `features/tasks/functions.ts`, `features/tasks/components/` where the build system auto-discovers and registers.

**Caution**: Implicit magic makes debugging harder. Consider explicit registration with convention as a convenience, not a requirement.

### Pattern 3: Namespace Isolation (from Rails Engines)

**The idea**: Each feature's models, routes, and views live in a namespace that prevents collision with other features or the host app.

**Applicable to us**: Each feature's Convex tables should be prefixed or namespaced. Feature-specific API functions should be in feature-scoped modules. This prevents naming collisions when features are independently developed.

**Caution**: Namespace overhead adds verbosity. Mitigate with re-exports and aliases.

### Pattern 4: Environment Variable Feature Flags (from Bullet Train)

**The idea**: Features are toggled by env vars, with helper functions that check availability throughout the codebase.

**Applicable to us**: A `featureConfig.ts` that reads from a config file and exports `isFeatureEnabled("subtasks")` checks. UI conditionally renders feature components. Schema conditionally includes feature tables.

**Caution**: Runtime feature checks scattered throughout code are hard to maintain. Better to resolve features at build/deploy time and tree-shake unused code.

### Pattern 5: Graceful Degradation via Structured Storage (from Wagtail)

**The idea**: Content stored as structured JSON can reference block types that no longer exist without crashing -- it just doesn't render.

**Applicable to us**: If feature data is stored in well-scoped tables, removing a feature means those tables are simply unused. No foreign key breakage if cross-feature references use IDs resolved at runtime rather than schema-level constraints.

**Caution**: Orphaned data accumulates. Need a cleanup strategy.

### Pattern 6: Cross-Feature Extension Without Modification (from Frappe Custom Fields)

**The idea**: Feature B can add fields/columns to Feature A's tables without modifying Feature A's code or schema definition.

**Applicable to us**: A feature could declare "I extend the Tasks table with a `project_id` field" in its config. The build system merges this into the Tasks schema. If the Projects feature is removed, the extension is also removed.

**This is the most important pattern for our use case.** It enables optional relationships (e.g., Tasks optionally belong to Projects) without hardcoding the relationship in the Tasks feature.

---

## Recommendations for Our System

### Build-Time Composition Over Runtime Composition

Every system studied except Bullet Train resolves features at runtime. For our use case (per-client deployments with known feature sets), **build-time composition is superior**:
- Dead code is eliminated, not just hidden behind `if` checks
- Schema is statically known, enabling type safety
- No runtime overhead from feature flag checks
- Convex schema validation happens at deploy time anyway

### Feature Config File as Single Source of Truth

Inspired by Frappe's hooks.py but adapted for TypeScript/Convex:

```typescript
// features/projects/feature.config.ts
export default {
  name: "projects",
  dependencies: ["tasks"],  // requires tasks feature
  schema: {
    tables: ["projects"],
    extensions: {
      tasks: { fields: ["projectId"] }  // extends tasks table
    }
  },
  navigation: [{ label: "Projects", path: "/projects", icon: "folder" }],
  convexFunctions: ["projects/queries", "projects/mutations"],
}
```

### Dependency Graph with Validation

Like Frappe's `required_apps` but with build-time validation:
- Parse all feature configs
- Build dependency graph
- Validate no missing dependencies for enabled features
- Validate no circular dependencies
- Generate merged schema, routes, navigation

### Explicit Over Implicit

Django's autodiscovery is elegant but hard to debug. Rails' decorator pattern is fragile. Prefer:
- Explicit feature registration in a central config
- Convention for file structure (aids developer experience)
- Build-time errors over runtime surprises

---

## Open Questions for Phase-Specific Research

1. **Schema extension mechanics in Convex**: Can we dynamically compose Convex schema definitions at build time? How do we handle optional foreign-key-like references between feature tables?

2. **UI composition**: How do we handle feature-specific UI that needs to appear inside another feature's views (e.g., "Project selector" dropdown inside the Task creation form)?

3. **Feature removal and data migration**: When a feature is removed from a deployment, what happens to existing data? Do we need cleanup migrations?

4. **Testing features in isolation**: How do we test a feature that depends on other features? Mock the dependencies? Include them?
