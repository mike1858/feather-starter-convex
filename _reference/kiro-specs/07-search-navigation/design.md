# Design: Search & Navigation

## Overview

Technical design for search functionality and command palette navigation.

## API Design

### Search Function

| Function | Type | Description |
|----------|------|-------------|
| tasks.search | query | Search tasks + projects |

```typescript
// Returns combined results
type SearchResult = 
  | { type: "task"; task: Task }
  | { type: "project"; project: Project };
```

## Component Design

### CommandPalette.tsx
- Opens on ⌘K / Ctrl+K
- Closes on Escape
- Debounced search input
- Keyboard navigation (arrow keys)
- Select on Enter

### Peek Mode
- Preview pane for selected task
- Shows title, status, priority, description
- Toggle with Tab or arrow right

## Key Bindings

| Key | Action |
|-----|--------|
| ⌘K / Ctrl+K | Open palette |
| Escape | Close palette |
| ↑/↓ | Navigate results |
| Enter | Select result |
| Tab / → | Toggle peek mode |
