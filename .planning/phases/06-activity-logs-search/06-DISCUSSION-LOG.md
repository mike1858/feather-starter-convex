# Phase 6: Activity Logs & Search - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-27
**Phase:** 06-activity-logs-search
**Areas discussed:** Activity timeline display, Auto-logging strategy, Search & filter controls, Search scope & indexing

---

## Activity Timeline Display

| Option | Description | Selected |
|--------|-------------|----------|
| Compact single-line | Icon + actor + action + time, grouped by date | ✓ |
| Card-based entries | Small cards with avatar, more visual | |
| You decide | Claude picks | |

**User's choice:** Compact single-line (Linear-style)

---

## Auto-Logging Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in mutations | Each mutation also inserts activity log entry | ✓ |
| Separate logging functions | Centralized logActivity() helper | |
| You decide | Claude picks | |

**User's choice:** Inline in mutations

---

## Search & Filter Controls

### Search Location

| Option | Description | Selected |
|--------|-------------|----------|
| In page title bar | Per-view search next to view switcher | ✓ |
| Global header search | One search box across all entities | |
| You decide | Claude picks | |

**User's choice:** In page title bar

### Filter Controls

| Option | Description | Selected |
|--------|-------------|----------|
| Filter bar below title | Horizontal bar with status tabs + dropdowns | ✓ |
| Dropdown filter panel | Single "Filter" button opens panel | |
| You decide | Claude picks | |

**User's choice:** Filter bar below title

---

## Search Scope & Indexing

| Option | Description | Selected |
|--------|-------------|----------|
| Titles only, prefix search | Task titles + project names, prefix matching | |
| Titles + descriptions, full-text | Also search descriptions + work log text | ✓ |
| You decide | Claude picks | |

**User's choice:** Titles + descriptions, full-text

---

## Claude's Discretion

- Activity entry icon selection
- Empty timeline state
- Search debounce timing
- Filter dropdown styling
- Activity count badge

## Deferred Ideas

None
