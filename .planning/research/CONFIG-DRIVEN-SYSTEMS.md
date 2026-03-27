# Config-Driven Systems: How App Builders Handle Feature Assembly

**Domain:** Config-driven application builders and feature composition
**Researched:** 2026-03-10
**Overall Confidence:** MEDIUM-HIGH (mix of official docs and verified web sources)

---

## Executive Summary

Config-driven systems fall into two distinct camps: **build-time generators** (JHipster, create-t3-app) that produce static output from config, and **runtime interpreters** (Frappe, Shopify, Strapi, Payload) that read config at startup to shape behavior. The most successful systems share three traits: (1) a single source of truth config file, (2) a declarative format that separates "what" from "how," and (3) a composition model that handles feature dependencies automatically.

For our task management assembler, the strongest patterns come from **Payload CMS** (TypeScript config with full type safety), **JHipster** (entity/relationship DSL driving code generation), and **create-t3-app** (modular installer registry with incompatibility guards). The weakest pattern to avoid is Frappe's "last writer wins" hook resolution, which creates unpredictable behavior when features conflict.

---

## 1. Frappe (bench/site/hooks.py)

### Config Format

Frappe uses **Python files** as config (not JSON/YAML). The primary config surface is `hooks.py` in each app:

```python
# hooks.py
app_name = "custom_app"
app_title = "Custom App"
required_apps = ["erpnext"]  # Dependency declaration

# Lifecycle hooks
before_install = "custom_app.setup.install.before_install"
after_install = "custom_app.setup.install.after_install"

# Document event hooks (runtime behavior)
doc_events = {
    "Sales Order": {
        "on_submit": "custom_app.overrides.sales_order.on_submit",
        "on_cancel": "custom_app.overrides.sales_order.on_cancel",
    }
}

# Asset injection
app_include_js = "/assets/custom_app/js/custom_app.js"
app_include_css = "/assets/custom_app/css/custom_app.css"

# Fixtures (seed data)
fixtures = [{"dt": "Custom Field", "filters": [["module", "=", "Custom App"]]}]
```

Supporting files: `modules.txt` (module list), `patches.txt` (migration list), `requirements.txt` (Python deps), `pyproject.toml` (version constraints).

### Config Drives: Runtime Behavior (primarily)

Frappe hooks are **runtime-interpreted**. When `frappe.get_hooks("doc_events")` is called, the framework collects values from ALL installed apps and merges them. This is not code generation -- it is runtime dispatch.

The composition model: Multiple apps can hook into the same event. Hooks are applied in app installation order. For override-type hooks, "last writer wins."

### Relationships Between Entities

Frappe uses **DocType** definitions (JSON files) for entity schema. Relationships are expressed as Link fields:

```json
{
  "fieldname": "customer",
  "fieldtype": "Link",
  "options": "Customer",
  "label": "Customer"
}
```

Inter-entity relationships are **field-level**, not schema-level. No explicit foreign key declarations -- the framework handles referential integrity.

### Feature Toggling

Features are toggled by **installing/uninstalling apps** on a site. There is no feature flag system -- an app is either present or absent. The `required_apps` hook in `hooks.py` declares hard dependencies:

```python
required_apps = ["frappe", "erpnext"]
```

The bench CLI resolves these transitively during `bench install-app`.

### DX Pipeline

```
bench new-site mysite.local → bench get-app custom_app → bench install-app custom_app
```

Each site has its own database and set of installed apps. Sites share the same bench (runtime environment) but have independent feature sets.

### Limitations and Pain Points

- **No version pinning per site** -- all sites on a bench share the same app versions
- **"Last writer wins"** creates unpredictable behavior when multiple apps override the same hook
- **No dry-run** -- you cannot preview what an app installation will change
- **Hook resolution order** is opaque and requires manual reordering via admin UI
- **Python-as-config** means no schema validation; typos in hook names fail silently

**Confidence:** MEDIUM (official docs + community sources)

