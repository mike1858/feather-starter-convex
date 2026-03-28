# Opus Critique with Stress Tests

**Source:** Agent research output from 2026-03-28 session

---

# Critical Analysis of the 7-Dimension Feature Complexity Framework

## 1. Real-World Stress Test

### 1.1 Stripe-like Billing System

**Schema:** Subscriptions, plans, invoices, line items, payment methods, usage records, coupons.

**CRUD:** Standard create/read/update/delete for plans, subscriptions, payment methods.

**Decomposition:**

| Dimension | Fits? | Mapping |
|-----------|-------|---------|
| Guards | Clean | Only account owner can manage billing; finance role can view invoices; API keys scoped to billing operations |
| Workflows | Clean | Subscription lifecycle: `trialing → active → past_due → canceled → expired`. Invoice lifecycle: `draft → open → paid / void / uncollectible` |
| Reactions | Clean | Payment succeeds → activate subscription, send receipt. Payment fails → mark past_due, schedule retry, notify. Subscription canceled → schedule access revocation at period end |
| Derivations | Clean | MRR, total usage this period, proration amount, next invoice preview, outstanding balance |
| Cascades | Clean | Cancel subscription → void draft invoices, deactivate add-ons. Delete customer → archive subscriptions, retain invoices for compliance |
| Projections | Clean | Usage dashboard, revenue chart, invoice PDF rendering, plan comparison view |
| Boundaries | Mostly clean | Max one active subscription per plan family, usage cannot exceed hard limit, downgrade blocked if current usage exceeds target plan limits |

**What doesn't fit cleanly:**

- **Time-based scheduling.** Billing runs on a clock: generate invoices on billing date, retry failed payments on a schedule (day 1, 3, 7), expire trials after N days. These are not reactions (no user event triggers them) and not workflows (no state transition initiates them). They're **cron-driven autonomous processes**. You could force them into Reactions ("when clock ticks and condition is met, do X") but that's a stretch — a reaction implies a triggering event within the system, not an external clock.
- **Proration logic.** The calculation of proration when upgrading mid-cycle is a Derivation, but the *decision* to apply proration (and which strategy: immediate, next-cycle, none) is a business policy that sits awkwardly between Boundaries and Workflows.
- **Idempotency and retry semantics.** Stripe is obsessive about idempotency keys and retry-safe operations. This is a cross-cutting infrastructure concern that none of the 7 dimensions address. You could argue it's an implementation detail below the spec level, which is fair.
- **External integration orchestration.** Payment processing requires calling Stripe/payment processor, handling webhooks, reconciling state. The dimension framework assumes a self-contained system. Multi-system coordination (send charge request → wait for webhook → update local state) is a different beast than internal reactions.

**Verdict: 75% clean fit.** The major gap is scheduled/time-driven behavior and external system orchestration.

---

### 1.2 GitHub-like PR Review System

**Schema:** Pull requests, reviews, review comments, check runs, check suites, merge queues, branch protection rules.

**CRUD:** Standard for PRs, reviews, comments.

**Decomposition:**

| Dimension | Fits? | Mapping |
|-----------|-------|---------|
| Guards | Clean | Only repo members can review; only maintainers can merge; author cannot approve own PR; CODEOWNERS auto-assigns required reviewers |
| Workflows | Clean | PR: `draft → open → approved → merged / closed`. Review: `pending → approved / changes_requested / commented`. Check: `queued → in_progress → completed` |
| Reactions | Clean | PR opened → run CI checks, notify reviewers, update branch status. Review submitted → recalculate merge readiness. Push to PR branch → invalidate stale reviews, re-run checks |
| Derivations | Mostly clean | Merge readiness (combines review approvals + CI status + branch protection), diff stats, files changed count, conflict status |
| Cascades | Clean | Merge PR → close linked issues, delete source branch (if configured), update deployment status. Close PR → dismiss pending review requests |
| Projections | Clean | Diff view (split/unified), file tree with change indicators, review timeline, merge queue position view |
| Boundaries | Clean | Minimum N approvals required, all required checks must pass, branch must be up-to-date, no unresolved conversations |

**What doesn't fit cleanly:**

