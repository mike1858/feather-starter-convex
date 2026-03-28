# Sonnet Critique of the 8-Dimension Framework

**Source:** Agent research output from 2026-03-28 session

---

## 1. Completeness — What's Missing

The framework has gaps that will show up in nearly every real SaaS feature.

**Integrations / Side Effects to External Systems**

Sending an email, posting to Slack, calling a webhook, charging a card — these are distinct from "Reactions" because they have failure modes, retry semantics, and idempotency concerns that internal reactions don't have. Lumping "task assigned → send email" with "task assigned → flip visibility" is wrong. One is a database write; the other is a network call with a circuit breaker. This belongs in its own dimension or at minimum a clear sub-category.

**Scheduling / Time-Triggered Behavior**

"Due date passes → mark overdue" and "send weekly digest every Monday" have no home here. Reactions are event-driven. Cron-style triggers are time-driven. These are architecturally different (Convex actions, scheduled functions) and developers need to recognize the pattern to wire it correctly. Missing entirely.

**Search and Filtering**

Not field-level validation (Boundaries). Not a computed value (Derivations). Full-text search, faceted filtering, and cursor-based pagination are a distinct concern with their own implementation patterns (indexes, search providers). Missing.

**Bulk Operations**

Archive 50 tasks at once. Bulk reassign. Bulk delete. This is not a Projection (it's not a view). It's not a Workflow (no state machine needed). It's not a Cascade (not a lifecycle event). It sits in a gap between operations and UI. Missing.

**Audit Trails / Activity Logs**

Who changed what and when. This is not a Reaction (you don't react to the log). It's not a Derivation (it's not computed). It's a cross-cutting concern about write instrumentation. Missing.

**Multi-tenancy / Data Isolation**

Which rows belong to which organization. This is more architectural than feature-level, but it affects every query, every guard, and every cascade. The framework treats Guards as "who can see this?" but doesn't address "which data partition does this live in?" A junior developer building a team workspace feature will get confused about whether to put "only show tasks in the current org" under Guards.

**Soft Delete / Archiving**

Not quite a Workflow state (it's a tombstone pattern). Not quite a Cascade (it changes query semantics globally). This is a lifecycle pattern that recurs enough to deserve explicit treatment.

**Verdict:** The framework covers about 70% of real-world SaaS complexity. The missing 30% (scheduling, integrations, search, bulk ops, audit) are common enough that developers will hit them in the first feature they build beyond the tutorial.

---

## 2. Overlap — Where Dimensions Collapse

**Guards vs. Boundaries — serious overlap**

Guards: "who can see/do this?" — private tasks visible only to creator.
Boundaries: "domain-level constraints" — max subtasks per task, due date must be future.

But "only the task creator can delete it" is a Guard. "A task can only be deleted if it has no subtasks" is... a Guard? A Boundary? Both are preconditions on an operation. The line between access control (who) and business rules (what conditions) is blurry in practice and developers will constantly second-guess which bin to use.

Recommendation: Merge these into **Invariants** — "conditions that must hold for an operation to proceed, whether identity-based or data-based." Separate implementation (Convex auth vs. validation logic) doesn't require separate conceptual categories.

**Cascades vs. Reactions — Cascades are a subset**

Cascades: "delete project → cascade tasks."
Reactions: "task assigned → auto-flip visibility."

Both are "when X happens, Y happens." Cascades are specifically lifecycle events on related entities. But this is just a naming convention, not a conceptual distinction. A Cascade IS a Reaction where the trigger is a lifecycle event and the target is a related entity. You could express every Cascade as a Reaction with a narrower scope.

The only argument for keeping Cascades separate is that they have well-known database-level implementations (ON DELETE CASCADE) whereas Reactions are application-level. That's an implementation concern, not a conceptual one.

Recommendation: Absorb Cascades into Reactions as a labeled sub-type: **Reactions (including Lifecycle Cascades)**. Or if you keep the split, be explicit: "Cascades = Reactions triggered by entity lifecycle (create/update/delete)."

**Workflows vs. Guards — partial overlap**

A workflow transition guard ("task can only move to done if all subtasks are complete") is simultaneously a Guard (precondition on an action) and a Workflow (state transition rule). Developers will not know which file to put this in.

---

## 3. MECE-ness — Cases That Don't Fit Cleanly

**Undo/Redo**

Undo is not a Workflow (no state machine). Not a Cascade. Not a Reaction. Not a Projection. It requires storing intent (event sourcing or command pattern) and reversing it. No clean home.

**Real-time Collaboration**

Optimistic updates, presence indicators, conflict resolution. Not a Projection (it's not a view query). Not a Reaction (it's a synchronization pattern). Not covered.

**Commenting / Threaded Discussion**

Comments on a task seem like a sub-entity (new schema table). But they also involve Reactions (notify on mention), Guards (who can comment), and possibly Workflows (resolve a comment). No clean single dimension — it spans four.

This is the real MECE problem: the 7 dimensions describe orthogonal concerns of a single entity, but real features involve multiple interacting entities each with their own concerns. The framework doesn't say how to handle feature-level cross-entity behavior.

**Rate Limiting / Quotas**

"Free tier users can have max 3 projects." This is a Guard (who can create), a Boundary (max count), and potentially a Workflow (upgrade to unlock). Three dimensions, one business rule.

---

## 4. Practical Utility

The framework is useful for trained developers who already know what state machines, cascades, and projections mean. For the stated audience (developers using a starter kit, probably mid-level), there are two usability problems:

**Problem 1: Naming is too technical**

"Projections" means something specific in CQRS. In Event Sourcing it means a read model rebuilt from events. Developers who know CQRS will be confused by the overloaded term. Developers who don't know CQRS won't know what it means. "Views Beyond List/Detail" is clearer, if less elegant.

"Derivations" is academic. "Computed Fields" is what developers search for. "Reactions" is the best name in the set — it maps to how developers think about `useEffect` and event handlers.

"Boundaries" is too vague. "Business Rules" or "Invariants" is more searchable.

**Problem 2: No examples at the feature level, only at the entity level**

The framework explains each dimension with a single entity in mind (tasks). Real features involve multiple entities. When you build "project membership," which dimension does "invite a user to a project → create membership record → send email → unlock project in their sidebar" belong to? It spans Reactions, Cascades, and Integrations (which doesn't exist). Developers need cross-entity examples.

**Recommendation:** Add a "Feature Pattern" layer above the 7 dimensions — named patterns like "Invitation Flow," "Subscription Gating," "Activity Feed" — that show how dimensions compose for real features.

---

## 5. Generator Boundary — What's Actually Declarable

The framework draws the line at CRUD. This is too conservative. Several "custom" dimensions have well-known declarable patterns:

| Dimension | What's Declarable | What's Truly Custom |
|---|---|---|
| Workflows | State machine: states, transitions, allowed roles | Transition side effects |
| Cascades | ON DELETE behavior: cascade, restrict, nullify | Conditional cascades |
| Guards | Role-based access (owner, admin, public) | Attribute-based rules (complex conditions) |
| Boundaries | Simple constraints (min/max, required-if) | Cross-entity business rules |
| Derivations | Count, sum, avg of related records | Formulas involving external data |

If the YAML schema can declare `workflow: { states: [todo, in_progress, done], transitions: [...] }`, the generator can scaffold the state machine, the transition mutation, and the UI status badges. This would dramatically reduce boilerplate.

The framework should have three tiers, not two:
1. **Auto-generated** — pure CRUD
2. **Declarable with constraints** — common patterns in each dimension, described in YAML
3. **Fully custom** — domain-specific logic that can't be expressed declaratively

---

## 6. Alternative Frameworks — What They'd Say

**Domain-Driven Design**

DDD would immediately flag that this framework mixes strategic and tactical concerns. "Guards" is an application service concern. "Workflows" is domain logic. "Projections" is a read model concern. DDD would separate the domain model (entities, value objects, aggregates) from the application layer (use cases, commands) from the infrastructure layer (repositories, external services). The 7 dimensions don't map cleanly to DDD layers, which means a DDD-oriented developer will fight this framework.

What DDD gets right that this misses: **Aggregates and Consistency Boundaries.** Which entities must be updated atomically? Convex transactions make this easier but developers still need to think about it.

**Event Storming**

Event Storming would reframe everything around domain events: "TaskCreated," "TaskAssigned," "TaskCompleted." Guards become "policies" (when event X, if condition Y, do Z). Cascades become reaction policies. Reactions become the same. The entire framework collapses into Events + Commands + Policies + Read Models. That's actually a cleaner MECE split.

Event Storming vocabulary is worth borrowing: **Events** (things that happened), **Commands** (things requested), **Policies** (automated reactions), **Read Models** (projections). This maps better to Convex's architecture (mutations = commands, queries = read models, reactive queries = live projections).

**CQRS**

CQRS would split Commands (mutations, with all the Guards/Workflows/Cascades/Reactions applying on the write side) from Queries (with all the Projections/Derivations applying on the read side). This is actually a useful split for Convex specifically because mutations and queries are already separate functions. The framework could organize around this axis.

**Jobs-to-be-Done**

JTBD would ignore the technical categories entirely and ask "what job is the user hiring this feature to do?" This is useful for requirements but doesn't help with implementation structure.

**Recommendation:** Borrow Event Storming vocabulary. Replace the 7 dimensions with a Command/Event/Policy/Projection model. It maps better to Convex's architecture and is more extensible.

---

## 7. Naming — Verdict by Dimension

| Name | Verdict | Recommendation |
|---|---|---|
| Guards | Good — intuitive | Keep, but merge with Boundaries |
| Workflows | Good — widely understood | Keep |
| Reactions | Excellent — maps to mental model | Keep |
| Derivations | Academic | Rename to "Computed Fields" |
| Cascades | Acceptable but overlaps Reactions | Either merge or rename to "Lifecycle Rules" |
| Projections | Overloaded (CQRS conflict) | Rename to "Custom Views" |
| Boundaries | Too vague | Rename to "Business Rules" or merge into Guards |

---

## Summary Recommendations

**Structural changes (high priority):**

1. Merge Guards + Boundaries into **Invariants** (preconditions on operations, whether identity-based or data-based)
2. Absorb Cascades into **Reactions** as a labeled sub-type
3. Add a missing dimension: **Integrations** (external system calls with failure modes)
4. Add a missing dimension: **Scheduling** (time-triggered behavior)

**If you keep all 7:**

5. Add "Search / Filtering" as an eighth dimension — it's too common to leave out
6. Rename Projections → Custom Views, Derivations → Computed Fields, Boundaries → Business Rules

**Framework-level changes:**

7. Add a third tier between "generated" and "custom": **Declarable Patterns** (state machines, cascade rules, role-based guards) — these reduce boilerplate without requiring full code generation
8. Add cross-entity "Feature Pattern" examples showing how dimensions compose (Invitation Flow, Subscription Gating, Activity Feed)
9. Consider adopting Event Storming vocabulary (Commands / Events / Policies / Read Models) as the underlying mental model — it maps better to Convex's architecture

**The one thing that makes or breaks this framework in practice:** if a developer cannot place any given behavior into exactly one dimension without hesitation, the framework will create noise rather than clarity. Right now, Guards/Boundaries and Cascades/Reactions both fail that test.
