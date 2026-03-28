# Excel Schema Evolution / Reconciliation

**Source:** Agent research output from 2026-03-28 session

---

# Schema Reconciliation Research Report: How Tools Handle Excel Re-Import with Schema Changes

## Executive Summary

This is the single biggest gap in the low-code/no-code data tools space. **No tool handles this well.** Every tool I researched either breaks, requires manual intervention, or silently drops data when an Excel file's schema changes between imports. The opportunity for Feather to differentiate here is massive.

---

## Tool-by-Tool Analysis

### 1. Grist

**Overall verdict: Breaks badly on schema changes.**

The user's assessment is correct. Grist's import-to-existing-table behavior has fundamental limitations:

- **Column rename**: Grist matches by column name. If "Emp Name" becomes "Employee Name," Grist sees a disappeared column and a new unknown column. The disappeared column's data stays untouched, but the new column's data is **silently dropped** because Grist cannot create new columns during import to an existing table. This is [documented as open issue #1996](https://github.com/gristlabs/grist-core/issues/1996) (still unresolved as of January 2026).
- **Sheet/table rename**: Grist shows all sheets in the import dialog and lets you pick the destination table. A renamed sheet just appears as a different source name -- you manually re-map it. Not terrible, but no automatic detection.
- **Column addition**: New columns in the import file are **dropped entirely**. You must pre-create columns in the target table before importing. The workaround is Alt+= to manually add columns first.
- **Column deletion**: Columns missing from the import file are left untouched in the existing table (their data preserved). This is actually reasonable behavior.
- **Column reorder**: Column order does not matter -- Grist matches by name. Reorder is handled gracefully.
- **Data type change**: Grist attempts auto-detection on import and can convert types, but mismatches between existing column types and imported data may cause silent data loss.
- **Re-import with existing data**: The "Update existing records" feature works via merge fields (you pick which columns form the key). Matching logic: same values in all selected merge fields = same record. Limitations: multiple matching records update only the first; blank values in import preserve existing data (good default). But there is no diff preview -- changes are applied directly.

The API (`syncTable` in grist-api) is slightly better, supporting merge strategies (`replace-with-nonblank-source`, `replace-all-fields`, `replace-blank-fields-only`), but still no schema evolution support.

**Community complaints**: Issue #1996 captures the frustration well -- forced to pre-create columns, no way to add new columns during import merge, all unmatched columns dropped silently.

### 2. Airtable

**Overall verdict: Manual mapping with some memory, but no schema diff.**

- **Column rename**: Airtable's CSV Import Extension matches by column name. Renamed columns won't auto-match. However, the extension **remembers your previous field mappings** for subsequent imports -- this is a genuine quality-of-life improvement that most tools lack.
- **Sheet/table rename**: Not applicable in the same way -- Airtable imports CSVs into specific tables.
- **Column addition**: For interface-only users, new columns that don't match existing fields **cannot be mapped at all**. Creator-permission users can map them to new fields. This is a permissions-gated limitation.
- **Column deletion**: Removed columns simply don't appear in the mapping UI. Existing data in those fields is preserved.
- **Column reorder**: Column order does not matter -- matching is by name. Graceful.
- **Data type change**: Airtable has strong field typing. Importing text into a number field may fail or be coerced.
- **Re-import with existing data**: The "Merge with existing records" option requires selecting a unique key field. "Skip blank or invalid CSV values" toggle prevents blanks from overwriting existing data. No diff preview.

**Airtable Sync** (for ongoing external sources): If you rename a field in the source, the synced table in the target **does not track the rename** -- it creates a duplicate field with a suffix (e.g., "Date field 2"). Field name changes in targets break the sync permanently, even if changed back. This is arguably worse than Grist.

**HyperDB** (Enterprise Scale only): The best behavior in the Airtable ecosystem. CSV updates can add new fields, respect field reordering, and provide a superset of the original schema. But this is enterprise-only ($$$) and still no rename detection.

### 3. NocoDB

**Overall verdict: Column mapping UI exists, but no schema evolution intelligence.**

- **Column rename**: NocoDB auto-maps by field name. Renamed columns appear unmapped. You get a dropdown UI to manually remap -- better UX than Grist, but no fuzzy matching or rename suggestion.
- **Sheet/table rename**: Handled through the import dialog -- manual selection.
- **Column addition**: NocoDB can create new fields during import if they appear in the mapping UI. Better than Grist. The "Allow create missing select field options" toggle helps for select/dropdown fields specifically.
- **Column deletion**: Missing columns from import are simply not mapped. Existing data preserved.
- **Column reorder**: Matching is by name. Graceful.
- **Data type change**: Auto-detects from first 500 rows. Can misidentify types. No override during import.
- **Re-import with existing data**: Supports "Update Only" (update matches, skip new) and "Merge Records" (update matches + add new). Merge field must be a single field (no composite keys). Known bug: [duplicate primary key records can be created](https://github.com/nocodb/nocodb/issues/3438).

**No diff preview, no rename detection, no migration plan.**

### 4. Frappe/ERPNext

**Overall verdict: Template-driven approach, manual mapping, no schema intelligence.**

- **Column rename**: Template-based system. If you download the template, rename a column, and re-upload, it throws an error. The fix: click "map columns" and manually remap. No auto-detection of renames.
- **Sheet/table rename**: Not applicable -- imports target specific DocTypes.
- **Column addition**: Additional columns that don't match any DocType field require manual mapping. The system won't auto-create fields.
- **Column deletion**: Missing columns are simply absent. Existing data preserved.
- **Column reorder**: Matching is by column header name. Reorder is fine.
- **Data type change**: Strict -- DocType fields have fixed types. Type mismatches cause import errors.
- **Re-import with existing data**: Two modes -- "Insert" (new records) and "Update" with overwrite checkbox. Overwrite is dangerous for child tables: **it deletes all child records of a parent and replaces with import data**.
- **Mapping persistence**: Community has requested saved mappings (e.g., for weekly supplier price list imports). [Not implemented yet](https://discuss.frappe.io/t/saving-import-tool-mappings-so-the-mapping-can-be-selected-during-import/116091) -- a significant gap for recurring imports.

### 5. Odoo

**Overall verdict: External ID solves re-import identity, but no schema evolution.**

- **Column rename**: Odoo maps by column label to field name. Renamed columns fail automatic mapping. Manual mapping required. Recommendation from docs: "use this field's label in the import file to ensure future imports are successful."
- **Sheet/table rename**: Not applicable -- imports target specific models.
- **Column addition**: New columns may not auto-map if the label doesn't match any Odoo field. Manual mapping step available. Field type detection uses heuristics on first 10 lines.
- **Column deletion**: Missing columns are simply skipped.
- **Column reorder**: Matching by name. Reorder is fine.
- **Data type change**: Heuristic-based detection. May show only compatible field types.
- **Re-import with existing data**: The **External ID** column is the key differentiator. If present, re-importing the same file updates existing records instead of creating duplicates. This is well-documented and reliable. But the user must include the External ID -- it's not auto-generated from a merge key.

**No mapping memory, no rename detection, no diff preview.**

### 6. Power Query / Power BI

**Overall verdict: The most sophisticated approach, but designed for ETL pipelines, not end-user re-import.**

This is fundamentally different from the other tools -- Power Query is a **transformation pipeline**, not a one-shot import. Each import creates a series of "Applied Steps" that form a repeatable recipe.

- **Column rename**: **This is where Power Query BREAKS.** If the source Excel renames a column, every Applied Step that references the old name fails with "The column 'X' of the table wasn't found." The fix is manual: edit each step in the Advanced Editor to reference the new name. The community has developed workarounds:
  - **Position-based referencing**: Use `Table.ColumnNames()` to reference columns by index instead of name. More resilient but loses semantic meaning.
  - **`MissingField.UseNull`**: Allows `Table.SelectColumns` to return null for missing columns instead of erroring.
  - **`try...otherwise`**: Wrap column references in error handlers.
  - **Dynamic renaming**: Use a mapping table to translate source names to canonical names.
- **Column addition**: Extra columns from the source appear automatically on refresh. But if subsequent steps filter columns explicitly, the new column is invisible downstream.
- **Column deletion**: Causes "column not found" errors in any step that references the deleted column.
- **Column reorder**: Depends on implementation. Name-based references handle it. Position-based references break.
- **Data type change**: The "Changed Type" step hardcodes column names and types. Source type changes may cause conversion errors.
- **Re-import with existing data**: Power Query does not have a concept of "existing system data" -- it's a full-refresh ETL. Append queries can combine old and new data, but there's no merge-by-key with existing records.

**Key insight for Feather**: Power Query's `SchemaTransformTable` helper function is the closest thing to a schema reconciliation pattern. It has three modes: `EnforceSchema.Strict` (add missing columns, remove extras), `EnforceSchema.IgnoreExtraColumns` (preserve extras), and `EnforceSchema.IgnoreMissingColumns` (ignore both). This is a useful conceptual model.

### 7. dbt

**Overall verdict: The most principled approach to schema evolution, but for data engineers, not end users.**

dbt's `on_schema_change` config is the gold standard for **declaring intent** about schema evolution:

| Option | Column Added | Column Removed | Column Renamed | Data Type Changed |
|--------|-------------|---------------|----------------|-------------------|
| `ignore` (default) | Silently dropped | Run fails | Treated as add+drop | Silently ignored |
| `fail` | Error, requires `--full-refresh` | Error | Error | Error |
| `append_new_columns` | Added to target | Preserved in target | Treated as add (old preserved) | Depends on adapter |
| `sync_all_columns` | Added to target | **Removed from target** | Treated as add+drop | Altered in target |

**Critical limitations**:
- **No rename detection at all.** A rename is always treated as a column deletion + column addition. This is the fundamental gap.
- **No backfilling.** New columns are added with NULLs for all historical rows.
- **No nested column tracking.** Only top-level schema changes are tracked.

**Column-level lineage** (dbt Cloud feature) can distinguish between "passthrough," "rename," and "transform" when tracing data flow. But this is observability, not automated handling -- it tells you what happened, not what to do about it.

---

## Comparative Rating Matrix

| Tool | Col Rename | Sheet Rename | Col Add | Col Delete | Col Reorder | Re-import Mode | Data Preservation | Mapping Memory |
|------|-----------|-------------|---------|-----------|-------------|---------------|-------------------|----------------|
| **Grist** | breaks | manual-mapping | breaks (dropped) | graceful | graceful | merge-by-key | good (blanks preserve) | none |
| **Airtable** | manual-mapping | n/a | breaks (permissions) | graceful | graceful | merge-by-key | good (skip blanks) | **yes** |
| **NocoDB** | manual-mapping | manual-mapping | manual-mapping | graceful | graceful | merge-by-key | fair (dup bugs) | none |
| **Frappe** | manual-mapping | n/a | manual-mapping | graceful | graceful | overwrite (dangerous) | poor (child delete) | **requested, not built** |
| **Odoo** | manual-mapping | n/a | manual-mapping | graceful | graceful | external-id-update | good | none |
| **Power Query** | breaks | n/a | graceful* | breaks | graceful* | full-refresh only | **not-supported** | n/a (pipeline) |
| **dbt** | breaks (add+drop) | n/a | graceful (append/sync) | graceful (sync) | graceful | incremental merge | good (no backfill) | n/a (config) |

*graceful only if subsequent steps don't hardcode column names.

**Key observation**: Every single tool treats a column rename as a deletion + addition. **No tool in any category -- spreadsheet, ERP, BI, or data engineering -- performs rename detection.** This is the gap.

---

## The Ideal Solution: Schema Reconciliation Workflow for Feather

### Design Principles

1. **Excel is the schema source, but not the data source.** After first import, the system owns the data. Excel provides schema updates and seed data.
2. **Track a persistent mapping** (Excel column name -> system field ID) that survives renames on either side.
3. **Never silently drop or overwrite.** Every schema change requires explicit user confirmation.
4. **Fuzzy matching for rename detection.** Use Jaro-Winkler similarity (better for name-like strings with shared prefixes) to suggest renames.

### The Three-Phase Workflow

#### Phase 1: Schema Diff

When the user uploads a new version of the Excel file:

```
Input:  Previous Excel schema (stored)  +  New Excel schema (detected)
Output: List of detected changes with confidence scores
```

**Change detection algorithm:**

1. **Exact match**: Column names that exist in both old and new -> no change.
2. **Missing from new**: Columns in old but not in new -> candidates for deletion or rename.
3. **New in new**: Columns in new but not in old -> candidates for addition or rename.
4. **Fuzzy match**: For each (missing, new) pair, compute Jaro-Winkler similarity. Score > 0.85 -> suggest as rename. Between 0.70-0.85 -> suggest with lower confidence. Below 0.70 -> treat as separate add/delete.
5. **Position heuristic**: If a column was at position 3 in old and a new unknown column is at position 3 in new, boost the rename confidence.
6. **Data fingerprinting**: Sample 50 rows from both columns. If the value distributions are similar (e.g., same unique values, same cardinality), boost rename confidence further.

#### Phase 2: User Confirmation (the diff UI)

```
Schema Changes Detected:

RENAMES (high confidence):
  [x] "Emp Name" -> "Employee Name"  (93% match, same position, same data)
  [x] Sheet "Staff" -> "Employees"   (87% match)

NEW COLUMNS:
  [x] "Department" (text, 50 values detected)
      -> Add to system as new field

REMOVED COLUMNS:
  [ ] "Fax Number" (12 rows have data in system)
      -> [Archive] [Delete] [Keep as hidden field]

TYPE CHANGES:
  [!] "Age": text -> number (47 of 50 source values are numeric)
      -> [Convert existing data] [Keep as text] [Create new field]

DATA CHANGES (matched by key "Employee ID"):
  - 3 rows modified (show diff)
  - 5 rows in new Excel not in system (add)
  - 100 rows in system not in Excel (preserve -- user-entered)
  - 0 rows to delete
```

Every change is a checkbox. The user confirms or adjusts. Nothing happens without approval.

#### Phase 3: Migration Execution

Apply the confirmed changes as an atomic operation:

1. **Schema changes first**: Rename fields, add fields, archive fields.
2. **Data changes second**: Update modified rows, insert new rows, preserve system-only rows.
3. **Audit trail**: Record every change with before/after values, timestamp, and the source file hash.

### Key Design Decisions

**Q: Should the system track a mapping (Excel column name -> system field name) that persists across imports?**

Yes, absolutely. This is the single most important data structure. Store it as:

```typescript
type ColumnMapping = {
  systemFieldId: string;         // Stable internal ID (never changes)
  systemFieldName: string;       // Current display name
  excelColumnName: string;       // Last-seen Excel column name
  excelColumnPosition: number;   // Last-seen position
  excelSheetName: string;        // Which sheet it came from
  importHistory: {               // Track renames over time
    date: string;
    oldName: string;
    newName: string;
  }[];
};
```

This mapping is what enables rename detection across imports. When "Emp Name" becomes "Employee Name," the system knows the field ID hasn't changed -- only the Excel-side label has.

**Q: Should there be a "diff" step with fuzzy matching suggestions?**

Yes. The diff step is non-negotiable. The scoring should combine:
- **String similarity** (Jaro-Winkler): 50% weight
- **Position similarity** (same index?): 20% weight
- **Data similarity** (sample values overlap): 30% weight

**Q: How should "Excel has 50 rows, system has 150 rows" be handled?**

The user designates a **primary key column** during first import (e.g., "Employee ID"). On re-import:
- Rows in both Excel and system, matched by key -> update with Excel values (user confirms which fields to update)
- Rows only in Excel -> new records, insert
- Rows only in system -> user-entered data, always preserve (never delete from re-import)
- Rows in both but with conflicts (both sides changed) -> show conflict resolution UI

**Q: Should there be a "migration plan" preview?**

Yes. The preview should be a dry-run showing exactly what will happen, with counts and sample data. The user should be able to export this plan as a report before applying it.

### What Makes This a Differentiator

| Capability | Current State of the Art | Feather Target |
|-----------|------------------------|----------------|
| Rename detection | Nobody does this | Fuzzy match + data fingerprinting |
| Schema diff preview | Nobody does this | Full diff UI with confidence scores |
| Persistent column mapping | Only Airtable remembers mappings | Full mapping with rename history |
| Conflict resolution | Nobody handles this | Three-way merge (old Excel, new Excel, system) |
| Audit trail | Nobody tracks import history | Every change recorded with provenance |
| Atomic migration | Most tools are append-only | Schema + data changes in one transaction |

The closest anything comes is dbt's `on_schema_change: sync_all_columns`, but that's for data engineers writing SQL. For a data consultant who receives updated Excel files from clients, **nothing exists that handles this gracefully**. This is genuinely greenfield.

### Anti-Patterns to Avoid

1. **Don't silently drop columns** (Grist's approach). Every dropped column should require explicit confirmation.
2. **Don't treat rename as delete+add** (dbt's approach). This loses the column's data and history.
3. **Don't require pre-creating columns** (Grist's approach). The import should offer to create them.
4. **Don't destructively overwrite child records** (Frappe's approach). Always preserve and merge.
5. **Don't gate basic functionality behind enterprise tiers** (Airtable HyperDB). Schema evolution should be a core feature.