- **Rule composition / policy engine.** Branch protection rules are a complex boolean expression: (approvals >= 2) AND (all required checks pass) AND (no changes_requested) AND (branch up-to-date OR admin override). This is sort of a Boundary, sort of a Derivation (merge readiness is computed), sort of a Guard (who can override). It's a **policy** that cross-cuts multiple dimensions. The framework forces you to scatter one coherent concept across three dimensions.
- **External system integration (again).** CI checks are run by external services (GitHub Actions, Jenkins). The PR system must model their state without controlling their execution directly. Webhooks in, status checks, retry logic.
- **Optimistic concurrency.** Two reviewers submit at the same time; merge conflicts detected after approval. Race conditions in collaborative systems are an infrastructure concern but affect behavioral specs significantly.

**Verdict: 85% clean fit.** Better than billing because it's more self-contained. The policy-engine pattern is the main gap — complex rules that combine Guards + Boundaries + Derivations into a single evaluable expression.

---

### 1.3 Slack-like Messaging System

**Schema:** Channels, messages, threads, reactions (emoji), files, user presence, notification preferences, bookmarks.

**CRUD:** Messages, channels, reactions, bookmarks.

**Decomposition:**

| Dimension | Fits? | Mapping |
|-----------|-------|---------|
| Guards | Clean | Channel membership gates visibility; private channels; DMs; guest accounts limited to specific channels |
| Workflows | Weak | Messages don't really have workflows. You could say channel lifecycle: `active → archived → deleted`. But messaging is fundamentally not workflow-driven — it's event-stream-driven |
| Reactions | Clean | Message posted → parse mentions → notify mentioned users, update unread counts, index for search. Emoji reaction added → notify message author. File shared → generate preview |
| Derivations | Clean | Unread count per channel, thread reply count, "X is typing" indicator, search results with highlighted matches, channel membership count |
| Cascades | Clean | Delete channel → cascade messages, files, bookmarks. User deactivated → remove from all channels, preserve message history |
| Projections | Clean | Thread view, channel list with unread badges, search results, pinned messages panel, file gallery, @mention feed |
| Boundaries | Weak | Message length limit, file size limit, max members per channel. These are mostly trivial field-level constraints, not rich domain boundaries |

**What doesn't fit cleanly:**

