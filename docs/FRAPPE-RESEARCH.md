# Frappe Framework Deep Dive — Informing the "Dimensions Beyond CRUD" Framework

**Purpose:** Study how Frappe handles feature complexity beyond CRUD. Extract patterns for Feather's dimension framework.

**Last updated:** 2026-03-28

---

## Table of Contents

1. [DocType System](#1-doctype-system)
2. [Permissions Model](#2-permissions-model)
3. [Workflow Engine](#3-workflow-engine)
4. [Server Scripts and Hooks](#4-server-scripts-and-hooks)
5. [Reports and Aggregations](#5-reports-and-aggregations)
6. [Extensibility: Virtual DocTypes, Custom Fields, Property Setters](#6-extensibility)
7. [Frappe Apps](#7-frappe-apps)
8. [Print Formats, Web Views, Portal](#8-print-formats-web-views-portal)
9. [Data Import, Webhooks, REST API](#9-data-import-webhooks-rest-api)
10. [The Golden Patterns — What to Steal, What to Avoid](#10-the-golden-patterns)
11. [Mapping to Our 8 Dimensions](#11-mapping-to-our-8-dimensions)

---

## 1. DocType System

The DocType is Frappe's core abstraction. It is not just a "model" — it is a unified model-view-controller-API-permissions bundle defined in a single JSON file. Declaring a DocType gives you: a database table, a form UI, a list view, a REST API, role-based permissions, naming rules, print formats, and search indexing. All automatically.

### What metadata a DocType carries

A DocType JSON file contains:

| Property | Purpose |
|----------|---------|
| `fields` | Field definitions (child table of DocField records) |
| `permissions` | Role-based access rules (child table of DocPerm records) |
| `naming_rule` | How the primary key is generated |
| `autoname` | Expression pattern for name generation |
| `issingle` | Single-record storage (settings pattern) |
| `istable` | Child table (belongs to a parent) |
| `is_virtual` | No database table — data from external source |
| `is_tree` | Hierarchical nested set model |
| `is_submittable` | Enables Draft/Submitted/Cancelled lifecycle |
| `module` | App module assignment |
| `search_fields` | Fields indexed for search |
| `title_field` | Which field to show as display name |
| `sort_field` / `sort_order` | Default list ordering |
| `track_changes` | Enable version history |
| `track_seen` | Track which users have seen the document |

Every field definition includes:

| Property | Purpose |
|----------|---------|
| `fieldname` | Database column name |
| `fieldtype` | Data type (Data, Int, Link, Table, Select, etc.) |
| `label` | UI display text |
| `options` | Type-specific config (target DocType for Link, options for Select) |
| `reqd` | Mandatory flag |
| `unique` | Uniqueness constraint |
| `search_index` | Database index |
| `in_list_view` | Show in list view |
| `permlevel` | Permission level (0-9) for field-level access control |
| `depends_on` | Client-side visibility condition |
| `fetch_from` | Auto-populate from a linked document's field |
| `is_virtual` | Computed field (no database column) |
| `read_only` | Not editable by user |
| `hidden` | Not visible in form |
| `default` | Default value |

### System-managed fields (always present, no declaration needed)

- `name` — primary key / unique identifier
- `creation`, `modified` — automatic timestamps
- `owner`, `modified_by` — user tracking
- `docstatus` — document state: 0=Draft, 1=Submitted, 2=Cancelled
- `idx` — sort ordering for child tables
- `_user_tags`, `_comments`, `_assign`, `_liked_by` — collaboration features
- `_seen` — read tracking

### File structure of a DocType

```
{app}/{module}/doctype/{doctype_name}/
├── {doctype_name}.json      # Complete metadata definition
├── {doctype_name}.py        # Python controller class
├── {doctype_name}.js        # Client-side controller
├── {doctype_name}_list.js   # List view customization
├── {doctype_name}_calendar.js  # Calendar view customization
├── test_{doctype_name}.py   # Tests
```

### How controllers extend generated CRUD

The Python controller inherits from `frappe.model.Document` and can override any lifecycle hook:

```python
class SalesOrder(Document):
    def autoname(self):
        self.name = make_autoname(f"SO-.YYYY.-.#####")

    def before_validate(self):
        self.calculate_totals()

    def validate(self):
        if self.grand_total < 0:
            frappe.throw("Grand total cannot be negative")

    def before_save(self):
        self.set_status()

    def after_insert(self):
        frappe.sendmail(recipients=[self.customer_email],
                       message="Your order has been received")

    def on_submit(self):
        self.update_stock()
        self.create_delivery_note()

    def on_cancel(self):
        self.reverse_stock()

    def on_trash(self):
        self.check_linked_documents()
```

### Complete lifecycle hook order

**Insert flow:** `before_insert` -> `before_naming` -> `autoname` -> `before_validate` -> `validate` -> `before_save` -> `db_insert` -> `after_insert` -> `on_update` -> `on_change`

**Update flow:** `before_validate` -> `validate` -> `before_save` -> `db_update` -> `on_update` -> `on_change`

**Submit flow:** `before_submit` -> `on_submit`

**Update after submit:** `before_update_after_submit` -> `on_update_after_submit`

**Cancel flow:** `before_cancel` -> `on_cancel`

**Delete flow:** `on_trash` -> `after_delete`

**Rename flow:** `before_rename` -> `after_rename`

### The autoname system

Nine naming strategies:

| Strategy | Example | Result |
|----------|---------|--------|
| Set by user | Manual entry | User types the name |
| Autoincrement | Sequential | 1, 2, 3, ... |
| By fieldname | `field:customer_name` | "Acme Corp" |
| Naming Series | `naming_series` field on form | User picks prefix |
| Expression | `PRE-.#####` | PRE-00001, PRE-00002 |
| Expression (old) | `EXAMPLE-{MM}-{fieldname1}-{#####}` | EXAMPLE-03-Acme-00001 |
| Random | Alphanumeric | `a8f3b2c1d4` |
| UUID | UUID v4 | Standard UUID |
| By script | `autoname()` method | Fully custom |

The `autoname()` controller method has highest priority and can use `getseries()` for thread-safe incrementing:

```python
def autoname(self):
    prefix = f"P-{self.customer}-"
    self.name = getseries(prefix, 3)  # P-Acme-001, P-Acme-002
```

### Link fields and child tables

**Link fields** are foreign keys stored as VARCHAR(140) containing the target document's name:

```json
{
  "fieldname": "customer",
  "fieldtype": "Link",
  "options": "Customer"
}
```

The framework enforces referential integrity on delete via `check_no_back_links_exist()`.

**`fetch_from`** auto-populates a field from a linked document — no code needed:

```json
{
  "fieldname": "customer_name",
  "fieldtype": "Data",
  "fetch_from": "customer.customer_name"
}
```

When the user selects a Customer link, `customer_name` is automatically pulled in.

**Child tables** (fieldtype `Table`) are one-to-many relationships:

```json
{
  "fieldname": "items",
  "fieldtype": "Table",
  "options": "Sales Order Item"
}
```

Child DocTypes (`istable=1`) have no independent existence — their lifecycle is tied to the parent. Access is list-like:

```python
for item in doc.items:
    print(item.item_name, item.qty)
```

### Single DocTypes

DocTypes marked `issingle=1` store exactly one record (settings pattern). Uses key-value storage in `tabSingles` table instead of a dedicated table. Accessed without a name parameter:

```python
settings = frappe.get_doc("System Settings")
```

---

## 2. Permissions Model

Frappe implements three-layer access control.

### Layer 1: Role-Based Permissions (DocType level)

Each DocType defines a permissions table specifying what roles can do:

```json
{
  "role": "Sales User",
  "permlevel": 0,
  "read": 1,
  "write": 1,
  "create": 1,
  "delete": 0,
  "submit": 0,
  "cancel": 0,
  "amend": 0,
  "report": 1,
  "export": 1,
  "import": 0,
  "share": 1,
  "print": 1,
  "email": 1
}
```

Permission types: `read`, `write`, `create`, `delete`, `submit`, `cancel`, `amend`, `report`, `export`, `import`, `share`, `print`, `email`, `set_user_permissions`.

Users hold multiple roles. A user can perform an action if ANY of their roles grants that permission.

### Layer 2: Field-Level Permissions (permlevel)

Fields are grouped by permission level (0-9). Each level gets separate role assignments:

- Level 0 fields: visible/editable by Sales User, Sales Manager
- Level 1 fields (e.g., discount, margin): visible/editable only by Sales Manager

This means a sales executive sees 15 fields while a sales manager sees all 25. No code needed — pure configuration.

### Layer 3: User Permissions (row-level filtering)

User Permissions restrict which specific records a user can access based on Link field values:

- "User X can only see Sales Orders where Territory = 'West'"
- "User Y can only see documents they created"

This applies automatically to all queries — including list views, reports, and API calls.

### Built-in roles

- **Guest** — unauthenticated users
- **All** — all registered users
- **Administrator** — system creator (superuser)
- **Desk User** — system users (v15+)

### Permission enforcement in code

```python
# Check permission before operation
frappe.has_permission("Sales Order", "write", doc)

# Auto-applied to queries
frappe.get_list("Sales Order")  # automatically filtered by user permissions

# Explicit permission check
frappe.only_for("Sales Manager")
```

### How this maps to our "Access Rules" dimension

Frappe's three layers map cleanly:

| Frappe Layer | Our Concept | Mechanism |
|-------------|-------------|-----------|
| Role permissions | Action-level RBAC | Declarative in DocType JSON |
| Perm levels | Field-level visibility | Numeric grouping |
| User permissions | Row-level filtering | Link-field based restrictions |

**Key insight for Feather:** Frappe gets enormous power from making permissions **declarative** and **co-located with the model definition**. Not a separate permissions file — permissions are fields on the DocType itself. The field-level `permlevel` concept is elegant and rarely seen in other frameworks.

---

## 3. Workflow Engine

Frappe has a built-in, declarative workflow system that overlays any DocType.

### Core concepts

A Workflow definition consists of:

1. **Workflow** — links a DocType to a set of states and transitions
2. **Workflow States** — the possible states (e.g., "Pending Approval", "Approved", "Rejected")
3. **Workflow Transitions** — rules for moving between states

Only one active workflow per DocType is allowed.

### State definition

Each state specifies:

| Property | Purpose |
|----------|---------|
| `state` | Name (e.g., "Pending Approval") |
| `doc_status` | Underlying status: 0=Draft, 1=Submitted, 2=Cancelled |
| `update_field` | Which document field stores the state name |
| `allow_edit` | Which role can edit in this state |
| `style` | Visual indicator (Primary, Danger, Warning, etc.) |

Critical: **multiple workflow states can map to the same doc_status**. "Pending Approval" and "Draft" can both be doc_status=0 while being distinct workflow states. The `workflow_state` field stores the name, `docstatus` stores the number.

### Transition definition

Each transition specifies:

| Property | Purpose |
|----------|---------|
| `state` | Source state |
| `action` | Button label (e.g., "Approve", "Reject") |
| `next_state` | Target state |
| `allowed` | Role that can perform this transition |
| `condition` | Python expression that must evaluate to True |
| `allow_self_approval` | Whether document creator can approve their own |

Example condition:
```python
doc.grand_total > 100000  # Requires manager approval for large orders
```

### The Submit/Amend/Cancel lifecycle

This is unique to Frappe and central to business document management:

1. **Draft (docstatus=0)** — Document is editable, not yet final
2. **Submitted (docstatus=1)** — Document is finalized, locked for editing (except "Allow on Submit" fields)
3. **Cancelled (docstatus=2)** — Document is voided, creates audit trail
4. **Amended** — Creates a NEW document linked via `amended_from`, starts at Draft

Constraints:
- Cannot go directly from Draft to Cancelled
- Cannot revert from Submitted to Draft
- No transitions from Cancelled (only amendment creates new doc)
- Amendment preserves the full chain: SO-001 -> SO-001-1 -> SO-001-2

### Programmatic access

```python
from frappe.model.workflow import apply_workflow, get_transitions

# Get available transitions for current user
transitions = get_transitions(doc)

# Apply a transition
apply_workflow(doc, "Approve")
```

```javascript
// Client-side
frappe.xcall("frappe.model.workflow.apply_workflow", {
    doc: frm.doc,
    action: "Approve"
});
```

### How this maps to our "Status Flow" dimension

| Frappe Concept | Our Dimension Concept |
|---------------|----------------------|
| Workflow States | Status definitions |
| Transitions | Allowed transitions with role guards |
| Conditions | Transition guard expressions |
| doc_status (0/1/2) | Document lifecycle phase |
| Submit/Cancel/Amend | Immutability and audit trail |

**Key insight for Feather:** The **separation of workflow state from document status** is brilliant. `docstatus` is a 3-value lifecycle phase (draft/final/void). `workflow_state` is the business process state (pending review, approved by dept head, etc.). These are orthogonal concerns that Frappe correctly models as separate fields.

The Submit/Cancel/Amend pattern is also gold — it's how accounting actually works. Once a journal entry is posted, you don't edit it. You cancel it and create a new one. This preserves a complete audit trail.

---

## 4. Server Scripts and Hooks

Frappe has two mechanisms for side effects: **hooks.py** (Python, app-level) and **Server Scripts** (JavaScript-like, no-code).

### hooks.py — the app extension point

The `hooks.py` file in each Frappe app defines extension points. Key categories:

**Document events (doc_events):**
```python
doc_events = {
    "Sales Order": {
        "after_insert": "my_app.events.on_new_sales_order",
        "on_submit": "my_app.events.on_submit_sales_order",
        "on_cancel": "my_app.events.on_cancel_sales_order",
    },
    "*": {  # All DocTypes
        "after_insert": "my_app.events.log_creation",
    }
}
```

**Scheduled tasks (scheduler_events):**
```python
scheduler_events = {
    "hourly": ["my_app.tasks.hourly_cleanup"],
    "daily": ["my_app.tasks.daily_report"],
    "weekly": ["my_app.tasks.weekly_summary"],
    "monthly": ["my_app.tasks.monthly_archive"],
    "cron": {
        "15 18 * * *": ["my_app.tasks.evening_job"],
        "*/6 * * * *": ["my_app.tasks.frequent_check"],
    }
}
```

**Permission hooks:**
```python
has_permission = {
    "Event": "my_app.permissions.event_permission"
}
permission_query_conditions = {
    "Todo": "my_app.permissions.todo_query"
}
```

**Override hooks:**
```python
override_doctype_class = {
    "ToDo": "my_app.overrides.todo.CustomToDo"
}
override_whitelisted_methods = {
    "frappe.client.get_count": "my_app.custom_get_count"
}
```

**Session hooks:**
```python
on_login = "my_app.overrides.successful_login"
on_session_creation = "my_app.overrides.allocate_credits"
on_logout = "my_app.overrides.clear_cache"
```

**Website hooks:**
```python
website_route_rules = [
    {"from_route": "/projects/<name>", "to_route": "app/projects/project"}
]
portal_menu_items = [
    {"title": "Dashboard", "route": "/dashboard", "role": "Customer"}
]
```

**Fixtures:**
```python
fixtures = [
    "Category",
    {"dt": "Role", "filters": [["role_name", "like", "Admin%"]]}
]
```

**Jinja extensions:**
```python
jinja = {
    "methods": ["my_app.jinja.methods"],
    "filters": ["my_app.jinja.filters"]
}
```

### Server Scripts — no-code event handlers

Server Scripts are stored as documents (in the database, not files) and run JavaScript-like code on document events. They can be created by administrators without developer mode.

### How this maps to our dimensions

| hooks.py Feature | Our Dimension |
|-----------------|---------------|
| doc_events | **Side Effects** — event-driven reactions |
| scheduler_events | **Schedules** — cron-like recurring tasks |
| permission hooks | **Access Rules** — dynamic permission logic |
| override hooks | Extensibility mechanism (not a dimension) |
| website hooks | **Custom Views** — portal/website routing |

**Key insight for Feather:** The `doc_events` pattern with wildcard (`*`) support is powerful. It allows cross-cutting concerns (audit logging, notifications) to be registered once for all DocTypes. The `hooks.py` file acts as a **declaration of all side effects** an app introduces — readable at a glance.

The scheduler pattern with named frequencies (`hourly`, `daily`, `weekly`) plus full cron syntax is pragmatic. Most scheduled tasks fall into standard intervals.

---

## 5. Reports and Aggregations

Frappe provides three report types, plus dashboard widgets — a complete analytics story requiring zero to minimal code.

### Report Builder (zero code)

A drag-and-drop report builder accessible from any list view:
- Select fields to display
- Add filters
- Set sorting
- Group by a field
- Apply aggregations (Count, Sum, Average)
- Save and share

This is purely UI-driven. No code, no files, no deployment.

### Query Reports

Raw SQL queries stored as report files:

```python
# my_report.py
def execute(filters=None):
    columns = [
        {"fieldname": "customer", "label": "Customer", "fieldtype": "Link", "options": "Customer"},
        {"fieldname": "total", "label": "Total", "fieldtype": "Currency"},
    ]
    data = frappe.db.sql("""
        SELECT customer, SUM(grand_total) as total
        FROM `tabSales Order`
        WHERE docstatus = 1
        GROUP BY customer
    """, as_dict=True)
    return columns, data
```

### Script Reports (full code)

The most flexible option. The `execute()` method can return up to five things:

```python
def execute(filters=None):
    columns = [...]
    data = [...]
    chart = {
        "data": {"labels": [...], "datasets": [...]},
        "type": "bar"
    }
    report_summary = [
        {"value": 1000, "label": "Total Sales", "indicator": "Green", "datatype": "Currency"}
    ]
    message = "Additional context here"
    return columns, data, message, chart, report_summary
```

Filters are defined in a companion JS file:

```javascript
frappe.query_reports['My Report'] = {
    filters: [
        {
            fieldname: 'company',
            label: __('Company'),
            fieldtype: 'Link',
            options: 'Company',
            default: frappe.defaults.get_user_default("Company")
        }
    ]
};
```

### Dashboard Number Cards

Three types:

1. **Document Type** — Point at a DocType, pick an aggregation (Count, Sum, Average, Min, Max), add filters. Zero code.

2. **Report** — Pull a number from any report's column. Zero code.

3. **Custom** — Write a Python API:
```python
@frappe.whitelist()
def get_total_outstanding():
    return {
        "value": 50000,
        "fieldtype": "Currency",
        "route_options": {"status": "Unpaid"},
        "route": ["query-report", "Accounts Receivable"]
    }
```

### Dashboard Charts

Configured via a chart source with filters and a Python API:

```python
@frappe.whitelist()
def get_chart_data(filters):
    return {
        "labels": ["Jan", "Feb", "Mar"],
        "datasets": [
            {"values": [100, 200, 300], "name": "Revenue", "chartType": "bar"},
            {"values": [50, 80, 120], "name": "Expenses", "chartType": "line"},
        ],
        "type": "axis-mixed",
    }
```

Supports mixed chart types (bar + line in one visualization).

### How this maps to our dimensions

| Frappe Feature | Our Dimension |
|---------------|---------------|
| Report Builder aggregations | **Aggregations** — no-code SUM/COUNT/AVG |
| Script Report chart + summary | **Computed Values** + **Custom Views** |
| Number Cards | **Aggregations** — declarative KPIs |
| Dashboard Charts | **Custom Views** — visual data presentation |

**Key insight for Feather:** The graduated complexity model is brilliant:
1. **Zero code**: Report Builder, Document Type number cards
2. **SQL only**: Query Reports
3. **Full code**: Script Reports with charts and summaries

Most frameworks jump straight to "write code." Frappe gives you three rungs on the ladder. The number card pattern (point at a DocType + pick an aggregation) is especially worth stealing — it's the simplest possible way to add KPI widgets.

---

## 6. Extensibility

Frappe's extensibility model allows modifying any DocType's structure and behavior without touching its source code.

### Custom Fields

Add fields to ANY DocType — even framework core ones — without modifying the original JSON. Custom Fields are stored as separate documents that get merged at runtime:

```python
# Programmatic
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

create_custom_fields({
    "Sales Order": [
        {
            "fieldname": "custom_priority",
            "fieldtype": "Select",
            "label": "Priority",
            "options": "\nLow\nMedium\nHigh",
            "insert_after": "status"
        }
    ]
})
```

Custom Fields show up in forms, APIs, and reports just like native fields.

### Property Setter

Override any property of an existing field without touching the DocType:

- Change a field's label
- Make a field mandatory
- Change default value
- Modify options on a Select field
- Change field visibility

Stored as separate documents — the original DocType JSON is untouched.

### Client Scripts

Additional JavaScript event handlers for frontend behavior:

```javascript
frappe.ui.form.on('Sales Order', {
    customer(frm) {
        // Custom logic when customer changes
        frm.set_value('delivery_date', frappe.datetime.add_days(frappe.datetime.now_date(), 7));
    }
});
```

### Server Scripts

Python-like scripts stored as documents (not files) for backend logic. Can be created by admins without developer mode.

### Customize Form

A UI for making all the above changes through a visual interface — no code, no files.

### Fixtures

Export customizations (Custom Fields, Property Setters, Custom Scripts) as JSON for distribution:

```python
# hooks.py
fixtures = [
    "Custom Field",
    "Property Setter",
    {"dt": "Custom Script", "filters": [["dt", "=", "Sales Order"]]}
]
```

Run `bench export-fixtures` to generate JSON files. These ship with apps and apply on install.

### Virtual DocTypes

DocTypes with `is_virtual=1` have no database table. The controller provides data from any source:

```python
class ExternalCustomer(Document):
    @staticmethod
    def get_list(args):
        return external_api.fetch_customers(**args)

    @staticmethod
    def get_count(args):
        return external_api.count_customers(**args)

    def db_insert(self, *args, **kwargs):
        external_api.create_customer(self.as_dict())

    def db_update(self):
        external_api.update_customer(self.name, self.as_dict())
```

Virtual DocTypes get the same UI (forms, lists, search) and permissions as regular DocTypes. The data source is abstracted away.

**Key insight for Feather:** The Custom Field + Property Setter + Fixtures pipeline is how Frappe enables true plugin behavior. An app can ship a fixture that adds fields to Sales Order without modifying ERPNext's code. This is the mechanism that makes the "apps on top of apps" architecture work.

Virtual DocTypes are the integration story — wrap any external API in a DocType interface and it gets forms, permissions, and search for free.

---

## 7. Frappe Apps

### What IS a Frappe app?

A Frappe app is a Python package with a specific directory structure that plugs into the Frappe framework. It can contain DocTypes, pages, reports, hooks, and customizations.

```
apps/my_app/
├── my_app/
│   ├── __init__.py
│   ├── hooks.py          # Extension points (THE key file)
│   ├── modules.txt        # Module definitions
│   ├── patches.txt        # Database migrations
│   ├── public/            # Static assets → /assets/my_app/
│   ├── templates/         # Jinja templates
│   ├── www/               # Portal pages → website URLs
│   └── {module_name}/
│       └── doctype/
│           └── {doctype_name}/
│               ├── {doctype_name}.json
│               ├── {doctype_name}.py
│               └── {doctype_name}.js
├── requirements.txt
├── setup.py
└── package.json
```

### How apps extend core DocTypes

Apps extend functionality through three mechanisms:

1. **hooks.py** — Register doc_events, scheduled tasks, override methods
2. **Fixtures** — Ship Custom Fields, Property Setters, Server Scripts that modify existing DocTypes
3. **override_doctype_class** — Replace a DocType's Python controller entirely

### How ERPNext relates to Frappe

ERPNext is a Frappe app — it installs on top of the Frappe framework. The relationship:

```
frappe (framework)
└── erpnext (app)
    ├── Adds ~700+ DocTypes (Customer, Sales Order, GL Entry, etc.)
    ├── Adds business logic via controllers
    ├── Adds reports
    └── Adds website portal for customers/suppliers
```

### Third-party app ecosystem

Third-party apps install via bench:

```bash
bench get-app https://github.com/someone/my-frappe-app
bench --site mysite.localhost install-app my-frappe-app
```

Apps can:
- Add new DocTypes
- Add Custom Fields to ERPNext DocTypes
- Override ERPNext controllers
- Add new reports
- Add portal pages
- Register scheduled tasks

The distribution model is Git-based — apps are repos cloned into the bench.

### How this compares to our Feature/Bundle/Custom model

| Frappe Concept | Feather Concept |
|---------------|-----------------|
| Frappe framework | Core starter kit |
| ERPNext (app on framework) | A "bundle" of features |
| Third-party app | A "feature" or "plugin" |
| Fixtures | Feature configuration that modifies core |
| hooks.py | Feature registration / side effect declaration |

**Key insight for Feather:** Frappe's "app" concept is really a **full-stack plugin system**. An app doesn't just add backend code — it adds DocTypes (schema + UI + API + permissions), Custom Fields on other apps' DocTypes, scheduled tasks, portal pages, and report. The `hooks.py` file is the single manifest that declares everything the app does.

This is more powerful than our current Feature concept because Frappe apps can cross-cut: App A can add fields to App B's DocTypes. This enables composition that our current architecture doesn't support.

---

## 8. Print Formats, Web Views, Portal

### Print Formats

Every DocType gets a default print format based on its form layout. Custom print formats use Jinja templates:

```html
{% extends "frappe/templates/print_formats/standard.html" %}

{% block page_content %}
<h1>{{ doc.name }}</h1>
<table>
    {% for item in doc.items %}
    <tr>
        <td>{{ item.item_name }}</td>
        <td>{{ item.qty }}</td>
        <td>{{ frappe.format_value(item.amount, "Currency") }}</td>
    </tr>
    {% endfor %}
</table>
{% endblock %}
```

Frappe also has a Print Format Builder (drag-and-drop UI) for no-code print layouts.

### Portal Pages

The `www/` folder in any app maps directly to website URLs:

```
my_app/www/
├── about.html          → /about
├── projects/
│   ├── index.html      → /projects
│   └── detail.html     → /projects/detail
```

Each page can have a Python controller for dynamic data:

```python
# about.py
def get_context(context):
    context.team_members = frappe.get_all("Employee", fields=["name", "image"])
```

Portal pages are server-rendered Jinja templates extending `frappe/templates/web.html`. They can be public or require login.

### Web Views

DocTypes with "Has Web View" enabled get a public-facing page at `/{doctype}/{name}`. This is how ERPNext's customer portal works — customers see their Sales Orders, Invoices, etc. through web views.

### Dashboard configurations

Each DocType can define a dashboard showing related documents:

```python
def get_dashboard_data(data):
    data['transactions'] = [
        {'label': 'Fulfillment', 'items': ['Delivery Note', 'Sales Invoice']},
        {'label': 'Related', 'items': ['Maintenance Visit', 'Warranty Claim']},
    ]
    data['non_standard_fieldnames'] = {
        'Delivery Note': 'against_sales_order',
    }
    return data
```

This shows connected documents as a dashboard on the form — click a Sales Order and see all related Delivery Notes and Invoices.

### How this maps to our "Custom Views" dimension

| Frappe Feature | View Type |
|---------------|-----------|
| Form view | Auto-generated from DocType |
| List view | Auto-generated, customizable via `_list.js` |
| Calendar view | Via `_calendar.js` |
| Kanban view | Built-in board view |
| Tree view | For `is_tree` DocTypes |
| Print format | Jinja templates or drag-and-drop builder |
| Portal page | Server-rendered website pages |
| Web view | Public-facing document pages |
| Dashboard | Related document connections |

**Key insight for Feather:** Frappe provides ~8 different view types from a single DocType definition. The form, list, calendar, and kanban views are generated automatically. The connection dashboard (showing related documents) is especially valuable for business apps — it answers "what's connected to this record?" without any code.

---

## 9. Data Import, Webhooks, REST API

### Auto-generated REST API

Every DocType automatically gets a full REST API:

```
GET    /api/resource/:doctype              # List
POST   /api/resource/:doctype              # Create
GET    /api/resource/:doctype/:name        # Read
PUT    /api/resource/:doctype/:name        # Update
DELETE /api/resource/:doctype/:name        # Delete

GET    /api/method/:dotted.path            # Call whitelisted method
POST   /api/method/:dotted.path            # Call whitelisted method (with side effects)
POST   /api/method/upload_file             # File upload
```

Authentication: Token (API Key + Secret), Password (session cookies), or OAuth Bearer token.

Filtering: `filters=[["field","operator","value"]]` with AND/OR logic.
Expansion: `expand=True` resolves Link fields inline.
Pagination: `limit_start` and `limit_page_length`.

### Webhooks (declarative, no code)

Webhooks are configured as documents:

1. Select DocType (e.g., "Sales Order")
2. Select event (e.g., "on_submit")
3. Set condition (optional Python expression)
4. Set URL, method (POST), headers
5. Define payload as JSON with Jinja templating or Form URL-encoded with field selection

Security: Optional "Webhook Secret" adds `X-Frappe-Webhook-Signature` header with HMAC-SHA256.

Logging: Every webhook request creates a log entry for debugging.

### Data Import

Built-in import tool:
1. Download CSV template (auto-generated from DocType fields)
2. Fill in data in Excel/Sheets
3. Upload CSV
4. System validates and shows errors before importing
5. Import with progress tracking

For large files: `bench import-csv` command bypasses web timeout limits.

The import tool handles child tables — parent and child rows in the same CSV with parent fields repeated.

### How this maps to our "Integrations" dimension

| Frappe Feature | Integration Type |
|---------------|-----------------|
| Auto-generated REST API | API-first — every DocType is an endpoint |
| Webhooks | Push integration — notify external systems |
| Data Import/Export | Batch integration — CSV/Excel interchange |
| Virtual DocTypes | Pull integration — wrap external APIs as DocTypes |
| `@frappe.whitelist()` | Custom API endpoints |

**Key insight for Feather:** The auto-generated REST API is table stakes — Convex already provides this via functions. But the **declarative webhook configuration** is worth studying. No code, just fill in a form: DocType, event, URL, payload template. The Jinja templating in webhook payloads is elegant — it lets non-developers configure integrations.

The Data Import tool with auto-generated CSV templates maps directly to the VISION.md's "Excel as Bidirectional Data Layer" concept. Frappe already does a version of this.

---

## 10. The Golden Patterns

### What Frappe gets RIGHT

**1. The DocType as a universal abstraction**

One declaration gives you: database table, form, list view, calendar view, kanban board, REST API, permissions, search, print format, import/export, audit trail, and webhooks. This is the "97.42% of development effort eliminated" claim. Most frameworks give you a model and make you build everything else. Frappe gives you everything and lets you customize.

**2. Metadata as first-class data**

DocTypes are themselves stored as documents. This means you can query, filter, and manipulate schema programmatically just like any other data. "Customize Form" works because it's just adding Custom Field documents. This recursive metadata design is what enables the no-code customization story.

**3. Three-layer graduated complexity**

For every capability (reports, permissions, naming, views), Frappe offers:
- **No-code**: UI configuration, drag-and-drop
- **Low-code**: Expressions, simple scripts
- **Pro-code**: Full Python/JS controllers

This is the core philosophy: start with zero code, drop down to code only when the business logic demands it.

**4. The Submit/Cancel/Amend lifecycle**

This is how real business documents work. Invoices, journal entries, stock transfers — once finalized, they're immutable. You cancel and re-create. The `amended_from` chain preserves the full history. Most frameworks only model Draft/Published, missing this critical accounting pattern.

**5. Cross-app extensibility via fixtures**

App A can add fields to App B's DocTypes without modifying App B's code. This is the mechanism that makes ERPNext's ecosystem work — hundreds of third-party apps that extend core DocTypes.

**6. Declarative side effects**

`hooks.py` is a single file that declares ALL side effects an app introduces: doc_events, scheduled tasks, permission overrides, asset inclusions. You can read one file and understand what an app does.

**7. The `fetch_from` pattern**

Auto-populate fields from linked documents with zero code. When you select a Customer on a Sales Order, the customer's address, credit limit, and tax ID flow in automatically. This eliminates massive amounts of frontend code.

### What to AVOID (trade-offs)

**1. Tight coupling to the framework**

Frappe apps are deeply tied to the Frappe runtime. You can't take a Frappe DocType and use it in Django. The framework is the platform. For Feather, which sits on Convex + React, we should keep the dimension framework portable.

**2. jQuery and server-rendered UI**

Frappe's frontend is jQuery-based with server-rendered forms. This was a pragmatic choice for the admin UI but limits modern SPA patterns. Feather's React-first approach is correct.

**3. Global mutable state**

Frappe uses `frappe.local` for request-scoped globals. This works in a traditional web server but doesn't map to serverless (Convex functions). Our dimension framework needs to work with Convex's functional, stateless model.

**4. Performance at scale**

The metadata-driven approach adds overhead — every request loads DocType metadata, evaluates permissions, checks workflows. For simple CRUD this is overhead. For complex business logic it pays for itself. Feather should make the dimensions opt-in per entity, not a universal tax.

**5. Monolithic database schema**

All Frappe tables live in one database. Multi-tenant isolation is at the site level (separate databases per tenant). Convex handles this differently with project-level isolation.

**6. Naming as primary key**

Frappe uses human-readable names (like "SO-2024-00001") as primary keys. This is elegant for business users but creates complications with renames and long foreign key chains. Convex's ID-based approach is more robust.

### Patterns to steal for Feather

1. **The universal declaration** — One definition generates schema + UI + API + permissions + validation + audit. Our EntityDefinition should aspire to this.

2. **Graduated complexity** — No-code -> low-code -> pro-code for every dimension. Start with config, drop to code when needed.

3. **fetch_from / computed fields** — Declare "this field auto-populates from that linked record's field." Zero code for a common pattern.

4. **Submit/Cancel/Amend** — Offer this as an opt-in dimension for financial/audit entities.

5. **Declarative webhooks** — No-code webhook configuration. Event + URL + payload template.

6. **The hooks manifest** — One file per feature that declares all side effects. Readable at a glance.

7. **Permission levels on fields** — Group fields by sensitivity level, assign roles per level. Elegant and powerful.

8. **Related document dashboard** — Show all connected records on a document's page.

---

## 11. Mapping to Our 8 Dimensions

### Current 8 dimensions vs. Frappe's mechanisms

| Our Dimension | Frappe's Mechanism | Frappe's Approach | Insight for Feather |
|--------------|-------------------|-------------------|---------------------|
| **Access Rules** | 3-layer permissions (Role, Field-level, User) | Declarative in DocType JSON + Permission Manager UI | Our dimension should support all 3 layers. Field-level perms (permlevel) are a missing concept we should add. |
| **Status Flow** | Workflow engine + docstatus lifecycle | Declarative states/transitions stored as documents | Separate "lifecycle phase" (draft/final/void) from "business state" (pending/approved). Offer Submit/Cancel/Amend as opt-in. |
| **Side Effects** | doc_events in hooks.py + Server Scripts | Declarative event registration; wildcard for cross-cutting | Our dimension should support both per-entity and cross-entity (wildcard) event handlers. The hooks manifest pattern is valuable. |
| **Computed Values** | `fetch_from`, virtual fields, controller properties | Declarative for simple cases, code for complex | `fetch_from` (auto-populate from linked record) should be a first-class feature. Virtual/computed fields need a clear pattern. |
| **Aggregations** | Report Builder, Number Cards, Dashboard Charts | Zero-code for simple aggregations, code for complex | Offer declarative aggregation widgets (point at entity + pick aggregation) before requiring code. |
| **Custom Views** | 8+ auto-generated view types + Jinja templates + Portal | Most views generated from DocType definition | Our entity definition should generate form, list, kanban, and calendar views. The related-documents dashboard is a new view type to consider. |
| **Schedules** | scheduler_events in hooks.py | Named frequencies + cron syntax | Simple named frequencies (hourly, daily, weekly) cover 80% of cases. Full cron for the rest. |
| **Integrations** | REST API + Webhooks + Data Import + Virtual DocTypes | Auto-generated API, declarative webhooks, CSV templates | REST API is table stakes (Convex gives us this). Declarative webhooks and CSV import/export are the value-add dimensions. |

### Dimensions Frappe reveals that we're MISSING

**1. Naming / Identity**
How entities are identified — auto-increment, series with patterns, expression-based, user-defined. Frappe has 9 naming strategies. Our framework doesn't address this. Business users care deeply about document numbering (INV-2024-00001 vs a UUID).

**2. Document Lifecycle (Submit/Cancel/Amend)**
Distinct from Status Flow. This is about immutability and audit trails for finalized documents. Not every entity needs it, but financial/legal entities absolutely do.

**3. Extensibility / Plugin Surface**
How one feature can extend another feature's entities. Frappe's Custom Fields + Property Setter + Fixtures pipeline. Our current architecture doesn't support cross-feature extension.

**4. Related Documents / Connections**
How entities relate to each other beyond simple foreign keys. The dashboard that shows "this Sales Order has 2 Delivery Notes and 1 Invoice" is a dimension of complexity we haven't named.

**5. Data Import/Export**
The bidirectional data layer — generate templates, import CSV, export CSV. This maps directly to VISION.md but isn't captured in our 8 dimensions.

### Revised dimension framework (suggested)

Based on Frappe research, consider evolving from 8 to 11 dimensions:

1. **Access Rules** — Role permissions, field-level permissions, row-level filtering
2. **Status Flow** — Business states, transitions, role guards, conditions
3. **Document Lifecycle** — Draft/Submit/Cancel/Amend immutability pattern (NEW)
4. **Side Effects** — Event handlers, cross-entity reactions, notifications
5. **Computed Values** — fetch_from, virtual fields, derived data
6. **Aggregations** — Declarative KPIs, rollups, dashboards
7. **Custom Views** — Form/list/calendar/kanban/print/portal/dashboard
8. **Schedules** — Recurring tasks, cron, named frequencies
9. **Integrations** — Webhooks, API, data import/export
10. **Naming** — Identity patterns, series, expressions, human-readable keys (NEW)
11. **Extensibility** — How features extend each other's entities and behavior (NEW)

Or keep at 8 by folding:
- Document Lifecycle into Status Flow (as a sub-pattern)
- Naming into the core entity definition (not a "dimension")
- Extensibility as an architecture concern rather than a per-entity dimension

---

## Sources

- [DocType System - Frappe Framework](https://frappe.io/framework/doctype)
- [DocType Controllers - Frappe Docs](https://docs.frappe.io/framework/user/en/basics/doctypes/controllers)
- [DocType Naming - Frappe Docs](https://docs.frappe.io/framework/user/en/basics/doctypes/naming)
- [Users and Permissions - Frappe Docs](https://docs.frappe.io/framework/user/en/basics/users-and-permissions)
- [Users and Permissions - Frappe Framework](https://frappe.io/framework/users-and-permissions)
- [Role Based Permissions - ERPNext Docs](https://docs.frappe.io/erpnext/user/manual/en/role-based-permissions)
- [Field Level Permission Management - ERPNext Docs](https://docs.frappe.io/erpnext/changing-the-properties-of-a-field-based-on-role)
- [Managing Perm Level - ERPNext Docs](https://docs.frappe.io/erpnext/user/manual/en/managing-perm-level)
- [Workflows - ERPNext Docs](https://docs.frappe.io/erpnext/workflows)
- [Workflow in Frappe: The Document Approval Lifecycle - Frappe Forum](https://discuss.frappe.io/t/workflow-in-frappe-the-document-approval-lifecycle/157477)
- [Workflow Engine - ReadMeX](https://readmex.com/en-US/frappe/frappe/page-90335d98a-823c-4948-8a8e-4438e6b3587d)
- [Hooks Reference - Frappe Docs](https://docs.frappe.io/framework/v15/user/en/python-api/hooks)
- [Script Reports - Frappe Docs](https://docs.frappe.io/framework/user/en/desk/reports/script-report)
- [Reports - Frappe Docs](https://docs.frappe.io/framework/v15/user/en/desk/reports)
- [Frappe Number Cards and Dashboards - FossERP](https://fosserp.com/blog/technical/frappe-number-cards-and-dashboards-chart)
- [Customizing DocTypes - Frappe Docs](https://docs.frappe.io/framework/user/en/basics/doctypes/customize)
- [Apps - Frappe Docs](https://docs.frappe.io/framework/user/en/basics/apps)
- [Portal Pages - Frappe Docs](https://docs.frappe.io/framework/user/en/portal-pages)
- [REST API - Frappe Docs](https://docs.frappe.io/framework/user/en/api/rest)
- [Webhooks - Frappe Docs](https://docs.frappe.io/framework/v14/user/en/guides/integration/webhooks)
- [API and Integrations - Frappe Framework](https://frappe.io/framework/api-and-integrations)
- [Frappe Framework - Main Site](https://frappe.io/framework)
- [DocType System - DeepWiki](https://deepwiki.com/frappe/frappe/2.3-doctype-system-and-metadata-management)
- [Database Layer - DeepWiki](https://deepwiki.com/frappe/frappe/3-doctype-system-and-metadata-management)
- [Frappe Framework Guide 2025 - Medium](https://medium.com/@rakesh.k.scideas/frappe-framework-guide-features-architecture-use-cases-benefits-2025-edition-9d0af8a3c047)
- [Frappe Workflow Guide - Medium](https://medium.com/@aalam-info-solutions-llp/frappe-workflow-guide-streamline-your-processes-for-maximum-efficiency-25e5b55ed292)
- [Frappe Limitations Discussion - Frappe Forum](https://discuss.frappe.io/t/limitations-of-this-framework/16539)
- [Frappe DocType Lifecycle - Sabbirz](https://www.sabbirz.com/blog/frappe-doctype-lifecycle-explained)