### Implementation Complexity Estimate

This is not a trivial feature. The three phases break down roughly as:

- **Phase 1 (Schema Diff engine)**: Medium complexity. Fuzzy matching + data sampling. Pure backend logic, no UI. Could be an independent module.
- **Phase 2 (Confirmation UI)**: High complexity. Interactive diff viewer with checkboxes, confidence indicators, conflict resolution. This is where the UX work lives.
- **Phase 3 (Migration execution)**: Medium-high complexity. Atomic schema+data changes, rollback on failure, audit logging. Needs transactional guarantees.

The persistent column mapping is the foundation. Without it, every re-import starts from scratch (which is what every tool does today).

---

## Sources

- [Grist: Importing More Data](https://support.getgrist.com/imports/)
- [Grist Issue #1996: Allow column creation when merging to existing table](https://github.com/gristlabs/grist-core/issues/1996)
- [Grist Issue #1162: Blank values in matching columns](https://github.com/gristlabs/grist-core/issues/1162)
- [Airtable: CSV Import Extension](https://support.airtable.com/docs/csv-import-extension)
- [Airtable: Synced tables and changed field names](https://community.airtable.com/other-questions-13/synced-tables-and-changed-field-names-18802)
- [Airtable: HyperDB](https://support.airtable.com/hyperdb-in-airtable)
- [NocoDB: Upload data into existing table](https://nocodb.com/docs/product-docs/tables/import-data-into-existing-table)
- [NocoDB Issue #3438: Duplicate data in primary key on import](https://github.com/nocodb/nocodb/issues/3438)
- [NocoDB Issue #5256: Better column datatype mapping during import](https://github.com/nocodb/nocodb/issues/5256)
- [Frappe: Data Import documentation](https://docs.frappe.io/erpnext/user/manual/en/data-import)
- [Frappe Forum: Saving import tool mappings](https://discuss.frappe.io/t/saving-import-tool-mappings-so-the-mapping-can-be-selected-during-import/116091)
- [Frappe Issue #17258: data-import field mapping](https://github.com/frappe/frappe/issues/17258)
- [Odoo 19.0: Export and import data](https://www.odoo.com/documentation/19.0/applications/essentials/export_import_data.html)
- [Power Query: Rename columns when names change](https://exceloffthegrid.com/rename-columns-in-power-query-when-names-change/)
- [Power Query: Handling schema for connectors](https://learn.microsoft.com/en-us/power-query/handling-schema)
- [Power Query: Fixing missing columns dynamically](https://hatfullofdata.blog/power-query-fixing-missing-columns-dynamically/)
- [Power BI Community: Prevent refresh error when column headers change](https://community.fabric.microsoft.com/t5/Desktop/Prevent-data-refresh-error-when-column-headers-change-or-are/td-p/4593271)
- [dbt: Configure incremental models (on_schema_change)](https://docs.getdbt.com/docs/build/incremental-models)
- [dbt: Column-level lineage](https://docs.getdbt.com/docs/explore/column-level-lineage)
- [dbt Issue #7975: on_schema_change=fail for contracted models](https://github.com/dbt-labs/dbt-core/issues/7975)