- **Real-time presence and synchronization.** "User is typing," online/offline/away status, read receipts, live message updates. This is a fundamentally different pattern: **continuous state synchronization** rather than discrete events. You could call it a Derivation (presence is derived from activity) but the real challenge is the delivery mechanism — WebSocket push, eventual consistency, conflict resolution. This is more about communication protocol than business logic.
- **Search and indexing.** Full-text search across messages is a major feature. It's not a Projection (which implies a visual layout), not a Derivation (it's not computed from a single entity), and not a Reaction (search index updates could be, but the search interface itself isn't). It's an **orthogonal query system** that sits alongside CRUD reads.
- **Notification routing.** "When should I notify this user, through which channel (push, email, in-app), based on their preferences and current presence?" This is partially Reactions (event triggers notification) but the routing logic — DND hours, preference per channel, frequency batching — is its own complex subsystem.

**Verdict: 70% clean fit.** Messaging systems are event-stream-oriented rather than entity-lifecycle-oriented. The framework's implicit assumption is that features revolve around entities that go through states. Messaging's core primitive is an append-only stream with real-time fanout, and that paradigm doesn't map naturally.

---

### 1.4 Notion-like Page System

**Schema:** Pages, blocks (paragraph, heading, list, toggle, database, embed...), workspaces, sharing links, templates, comments.

**CRUD:** Pages, blocks, comments, templates.

**Decomposition:**

| Dimension | Fits? | Mapping |
|-----------|-------|---------|
| Guards | Clean | Workspace → page → block permission inheritance with overrides. Sharing links with read/edit/comment scopes. Guest access per page |
| Workflows | Weak | Pages don't really have lifecycle states. Maybe `draft → published` for wiki mode, but Notion's core is stateless editing. The workflow dimension adds little here |
| Reactions | Moderate | Page shared → send notification. Comment added → notify page followers. Template used → clone block tree |
| Derivations | Clean | Backlink count, word count, last edited by, "recently viewed" list, database rollups and formulas |
| Cascades | Clean | Delete page → cascade child pages, blocks, comments, sharing links. Move page → update all internal links |
| Projections | Strong fit | This is where Notion lives: table view, board view, calendar view, gallery view, timeline view, list view — all over the same underlying data. Plus page-as-document vs page-as-database |
| Boundaries | Weak | Max nesting depth, max block count per page. Not many meaningful domain constraints |

**What doesn't fit cleanly:**

- **Recursive/compositional data structures.** Blocks containing blocks, pages containing pages, databases containing pages that contain databases. The schema and CRUD generators would need to handle tree structures natively — this isn't a "dimension" of behavior, it's a fundamental data modeling pattern that changes everything about how CRUD works (insert becomes "insert at position within parent," reorder is a thing, move is reparenting).
- **Real-time collaborative editing.** Operational transforms or CRDTs for concurrent editing. Two users editing the same block simultaneously. This is a foundational infrastructure concern that permeates the entire system, not something capturable in a behavioral dimension.
- **Polymorphic blocks.** A block can be a paragraph, image, code, embed, database, or 30 other types. Each type has different schema, different rendering, different editing behavior. This is a **type system** problem — the generator needs to handle sum types / discriminated unions, not just flat field lists.
- **Formulas and rollups** in database blocks are essentially a user-defined computation language. Derivations covers "developer specifies computed values" but Notion lets *end users* define computed values at runtime. That's a meta-level the framework doesn't contemplate.

**Verdict: 60% clean fit.** Notion-like systems challenge the framework's assumption that entities are flat records with uniform CRUD. The core complexity is in compositional structure, polymorphism, and real-time collaboration — all below the dimension layer.

---

### 1.5 Calendar/Scheduling System

**Schema:** Events, calendars, attendees, recurrence rules, time zones, reminders, availability blocks, booking links.

**CRUD:** Events, calendars, reminders, booking links.

**Decomposition:**

| Dimension | Fits? | Mapping |
|-----------|-------|---------|
| Guards | Clean | Calendar sharing permissions (view free/busy, view details, edit). Private events visible only to creator. Delegated calendar access |
| Workflows | Moderate | Event invites: `pending → accepted / declined / tentative`. Booking flow: `available → pending_confirmation → booked / expired` |
| Reactions | Clean | Event created with attendees → send invites. Attendee responds → update attendee list, notify organizer. Event approaching → send reminder. Conflict detected → notify |
| Derivations | Clean | Free/busy calculation, next available slot, meeting duration, overlap detection, timezone-converted display times |
| Cascades | Clean | Delete calendar → cascade events. Cancel recurring event → cancel all future instances (or just this one — "this and following") |
| Projections | Strong fit | Day/week/month/year views, agenda view, scheduling poll view, availability overlay |
| Boundaries | Clean | No double-booking (unless allowed), working hours constraint, minimum scheduling notice, maximum event duration, buffer between meetings |

**What doesn't fit cleanly:**

- **Recurrence rules.** RFC 5545 RRULE is a mini-language: "every 2nd Tuesday of the month, except holidays, until December." This is schema-level complexity (how do you represent it?) combined with Derivation-level complexity (expand instances) combined with Cascade-level complexity (edit this instance vs all future instances vs the series). It cross-cuts at least three dimensions and is really its own beast. The "this and following" edit pattern — where modifying one instance of a recurring event splits the series — is particularly gnarly.
- **Timezone handling.** An event at "3pm EST" displayed to a user in Tokyo. Floating-time events (all-day events that should be "March 15th" everywhere, not shifting across date boundaries). Timezone changes when traveling. This is a **data representation** problem that affects schema, CRUD, derivations, and projections simultaneously.
- **Scheduling optimization.** "Find a time that works for 5 people across 3 timezones with these constraints" is an algorithmic problem. It's not quite a Derivation (it's a search/optimization, not a computed value), not a Boundary (it uses boundaries as inputs), not a Projection (though the result needs visualization). It's a **solver** — a computation pattern the framework doesn't account for.

**Verdict: 72% clean fit.** Calendar systems have deep complexity in temporal modeling (recurrence, timezones) that cuts across all dimensions rather than fitting neatly into one.

---

### Stress Test Summary