**Sources:**
- [Frappe Apps Documentation](https://docs.frappe.io/framework/user/en/basics/apps)
- [Frappe Hooks API](https://docs.frappe.io/framework/v15/user/en/python-api/hooks)
- [Frappe Forum: required_apps](https://discuss.frappe.io/t/how-do-i-make-my-own-app-required-elsewhere/126823)

---

## 2. JHipster (JDL + .yo-rc.json)

### Config Format

JHipster uses TWO config layers:

**Layer 1: JDL (JHipster Domain Language)** -- a custom DSL for entities, relationships, and app options:

```jdl
application {
  config {
    baseName myapp
    applicationType monolith
    authenticationType oauth2
    databaseType sql
    clientFramework react
    buildTool gradle
    cacheProvider redis
    enableSwaggerCodegen true
    enableTranslation true
  }
  entities *
}

entity Employee {
  firstName String required
  lastName String required
  email String required
  phoneNumber String
  hireDate Instant
  salary Long
}

entity Department {
  name String required
}

relationship ManyToOne {
  Employee{department(name)} to Department
}

dto * with mapstruct
service * with serviceImpl
paginate Employee with pagination
```

**Layer 2: .yo-rc.json** -- the persisted generator state (Yeoman convention):

```json
{
  "generator-jhipster": {
    "applicationType": "monolith",
    "authenticationType": "jwt",
    "baseName": "jhipster",
    "buildTool": "maven",
    "cacheProvider": "ehcache",
    "clientFramework": "angular",
    "clientPackageManager": "npm",
    "databaseType": "sql",
    "devDatabaseType": "h2Disk",
    "prodDatabaseType": "postgresql",
    "enableHibernateCache": true,
    "enableSwaggerCodegen": false,
    "enableTranslation": true,
    "jhipsterVersion": "8.x.x",
    "languages": ["en", "fr"],
    "serverPort": "8080",
    "serviceDiscoveryType": false,
    "skipClient": false,
    "skipServer": false,
    "testFrameworks": ["cypress"]
  }
}
```

### Config Drives: Code Generation (entirely)

JHipster is a pure code generator. The JDL/config is parsed once to produce a complete Spring Boot + frontend project. Re-running the generator after config changes regenerates files (with merge conflict resolution).

### Relationships Between Entities

JDL has first-class relationship syntax:

```jdl
relationship OneToMany {
  Department{employee} to Employee{department(name)}
}
relationship ManyToMany {
  Job{task(title)} to Task{job}
}
```

Relationships support: `OneToOne`, `OneToMany`, `ManyToOne`, `ManyToMany`. The `(fieldName)` syntax specifies which field to display for the relationship in UI.

### Feature Toggling

Features are toggled via config options in the JDL `application` block or `.yo-rc.json`:

| Feature | Config Key | Values |
|---------|-----------|--------|
| Auth system | `authenticationType` | jwt, session, oauth2 |
| Frontend | `clientFramework` | angular, react, vue, svelte, no |
| Database | `databaseType` | sql, mongodb, cassandra, couchbase, no |
| Cache | `cacheProvider` | ehcache, redis, memcached, caffeine, no |
| Search | `searchEngine` | elasticsearch, couchbase, no |
| Messaging | `messageBroker` | kafka, pulsar, no |
| Service discovery | `serviceDiscoveryType` | eureka, consul, no |

The generator uses these flags to conditionally include templates, dependencies, and configuration files.

### DX Pipeline

```
jhipster jdl my-app.jdl → generates full project → mvn spring-boot:run
```

Or interactively: `jhipster` prompts for every option, stores in `.yo-rc.json`, generates.

### Limitations and Pain Points

- **Regeneration conflicts** -- modifying generated code then re-generating creates merge hell
- **Monolithic config** -- `.yo-rc.json` captures everything; no partial regeneration
- **JDL learning curve** -- custom DSL means another language to learn
- **Opinionated stack** -- hard to deviate from JHipster's blessed path (Spring Boot + specific frontends)
- **Entity-centric** -- great for CRUD, awkward for complex business logic that does not map to entities

**Confidence:** HIGH (official JHipster documentation)

**Sources:**
- [JHipster JDL Intro](https://www.jhipster.tech/jdl/intro/)
- [JHipster JDL Applications](https://www.jhipster.tech/jdl/applications/)
- [JHipster Sample .yo-rc.json](https://github.com/jhipster/jhipster-sample-app/blob/main/.yo-rc.json)
- [Creating a JHipster Application](https://www.jhipster.tech/creating-an-app/)

---

## 3. create-t3-app / create-next-app

### Config Format

create-t3-app uses **no persistent config file**. Instead, it captures choices through an interactive CLI and stores them as an in-memory `CliResults` object:

```typescript
interface CliResults {
  appName: string;
  packages: AvailablePackages[];  // ["nextAuth", "prisma", "tailwind", "trpc"]
  flags: {
    noGit: boolean;
    noInstall: boolean;
    default: boolean;
    CI: boolean;
    tailwind: boolean;
    trpc: boolean;
    prisma: boolean;
    drizzle: boolean;
    nextAuth: boolean;
    // ...
  };
  databaseProvider: "sqlite" | "mysql" | "postgres" | "planetscale";
}
```

For CI/non-interactive mode, flags replace prompts:

```bash
create-t3-app --CI --trpc --prisma --tailwind --appRouter --dbProvider postgres
```

### Config Drives: Code Generation (one-shot scaffolding)

The installer system uses a **modular registry pattern**:

```typescript
// Each package has an installer
const pkgInstallerMap: PkgInstallerMap = {
  nextAuth: { inUse: boolean, installer: nextAuthInstaller },
  prisma:   { inUse: boolean, installer: prismaInstaller },
  tailwind: { inUse: boolean, installer: tailwindInstaller },
  trpc:     { inUse: boolean, installer: trpcInstaller },
};
```

Each installer does three things:
1. `addPackageDependency()` -- updates package.json
2. `fs.copySync()` -- copies template files from `extras/` directory
3. `addPackageScript()` -- registers npm scripts

The template structure is **base + conditional extras**:
- `cli/template/base/` -- minimal Next.js app (always copied)
- `cli/template/extras/` -- per-package files (conditionally copied)

### Relationships Between Entities

Not applicable. create-t3-app does not model entities or relationships. It only composes infrastructure/tooling.

### Feature Toggling

Binary flags per package. **Incompatibility guards** prevent invalid combinations:
- Prisma + Drizzle = exit with error
- ESLint + Biome = exit with error

No dependency chains -- each package is independent (though some installers check for the presence of others to adjust their output).

### DX Pipeline

```
npx create-t3-app@latest → answer prompts → project generated → cd project && npm run dev
```

One-shot generation. No re-generation capability. Once scaffolded, the project is yours to modify freely. This is a **scaffolder, not a framework**.

### Limitations and Pain Points

- **No re-generation** -- cannot add tRPC to an existing project via the CLI
- **No entity modeling** -- only infrastructure, no business domain
- **Limited feature set** -- only ~6 optional packages; adding more requires forking
- **Version coupling** -- dependency versions are hardcoded in `dependencyVersionMap.ts`
- **No config persistence** -- cannot reproduce the exact same scaffold later (unless you save the CLI command)

**Confidence:** HIGH (official docs + DeepWiki analysis of source code)

**Sources:**
- [create-t3-app Overview (DeepWiki)](https://deepwiki.com/t3-oss/create-t3-app/1-overview)
- [CLI Usage and Options (DeepWiki)](https://deepwiki.com/t3-oss/create-t3-app/2.2-cli-usage-and-options)
- [create-t3-app GitHub](https://github.com/t3-oss/create-t3-app)
- [create-t3-app FAQ](https://create.t3.gg/en/faq)

---

## 4. Shopify Themes (Liquid Sections + settings_schema.json)

### Config Format

Shopify uses **two config layers**:

**Layer 1: settings_schema.json** -- global theme settings:

```json
[
  {
    "name": "Colors",
    "settings": [
      {
        "type": "color",
        "id": "color_background",
        "label": "Background color",
        "default": "#ffffff"
      },
      {
        "type": "select",
        "id": "font_family",
        "label": "Font family",
        "options": [
          { "value": "system", "label": "System" },
          { "value": "serif", "label": "Serif" }
        ],
        "default": "system"
      }
    ]
  }
]
```

**Layer 2: Section schemas** -- per-section config embedded in Liquid files:

```liquid
{% schema %}
{
  "name": "Featured collection",
  "settings": [
    {
      "type": "collection",
      "id": "collection",
      "label": "Collection"
    },
    {
      "type": "range",
      "id": "products_to_show",
      "min": 2,
      "max": 12,
      "step": 2,
      "default": 4,
      "label": "Products to show"
    }
  ],
  "blocks": [
    {
      "type": "product_card",
      "name": "Product Card",
      "settings": [
        {
          "type": "checkbox",
          "id": "show_price",
          "label": "Show price",
          "default": true
        }
      ]
    }
  ],
  "presets": [
    {
      "name": "Featured collection",
      "blocks": [
        { "type": "product_card" },
        { "type": "product_card" }
      ]
    }
  ],
  "limit": 1,
  "enabled_on": {
    "templates": ["index"]
  }
}
{% endschema %}
```

Merchant selections are persisted in `settings_data.json` (auto-generated, not hand-edited).

### Config Drives: Runtime Behavior (interpreted by Liquid engine)

Settings are **runtime-interpreted** by the Liquid template engine. The theme editor reads schemas to build the UI; merchants make selections; selections are stored in `settings_data.json`; Liquid templates read values at render time.

### Relationships Between Entities

No entity relationships. Shopify themes configure **presentation**, not data models. Resource pickers (`collection`, `product`, `blog`) reference Shopify's internal data model, but the theme does not define relationships between those resources.

### Feature Toggling

- **Section-level:** `enabled_on` / `disabled_on` restricts sections to specific page templates
- **Block-level:** `max_blocks` limits repetition; `limit` on sections prevents duplicates
- **App blocks:** `{ "type": "@app" }` enables third-party app injection points
- **Presets:** Define default states; sections without presets are not addable from the editor

Features are not toggled on/off in a binary sense. Instead, sections are added/removed from page templates by merchants via the theme editor.

### DX Pipeline

```
Theme development → Define schemas → Preview in editor → Merchant customizes → Deployed
```

Developers define the schema; merchants configure values through the visual editor. The schema is both the config format and the UI definition.

### Limitations and Pain Points

- **50-block limit per section** -- cannot model unlimited repeating structures
- **No cross-section communication** -- sections are isolated; cannot reference each other's settings
- **Schema is presentation-only** -- no business logic, validation, or computed fields
- **Liquid limitations** -- no complex conditionals, no async, limited data manipulation
- **No version control for merchant settings** -- `settings_data.json` changes are hard to track

**Confidence:** HIGH (official Shopify developer documentation)

**Sources:**
- [settings_schema.json Reference](https://shopify.dev/docs/storefronts/themes/architecture/config/settings-schema-json)
- [Section Schema Reference](https://shopify.dev/docs/storefronts/themes/architecture/sections/section-schema)
- [Block Schema Reference](https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/schema)
- [Shopify Settings Schema Guide (FirstPier)](https://www.firstpier.com/resources/shopify-settings-schema)

---

## 5. Strapi / Payload CMS

### Strapi Config Format

Strapi uses **JSON schema files** per content type:

```
src/api/
  article/
    content-types/
      article/
        schema.json
    controllers/
    routes/
    services/
```

```json
{
  "kind": "collectionType",
  "collectionName": "articles",
  "info": {
    "singularName": "article",
    "pluralName": "articles",
    "displayName": "Article"
  },
  "options": {
    "draftAndPublish": true
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "content": {
      "type": "richtext"
    },
    "author": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::author.author",
      "inversedBy": "articles"
    },
    "tags": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "api::tag.tag",
      "inversedBy": "articles"
    },
    "slug": {
      "type": "uid",
      "targetField": "title"
    }
  }
}
```

Plugin config in `config/plugins.ts`:

```typescript
export default {
  'users-permissions': {
    config: {
      jwt: { expiresIn: '7d' },
    },
  },
  upload: {
    config: {
      provider: 'aws-s3',
      providerOptions: { /* ... */ },
    },
  },
};
```

### Payload CMS Config Format

Payload uses **TypeScript config** with full type safety -- this is the gold standard for DX:

```typescript
import { buildConfig } from 'payload/config';
import { mongooseAdapter } from '@payloadcms/db-mongodb';
import { slateEditor } from '@payloadcms/richtext-slate';

export default buildConfig({
  collections: [
    {
      slug: 'posts',
      admin: {
        useAsTitle: 'title',
      },
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richText' },
        {
          name: 'author',
          type: 'relationship',
          relationTo: 'users',
          hasMany: false,
        },
        {
          name: 'tags',
          type: 'relationship',
          relationTo: 'tags',
          hasMany: true,
        },
        {
          name: 'category',
          type: 'relationship',
          relationTo: ['news', 'blog', 'tutorial'],  // Polymorphic
          hasMany: false,
        },
      ],
      hooks: {
        beforeChange: [validateSlug],
        afterRead: [populateRelated],
      },
    },
  ],
  globals: [
    {
      slug: 'site-settings',
      fields: [
        { name: 'siteName', type: 'text' },
        { name: 'logo', type: 'upload', relationTo: 'media' },
      ],
    },
  ],
  plugins: [
    seoPlugin({ collections: ['posts'] }),
    formBuilderPlugin({ fields: { text: true, email: true } }),
  ],
  db: mongooseAdapter({ url: process.env.DATABASE_URI }),
  editor: slateEditor({}),
});
```

### Config Drives: Runtime + Code Generation (hybrid)

- **Strapi:** Runtime-interpreted. The server reads schema.json files at startup and builds API routes, admin UI, and database tables automatically. Changes to schema.json require a server restart.
- **Payload:** Runtime-interpreted with TypeScript compilation. Config is compiled once, then interpreted at runtime. Payload auto-generates REST API, GraphQL API, admin UI, and TypeScript types from the config.

### Relationships Between Entities

Both systems have first-class relationship support:

| Feature | Strapi | Payload |
|---------|--------|---------|
| One-to-One | `relation: "oneToOne"` | `type: "relationship", hasMany: false` |
| One-to-Many | `relation: "oneToMany"` | `type: "relationship", hasMany: true` |
| Many-to-Many | `relation: "manyToMany"` | `type: "relationship", hasMany: true` (both sides) |
| Polymorphic | Not native | `relationTo: ['collA', 'collB']` |
| Bidirectional | `inversedBy` / `mappedBy` | `type: "join"` field |

### Plugin/Feature Toggling

**Strapi:** Plugins are npm packages enabled in `config/plugins.ts`. Each plugin can contribute content types, routes, controllers, and admin panel extensions. Feature toggling is binary (plugin installed or not), with per-plugin config for fine-tuning.

**Payload:** Plugins are functions that receive the existing config and return a modified config:

```typescript
// A Payload plugin is a config transformer
type Plugin = (config: Config) => Config;

// Plugin implementation
const seoPlugin = (options) => (incomingConfig) => {
  const config = { ...incomingConfig };
  // Add SEO fields to specified collections
  config.collections = config.collections.map(collection => {
    if (options.collections.includes(collection.slug)) {
      collection.fields.push(
        { name: 'metaTitle', type: 'text' },
        { name: 'metaDescription', type: 'textarea' },
      );
    }
    return collection;
  });
  return config;
};
```

This is a **config-as-data pipeline** -- plugins compose by transforming the config object sequentially.

### DX Pipeline

**Strapi:**
```
npx create-strapi-app → use Content-Type Builder UI or edit schema.json → restart → API available
```

**Payload:**
```
edit payload.config.ts → TypeScript catches errors immediately → restart → API + admin UI available
```

### Limitations and Pain Points

**Strapi:**
- JSON schema lacks type safety -- errors surface at runtime
- Content-Type Builder UI and schema.json files can get out of sync
- Plugin API is underdocumented; extending core behavior requires deep knowledge
- No computed fields or virtual attributes in schema

**Payload:**
- TypeScript config = steeper learning curve for non-TS developers
- Plugin composition order matters (last plugin's modifications win)
- Large configs become unwieldy in a single file (need manual splitting)
- No visual config builder -- code-only

**Confidence:** HIGH (official documentation for both)

**Sources:**
- [Strapi 5 Models Documentation](https://docs.strapi.io/cms/backend-customization/models)
- [Strapi 5 Plugin Configuration](https://docs.strapi.io/cms/configurations/plugins)
- [Payload Config Overview](https://payloadcms.com/docs/configuration/overview)
- [Payload Collections](https://payloadcms.com/docs/configuration/collections)
- [Payload Plugins](https://payloadcms.com/docs/plugins/overview)
- [Building a Payload Plugin](https://payloadcms.com/docs/plugins/build-your-own)

---

## 6. Firebase Extensions

### Config Format

Firebase Extensions use **YAML** (`extension.yaml`) as the manifest:

```yaml
name: resize-images
version: 0.2.2
specVersion: v1beta
license: Apache-2.0
billingRequired: true

displayName: Resize Images
description: Resizes images uploaded to Cloud Storage

roles:
  - role: storage.admin
    reason: Needs to read/write images in Cloud Storage

resources:
  - name: generateResizedImage
    type: firebaseextensions.v1beta.function
    description: Listens for new images and resizes them
    properties:
      runtime: nodejs20
      availableMemoryMb: ${param:IMG_MEMORY}
      eventTrigger:
        eventType: google.storage.object.finalize
        resource: projects/_/buckets/${param:IMG_BUCKET}

params:
  - param: IMG_BUCKET
    label: Cloud Storage bucket
    description: Which bucket should the extension watch?
    type: selectResource
    resourceType: storage.googleapis.com/Bucket
    default: ${STORAGE_BUCKET}
    required: true

  - param: IMG_SIZES
    label: Sizes of resized images
    description: Comma-separated list of sizes (e.g., "200x200,400x400")
    type: string
    default: "200x200"
    required: true

  - param: IMG_MEMORY
    label: Memory allocation
    type: select
    options:
      - label: 512 MB
        value: 512
      - label: 1 GB
        value: 1024
    default: 512

lifecycleEvents:
  onInstall:
    function: backfillExistingImages
    processingMessage: Resizing existing images...
  onUpdate:
    function: handleConfigChange
    processingMessage: Applying new configuration...
  onConfigure:
    function: handleConfigChange
    processingMessage: Updating settings...
```

### Supabase Config Format

Supabase uses **TOML** (`supabase/config.toml`) for project configuration:

```toml
[project]
id = "your-project-id"

[db]
port = 54322
major_version = 15

[db.settings]
# Extensions are enabled via SQL migrations, not config
# But the search path includes extensions:
extra_search_path = ["public", "extensions"]

[auth]
enabled = true
site_url = "http://localhost:3000"

[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_CLIENT_SECRET)"

[storage]
enabled = true
file_size_limit = "50MiB"

[realtime]
enabled = true
```

Supabase extensions are **PostgreSQL extensions** enabled via SQL:
```sql
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
```

### Config Drives: Runtime Behavior (both)

- **Firebase Extensions:** YAML declares Cloud Functions that deploy as event-triggered infrastructure. Parameters are resolved at install-time and injected as environment variables. The extension is a self-contained unit of infrastructure.
- **Supabase:** TOML configures the local development environment. Extensions are database-level features enabled via SQL migrations. The config.toml is not a feature composition mechanism -- it is infrastructure config.

### Relationships Between Entities

Neither system defines entity relationships in config. Firebase Extensions operate on events (storage uploads, auth changes, Firestore writes), not entity models. Supabase delegates relationships to PostgreSQL's native foreign key system.

### Feature Toggling

**Firebase Extensions:**
- Install/uninstall per extension (`firebase ext:install`)
- Parameters customized at install time
- Lifecycle events (onInstall, onUpdate, onConfigure) handle state transitions
- Extensions are isolated -- they cannot depend on other extensions

**Supabase:**
- Features toggled via `enabled = true/false` in config.toml sections
- Auth providers toggled individually under `[auth.external.*]`
- Database extensions enabled/disabled via SQL migrations
- Environment variables referenced with `env()` function

### DX Pipeline

**Firebase:**
```
firebase ext:install publisher/extension-name → configure params → deployed to project
```

**Supabase:**
```
supabase init → edit config.toml → supabase start → supabase db reset (to apply changes)
```

### Limitations and Pain Points

**Firebase Extensions:**
- Extensions are **isolated islands** -- no inter-extension communication or dependencies
- YAML config is verbose and error-prone (no schema validation in editors)
- Parameter types are limited (string, secret, select, selectResource)
- No conditional resources -- cannot say "if param X, deploy function Y"
- Billing implications are opaque until deployment

**Supabase:**
- config.toml is **infrastructure config, not feature config** -- does not model business features
- Extensions are PostgreSQL-level, not application-level
- No extension marketplace or composition system comparable to Firebase
- Changes to config.toml require full restart (`supabase stop && supabase start`)

**Confidence:** MEDIUM-HIGH (official docs for Firebase; official docs + GitHub for Supabase)

**Sources:**
- [Firebase extension.yaml Reference](https://firebase.google.com/docs/extensions/reference/extension-yaml)
- [Firebase Extension Parameters](https://firebase.google.com/docs/extensions/publishers/parameters)
- [Firebase Lifecycle Events](https://firebase.google.com/docs/extensions/publishers/lifecycle-events)
- [Supabase CLI Config](https://supabase.com/docs/guides/local-development/cli/config)
- [Supabase Managing Config](https://supabase.com/docs/guides/local-development/managing-config)

---

## Cross-System Comparison

### Config Format Comparison

| System | Format | Type Safety | Validation | Readability |
|--------|--------|-------------|------------|-------------|
| Frappe | Python (hooks.py) | None | Runtime only | Good (Python) |
| JHipster | Custom DSL (JDL) + JSON (.yo-rc.json) | None | CLI parser | Good (DSL), Low (JSON) |
| create-t3-app | In-memory TypeScript object | Full | Compile-time | N/A (transient) |
| Shopify | JSON (schema tags + settings_schema.json) | None | Editor validation | Good |
| Strapi | JSON (schema.json) | None | Runtime | Good |
| Payload | TypeScript (payload.config.ts) | Full | Compile-time | Excellent |
| Firebase | YAML (extension.yaml) | None | CLI validation | Good |
| Supabase | TOML (config.toml) | None | CLI validation | Good |

### Generation vs Runtime

| System | Model | Re-generatable? | Incremental? |
|--------|-------|-----------------|--------------|
| Frappe | Runtime | N/A | Yes (add/remove apps) |
| JHipster | Code generation | Yes (with conflicts) | No (full regen) |
| create-t3-app | Code generation (one-shot) | No | No |
| Shopify | Runtime | N/A | Yes (add/remove sections) |
| Strapi | Runtime | N/A | Yes (edit schemas) |
| Payload | Runtime (compiled) | N/A | Yes (edit config) |
| Firebase | Infrastructure deployment | Yes | Yes (per extension) |
| Supabase | Infrastructure config | Yes | Yes (per feature) |

### Feature Composition Models

| System | Composition Pattern | Dependency Handling |
|--------|-------------------|-------------------|
| Frappe | Hook cascading (runtime merge) | `required_apps` in hooks.py |
| JHipster | Template conditional inclusion | Implicit (generator knows) |
| create-t3-app | Installer registry with inUse flags | Incompatibility guards |
| Shopify | Section/block nesting | None (sections are isolated) |
| Strapi | Plugin registration + schema files | npm dependencies |
| Payload | Config transformer pipeline | Plugin ordering |
| Firebase | Isolated extensions | None (extensions are islands) |
| Supabase | PostgreSQL extension system | PostgreSQL handles it |

---

## Patterns Most Relevant to Our Assembler

### 1. Payload's Config-as-TypeScript (ADOPT)

**Why:** TypeScript config gives us compile-time validation, IDE autocomplete, and the ability to express complex relationships. Our wizard captures choices; the output should be a typed config that the assembler reads.

**Pattern:**
```typescript
// Our equivalent of buildConfig
export const projectConfig = defineProject({
  features: {
    auth: { provider: 'clerk', roles: ['admin', 'member'] },
    database: { provider: 'convex' },
    payments: { provider: 'stripe', plans: ['free', 'pro'] },
  },
  entities: [
    {
      name: 'Task',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'assignee', type: 'relationship', relationTo: 'User' },
      ],
    },
  ],
});
```

### 2. create-t3-app's Installer Registry (ADOPT)

**Why:** Each feature should have a self-contained installer that knows how to add its files, dependencies, and configuration. The assembler iterates installers where `inUse === true`.

**Pattern:**
```typescript
const featureInstallers: Record<Feature, FeatureInstaller> = {
  auth:     { inUse: config.features.auth !== false,     installer: authInstaller },
  payments: { inUse: config.features.payments !== false,  installer: paymentsInstaller },
  email:    { inUse: config.features.email !== false,     installer: emailInstaller },
};
```

### 3. JHipster's Entity DSL (ADAPT)

**Why:** JDL's relationship syntax is clean and expressive. We do not need a custom DSL (TypeScript config is better), but the relationship modeling patterns are worth adopting.

**Key ideas:**
- Relationships declared at the schema level, not embedded in fields
- Display field specification (`Employee{department(name)}`)
- Bulk options (`dto * with mapstruct`, `paginate Employee with pagination`)

### 4. Shopify's Schema-as-UI-Definition (ADAPT)

**Why:** Our wizard needs to know what settings each feature exposes. Shopify's pattern of embedding UI schema alongside component schema is worth adopting -- each feature installer could declare its configurable settings.

**Pattern:**
```typescript
const authInstaller: FeatureInstaller = {
  settings: [
    { type: 'select', id: 'provider', label: 'Auth Provider', options: ['clerk', 'auth0'] },
    { type: 'checkbox', id: 'socialLogin', label: 'Enable social login', default: true },
  ],
  install: (opts) => { /* ... */ },
};
```

### 5. Firebase's Parameter System (ADAPT for wizard)

**Why:** Firebase's typed parameters with labels, descriptions, defaults, and validation provide a good model for wizard step definitions.

### 6. Frappe's Hook Cascading (AVOID)

**Why:** "Last writer wins" creates unpredictable behavior. Our assembler should use explicit composition (Payload's pipeline approach) rather than implicit merging.

---

## Key Takeaways for Our System

1. **Use TypeScript as the config format** -- not JSON, not YAML, not a custom DSL. TypeScript gives type safety, IDE support, and the ability to compute derived values.

2. **Separate config capture from config consumption** -- the wizard produces a config file; the assembler reads it. These are distinct phases (like JHipster's JDL parse + code generation).

3. **Feature installers should be self-contained units** -- each knows its dependencies, files, and settings (like create-t3-app's installer pattern).

4. **Model relationships explicitly** -- use Payload/Strapi-style relationship fields with `relationTo`, `hasMany`, and bidirectional references rather than implicit foreign keys.

5. **Include incompatibility guards** -- create-t3-app's approach of blocking invalid combinations (Prisma + Drizzle) is better than silently generating broken code.

6. **Config should declare its own UI** -- each feature's configurable settings should be part of the feature definition (Shopify's schema pattern), so the wizard can be generated from the feature registry.

7. **One-shot generation is fine** -- create-t3-app proves that "scaffolder, not framework" is a viable and popular model. Do not over-invest in re-generation; focus on getting the initial output right.
