# Analytics Dimension Research

**Source:** Agent research output from 2026-03-28 session

---

## Analytics / Reporting / Metrics — Dimension Analysis

### 1. Does This Fit Inside "Derivations"?

**No. The architectural boundary is clear.**

A derivation is a function of one entity's data. `task.subtaskCount` reads children of a single task. `task.isOverdue` reads one task's dueDate. The scope is bounded: you pass in a document, you get back an augmented document.

Analytics are functions of a *set*. Team velocity reads every task completed this sprint by every team member. Monthly revenue reads every invoice across every customer. The scope is unbounded by design — that's the point.

This is not just a conceptual difference. In Convex it materializes as different code:

```typescript
// Derivation — scoped to one entity
const task = await ctx.db.get(taskId);
return { ...task, isOverdue: task.dueDate < Date.now() };

// Aggregate — scans the whole table
const tasks = await ctx.db.query("tasks")
  .withIndex("by_assignee_status", q => q.eq("assigneeId", userId).eq("status", "done"))
  .collect();
return tasks.length; // now aggregate in JS
```

The second pattern requires index design for reporting, full table scans or filtered scans, in-memory aggregation in JavaScript (because Convex has no GROUP BY), and awareness of read limits. These are fundamentally different engineering decisions than computing a field on a document.

**Verdict: Derivations cannot absorb Analytics without blurring a real architectural line.**

---

### 2. What Makes Analytics Distinct in a Convex Context

Convex's lack of SQL GROUP BY is not a minor inconvenience — it changes the entire pattern:

| SQL World | Convex World |
|-----------|-------------|
| `SELECT assignee_id, COUNT(*) FROM tasks GROUP BY assignee_id` | Full scan → `reduce()` in JS |
| Window functions (`RANK() OVER PARTITION BY`) | Multi-pass aggregation in JS or pre-computed |
| Materialized views | Manual rollup tables + scheduled mutations |
| Query planner picks indexes | You design indexes for each access pattern explicitly |

This means a developer specifying an analytics feature needs to think about:

1. **Can this be a live query?** Count of open tasks: yes. 12-month revenue trend: no — too expensive per request.
2. **Does this need a reporting index?** If filtering by date range + status + assignee, you need an index that supports that combination.
3. **Does this need pre-computation?** Rolling averages, period-over-period comparisons, and anything involving time-series typically need a scheduled job that writes into a rollup table.
4. **What's the staleness tolerance?** Live = always current but expensive. Pre-computed = cheap but stale by however often the cron runs.

None of these questions appear in the Derivations dimension. They're a different class of decision entirely.

---

### 3. What a Developer Needs to Specify

For an LLM or generator to produce useful analytics code, the spec needs:

**Metric definition**
- What is being measured (the "what")
- The source table(s) and relevant fields
- The computation type: aggregate, ratio, time-series, ranking

**Granularity and filters**
- Time grain: daily, weekly, monthly, all-time
- Dimensions to slice by: assignee, project, status, region
- Date range: trailing N days, this month, custom

**Computation type** (the four from your observation map cleanly to implementation patterns):

| Type | Convex Pattern |
|------|---------------|
| Row-level | Derivation — add to document query, no separate dimension needed |
| Pure aggregate | Live query with index + JS reduce |
| Mixed (% of group) | Two-pass: aggregate first, then enrich rows |
| Window (running total, rank) | Pre-computed rollup table written by scheduled mutation |

**Staleness tolerance**
- Real-time: direct query
- Near-real-time (minutes): reactive query with good indexes
- Periodic (daily/weekly): scheduled rollup

**Output shape**
- Single number (KPI card)
- Time series (chart)
- Ranked list (leaderboard)
- Distribution (histogram)

---

### 4. Real-World Computation Types by Domain

**Project management**

| Metric | Type | Notes |
|--------|------|-------|
| Open tasks by status | Pure aggregate | Live query viable |
| Cycle time (created → done) | Pure aggregate (avg of row-level values) | Mixed: row-level duration, then avg |
| Velocity (tasks completed/sprint) | Pure aggregate per time bucket | Needs date-bucketed index |
| Burndown | Window (cumulative remaining) | Pre-compute daily |
| Lead time trending | Window (moving avg) | Scheduled rollup |

**E-commerce**

| Metric | Type | Notes |
|--------|------|-------|
| Revenue today | Pure aggregate | Live query |
| AOV | Mixed (revenue ÷ order count) | Two aggregates, one division |
| Conversion rate | Mixed (orders ÷ sessions) | Requires session tracking table |
| Cohort retention | Window (% of cohort still active at week N) | Pre-compute — this is expensive |
| Cart abandonment | Mixed | Needs funnel-stage tracking |

**SaaS billing**