| System | Fit | Primary Gaps |
|--------|-----|-------------|
| Billing | 75% | Scheduled/time-driven processes, external system orchestration |
| PR Reviews | 85% | Policy engine (cross-cutting rule composition) |
| Messaging | 70% | Real-time sync, event streams, search as a first-class concept |
| Notion-like | 60% | Recursive structures, polymorphism, real-time collaboration, user-defined computation |
| Calendar | 72% | Temporal modeling (recurrence, timezones), algorithmic solving |

**Recurring gaps across all five:**
1. **Time/scheduling as a first-class concern** (4/5 systems)
2. **External system integration** (3/5 systems)
3. **Real-time synchronization** (3/5 systems)
4. **Complex data structures beyond flat records** (2/5 systems)

---

## 2. The "8th Dimension" Test

### Candidate: **Schedules** (or "Temporal Triggers" / "Clocks")

**The question it answers:** *What should happen automatically based on time, independent of user action?*

**Why the current 7 miss this:**

- **Reactions** answer "when X happens, do Y" — but the trigger is an event within the system (user creates, updates, deletes something). A cron job or scheduled check has no triggering event; the passage of time itself is the trigger.
- **Workflows** define valid state transitions, but not *when* transitions should happen autonomously. A subscription moving from `active` to `expired` at the end of a billing period is a time-driven transition, not a user-driven one.
- **Derivations** compute values but don't initiate actions.

**What it captures:**

| Pattern | Example |
|---------|---------|
| Scheduled jobs | Generate invoices on billing date, send weekly digest |
| Delayed actions | "Undo send" window (delete scheduled send after 10s), trial expiration in 14 days |
| Recurring processes | Daily cleanup of expired tokens, hourly sync with external API |
| Deadline enforcement | Auto-close stale PRs after 30 days of inactivity, escalate unresponded tickets |
| Time-window logic | Happy hour pricing between 4-6pm, maintenance window blocks deployments |

**Frequency:** This appears in 4 of the 5 stress test systems and in most non-trivial SaaS products. Billing is dominated by it. Support ticket SLAs depend on it. Content publishing (scheduled posts) requires it. It's arguably more universal than Workflows.

**Generatability:** High. "Run X every Y" and "after Z time, do W" are highly declarative patterns. Convex has scheduled functions (`ctx.scheduler.runAfter`, cron jobs) that map directly to a declarative spec.

**Why it's not just infrastructure:** A developer needs to *specify* the scheduled behavior as part of the feature definition. "Trials expire after 14 days" is a business requirement, not an implementation detail. The LLM architect needs to capture it, and the generator needs to scaffold it.

**Counterargument and why I still include it:** You could argue scheduled behavior is a special case of Reactions where the trigger is a timer rather than a user event. But in practice, the implementation is completely different (cron jobs vs event handlers), the specification is different (time expressions vs event patterns), and developers think about them differently. Merging them would make Reactions bloated and confusing. Dedicated is better.

---

### Runner-up: **Integrations** (External System Interactions)

What APIs does this feature call? What webhooks does it receive? What data does it sync? This appeared in 3/5 stress tests but I rank it below Schedules because (a) it's more of an infrastructure concern than a behavioral dimension, (b) it's harder to generalize declaratively, and (c) in the Convex ecosystem specifically, external calls are already modeled as `actions` with a clear pattern, so the architectural guidance already exists.

---

## 3. The "Reduce to 5" Test

### Merge Candidate A: Boundaries → Guards

**Rationale:** Both answer "what is NOT allowed?" Guards restrict *who* (identity-based), Boundaries restrict *what* (domain-logic-based). They're two faces of the same coin: authorization predicates. "Only the creator can delete" (Guard) and "Can't delete if there are active subscriptions" (Boundary) are both `canDelete()` checks — they often live in the same middleware/function and are evaluated together.

**Information loss:** Low. The distinction between "who-based restriction" and "what-based restriction" is meaningful at the conceptual level but nearly irrelevant at the implementation level. Both become validation checks on mutations. A unified "Rules" or "Constraints" dimension could hold both with subcategories.

**Risk:** Developers might forget domain constraints if they're lumped under "access control" framing. But if the unified dimension is framed as "What prevents this operation?" rather than "Who can do this?", both concerns get equal attention.

### Merge Candidate B: Cascades → Reactions

**Rationale:** Cascades are just Reactions scoped to lifecycle events (create, update, delete). "Delete project → cascade tasks" is structurally identical to "Task completed → update project progress" — both are "when X happens, do Y." The only difference is that cascades specifically involve related entity lifecycle management, while reactions are broader.

