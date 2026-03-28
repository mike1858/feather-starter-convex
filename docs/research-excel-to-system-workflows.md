# Research: Excel Spreadsheet to Working System Workflows

**Purpose:** Analyze how ERP-oriented frameworks and spreadsheet-native tools handle the "I have an Excel of master data, I want a working system" use case. Extract practical patterns for a Feather-based workflow.

**Date:** 2026-03-28

---

## Table of Contents

1. [Frappe/ERPNext](#1-frappeerppnext--data-import-tool)
2. [Odoo](#2-odoo--importexport)
3. [Airtable](#3-airtable--spreadsheet-native-approach)
4. [NocoDB](#4-nocodb--spreadsheet-to-api)
5. [Retool / Internal Tool Builders](#5-retool--internal-tool-builders)
6. [Glide / Spreadsheet-First Builders](#6-glide--spreadsheet-first-builders)
7. [Flatfile / Import Infrastructure](#7-flatfile--import-infrastructure)
8. [Synthesis: Patterns Worth Stealing](#8-synthesis-patterns-worth-stealing)
9. [Proposed "Excel to Feather" Workflow](#9-proposed-excel-to-feather-workflow)
10. [Key Design Questions and Recommendations](#10-key-design-questions-and-recommendations)
11. [WHO/WHAT/WHERE/WHEN/HOW: Entity Classification from Spreadsheets](#11-whowhatwherewhenhowhow-entity-classification-from-spreadsheets)

---

## 1. Frappe/ERPNext -- Data Import Tool

### How It Works

ERPNext's Data Import Tool is designed for importing data into **pre-existing DocTypes** (schema already defined). It does NOT infer or create schema from spreadsheets.

### Step-by-Step Workflow

1. **Navigate to the DocType** you want to import into (e.g., Customer, Sales Order)
2. **Download the template** -- the system generates a CSV/Excel template with:
   - All columns matching the DocType's field definitions
   - Mandatory fields marked in **red**
   - Dependent ("depends on") fields marked in **yellow**
   - Option to download "All Tables" (parent + child tables) or single table
   - Option to "Download With Data" to see existing records as format examples
3. **Fill the template** in Excel/Google Sheets following the column structure
4. **Upload the CSV** and click "Upload and Import"
5. **Review validation errors** -- the tool validates against field types, mandatory fields, and link field existence
6. **Optionally submit** -- for submittable documents (invoices, orders), can auto-submit after import

### Column Mapping

- Automatic mapping when CSV column headers match DocType field labels exactly
- Manual mapping UI when automatic matching fails -- user clicks "Map Columns" and searches the field list
- No fuzzy matching or AI assistance

### Parent-Child Relationship Handling

ERPNext uses a distinctive CSV format for parent-child records:

```
| Order ID | Customer | ~ | Item Code | Qty | Rate |
|----------|----------|---|-----------|-----|------|
| ORD-001  | Acme Co  |   | WIDGET-A  | 10  | 25   |
|          |          |   | WIDGET-B  | 5   | 50   |
| ORD-002  | Beta Inc |   | GADGET-X  | 3   | 100  |
```

- The `~` character separates parent table columns from child table columns
- Parent data appears only on the first row
- Subsequent rows with blank parent fields belong to the same parent
- Each new parent starts on a fresh row

### Link Field (Foreign Key) Resolution

- Link fields reference other DocTypes by their **name** (primary key)
- The referenced record **must already exist** before import
- If a Sales Order references "Customer: Acme Co", a Customer record named "Acme Co" must exist
- No automatic creation of referenced records during import
- Validation fails if the linked record doesn't exist

### What's Painful

- **Strict import order required:** Must import Customers before Sales Orders, Items before Invoices. No dependency resolution or topological sorting.
- **Cannot create DocTypes from spreadsheets:** Schema must be pre-defined through the DocType builder UI. There is no "analyze this CSV and create a DocType" feature.
- **Name/ID confusion:** ERPNext auto-generates record names and may override imported IDs
- **1000-row limit per upload** to prevent crashes
- **UTF-8 encoding issues** with non-English characters in Excel
- **Template-first approach is rigid:** Users must conform to the template, not the other way around

### Best Pattern Worth Stealing

**The template download-fill-upload cycle.** Users never have to guess the format. They download a template that exactly matches the schema, fill it in, and upload. This eliminates ambiguity about column names, types, and required fields.

---

## 2. Odoo -- Import/Export

### How It Works

Odoo provides import functionality on every list view. Like ERPNext, it imports into pre-existing models. The key differentiator is its sophisticated handling of relationships through External IDs.

### Step-by-Step Workflow

1. **Open any list view** (Contacts, Products, Orders, etc.)
2. **Click the gear icon** and select "Import records"
3. **Download the import template** (pre-mapped columns for the model)
4. **Fill with data** in Excel or CSV
5. **Upload the file** -- Odoo shows a preview table with column mapping
6. **Map columns** -- Odoo auto-maps by header name match, user fixes mismatches
7. **Test the import** -- runs validation without committing
8. **Import** -- commits the data

### Foreign Key / Relationship Handling

Odoo supports three mechanisms for referencing related records:

**Many-to-One (e.g., Order -> Customer):**
```csv
Customer/External ID,Order Date,Total
company_acme,2024-01-15,5000
company_beta,2024-01-16,3000
```

Three ways to reference:
- **By Name:** `"Belgium"` (simplest, but fragile if names aren't unique)
- **By Database ID:** `"21"` (brittle, changes between databases)
- **By External ID:** `"base.be"` (recommended -- stable across imports)

**Many-to-Many (e.g., Product -> Tags):**
```csv
Product Name,Tags
Widget A,"Manufacturer,Retailer"
```
Comma-separated list of External IDs in a single cell. Alternative: split across multiple rows with the same product.

**One-to-Many (e.g., Order -> Order Lines):**
```csv
Order Name,Customer,Order Lines/Product,Order Lines/Qty
ORD-001,Acme Co,Widget A,10
,,Widget B,5
ORD-002,Beta Inc,Gadget X,3
```
Parent fields on first row only. Subsequent rows with blank parent fields are child rows of the same parent.

### External ID Strategy

This is Odoo's killer feature for imports:

- Every record can have an **External ID** (a human-readable stable identifier)
- Format: `module_name.record_id` (e.g., `my_import.customer_acme`)
- External IDs survive re-imports -- re-importing a record with an existing External ID **updates** instead of duplicating
- Cross-table references use `Field/External ID` column headers
- Users assign External IDs in the source system and carry them through all imports

### What's Painful

- **Still requires pre-existing models:** Cannot create new models from a spreadsheet
- **Import order matters:** Must import dependencies first (customers before orders)
- **Column header syntax is arcane:** `Order Lines/Product/External ID` for nested references
- **Many-to-many formatting is confusing:** Comma-separated IDs in a cell vs. multi-row approaches
- **No schema inference:** You must know the target model's structure before importing

### Best Pattern Worth Stealing

**External IDs for idempotent imports.** The ability to assign stable human-readable IDs that survive re-imports is essential for "spreadsheet as source of truth" workflows. It means users can edit the spreadsheet and re-import without creating duplicates.

---

## 3. Airtable -- Spreadsheet-Native Approach

### How It Works

Airtable treats the spreadsheet as the primary interface. Import creates a new table (or adds to existing), and the system attempts to infer field types from the data.

### Step-by-Step Workflow

**Creating a new base from CSV/Excel:**
1. **Click "Add a base"** and choose "Import from CSV" or "Import from Excel"
2. **Upload the file** -- Airtable parses it immediately
3. **Toggle "Auto-select field types"** ON/OFF:
   - ON: Airtable analyzes data patterns to infer types
   - OFF: All columns become single-line text
4. **Review the imported table** -- each sheet becomes a table
5. **Manually adjust** field types, create linked record fields, etc.

**Adding data to an existing table (CSV Import Extension):**
1. **Add the CSV Import Extension** to your base
2. **Drag and drop a CSV** file into the extension
3. **Map fields** -- left side shows table fields, right side shows CSV columns
4. **Handle linked records** -- if a CSV value matches an existing linked record's primary value, it auto-links; if not, it creates a new record in the linked table
5. **Click "Create records"** to import

### Field Type Inference Algorithm

When "Auto-select field types" is ON, Airtable checks:

| Pattern Detected | Inferred Type |
|-----------------|---------------|
| Consistent true/false convention (Y/N, 1/0, true/false) but NOT mixed conventions | Checkbox |
| Every cell is comma-separated, no token >20 chars, no repeated tokens, no digits-only tokens | Multi-select |
| All values match number patterns | Number |
| All values match date patterns | Date |
| All values match email patterns | Email |
| All values match URL patterns | URL |
| Everything else | Single line text |

### Linked Records During Import

**Critical limitation of native CSV import:** Cannot import directly into linked record fields.

**CSV Import Extension workaround:** CAN import into linked record fields:
- If the imported value matches an existing record's primary field in the linked table, it creates a link
- If no match, it creates a new record in the linked table with that value as the primary field
- Commas in values are treated as separators (creating multiple links), so quoted values are needed to preserve commas

### The "Spreadsheet to App" Gap

Airtable creates a **database with views**, not a full application. To get from spreadsheet to "app":
1. Import data -> table
2. Manually create linked record fields between tables
3. Build views (gallery, kanban, form, calendar)
4. Add automations
5. Build an Airtable Interface (dashboard-style app layer)

There is NO automatic detection of relationships between tables. If you import separate CSV files for Customers and Orders, you must manually create the link field and configure it.

### What's Painful

- **No relationship inference:** Each table is independent after import. User must manually create links.
- **Flat data stays flat:** Importing a denormalized spreadsheet does NOT auto-normalize into linked tables
- **25,000 row limit** on CSV Import Extension
- **Auto-select field types is conservative:** Many fields end up as text when they could be richer types
- **No schema-driven generation:** The "app" is just configured views, not generated code

### Best Pattern Worth Stealing

**Field type inference with user override.** The toggle between "auto-detect" and "everything is text" is the right UX. Let the system try, let the user correct. Also, the CSV Import Extension's approach of auto-linking by matching primary field values is elegant -- it means users don't need to think about IDs.

---

## 4. NocoDB -- Spreadsheet-to-API

### How It Works

NocoDB creates database tables from imported files and auto-generates a REST API for each table. It's the closest to "upload CSV, get a working backend."

### Step-by-Step Workflow

1. **Create a new table** via "Quick Import" or the base dashboard
2. **Upload CSV/Excel/JSON** (drag-and-drop or URL import)
3. **Configure options:**
   - Character encoding (default UTF-8)
   - "Use first record as header" (default ON)
   - "Import data" (default ON -- OFF imports only the schema/structure)
4. **Select columns** to include (all by default)
5. **Modify field names** if needed
6. **Auto-select field types** (optional toggle):
   - When ON, runs type inference
   - When OFF, all fields default to Single Line Text
7. **Click import** -- table is created with data
8. **REST API is auto-generated** -- full CRUD endpoints for the table

### Schema Inference (ExcelTemplateAdapter)

NocoDB's type inference is the most detailed of any tool researched:

| Data Pattern | Inferred Type |
|-------------|---------------|
| Content >255 chars or contains newlines | Long Text |
| Content <=255 chars, no newlines | Single Line Text |
| Values match true/false/yes/no/1/0 patterns | Checkbox |
| Comma-separated values (specific rules) | Multi-select |
| Non-comma-separated categorical values | Single Select |
| Integer values only | Integer |
| Decimal values | Decimal |
| Date values without time component | Date |
| Date values with time component | DateTime |

### Relationship Handling

**NocoDB does NOT auto-detect relationships during import.** Each imported file becomes an independent table. Relationships must be created manually through the UI:
- Create a "Link to Another Record" field
- Choose the related table
- Set relationship type (one-to-many, many-to-many)

### Auto-Generated API

After import, NocoDB provides:
- REST API with full CRUD for each table
- Filtering, sorting, pagination
- Swagger/OpenAPI documentation
- Authentication and access control

### What's Painful

- **5MB file size limit** on imports
- **No relationship detection:** Tables are islands after import
- **Type inference is conservative:** defaults to text when ambiguous
- **No normalization:** A flat spreadsheet stays flat
- **API is generic:** No business logic, validation beyond field types

### Best Pattern Worth Stealing

**"Import data" vs "Import schema only" toggle.** The ability to import just the structure (column names and types) without the data is powerful for prototyping. Also, **auto-generated API from schema** is the model -- upload CSV, get endpoints.

---

## 5. Retool -- Internal Tool Builders

### How It Works

Retool's workflow goes CSV -> Retool Database table -> Generated CRUD app.

### Step-by-Step Workflow

1. **Create new table** in Retool Database
2. **Choose "Import CSV"** (alternatives: "Generate schema with AI" or "Start from scratch")
3. **Upload CSV** -- Retool analyzes the file
4. **Map columns:** Rename fields, remove unnecessary columns, fix types, set primary key
5. **Confirm** -- table is created with all rows loaded
6. **Generate app** using "Generate with AI" option:
   - Describe what you want in plain English
   - Retool scaffolds a working CRUD app based on the actual schema
   - Uses gpt-4o-mini for generation
7. **Customize** -- adjust queries, add filters, write transformers

### Schema Inference

- Basic type detection on import (text, number, boolean, date)
- "Generate schema with AI" option for natural language table creation
- Column type can be manually adjusted during import

### Relationship Handling

Retool Database supports foreign keys, but:
- **No automatic relationship detection from CSV**
- Users must manually set up foreign keys after import
- When generating apps, Retool can include related queries if tables are properly linked

### What's Painful

- **150-row limit** on the free CSV-to-app utility
- **No multi-table import:** Each CSV becomes one table, relationships are manual
- **AI generation is surface-level:** Creates basic CRUD UI, not business logic
- **Still requires developer customization** for anything beyond basic CRUD

### Best Pattern Worth Stealing

**AI-described app generation on top of real schema.** The combination of "import CSV to get the schema" + "describe what you want in English to get the UI" is compelling. The schema grounds the AI -- it generates against real data types and real column names, not hallucinated ones.

---

## 6. Glide -- Spreadsheet-First Builders

### How It Works

Glide treats the spreadsheet as the living data source. The app reads from and writes to the spreadsheet in real-time.

### Step-by-Step Workflow

1. **Drop a spreadsheet** (Google Sheets or Excel) into Glide
2. **AI analyzes the data:** structure, relationships, content patterns
3. **AI proposes 3-6 app concepts** with development plans:
   - E.g., for a manufacturing sheet: production dashboard, cost analyzer, sales forecaster
4. **User selects a concept** or modifies the plan
5. **AI compiles the initial application** -- claims "90% or more done" in minutes
6. **User customizes** through the visual builder

### Key Differentiator: Spreadsheet IS the Database

- No import step -- the Google Sheet remains the source of truth
- Changes in the sheet reflect in the app and vice versa
- Relations, computed fields, and lookups are configured in Glide's data editor layer on top of the sheet
- Data structure analysis happens at the workbook level (across multiple sheets)

### What's Painful

- **Google Sheets as database hits scaling limits** (row limits, performance)
- **Relations are Glide-layer constructs** -- they don't exist in the sheet itself
- **Schema changes require updating both sheet and Glide config**
- **Not suited for transactional/ERP systems** -- no multi-user concurrency, no audit trails

### Best Pattern Worth Stealing

**AI proposing multiple app concepts from one dataset.** Instead of "here's your app," it's "here are 3-6 things you could build." This is brilliant because the same employee master data could power a leave tracker, a directory, a payroll system, or an org chart. The user picks the intent; the AI figures out the implementation.

---

## 7. Flatfile -- Import Infrastructure

### How It Works

Flatfile is not an app builder -- it's embeddable import infrastructure. It solves the "accept messy CSV from users" problem.

### Key Capabilities

- **95% automatic column matching** using ML and fuzzy matching
- **AI agent reshaping:** understands your schema and transforms inbound files to match (adding/removing columns, splitting/merging fields, unpivoting)
- **Data Hooks:** field-level and record-level validation/transformation during import
- **Step Hooks:** pause the import flow for human review

### What's Relevant for Feather

Flatfile's column matching algorithm is the gold standard:
1. Exact header match first
2. Fuzzy/synonym matching (e.g., "Phone #" -> "phone_number")
3. ML-based pattern matching for ambiguous columns
4. User review for unmatched columns with suggestions

### Best Pattern Worth Stealing

**Fuzzy column matching + AI reshaping.** When a user's Excel has "Dept" and the schema expects "department_id", the system should handle this gracefully. Flatfile's approach of "match what you can, ask about the rest" is the right UX.

---

## 8. Synthesis: Patterns Worth Stealing

### Tier 1: Must-Have Patterns

| Pattern | Source | Why It Matters |
|---------|--------|----------------|
| **Template download-fill-upload** | ERPNext | Eliminates format guessing. User works from a known-good structure |
| **External IDs for idempotent import** | Odoo | Re-import without duplicates. Spreadsheet stays the source of truth |
| **Field type inference with override** | Airtable, NocoDB | System tries to be smart; user corrects where needed |
| **"Schema only" vs "schema + data" import** | NocoDB | Prototype with structure first, load data second |
| **AI-proposed app concepts from data** | Glide | Multiple app possibilities from one dataset |

### Tier 2: Valuable Patterns

| Pattern | Source | Why It Matters |
|---------|--------|----------------|
| **Parent-child rows in flat CSV** | ERPNext, Odoo | Handles one-to-many relationships without multiple files |
| **Link by name (not ID)** | Airtable CSV Extension | Users think in names ("Acme Co"), not IDs ("cust_001") |
| **Fuzzy column matching** | Flatfile | Tolerates messy real-world spreadsheets |
| **Auto-generated API from schema** | NocoDB | Upload → endpoints in seconds |
| **AI + real schema = grounded generation** | Retool | Schema prevents AI hallucination |

### Tier 3: Nice-to-Have

| Pattern | Source | Why It Matters |
|---------|--------|----------------|
| **Import preview/test before commit** | Odoo | Catch errors before they're in the database |
| **Validation with color-coded fields** | ERPNext | Visual indication of mandatory/dependent fields |
| **Import remembers mappings** | Airtable Extension | Repeated imports are faster |

### Anti-Patterns to Avoid

| Anti-Pattern | Source | Why It Fails |
|-------------|--------|-------------|
| **Schema must exist before import** | ERPNext, Odoo | Kills the "I just have an Excel" use case |
| **Rigid template conformance** | ERPNext | Real-world data is messy |
| **No relationship inference** | ALL tools | Every tool requires manual relationship setup |
| **Flat import stays flat** | Airtable, NocoDB | Denormalized data creates data quality problems |
| **1000-row limits** | ERPNext | Arbitrary limits frustrate real migrations |

---

## 9. Proposed "Excel to Feather" Workflow

### The Core Insight

**No existing tool does what we want.** Every tool either:
- Requires schema to exist first (ERPNext, Odoo) -- "import into existing DocType"
- Creates flat tables without relationships (Airtable, NocoDB) -- "CSV → table, that's it"
- Treats the spreadsheet as the database (Glide) -- not suitable for transactional systems

The gap is: **Analyze spreadsheet structure → infer normalized schema with relationships → generate a full application.**

An LLM can fill this gap.

### Proposed 5-Step Workflow

#### Step 1: User Provides Excel File(s)

**Input formats supported:**
- **Single file, multiple sheets:** Each sheet = one entity (most common for ERP master data)
- **Multiple CSV files:** One per entity
- **Single flat file:** Denormalized data that needs normalization

**Conventions the user follows:**
- Sheet/file names = entity names (e.g., "Customers", "Products", "Orders")
- First row = column headers
- One row per record (except for parent-child patterns)

#### Step 2: LLM Analyzes the Spreadsheet

The LLM receives the spreadsheet structure (headers + sample rows) and infers:

**Field types** (like NocoDB/Airtable but LLM-powered):
```
"Employee Name" → string (required)
"Hire Date" → date
"Salary" → number (currency)
"Department" → enum/lookup (detected from repeated values)
"Email" → string (email format)
"Is Active" → boolean (from Y/N, true/false patterns)
```

**Entity classification** (WHO/WHAT/WHERE/WHEN/HOW):
```
"Employees" sheet → Master (WHO) — has unique names, stable data
"Products" sheet → Reference (WHAT) — has codes, descriptions, prices
"Orders" sheet → Transaction — has dates, references to other sheets, amounts
"Departments" sheet → Lookup/Enum — small set of repeated values
```

**Relationships** (the key innovation):
```
"Orders.customer_name" matches values in "Customers.name" → Foreign key
"Orders.product_code" matches values in "Products.code" → Foreign key
"Employees.department" has only 5 unique values → Extract to lookup table
```

**Normalization opportunities:**
```
"Orders" sheet has "customer_name, customer_email, customer_phone"
→ Suggest: extract Customer columns to Customers table, link by ID
```

#### Step 3: User Reviews and Adjusts

Present the analysis as an interactive confirmation:

```
Detected Entities:
  ✅ customers (Master) — 45 records
     - name: string (required, unique) ← PRIMARY DISPLAY
     - email: string (email)
     - phone: string (phone)
     - city: string

  ✅ products (Reference) — 120 records
     - code: string (required, unique) ← PRIMARY DISPLAY
     - name: string (required)
     - price: number (currency)
     - category: → extracted to "categories" lookup

  ✅ orders (Transaction) — 500 records
     - order_date: date (required)
     - customer: → links to customers.name
     - status: enum [pending, shipped, delivered]

  🆕 categories (Lookup) — extracted from products.category
     - name: string (required, unique)
     Values: [Electronics, Clothing, Food, Hardware]

  🆕 order_items (Child of orders) — normalized from flat order rows
     - product: → links to products.code
     - quantity: number
     - unit_price: number

Relationships:
  orders.customer → customers (many-to-one)
  order_items.order → orders (many-to-one, child table)
  order_items.product → products (many-to-one)
  products.category → categories (many-to-one)

Questions:
  1. "Department" column in Employees has 8 unique values.
     Extract to a separate table? [Yes/No]
  2. "Status" in Orders has 3 values.
     Treat as enum field or separate table? [Enum/Table]
```

**User can:**
- Rename entities and fields
- Change inferred types
- Accept or reject normalization suggestions
- Add missing relationships
- Mark fields as required/optional
- Choose display fields

#### Step 4: Generate feather.yaml

The confirmed analysis becomes a feather.yaml:

```yaml
entities:
  customers:
    type: master
    display_field: name
    fields:
      name: { type: string, required: true, unique: true }
      email: { type: string, format: email }
      phone: { type: string, format: phone }
      city: { type: string }

  categories:
    type: lookup
    display_field: name
    fields:
      name: { type: string, required: true, unique: true }
    seed_data: [Electronics, Clothing, Food, Hardware]

  products:
    type: reference
    display_field: name
    fields:
      code: { type: string, required: true, unique: true }
      name: { type: string, required: true }
      price: { type: number, format: currency }
      category: { type: relation, target: categories, display: name }

  orders:
    type: transaction
    display_field: order_number
    fields:
      order_number: { type: string, auto: true, prefix: "ORD-" }
      order_date: { type: date, required: true }
      customer: { type: relation, target: customers, display: name }
      status: { type: enum, values: [pending, shipped, delivered] }
    children:
      order_items:
        fields:
          product: { type: relation, target: products, display: name }
          quantity: { type: number, required: true }
          unit_price: { type: number, format: currency }
```

#### Step 5: Import Data After Generation

After the code generators produce the application:

1. **Generate seed data script** from the original Excel
2. **Resolve lookups first:** Create categories, departments, etc.
3. **Import masters second:** Customers, employees, products (referencing lookups)
4. **Import transactions last:** Orders (referencing masters), with child rows
5. **Map spreadsheet values to IDs:** "Acme Co" in the CSV → `customers.find(name: "Acme Co").id` in the DB
6. **Report results:** "Imported 45 customers, 120 products, 500 orders (with 1,247 line items). 3 rows skipped (see errors)."

**The seed script approach (not raw CSV import):**
```typescript
// convex/seed/importFromExcel.ts
// Generated from the original Excel analysis

import { internalMutation } from "../_generated/server";

export const seedFromExcel = internalMutation(async ({ db }) => {
  // Phase 1: Lookups
  const categoryIds = new Map();
  for (const name of ["Electronics", "Clothing", "Food", "Hardware"]) {
    const id = await db.insert("categories", { name });
    categoryIds.set(name, id);
  }

  // Phase 2: Masters
  const customerIds = new Map();
  for (const row of customersData) {
    const id = await db.insert("customers", {
      name: row.name,
      email: row.email,
      // ...
    });
    customerIds.set(row.name, id);
  }

  // Phase 3: Transactions (with relationship resolution)
  for (const row of ordersData) {
    const customerId = customerIds.get(row.customer_name);
    if (!customerId) { errors.push(`Unknown customer: ${row.customer_name}`); continue; }

    const orderId = await db.insert("orders", {
      customer: customerId,
      order_date: parseDate(row.order_date),
      status: row.status,
    });

    // Child rows
    for (const item of row.items) {
      const productId = productIds.get(item.product_code);
      await db.insert("order_items", {
        order: orderId,
        product: productId,
        quantity: item.quantity,
        unit_price: item.unit_price,
      });
    }
  }
});
```

---

## 10. Key Design Questions and Recommendations

### Q1: Should the Excel file BE the schema definition?

**Recommendation: No. Excel is the INPUT; YAML is the schema.**

| Approach | Pros | Cons |
|----------|------|------|
| Excel IS the schema (Glide model) | Zero friction, no new format to learn | Can't express types, constraints, relationships in cells; schema and data are tangled |
| Excel → YAML → Generation | Clean separation of concerns; YAML is version-controllable, diffable, machine-readable | Extra step, user must review YAML |

The Glide approach (spreadsheet = database) doesn't work for transactional systems. You need proper schema for validation, relationships, field types, and business rules. The LLM bridges the gap -- it reads the Excel and proposes the YAML, so the user doesn't write YAML from scratch.

### Q2: How to handle "Excel has flat data but the system needs normalized tables"?

**Recommendation: LLM-powered normalization with user confirmation.**

Detection heuristics:
1. **Column name patterns:** `customer_name, customer_email, customer_phone` in an Orders sheet → extract to Customer entity
2. **Repeated value groups:** If 3+ columns always change together, they likely belong to a separate entity
3. **Low cardinality columns:** A column with <20 unique values in 1000+ rows is likely a lookup/enum
4. **Cross-sheet value matching:** If values in Orders.customer match values in Customers.name, there's a relationship

The LLM should propose normalization but NEVER auto-apply it. Show the user:
```
Found: Orders sheet has customer_name, customer_email, customer_phone
These 3 columns have 45 unique combinations across 500 order rows.
Suggestion: Extract to a Customers table and link by customer_name.
[Accept] [Keep Flat]
```

### Q3: How to handle lookups (e.g., "Department: Engineering" → department_id)?

**Recommendation: Import by display value, resolve to ID at import time.**

The Airtable CSV Import Extension pattern is correct:
- User's Excel says `Department: Engineering`
- System looks up the Departments table for a record where `name = "Engineering"`
- If found: links to that record's ID
- If not found: creates a new Department record with name "Engineering" and links to it

This is more user-friendly than requiring IDs in the spreadsheet. Users think in names, not IDs.

### Q4: Should sample data from Excel seed the development database?

**Recommendation: Yes, absolutely.**

This is one of the highest-value features:
1. **Developers see realistic data immediately** -- not Lorem Ipsum
2. **Data validates the schema** -- if import fails, the schema is wrong
3. **Users can verify the system** -- "Yes, that's my data, displayed correctly"
4. **Seed scripts are reproducible** -- re-run during development as schema evolves

The seed script should be a Convex mutation that can be run on demand, not a one-time import tool.

### Q5: What should the LLM infer vs. what requires user input?

| LLM Infers (High Confidence) | LLM Suggests (Needs Confirmation) | User Must Provide |
|-------------------------------|-----------------------------------|--------------------|
| Field types (string, number, date, boolean) | Entity type (master vs transaction) | Business rules and validation |
| Required fields (from non-null patterns) | Normalization opportunities | Workflow states and transitions |
| Unique fields (from uniqueness in data) | Enum vs lookup table decision | Permissions and access control |
| Display field (first text column or "name") | Relationship direction | Computed fields / derived values |
| Basic relationships (value matching) | Auto-generated fields (IDs, timestamps) | Custom UI requirements |

---

## 11. WHO/WHAT/WHERE/WHEN/HOW: Entity Classification from Spreadsheets

### How an LLM Should Analyze Spreadsheet Structure

Given that "an Excel spreadsheet of master data IS a business document," the LLM can classify entities by examining:

#### Master Tables (WHO: employees, customers, suppliers)

**Signals:**
- Sheet/column names containing: name, employee, customer, supplier, vendor, contact, person, user
- Contains personal data columns: email, phone, address, date_of_birth
- Records are relatively stable (inferred from data patterns -- no date-range columns)
- Each row represents a unique real-world entity
- Low row count relative to transaction sheets (50-500 vs 5,000+)

**Data pattern:**
```
| Employee ID | Name         | Email              | Department  | Hire Date  |
|-------------|-------------|--------------------|-------------|------------|
| EMP-001     | John Smith  | john@company.com   | Engineering | 2023-01-15 |
```

#### Reference Tables (WHAT: products, services, categories)

**Signals:**
- Sheet/column names containing: product, item, service, SKU, code, catalog
- Contains descriptive columns: description, specification, unit, price
- Has identifier/code columns (SKU, item_code, product_id)
- Medium cardinality: more than a lookup, fewer than transactions

**Data pattern:**
```
| Product Code | Name         | Category    | Unit Price | Unit |
|-------------|-------------|-------------|------------|------|
| WIDGET-A    | Blue Widget | Electronics | 25.00      | Each |
```

#### Transaction Tables (orders, movements, entries)

**Signals:**
- Sheet/column names containing: order, invoice, payment, entry, transaction, movement
- **Always has a date column** -- the defining characteristic
- References other sheets (customer name, product code appear as columns)
- Has quantity/amount columns
- High row count relative to master sheets
- May have status columns (pending, approved, shipped)
- May have child rows (order lines, invoice items)

**Data pattern:**
```
| Order #  | Date       | Customer   | Product    | Qty | Amount  | Status  |
|----------|-----------|------------|------------|-----|---------|---------|
| ORD-001  | 2024-01-15 | Acme Co   | WIDGET-A   | 10  | 250.00  | Shipped |
| ORD-001  | 2024-01-15 |            | WIDGET-B   | 5   | 125.00  |         |
```

#### Lookup / Enum Tables

**Signals:**
- **Very low cardinality:** <20 unique values in a column across all rows
- Common lookup domains: status, type, category, department, country, currency
- Values appear repeatedly across many rows in other sheets
- Often NOT a separate sheet -- extracted from a column in another sheet

**Detection algorithm:**
```
For each column in every sheet:
  unique_values = count distinct values
  total_rows = count rows
  if unique_values < 20 AND unique_values / total_rows < 0.05:
    → Candidate lookup table
    → Especially if this column is referenced from multiple sheets
```

### Classification Decision Tree

```
Sheet Analysis:
│
├─ Has date column + references other sheets + amounts/quantities?
│   → TRANSACTION (orders, invoices, journal entries)
│   └─ Has repeated parent rows with varying child data?
│       → TRANSACTION WITH CHILDREN (order + order_items)
│
├─ Has name/person columns + personal data (email, phone)?
│   → MASTER - WHO (employees, customers, suppliers)
│
├─ Has code/SKU columns + descriptions + prices?
│   → REFERENCE - WHAT (products, services, inventory items)
│
├─ Has address/location columns as primary data?
│   → REFERENCE - WHERE (warehouses, offices, branches)
│
├─ Very few rows (<20) + values appear in other sheets as column values?
│   → LOOKUP/ENUM (departments, statuses, categories)
│
└─ None of the above?
    → Ask the user
```

### Cross-Sheet Relationship Detection

```
For each pair of sheets (A, B):
  For each text column in A:
    For each text column in B:
      overlap = A.column ∩ B.column (value intersection)
      if overlap / min(|A.column|, |B.column|) > 0.8:
        → Strong relationship candidate
        if |unique(A.column)| << |unique(B.column)|:
          → B references A (A is the master, B has the foreign key)
        else:
          → A references B
```

---

## Sources

### Frappe/ERPNext
- [ERPNext Data Import Documentation](https://docs.frappe.io/erpnext/user/manual/en/data-import)
- [ERPNext Data Import Tool (GitHub)](https://github.com/frappe/manual_erpnext_com/blob/master/manual_erpnext_com/www/contents/setting-up/data/data-import-tool.md)
- [ERPNext Data Import from Excel - Medium](https://technofunctionallearning.medium.com/erpnext-open-source-data-import-from-excel-csv-part-01-how-to-import-sales-quotation-from-csv-6a842d9fc62f)
- [ERPNext Import Link Fields - Forum](https://discuss.frappe.io/t/importing-data-w-link-fields/33410)

### Odoo
- [Odoo 18.0 Export/Import Documentation](https://www.odoo.com/documentation/18.0/applications/essentials/export_import_data.html)
- [Odoo 19.0 Export/Import Documentation](https://www.odoo.com/documentation/19.0/applications/essentials/export_import_data.html)
- [Odoo CSV Import FAQ](https://www.odoo.com/forum/help-1/how-to-import-a-one2many-field-in-odoo12-community-version-145714)

### Airtable
- [Importing Third-Party Data into Airtable](https://support.airtable.com/docs/importing-third-party-data-into-airtable)
- [CSV Import Extension](https://support.airtable.com/docs/csv-import-extension)
- [Import with Linked Data - Community](https://community.airtable.com/base-design-9/import-with-linked-data-31644)

### NocoDB
- [Create Table via Import](https://nocodb.com/docs/product-docs/tables/create-table-via-import/)
- [NocoDB Data Integration - DeepWiki](https://deepwiki.com/nocodb/nocodb-1/6-data-integration)
- [NocoDB Documentation](https://docs.nocodb.com/)

### Retool
- [Generate App from CSV](https://retool.com/utilities/generate-app-from-csv)
- [AI App Generation in Retool](https://retool.com/blog/ai-generated-apps)
- [Retool AI AppGen Docs](https://docs.retool.com/education/labs/ai/assist)

### Glide
- [Glide AI-Powered App Builder](https://www.createwith.com/tool/glide/updates/glide-returns-to-its-spreadsheet-roots-with-ai-powered-app-builder)
- [Spreadsheet to App Converter](https://www.glideapps.com/blog/spreadsheet-to-app-converter)
- [Glide Google Sheets Integration](https://www.glideapps.com/data-sources/google-sheets)

### Flatfile
- [Flatfile Portal - CSV Importer](https://flatfile.com/platform/portal/)
- [Data Hooks Guide](https://flatfile.com/blog/flatfileioblogdata-hooks-guide/)
- [Data Normalization: Manual vs Automatic](https://flatfile.com/blog/data-normalization-manual-vs-automatic/)

### LLM + Spreadsheet Normalization
- [Effortless Spreadsheet Normalisation with LLM](https://medium.com/data-science-collective/effortless-spreadsheet-normalisation-with-llm-c1b28669b729)
- [LlamaSheets: Turn Messy Spreadsheets Into AI-Ready Data](https://www.llamaindex.ai/blog/announcing-llamasheets-turn-messy-spreadsheets-into-ai-ready-data-beta)