| Metric | Type | Notes |
|--------|------|-------|
| MRR | Pure aggregate | Live query on subscriptions table |
| MRR growth % | Mixed (current - prior) ÷ prior | Needs prior-period snapshot |
| Churn rate | Mixed | Requires "was active last period" flag |
| LTV | Row-level (revenue × expected lifespan) | Derivation on customer record |
| Expansion revenue | Window (MRR delta month-over-month) | Scheduled rollup |

**HR / People**

| Metric | Type | Notes |
|--------|------|-------|
| Headcount | Pure aggregate | Live query |
| Attrition rate | Mixed | Needs prior-period headcount |
| Time-to-hire | Pure aggregate (avg of row-level durations) | Mixed |
| Department breakdown | Pure aggregate by dimension | Live query with index |

**Pattern that emerges:** Row-level calculations are Derivations and don't need a separate dimension. Pure aggregates and mixed calculations can be live queries with the right indexes. Window calculations almost always need pre-computation via scheduled jobs. The scheduling dependency is real, not incidental.

---

### 5. The Pre-Computation / Live Query Problem

This is where Analytics and Scheduling become entangled, but they're not the same dimension.

**Scheduling** answers: "What runs on a timer?" — daily digest emails, subscription renewals, expiry checks.

**Analytics** answers: "What is the shape of this metric and how is it computed?"

The interaction is: some analytics *require* scheduling as an implementation strategy. A 12-month revenue chart cannot be computed live on every page load — you need a `monthly_revenue_rollups` table that a cron job writes to at midnight. The Analytics dimension says "this metric needs pre-computation." The Scheduling dimension says "here's the cron job that does it."

They're different concerns that happen to intersect. Collapsing them loses information. A spec that says "analytics: monthly revenue trend" tells the LLM what the metric is. A spec that says "scheduling: nightly revenue rollup" tells it when and how. Both are needed; neither implies the other fully.

---

### 6. The Three Options

**Option A: Sub-category of Derivations + Scheduling**

*For:* Keeps the dimension count low. Simple aggregates are "just derivations over a set."

*Against:* Conflates per-entity computation with cross-entity computation. Hides the index design question. Hides the staleness question. A developer reading "Derivations" doesn't know they need to think about reporting indexes and rollup tables. The architectural difference is real and consequential.

*Verdict:* Wrong. It saves a label at the cost of losing signal.

---

**Option B: Standalone "Analytics" or "Metrics" dimension**

*For:* Clean separation. The dimension name signals "you need to think differently here." Captures KPIs, dashboards, reports, and time-series as first-class concerns.

*Against:* "Analytics" is broad. It could absorb row-level computations that belong in Derivations. The name may suggest a BI tool rather than application-level metrics.

*Verdict:* Correct in principle, but needs a crisp definition to prevent scope creep. Call it **"Aggregations"** not "Analytics" — the word anchors the scope to cross-entity computation.

---

**Option C: Split into Derivations (per-entity) and Aggregations (cross-entity)**

*For:* The cleanest separation. Derivations = one entity in, augmented entity out. Aggregations = many entities in, summary out. The boundary maps directly to the architectural difference in Convex. A developer can immediately classify their metric into one or the other. "Is my computation scoped to one document, or does it scan a set?" That's a one-question test.

*Against:* Adds a dimension. Window functions and pre-computed rollups sit awkwardly — they're aggregations that need scheduling. But this is a spec concern, not a dimension concern: "this aggregation requires pre-computation" is a flag within the Aggregations dimension.

*Verdict:* Best option.

---

### Recommendation: Option C — Split into Derivations + Aggregations

**Derivations** (existing, refined): Per-entity computed values. Scope: one document in, augmented document out. Examples: `task.isOverdue`, `task.totalTimeLogged`, `customer.ltv`. Implemented as document-level transforms in queries. No index design required beyond what the document query needs.

**Aggregations** (new): Cross-entity computed summaries. Scope: a set of documents in, a summary out. Sub-categories within the dimension:

- **Pure aggregate** — count, sum, avg over a filtered set. Live query with reporting index.
- **Mixed** — ratios, percentages, comparisons to group. Two-pass: aggregate then enrich.
- **Time-series** — values bucketed by time period. Usually needs pre-computation.
- **Window** — running totals, rankings, moving averages. Always needs pre-computation + scheduled job.

The **pre-computation flag** within Aggregations is what triggers the Scheduling dimension. The spec doesn't collapse them — it links them: "this metric requires pre-computation → therefore needs a scheduled rollup."

**What a spec entry looks like under Aggregations:**

```
Aggregations:
  - name: team_velocity
    type: time-series (weekly buckets)
    source: tasks (status=done, completedAt range)
    dimensions: [assignee, project]
    pre-computed: yes
    rollup_frequency: daily
    output_shape: time series → chart
```

This tells the LLM: design a `velocity_rollups` table, create a scheduled mutation that runs daily, build a query that reads from the rollup table rather than scanning tasks. None of that information is capturable under "Derivations."