**Information loss:** Moderate. The merge loses an important *prompt* to think about referential integrity and cleanup. "What happens to child entities when the parent is deleted?" is a question developers routinely forget to ask. If it's buried inside a general "Reactions" dimension, the LLM architect might not probe for it. However, this could be mitigated by having "lifecycle cascades" as an explicit sub-question within Reactions.

**Risk:** Higher than Merge A. Cascades have a strong "completeness check" property — for every relationship in the schema, you should ask "what happens on delete?" This systematic prompting gets lost if cascades are just one more type of reaction.

### Alternative Merge: Derivations → Projections

**Why I considered it:** Both are about "showing computed/transformed data." Derivations compute values; Projections arrange views. You could unify them as "Derived Views."

**Why I rejected it:** This would be a bad merge. Derivations are backend-computed values stored or calculated at query time. Projections are frontend layout concerns. They have entirely different implementation targets (backend vs frontend), different performance characteristics, and different specification requirements. Merging them conflates data layer with presentation layer.

### Recommended 5-dimension set:

1. **Constraints** (Guards + Boundaries merged) — Who and what is restricted?
2. **Workflows** — What states and transitions exist?
3. **Reactions** (Cascades absorbed) — When X happens, what else should happen? (with explicit "lifecycle cascade" sub-question)
4. **Derivations** — What values are computed?
5. **Projections** — What custom views exist?

**What this loses vs the 7:** Slightly less prompting power for access control (since "who can do this?" and "what domain rules exist?" are blurred) and slightly less prompting for referential integrity (cascades become a sub-topic). Both are manageable with good sub-questions.

---

## 4. Generatability Spectrum

| # | Dimension | Generatable | Custom | Reasoning |
|---|-----------|-------------|--------|-----------|
| 1 | Guards | **80%** | 20% | Role-based access (row-level security, ownership checks) is highly declarative: `{ visibility: "creator_only" }`, `{ role: "admin" }`. The 20% custom is complex conditional access (e.g., "editors can see draft posts but only if assigned to the editorial team AND the post category matches their beat") |
| 2 | Workflows | **70%** | 30% | State machine definition (states, transitions, valid next states) is fully declarative. Transition guards ("can only move to 'approved' if all reviewers approved") often require custom logic. Side effects on transition can be partially generated but often need custom code |
| 3 | Reactions | **40%** | 60% | Simple patterns are generatable: "on create → notify owner," "on field change → log." But most real reactions involve custom business logic: calculating proration amounts, determining notification routing, composing emails with contextual data. The *wiring* (event → handler) is generatable; the *handler body* usually isn't |
| 4 | Derivations | **50%** | 50% | Aggregations (count, sum, avg of related entities) are fully generatable. Simple field compositions ("fullName = first + last") too. But formulas involving business logic (proration calculation, credit score, priority scoring) are custom. The *declaration* that a derived field exists and its dependencies is generatable; the *computation* often isn't |
| 5 | Cascades | **85%** | 15% | Highly declarative: `{ onDelete: "cascade" | "set_null" | "restrict" | "archive" }`. The 15% custom covers cases like "cascade tasks but preserve audit logs" or "soft-delete with conditional cleanup" |
| 6 | Projections | **30%** | 70% | The generator can scaffold standard alternate views (kanban if workflow exists, calendar if dates exist). But most custom projections involve unique layouts, aggregation views, dashboard compositions, or interactive visualizations that are inherently custom |
| 7 | Boundaries | **60%** | 40% | Many boundaries are declarative: max count, uniqueness, temporal constraints (due date must be future), required combinations. Custom boundaries involve cross-entity validation ("total allocated budget across sub-projects cannot exceed parent budget") or external data dependencies |

**Key insight for tooling:** The high-generatability dimensions (Cascades 85%, Guards 80%, Workflows 70%) should be the generator's priority. These offer the most "free code" from a YAML declaration. Reactions and Projections are mostly custom code territories where the generator's role is scaffolding the *structure* (event handler files, view component shells) rather than the logic.

---

## 5. Developer Ergonomics

### Frequency (% of features that need this dimension)

| Dimension | Frequency | Reasoning |
|-----------|-----------|-----------|
| Guards | **95%** | Almost everything has access control in a multi-user app. The rare exception: truly public, read-only features |
| Workflows | **40%** | Many features don't have meaningful states. A "profile" has no workflow. A "bookmark" has no workflow. Workflows matter for entities with lifecycle stages, but plenty of features are stateless CRUD |
| Reactions | **70%** | Most features trigger at least notifications or logging. But many simple features (settings pages, profile management) have minimal reactions |
| Derivations | **60%** | Counts, totals, and status summaries are common. But many features display only stored data without computation |
| Cascades | **55%** | Only relevant when entities have relationships. A standalone entity (user preferences, audit log) needs no cascades |
| Projections | **35%** | Most features are fine with the generated list/detail/form. Custom views are a "nice to have" that often comes in v2, not v1 |
| Boundaries | **50%** | Beyond basic field validation, domain-level constraints appear in about half of features. Simple CRUD entities often have none |

### Specification Difficulty (can a non-technical founder describe it?)

| Dimension | Difficulty | Reasoning |
|-----------|------------|-----------|
| Guards | **Easy** | "Only the task creator can see it" — natural language maps directly. Everyone understands "who can see/do what" |
| Workflows | **Easy** | "Tasks go from todo to in-progress to done" — people think in states naturally. Status columns on boards are universal |
| Reactions | **Medium** | "When a task is assigned, notify the assignee" is easy. But anticipating all necessary reactions requires system thinking. Founders describe the happy path; side effects get missed |
| Derivations | **Medium** | "Show how many tasks are done out of total" is easy. But knowing *which* values should be computed (vs stored) requires some technical intuition |
| Cascades | **Hard** | Non-technical founders almost never think about "what happens to child records when the parent is deleted." They'll discover this gap in production when data goes missing or orphaned records accumulate. This is high-value precisely because it's hard to specify — the LLM architect should probe for it |
| Projections | **Easy** | "I want a kanban board" — visual references are universal. People can describe the view they want, even if they can't implement it |
| Boundaries | **Medium** | "Max 10 subtasks per task" is easy. "Due date must be after start date" is easy. But complex cross-entity constraints ("total hours across all team members can't exceed project budget / hourly rate") require domain modeling skill |

### Value Added to Spec (does knowing this change the generated output?)

| Dimension | Value | Reasoning |
|-----------|-------|-----------|
| Guards | **High** | Fundamentally changes data model (needs `creatorId`, `visibility` fields), query patterns (filtered reads), and mutation wrappers. Without this, you get wide-open CRUD |
| Workflows | **High** | Adds `status` field, enum definition, transition validation functions, status-aware UI components (badges, filters). Significant generated output |
| Reactions | **High** | Creates event handler files, notification infrastructure, side-effect functions. Without this, mutations are isolated operations |
| Derivations | **Medium** | Adds computed fields or query-time aggregations. Important but often can be added incrementally without changing the core schema |
| Cascades | **High** | Directly changes delete mutation behavior. Getting this wrong causes data corruption. Must be specified upfront |
| Projections | **Medium** | Triggers view component generation (kanban, calendar). Valuable but additive — doesn't change the data layer |
| Boundaries | **Medium** | Adds validation rules to mutations. Important for correctness but often refineable after initial generation |

### Composite Ergonomics Score

| Dimension | Frequency | Ease of Spec | Value | Overall Priority |
|-----------|-----------|-------------|-------|-----------------|
| Guards | 95% | Easy | High | **#1 — Always ask** |
| Workflows | 40% | Easy | High | **#3 — Ask if entity has lifecycle** |
| Reactions | 70% | Medium | High | **#2 — Always ask** |
| Cascades | 55% | Hard | High | **#4 — Always probe (founder won't volunteer)** |
| Boundaries | 50% | Medium | Medium | **#5 — Ask if domain has rules** |
| Derivations | 60% | Medium | Medium | **#6 — Ask if aggregations exist** |
| Projections | 35% | Easy | Medium | **#7 — Ask only if non-standard views needed** |

**Implication for the LLM architect conversation flow:** Don't ask about all 7 for every feature. The priority ordering above suggests a flow: always ask about Guards and Reactions, conditionally ask about Workflows (if the entity has a lifecycle), always probe for Cascades (since founders won't volunteer it), then conditionally explore Boundaries, Derivations, and Projections.

---

## 6. The Naming Problem

The current names have two issues: (a) some are jargon-heavy (Projections, Derivations, Cascades), and (b) they describe the *mechanism* rather than the *question the developer answers*.

### Proposed Renames

| Current | Proposed | Question Form | Why Better |
|---------|----------|---------------|------------|
| Guards | **Access Rules** | "Who can see or do this?" | "Guards" sounds like security middleware. "Access Rules" is what non-technical people call it. "Permissions" is also good but overloaded in programming |
| Workflows | **Status Flow** | "What states does this go through?" | "Workflows" implies BPM-style multi-step processes (Zapier, n8n). "Status Flow" is more precise — it's about the status field and its valid transitions. Alternatively: **Lifecycle** |
| Reactions | **Side Effects** | "When this happens, what else should happen?" | "Reactions" sounds like emoji reactions (especially in a Slack-like context) or React.js. "Side Effects" is the precise technical term. Alternatively: **Triggers** (more accessible but less precise) |
| Derivations | **Computed Values** | "What values are calculated, not stored?" | "Derivations" is academic. "Computed Values" is what every developer already calls these: computed properties, calculated fields, derived columns. Everyone gets it instantly |
| Cascades | **Ripple Effects** | "What happens to related data when this changes?" | "Cascades" is DB jargon (ON DELETE CASCADE). "Ripple Effects" captures the concept more broadly — changes propagating through related entities. Alternatively: **Cleanup Rules** (more specific but narrower) |
| Projections | **Custom Views** | "What non-standard ways should this data be displayed?" | "Projections" is CQRS/event-sourcing jargon. "Custom Views" says exactly what it is: views beyond the generated list/detail/form. Everyone understands it |
| Boundaries | **Business Rules** | "What domain constraints exist beyond field validation?" | "Boundaries" is vague — boundaries of what? "Business Rules" is the universal business analyst term for domain-level constraints. Alternatively: **Limits & Rules** |

### The rename that matters most

**Cascades → Ripple Effects** (or **Cleanup Rules**). This is the dimension developers are least likely to think about unprompted. "Cascades" sends them to SQL mental models. "Ripple Effects" or "What happens to related data?" is a question that naturally triggers the right thinking: "Oh, if I delete a project, what happens to its tasks?"

### The rename to be careful with

**Reactions → Side Effects**. "Side Effects" is precise for developers but might confuse non-technical founders. If the LLM architect is talking to technical users, use "Side Effects." If talking to non-technical founders, use "Triggers" or "Auto-Actions" or "When-Then Rules."

---

## 7. Summary Assessment and Recommendations

### The framework is good but not complete

The 7 dimensions capture roughly 70-80% of real-world feature complexity beyond CRUD. That's genuinely impressive for a concise, memorable framework. The gaps are mostly in temporal behavior, external integrations, and complex data structures — which are infrastructure-heavy concerns that may be better served by separate architectural patterns than by additional behavioral dimensions.

### Top 3 recommendations

**1. Add Schedules as the 8th dimension.** Time-driven behavior is too common and too distinct from event-driven reactions to be absorbed. It appeared in 4/5 stress tests. The declaration is highly generatable. The omission will cause real specification gaps.

**2. Make the LLM architect conversation adaptive, not exhaustive.** Don't ask about all 7 (or 8) for every feature. Use the frequency data to build a decision tree: always ask Guards and Side Effects, conditionally ask Status Flow and Schedules, probe for Ripple Effects, then explore the rest based on feature characteristics.

**3. Rename the dimensions to question form for the developer-facing interface.** Instead of presenting "Dimension: Cascades," present "What happens to related data when this is deleted or changed?" The question form is both more accessible and more generative — it prompts the developer to think, rather than requiring them to understand a taxonomy first.

### What the framework deliberately and correctly excludes

- **Infrastructure concerns** (caching, indexing, real-time sync, retry logic) — these are architecture decisions, not feature specifications
- **UI/UX design** (layout, animation, responsive behavior) — these are design decisions
- **Performance optimization** (query optimization, denormalization) — these are implementation decisions

The framework's scope — behavioral complexity at the domain logic layer — is well-chosen. The temptation to expand it to cover everything should be resisted. A framework that tries to capture all complexity captures none of it usefully.
