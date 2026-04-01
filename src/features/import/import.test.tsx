// Test Matrix: useImportWizard hook
// | # | State                     | Approach | What to verify                                      |
// |---|---------------------------|----------|-----------------------------------------------------|
// | 1 | Initial state             | Unit     | step is "upload", entities/relationships empty       |
// | 2 | goNext from upload        | Unit     | advances to "entities"                               |
// | 3 | goBack from entities      | Unit     | returns to "upload"                                  |
// | 4 | goToStep                  | Unit     | jumps to specific step directly                      |
// | 5 | goNext at review (edge)   | Unit     | stays at "review" (no next step)                     |
// | 6 | goBack at upload (edge)   | Unit     | stays at "upload" (no previous step)                 |
// | 7 | setFile                   | Unit     | stores file in state                                 |
// | 8 | setAnalysisResult         | Unit     | populates entities, moves to "entities" step         |
// | 9 | updateEntity              | Unit     | modifies entity at index                             |
// |10 | updateField               | Unit     | modifies field within entity                         |
// |11 | removeRelationship        | Unit     | removes relationship at index                        |
// |12 | addRelationship           | Unit     | adds new relationship                                |
// |13 | canGoNext/canGoBack flags | Unit     | correct at boundaries                                |
//
// Test Matrix: DropZone component
// | # | State              | Approach | What to verify                                       |
// |---|---------------------|----------|------------------------------------------------------|
// |14 | Default render      | Unit     | shows upload text                                    |
// |15 | isAnalyzing=true    | Unit     | shows loading spinner                                |
// |16 | Invalid file        | Unit     | shows error message                                  |
// |17 | Valid .xlsx file    | Unit     | calls onFileSelected                                 |
//
// Test Matrix: Step components
// | # | Component          | Approach | What to verify                                       |
// |---|---------------------|----------|------------------------------------------------------|
// |18 | Step1Entities       | Unit     | renders entities with confidence badges               |
// |19 | FieldTypeDropdown   | Unit     | renders all 11 field types                           |
// |20 | Step3Relationships  | Unit     | renders relationships, remove button works            |
// |21 | SampleDataPreview   | Unit     | compact mode shows inline values                     |
// |22 | DashboardReview     | Unit     | renders entity tabs and confirm button               |

import { describe, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { renderHook, act } from "@testing-library/react";
import { test } from "@cvx/test.setup";
import { useImportWizard } from "./hooks/useImportWizard";
import { DropZone } from "./components/DropZone";
import { Step1Entities } from "./components/Step1Entities";
import { Step2Fields } from "./components/Step2Fields";
import { Step3Relationships } from "./components/Step3Relationships";
import { FieldTypeDropdown } from "./components/FieldTypeDropdown";
import { SampleDataPreview } from "./components/SampleDataPreview";
import { DashboardReview } from "./components/DashboardReview";
import { ColumnGroupAccordion } from "./components/ColumnGroupAccordion";
import type { InferredEntity, DetectedRelationship } from "./types";
import type { InferredField } from "~/templates/pipeline/excel/type-inference";

// ── Test data factories ──────────────────────────────────────────────────────

function makeEntity(overrides: Partial<InferredEntity> = {}): InferredEntity {
  return {
    name: "customers",
    label: "Customers",
    labelPlural: "Customerss",
    entityType: "master",
    confidence: 85,
    fields: {
      name: {
        name: "name",
        type: "string",
        required: true,
        confidence: 90,
      },
      email: {
        name: "email",
        type: "email",
        required: true,
        confidence: 95,
      },
      age: {
        name: "age",
        type: "number",
        required: false,
        confidence: 80,
      },
      notes: {
        name: "notes",
        type: "text",
        required: false,
        confidence: 60,
      },
    },
    sourceSheet: "Customers",
    ...overrides,
  };
}

function makeRelationship(
  overrides: Partial<DetectedRelationship> = {},
): DetectedRelationship {
  return {
    sourceEntity: "orders",
    targetEntity: "customers",
    sourceField: "customerId",
    confidence: 70,
    type: "belongs_to",
    ...overrides,
  };
}

// ── useImportWizard hook tests ───────────────────────────────────────────────

describe("useImportWizard", () => {
  test("initial state has step upload and empty entities", () => {
    const { result } = renderHook(() => useImportWizard());
    expect(result.current.state.step).toBe("upload");
    expect(result.current.state.entities).toEqual([]);
    expect(result.current.state.relationships).toEqual([]);
    expect(result.current.state.file).toBeNull();
    expect(result.current.state.importId).toBeNull();
    expect(result.current.state.analysisMethod).toBeNull();
  });

  test("goNext advances from upload to entities", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() => result.current.goNext());
    expect(result.current.state.step).toBe("entities");
  });

  test("goBack goes from entities to upload", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() => result.current.goNext()); // upload -> entities
    act(() => result.current.goBack());
    expect(result.current.state.step).toBe("upload");
  });

  test("goToStep jumps directly to a specific step", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() => result.current.goToStep("relationships"));
    expect(result.current.state.step).toBe("relationships");
  });

  test("goNext at review step stays at review", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() => result.current.goToStep("review"));
    act(() => result.current.goNext());
    expect(result.current.state.step).toBe("review");
  });

  test("goBack at upload step stays at upload", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() => result.current.goBack());
    expect(result.current.state.step).toBe("upload");
  });

  test("setFile stores file in state", () => {
    const { result } = renderHook(() => useImportWizard());
    const mockFile = new File(["data"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    act(() => result.current.setFile(mockFile));
    expect(result.current.state.file).toBe(mockFile);
  });

  test("setAnalysisResult populates entities and jumps to entities step", () => {
    const { result } = renderHook(() => useImportWizard());
    const entities = [makeEntity()];
    const relationships = [makeRelationship()];
    act(() =>
      result.current.setAnalysisResult({
        entities,
        relationships,
        importOrder: ["customers"],
        method: "heuristic",
        importId: "import-123",
      }),
    );
    expect(result.current.state.entities).toEqual(entities);
    expect(result.current.state.relationships).toEqual(relationships);
    expect(result.current.state.importOrder).toEqual(["customers"]);
    expect(result.current.state.step).toBe("entities");
    expect(result.current.state.importId).toBe("import-123");
    expect(result.current.state.analysisMethod).toBe("heuristic");
  });

  test("updateEntity modifies entity at index", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() =>
      result.current.setAnalysisResult({
        entities: [makeEntity()],
        relationships: [],
        importOrder: [],
        method: "heuristic",
        importId: "i1",
      }),
    );
    act(() => result.current.updateEntity(0, { label: "Updated Label" }));
    expect(result.current.state.entities[0].label).toBe("Updated Label");
  });

  test("updateField modifies field within entity", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() =>
      result.current.setAnalysisResult({
        entities: [makeEntity()],
        relationships: [],
        importOrder: [],
        method: "heuristic",
        importId: "i1",
      }),
    );
    act(() =>
      result.current.updateField(0, "email", { type: "string" }),
    );
    expect(result.current.state.entities[0].fields.email.type).toBe("string");
  });

  test("removeRelationship removes at index", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() =>
      result.current.setAnalysisResult({
        entities: [makeEntity()],
        relationships: [makeRelationship(), makeRelationship({ sourceField: "otherId" })],
        importOrder: [],
        method: "heuristic",
        importId: "i1",
      }),
    );
    expect(result.current.state.relationships).toHaveLength(2);
    act(() => result.current.removeRelationship(0));
    expect(result.current.state.relationships).toHaveLength(1);
    expect(result.current.state.relationships[0].sourceField).toBe("otherId");
  });

  test("addRelationship appends new relationship", () => {
    const { result } = renderHook(() => useImportWizard());
    act(() =>
      result.current.addRelationship(makeRelationship({ sourceField: "newField" })),
    );
    expect(result.current.state.relationships).toHaveLength(1);
    expect(result.current.state.relationships[0].sourceField).toBe("newField");
  });

  test("canGoNext is false on review step, canGoBack is false on upload step", () => {
    const { result } = renderHook(() => useImportWizard());
    // At upload: canGoNext=true, canGoBack=false
    expect(result.current.canGoNext).toBe(true);
    expect(result.current.canGoBack).toBe(false);
    // At review: canGoNext=false, canGoBack=true
    act(() => result.current.goToStep("review"));
    expect(result.current.canGoNext).toBe(false);
    expect(result.current.canGoBack).toBe(true);
  });
});

// ── DropZone component tests ─────────────────────────────────────────────────

describe("DropZone", () => {
  test("renders drop zone with upload text", () => {
    render(<DropZone onFileSelected={vi.fn()} isAnalyzing={false} />);
    expect(screen.getByText("Drop your Excel file here")).toBeInTheDocument();
    expect(screen.getByText("or click to browse")).toBeInTheDocument();
    expect(
      screen.getByText("Supports .xlsx and .xls files"),
    ).toBeInTheDocument();
  });

  test("shows loading spinner when isAnalyzing is true", () => {
    render(<DropZone onFileSelected={vi.fn()} isAnalyzing={true} />);
    expect(
      screen.getByText("Analyzing your spreadsheet..."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Drop your Excel file here"),
    ).not.toBeInTheDocument();
  });

  test("rejects non-Excel file and shows error", () => {
    const onFileSelected = vi.fn();
    render(<DropZone onFileSelected={onFileSelected} isAnalyzing={false} />);

    const input = screen.getByTestId("file-input");
    const file = new File(["data"], "test.txt", { type: "text/plain" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(
      screen.getByText("Please upload an .xlsx or .xls file"),
    ).toBeInTheDocument();
    expect(onFileSelected).not.toHaveBeenCalled();
  });

  test("calls onFileSelected for valid .xlsx file", () => {
    const onFileSelected = vi.fn();
    render(<DropZone onFileSelected={onFileSelected} isAnalyzing={false} />);

    const input = screen.getByTestId("file-input");
    const file = new File(["data"], "test.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  test("calls onFileSelected for valid .xls file", () => {
    const onFileSelected = vi.fn();
    render(<DropZone onFileSelected={onFileSelected} isAnalyzing={false} />);

    const input = screen.getByTestId("file-input");
    const file = new File(["data"], "test.xls", {
      type: "application/vnd.ms-excel",
    });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  test("handles drag over and drag leave events", () => {
    render(<DropZone onFileSelected={vi.fn()} isAnalyzing={false} />);

    const dropZone = screen.getByRole("button", {
      name: "Upload Excel file",
    });

    // Drag over should add visual feedback (no error thrown)
    fireEvent.dragOver(dropZone, { preventDefault: vi.fn() });
    // Drag leave should remove visual feedback
    fireEvent.dragLeave(dropZone);
  });

  test("handles drop event with valid file", () => {
    const onFileSelected = vi.fn();
    render(<DropZone onFileSelected={onFileSelected} isAnalyzing={false} />);

    const dropZone = screen.getByRole("button", {
      name: "Upload Excel file",
    });
    const file = new File(["data"], "report.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  test("handles drop event with invalid file", () => {
    const onFileSelected = vi.fn();
    render(<DropZone onFileSelected={onFileSelected} isAnalyzing={false} />);

    const dropZone = screen.getByRole("button", {
      name: "Upload Excel file",
    });
    const file = new File(["data"], "image.png", { type: "image/png" });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelected).not.toHaveBeenCalled();
    expect(
      screen.getByText("Please upload an .xlsx or .xls file"),
    ).toBeInTheDocument();
  });

  test("click triggers file input", () => {
    render(<DropZone onFileSelected={vi.fn()} isAnalyzing={false} />);

    const dropZone = screen.getByRole("button", {
      name: "Upload Excel file",
    });
    // Click the drop zone - should open file dialog (input.click())
    fireEvent.click(dropZone);
    // No error = click handler works
  });
});

// ── Step component tests ─────────────────────────────────────────────────────

describe("Step1Entities", () => {
  test("renders entities with green, yellow, and red confidence badges", () => {
    const onUpdate = vi.fn();
    const entities = [
      makeEntity({ confidence: 90 }), // green (>=85)
      makeEntity({
        name: "products",
        label: "Products",
        entityType: "reference",
        confidence: 75, // yellow (70-84)
        sourceSheet: "Products",
      }),
      makeEntity({
        name: "orders",
        label: "Orders",
        entityType: "transaction",
        confidence: 60, // red (<70)
        sourceSheet: "Orders",
      }),
    ];

    render(
      <Step1Entities entities={entities} onUpdateEntity={onUpdate} />,
    );

    expect(screen.getByText("Step 1: Review Entities")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Customers")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Products")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Orders")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("master")).toBeInTheDocument();
    expect(screen.getByText("reference")).toBeInTheDocument();
    expect(screen.getByText("transaction")).toBeInTheDocument();
  });

  test("calls onUpdateEntity when label is changed", () => {
    const onUpdate = vi.fn();
    render(
      <Step1Entities entities={[makeEntity()]} onUpdateEntity={onUpdate} />,
    );

    const input = screen.getByDisplayValue("Customers");
    fireEvent.change(input, { target: { value: "Clients" } });
    expect(onUpdate).toHaveBeenCalledWith(0, { label: "Clients" });
  });
});

describe("FieldTypeDropdown", () => {
  test("renders all 11 field types as options", () => {
    const onChange = vi.fn();
    render(<FieldTypeDropdown value="string" onChange={onChange} />);

    const select = screen.getByRole("combobox");
    const options = Array.from(select.querySelectorAll("option"));
    expect(options).toHaveLength(11);

    const types = options.map((o: HTMLOptionElement) => o.value);
    expect(types).toEqual([
      "string",
      "text",
      "number",
      "boolean",
      "enum",
      "date",
      "reference",
      "email",
      "url",
      "currency",
      "percentage",
    ]);
  });

  test("calls onChange when selection changes", () => {
    const onChange = vi.fn();
    render(<FieldTypeDropdown value="string" onChange={onChange} />);

    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "email" },
    });
    expect(onChange).toHaveBeenCalledWith("email");
  });
});

describe("Step3Relationships", () => {
  test("renders detected relationships with confidence and remove button", () => {
    const onRemove = vi.fn();
    const relationships = [makeRelationship()];
    const entities = [
      makeEntity(),
      makeEntity({ name: "orders", label: "Orders" }),
    ];

    render(
      <Step3Relationships
        entities={entities}
        relationships={relationships}
        onRemoveRelationship={onRemove}
      />,
    );

    expect(screen.getByText("orders")).toBeInTheDocument();
    expect(screen.getByText("customers")).toBeInTheDocument();
    expect(screen.getByText("70%")).toBeInTheDocument();
    expect(screen.getByText("belongs_to")).toBeInTheDocument();
  });

  test("calls onRemoveRelationship when remove is clicked", () => {
    const onRemove = vi.fn();
    const relationships = [makeRelationship()];
    const entities = [makeEntity()];

    render(
      <Step3Relationships
        entities={entities}
        relationships={relationships}
        onRemoveRelationship={onRemove}
      />,
    );

    fireEvent.click(screen.getByText("Remove"));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  test("shows empty state when no relationships", () => {
    render(
      <Step3Relationships
        entities={[makeEntity()]}
        relationships={[]}
      />,
    );

    expect(
      screen.getByText("No relationships detected."),
    ).toBeInTheDocument();
  });

  test("shows add relationship button and form when onAddRelationship is provided", () => {
    const onAdd = vi.fn();
    const entities = [
      makeEntity(),
      makeEntity({ name: "orders", label: "Orders" }),
    ];

    render(
      <Step3Relationships
        entities={entities}
        relationships={[]}
        onAddRelationship={onAdd}
      />,
    );

    // Click "+ Add relationship"
    fireEvent.click(screen.getByText("+ Add relationship"));

    // Form should appear with Source Entity, Target Entity, Source Field, Type selects
    expect(screen.getByText("Source Entity")).toBeInTheDocument();
    expect(screen.getByText("Target Entity")).toBeInTheDocument();
    expect(screen.getByText("Source Field")).toBeInTheDocument();
  });

  test("add relationship form submits valid relationship", () => {
    const onAdd = vi.fn();
    const entities = [
      makeEntity(),
      makeEntity({ name: "orders", label: "Orders" }),
    ];

    render(
      <Step3Relationships
        entities={entities}
        relationships={[]}
        onAddRelationship={onAdd}
      />,
    );

    // Open form
    fireEvent.click(screen.getByText("+ Add relationship"));

    // Fill form
    const selects = screen.getAllByRole("combobox");
    // Source Entity
    fireEvent.change(selects[0], { target: { value: "orders" } });
    // Target Entity
    fireEvent.change(selects[1], { target: { value: "customers" } });
    // Source Field
    fireEvent.change(screen.getByPlaceholderText("e.g. customerId"), {
      target: { value: "customerId" },
    });
    // Type
    fireEvent.change(selects[2], { target: { value: "has_many" } });

    // Submit
    fireEvent.click(screen.getByText("Add"));

    expect(onAdd).toHaveBeenCalledWith({
      sourceEntity: "orders",
      targetEntity: "customers",
      sourceField: "customerId",
      confidence: 50,
      type: "has_many",
    });
  });

  test("cancel button hides add relationship form", () => {
    render(
      <Step3Relationships
        entities={[makeEntity()]}
        relationships={[]}
        onAddRelationship={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("+ Add relationship"));
    expect(screen.getByText("Source Entity")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Source Entity")).not.toBeInTheDocument();
  });

  test("does not show add button when onAddRelationship is not provided", () => {
    render(
      <Step3Relationships
        entities={[makeEntity()]}
        relationships={[]}
      />,
    );

    expect(screen.queryByText("+ Add relationship")).not.toBeInTheDocument();
  });

  test("does not show remove button when onRemoveRelationship is not provided", () => {
    render(
      <Step3Relationships
        entities={[makeEntity()]}
        relationships={[makeRelationship()]}
      />,
    );

    expect(screen.queryByText("Remove")).not.toBeInTheDocument();
  });

  test("shows green, yellow, and red badges for different confidence levels", () => {
    const relationships = [
      makeRelationship({ confidence: 90, sourceField: "field1" }),
      makeRelationship({ sourceField: "field2", confidence: 75 }),
      makeRelationship({ sourceField: "field3", confidence: 50 }),
    ];

    render(
      <Step3Relationships
        entities={[makeEntity()]}
        relationships={relationships}
      />,
    );

    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
  });

  test("add button does nothing when form fields are empty", () => {
    const onAdd = vi.fn();
    render(
      <Step3Relationships
        entities={[makeEntity()]}
        relationships={[]}
        onAddRelationship={onAdd}
      />,
    );

    fireEvent.click(screen.getByText("+ Add relationship"));
    // Click Add without filling any fields
    fireEvent.click(screen.getByText("Add"));
    expect(onAdd).not.toHaveBeenCalled();
  });
});

describe("SampleDataPreview", () => {
  test("compact mode shows inline values per field", () => {
    render(
      <SampleDataPreview
        columns={["Name", "Email"]}
        sampleRows={[
          ["Alice", "alice@example.com"],
          ["Bob", "bob@example.com"],
        ]}
        compact={true}
      />,
    );

    expect(screen.getByText("Name:")).toBeInTheDocument();
    expect(screen.getByText("Alice, Bob")).toBeInTheDocument();
  });

  test("full mode shows table rows", () => {
    render(
      <SampleDataPreview
        columns={["Name", "Email"]}
        sampleRows={[["Alice", "alice@example.com"]]}
        compact={false}
      />,
    );

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  test("returns null when sampleRows is empty", () => {
    const { container } = render(
      <SampleDataPreview columns={["Name"]} sampleRows={[]} />,
    );
    expect(container.innerHTML).toBe("");
  });

  test("handles null values in sample rows (compact mode)", () => {
    render(
      <SampleDataPreview
        columns={["Name", "Email"]}
        sampleRows={[[null, "alice@example.com"], ["Bob", null]]}
        compact={true}
      />,
    );

    // null values should be rendered as empty strings
    expect(screen.getByText("Name:")).toBeInTheDocument();
    expect(screen.getByText("Email:")).toBeInTheDocument();
  });

  test("handles null values in sample rows (full mode)", () => {
    render(
      <SampleDataPreview
        columns={["Name", "Email"]}
        sampleRows={[[null, "alice@example.com"]]}
        compact={false}
      />,
    );

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  test("defaults to compact mode when compact prop is not provided", () => {
    render(
      <SampleDataPreview
        columns={["Name"]}
        sampleRows={[["Alice"]]}
      />,
    );

    // Compact mode shows "Name:" label inline
    expect(screen.getByText("Name:")).toBeInTheDocument();
  });
});

describe("DashboardReview", () => {
  test("renders entity tabs and confirm button", () => {
    const entities = [
      makeEntity(),
      makeEntity({ name: "orders", label: "Orders" }),
    ];

    render(
      <DashboardReview
        entities={entities}
        relationships={[]}
        onUpdateField={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Review & Confirm")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Confirm & Generate/i }),
    ).toBeInTheDocument();
    // Entity tabs
    expect(screen.getByText("Customers (4)")).toBeInTheDocument();
    expect(screen.getByText("Orders (4)")).toBeInTheDocument();
  });

  test("calls onConfirm when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <DashboardReview
        entities={[makeEntity()]}
        relationships={[]}
        onUpdateField={vi.fn()}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByText("Confirm & Generate"));
    expect(onConfirm).toHaveBeenCalled();
  });

  test("shows relationships summary when present", () => {
    render(
      <DashboardReview
        entities={[makeEntity()]}
        relationships={[makeRelationship()]}
        onUpdateField={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByText("Relationships")).toBeInTheDocument();
  });

  test("switches tab when another entity tab is clicked", () => {
    const entities = [
      makeEntity(),
      makeEntity({
        name: "orders",
        label: "Orders",
        entityType: "transaction",
        sourceSheet: "Orders",
        fields: {
          orderId: { name: "orderId", type: "string", required: true, confidence: 90 },
        },
      }),
    ];

    render(
      <DashboardReview
        entities={entities}
        relationships={[]}
        onUpdateField={vi.fn()}
        onConfirm={vi.fn()}
      />,
    );

    // Initially shows first entity fields
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getByText("master")).toBeInTheDocument();

    // Click Orders tab
    fireEvent.click(screen.getByText("Orders (1)"));
    expect(screen.getByText("orderId")).toBeInTheDocument();
    expect(screen.getByText("transaction")).toBeInTheDocument();
  });

  test("calls onUpdateField when field type dropdown changes", () => {
    const onUpdateField = vi.fn();
    render(
      <DashboardReview
        entities={[makeEntity()]}
        relationships={[]}
        onUpdateField={onUpdateField}
        onConfirm={vi.fn()}
      />,
    );

    // Find the first field type dropdown (there are 4 fields)
    const selects = screen.getAllByLabelText("Field type");
    fireEvent.change(selects[0], { target: { value: "text" } });
    expect(onUpdateField).toHaveBeenCalledWith(0, "name", { type: "text" });
  });

  test("calls onUpdateField when required checkbox changes", () => {
    const onUpdateField = vi.fn();
    render(
      <DashboardReview
        entities={[makeEntity()]}
        relationships={[]}
        onUpdateField={onUpdateField}
        onConfirm={vi.fn()}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    // Toggle the first field's required (currently true -> false)
    fireEvent.click(checkboxes[0]);
    expect(onUpdateField).toHaveBeenCalledWith(0, "name", { required: false });
  });
});

describe("ColumnGroupAccordion", () => {
  test("groups fields by semantic category", () => {
    const fields: Record<string, InferredField> = {
      name: { name: "name", type: "string", required: true, confidence: 90 },
      email: { name: "email", type: "email", required: true, confidence: 95 },
      totalAmount: { name: "totalAmount", type: "currency", required: false, confidence: 85 },
      createdAt: { name: "createdAt", type: "date", required: true, confidence: 90 },
      status: { name: "status", type: "enum", required: true, confidence: 80 },
      notes: { name: "notes", type: "text", required: false, confidence: 70 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={vi.fn()}
        sampleRows={[]}
        columns={[]}
      />,
    );

    expect(screen.getByText(/Personal Info/)).toBeInTheDocument();
    expect(screen.getByText(/Financial/)).toBeInTheDocument();
    expect(screen.getByText(/Dates & Times/)).toBeInTheDocument();
    expect(screen.getByText(/Status/)).toBeInTheDocument();
  });

  test("low-confidence groups are expanded by default", () => {
    const fields: Record<string, InferredField> = {
      unknownField: { name: "unknownField", type: "string", required: false, confidence: 50 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={vi.fn()}
        sampleRows={[]}
        columns={[]}
      />,
    );

    // "Other" group should be expanded (confidence 50 < 85)
    const groupButton = screen.getByText(/Other/);
    expect(groupButton.closest("button")).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("high-confidence groups are collapsed by default", () => {
    const fields: Record<string, InferredField> = {
      email: { name: "email", type: "email", required: true, confidence: 95 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={vi.fn()}
        sampleRows={[]}
        columns={[]}
      />,
    );

    const groupButton = screen.getByText(/Personal Info/);
    expect(groupButton.closest("button")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("clicking group header toggles expanded state", () => {
    const fields: Record<string, InferredField> = {
      unknownField: { name: "unknownField", type: "string", required: false, confidence: 50 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={vi.fn()}
        sampleRows={[]}
        columns={[]}
      />,
    );

    const groupButton = screen.getByText(/Other/).closest("button")!;
    expect(groupButton).toHaveAttribute("aria-expanded", "true");

    // Click to collapse
    fireEvent.click(groupButton);
    expect(groupButton).toHaveAttribute("aria-expanded", "false");

    // Click to expand again
    fireEvent.click(groupButton);
    expect(groupButton).toHaveAttribute("aria-expanded", "true");
  });

  test("calls onUpdateField when field type is changed", () => {
    const onUpdate = vi.fn();
    const fields: Record<string, InferredField> = {
      unknownField: { name: "unknownField", type: "string", required: false, confidence: 50 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={onUpdate}
        sampleRows={[]}
        columns={[]}
      />,
    );

    // Group is expanded (low confidence), so field type dropdown is visible
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "number" } });
    expect(onUpdate).toHaveBeenCalledWith("unknownField", { type: "number" });
  });

  test("calls onUpdateField when required checkbox is toggled", () => {
    const onUpdate = vi.fn();
    const fields: Record<string, InferredField> = {
      unknownField: { name: "unknownField", type: "string", required: false, confidence: 50 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={onUpdate}
        sampleRows={[]}
        columns={[]}
      />,
    );

    const checkbox = screen.getByRole("checkbox");
    fireEvent.click(checkbox);
    expect(onUpdate).toHaveBeenCalledWith("unknownField", { required: true });
  });

  test("shows sample values when column index matches", () => {
    const fields: Record<string, InferredField> = {
      name: { name: "name", type: "string", required: true, confidence: 50 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={vi.fn()}
        sampleRows={[["Alice"], ["Bob"], ["Charlie"]]}
        columns={["name"]}
      />,
    );

    // Should display sample values
    expect(screen.getByText("Alice, Bob, Charlie")).toBeInTheDocument();
  });

  test("categorizes reference fields into References group", () => {
    const fields: Record<string, InferredField> = {
      customerId: { name: "customerId", type: "reference", required: true, confidence: 70 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={vi.fn()}
        sampleRows={[]}
        columns={[]}
      />,
    );

    expect(screen.getByText(/References/)).toBeInTheDocument();
  });

  test("handles null values in sample rows", () => {
    const fields: Record<string, InferredField> = {
      name: { name: "name", type: "string", required: true, confidence: 50 },
    };

    render(
      <ColumnGroupAccordion
        fields={fields}
        onUpdateField={vi.fn()}
        sampleRows={[[null], ["Bob"]]}
        columns={["name"]}
      />,
    );

    // null should be rendered as empty string via ?? ""
    expect(screen.getByText(", Bob")).toBeInTheDocument();
  });
});

describe("Step2Fields", () => {
  test("renders entity tabs and field list", () => {
    const entities = [
      makeEntity(),
      makeEntity({ name: "orders", label: "Orders" }),
    ];

    render(
      <Step2Fields entities={entities} onUpdateField={vi.fn()} />,
    );

    expect(screen.getByText("Step 2: Review Fields")).toBeInTheDocument();
    // Entity tabs
    expect(screen.getByText("Customers (4)")).toBeInTheDocument();
    expect(screen.getByText("Orders (4)")).toBeInTheDocument();
    // Fields from first entity (use getAllByText since "email" also appears as a dropdown option)
    expect(screen.getByText("name")).toBeInTheDocument();
    expect(screen.getAllByText("email").length).toBeGreaterThanOrEqual(1);
  });

  test("switches active entity when tab is clicked", () => {
    const entities = [
      makeEntity(),
      makeEntity({
        name: "orders",
        label: "Orders",
        fields: {
          orderId: {
            name: "orderId",
            type: "string",
            required: true,
            confidence: 90,
          },
        },
      }),
    ];

    render(
      <Step2Fields entities={entities} onUpdateField={vi.fn()} />,
    );

    // Initially shows first entity's fields
    expect(screen.getByText("name")).toBeInTheDocument();

    // Click "Orders" tab
    fireEvent.click(screen.getByText("Orders (1)"));
    expect(screen.getByText("orderId")).toBeInTheDocument();
  });

  test("calls onUpdateField when field type dropdown changes", () => {
    const onUpdateField = vi.fn();
    render(
      <Step2Fields entities={[makeEntity()]} onUpdateField={onUpdateField} />,
    );

    // Find the first field type dropdown
    const selects = screen.getAllByLabelText("Field type");
    fireEvent.change(selects[0], { target: { value: "text" } });
    expect(onUpdateField).toHaveBeenCalledWith(0, "name", { type: "text" });
  });

  test("calls onUpdateField when required checkbox is toggled", () => {
    const onUpdateField = vi.fn();
    render(
      <Step2Fields entities={[makeEntity()]} onUpdateField={onUpdateField} />,
    );

    const checkboxes = screen.getAllByRole("checkbox");
    // Toggle first field's required
    fireEvent.click(checkboxes[0]);
    expect(onUpdateField).toHaveBeenCalledWith(0, "name", { required: false });
  });

  test("uses ColumnGroupAccordion for entities with 30+ fields", () => {
    // Create entity with 30+ fields
    const fields: Record<string, InferredField> = {};
    for (let i = 0; i < 31; i++) {
      fields[`field${i}`] = {
        name: `field${i}`,
        type: "string",
        required: false,
        confidence: 75,
      };
    }
    const entity = makeEntity({ fields });

    render(
      <Step2Fields entities={[entity]} onUpdateField={vi.fn()} />,
    );

    // Should show grouped accordion (has group headers with expand/collapse)
    // ColumnGroupAccordion groups into categories; "Other" would contain all generic fields
    expect(screen.getByText(/Other/)).toBeInTheDocument();
  });

  test("shows sample data toggle when sampleData is provided", () => {
    render(
      <Step2Fields
        entities={[makeEntity()]}
        onUpdateField={vi.fn()}
        sampleData={{
          customers: {
            columns: ["Name", "Email"],
            rows: [["Alice", "alice@example.com"]],
          },
        }}
      />,
    );

    expect(screen.getByText("Sample Data")).toBeInTheDocument();
    // Toggle exists
    expect(screen.getByText("Show full rows")).toBeInTheDocument();
  });

  test("toggles between compact and full sample data", () => {
    render(
      <Step2Fields
        entities={[makeEntity()]}
        onUpdateField={vi.fn()}
        sampleData={{
          customers: {
            columns: ["Name", "Email"],
            rows: [["Alice", "alice@example.com"]],
          },
        }}
      />,
    );

    // Initially compact
    fireEvent.click(screen.getByText("Show full rows"));
    expect(screen.getByText("Show compact")).toBeInTheDocument();
  });

  test("returns null when entities array is empty", () => {
    const { container } = render(
      <Step2Fields entities={[]} onUpdateField={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  test("field update flows through ColumnGroupAccordion for large entities", () => {
    const onUpdateField = vi.fn();
    // Create entity with 30+ fields where at least one group has low confidence (auto-expanded)
    const fields: Record<string, InferredField> = {};
    for (let i = 0; i < 31; i++) {
      fields[`field${i}`] = {
        name: `field${i}`,
        type: "string",
        required: false,
        confidence: 50, // Low confidence => groups auto-expand
      };
    }
    const entity = makeEntity({ fields });

    render(
      <Step2Fields entities={[entity]} onUpdateField={onUpdateField} />,
    );

    // ColumnGroupAccordion is rendered; "Other" group should be expanded (low confidence)
    // Change the first field's type
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "number" } });
    expect(onUpdateField).toHaveBeenCalledWith(0, expect.any(String), { type: "number" });
  });
});

// ── ReconciliationDiff component tests ───────────────────────────────────────

import { ReconciliationDiff } from "./components/ReconciliationDiff";
import type { SchemaChange } from "~/templates/pipeline/excel/reconciliation";

describe("ReconciliationDiff", () => {
  function makeRenameChange(overrides: Partial<SchemaChange> = {}): SchemaChange {
    return {
      type: "rename",
      entityName: "employees",
      oldColumnName: "Emp Name",
      newColumnName: "Employee Name",
      matchScore: {
        score: 0.85,
        stringScore: 0.9,
        positionScore: 1,
        dataScore: 0.7,
        isLikelyRename: true,
        isPossibleRename: true,
      },
      ...overrides,
    };
  }

  function makeAddChange(overrides: Partial<SchemaChange> = {}): SchemaChange {
    return {
      type: "add",
      entityName: "employees",
      addedColumn: {
        name: "Phone",
        position: 2,
        detectedType: "string",
        sampleValues: [],
        uniqueCount: 0,
        emptyCount: 0,
      },
      ...overrides,
    };
  }

  function makeRemoveChange(overrides: Partial<SchemaChange> = {}): SchemaChange {
    return {
      type: "remove",
      entityName: "employees",
      removedColumn: "Department",
      removedColumnDataCount: 50,
      ...overrides,
    };
  }

  test("renders rename changes with old->new names and confidence", () => {
    const changes = [makeRenameChange()];
    render(
      <ReconciliationDiff changes={changes} onUpdateAction={vi.fn()} />,
    );

    expect(screen.getByText("Emp Name")).toBeInTheDocument();
    expect(screen.getByText("Employee Name")).toBeInTheDocument();
    expect(screen.getByText("(85%)")).toBeInTheDocument();
    expect(screen.getByText("Renamed Columns")).toBeInTheDocument();
  });

  test("renders addition and removal changes", () => {
    const changes = [makeAddChange(), makeRemoveChange()];
    render(
      <ReconciliationDiff changes={changes} onUpdateAction={vi.fn()} />,
    );

    expect(screen.getByText("Added Columns")).toBeInTheDocument();
    expect(screen.getByText(/Phone/)).toBeInTheDocument();
    expect(screen.getByText("Removed Columns")).toBeInTheDocument();
    expect(screen.getByText(/Department/)).toBeInTheDocument();
  });

  test("toggles between flat and diff view", () => {
    const changes = [makeRenameChange()];
    render(
      <ReconciliationDiff changes={changes} onUpdateAction={vi.fn()} />,
    );

    // Default is flat (List button active)
    expect(screen.getByText("Renamed Columns")).toBeInTheDocument();

    // Click Diff button
    fireEvent.click(screen.getByText("Diff"));

    // Should show diff view with Previous/New Schema labels
    expect(screen.getByText("Previous Schema")).toBeInTheDocument();
    expect(screen.getByText("New Schema")).toBeInTheDocument();

    // Click List button to go back
    fireEvent.click(screen.getByText("List"));
    expect(screen.getByText("Renamed Columns")).toBeInTheDocument();
  });

  test("shows empty state when no changes", () => {
    render(
      <ReconciliationDiff changes={[]} onUpdateAction={vi.fn()} />,
    );

    expect(screen.getByText("No schema changes detected. Schema is identical.")).toBeInTheDocument();
  });

  test("calls onUpdateAction when rename dropdown changes", () => {
    const onUpdateAction = vi.fn();
    const changes = [makeRenameChange()];
    render(
      <ReconciliationDiff changes={changes} onUpdateAction={onUpdateAction} />,
    );

    const select = screen.getAllByRole("combobox")[0];
    fireEvent.change(select, { target: { value: "reject" } });
    expect(onUpdateAction).toHaveBeenCalledWith(0, "reject");
  });

  test("calls onUpdateAction when removal dropdown changes", () => {
    const onUpdateAction = vi.fn();
    const changes = [makeRemoveChange()];
    render(
      <ReconciliationDiff changes={changes} onUpdateAction={onUpdateAction} />,
    );

    const select = screen.getAllByRole("combobox")[0];
    fireEvent.change(select, { target: { value: "delete" } });
    expect(onUpdateAction).toHaveBeenCalledWith(0, "delete");
  });

  test("shows data count for removed columns", () => {
    const changes = [makeRemoveChange({ removedColumnDataCount: 100 })];
    render(
      <ReconciliationDiff changes={changes} onUpdateAction={vi.fn()} />,
    );

    expect(screen.getByText("(100 rows with data)")).toBeInTheDocument();
  });

  test("renders change count in header", () => {
    const changes = [makeRenameChange(), makeAddChange()];
    render(
      <ReconciliationDiff changes={changes} onUpdateAction={vi.fn()} />,
    );

    expect(screen.getByText("2 changes detected")).toBeInTheDocument();
  });
});

// ── ImportReport component tests ─────────────────────────────────────────────

import { ImportReport } from "./components/ImportReport";
import type { ImportError } from "~/templates/pipeline/excel/data-importer";

describe("ImportReport", () => {
  function makeImportDoc(overrides: Record<string, unknown> = {}) {
    return {
      fileName: "test-data.xlsx",
      status: "complete",
      completedAt: Date.now(),
      importStats: JSON.stringify({
        entities: [
          { entityName: "employees", totalRows: 100, importedRows: 90, skippedRows: 10 },
          { entityName: "departments", totalRows: 20, importedRows: 20, skippedRows: 0 },
        ],
        method: "heuristic",
      }),
      ...overrides,
    };
  }

  function makeImportError(overrides: Partial<ImportError> = {}): ImportError {
    return {
      entityName: "employees",
      rowNumber: 5,
      severity: "green",
      column: "salary",
      originalValue: "$50,000",
      fixedValue: "50000",
      errorMessage: 'Auto-converted "$50,000" to 50000',
      ...overrides,
    };
  }

  test("renders error sections grouped by severity", () => {
    const errors: ImportError[] = [
      makeImportError({ severity: "green" }),
      makeImportError({ severity: "yellow", column: "status", errorMessage: "Ambiguous value" }),
      makeImportError({ severity: "red", column: "email", errorMessage: "Invalid email" }),
    ];

    render(<ImportReport importDoc={makeImportDoc()} errors={errors} />);

    expect(screen.getByText("Auto-fixed")).toBeInTheDocument();
    expect(screen.getByText("Needs Review")).toBeInTheDocument();
    expect(screen.getByText("Unfixable")).toBeInTheDocument();
  });

  test("shows correct per-entity row counts", () => {
    render(<ImportReport importDoc={makeImportDoc()} errors={[]} />);

    expect(screen.getByText("employees")).toBeInTheDocument();
    expect(screen.getByText("departments")).toBeInTheDocument();
    // Check the grid rows contain the expected numbers
    // Multiple "20" values exist (departments imported=20, total=20) so use getAllByText
    expect(screen.getByText("90")).toBeInTheDocument(); // employees importedRows
    expect(screen.getByText("100")).toBeInTheDocument(); // employees totalRows
    expect(screen.getAllByText("20").length).toBeGreaterThanOrEqual(1); // departments
  });

  test("shows import metadata: file name, status, method", () => {
    render(<ImportReport importDoc={makeImportDoc()} errors={[]} />);

    expect(screen.getByText("Import Report")).toBeInTheDocument();
    expect(screen.getByText("test-data.xlsx")).toBeInTheDocument();
    expect(screen.getByText("complete")).toBeInTheDocument();
    expect(screen.getByText("heuristic")).toBeInTheDocument();
  });

  test("renders without stats when importStats is not set", () => {
    const doc = makeImportDoc({ importStats: undefined });
    render(<ImportReport importDoc={doc} errors={[]} />);

    expect(screen.getByText("Import Report")).toBeInTheDocument();
    expect(screen.queryByText("Entity Summary")).not.toBeInTheDocument();
  });

  test("hides error sections when no errors of that severity exist", () => {
    const errors: ImportError[] = [
      makeImportError({ severity: "red", errorMessage: "Bad value" }),
    ];

    render(<ImportReport importDoc={makeImportDoc()} errors={errors} />);

    // Only red section should show
    expect(screen.getByText("Unfixable")).toBeInTheDocument();
    expect(screen.queryByText("Auto-fixed")).not.toBeInTheDocument();
    expect(screen.queryByText("Needs Review")).not.toBeInTheDocument();
  });

  test("shows original and fixed values for green errors after expanding", () => {
    const errors: ImportError[] = [
      makeImportError({
        severity: "green",
        originalValue: "$50,000",
        fixedValue: "50000",
      }),
    ];

    render(<ImportReport importDoc={makeImportDoc()} errors={errors} />);

    // Green section is collapsed by default — expand it first
    const expandButton = screen.getByText("Auto-fixed").closest("button")!;
    fireEvent.click(expandButton);

    expect(screen.getByText("$50,000")).toBeInTheDocument();
    expect(screen.getByText("50000")).toBeInTheDocument();
  });

  test("collapses green section by default and expands yellow/red", () => {
    const errors: ImportError[] = [
      makeImportError({ severity: "green" }),
      makeImportError({ severity: "yellow", column: "status", errorMessage: "Ambiguous" }),
    ];

    render(<ImportReport importDoc={makeImportDoc()} errors={errors} />);

    // Green section collapsed: should show "Expand" button
    const greenSection = screen.getByText("Auto-fixed").closest("button")!;
    expect(greenSection.textContent).toContain("Expand");

    // Yellow section expanded: should show "Collapse" button
    const yellowSection = screen.getByText("Needs Review").closest("button")!;
    expect(yellowSection.textContent).toContain("Collapse");
  });
});

// ── useReconciliation hook tests ─────────────────────────────────────────────

import { useReconciliation } from "./hooks/useReconciliation";
import type { SheetMetadata } from "~/templates/pipeline/excel/parser";
import type { StoredMapping } from "~/templates/pipeline/excel/reconciliation";

describe("useReconciliation", () => {
  function makeTestSheet(): SheetMetadata {
    return {
      name: "Employees",
      rowCount: 10,
      columnCount: 2,
      columns: [
        { name: "Name", position: 0, detectedType: "string", sampleValues: [], uniqueCount: 5, emptyCount: 0 },
        { name: "Email", position: 1, detectedType: "string", sampleValues: [], uniqueCount: 5, emptyCount: 0 },
      ],
      sampleRows: [],
    };
  }

  function makeTestMapping(colName: string, position: number): StoredMapping {
    return {
      systemFieldId: `f_${colName}`,
      systemFieldName: colName,
      excelColumnName: colName,
      excelColumnPosition: position,
      excelSheetName: "Sheet1",
    };
  }

  test("initial state has empty results and isChecking=false", () => {
    const { result } = renderHook(() => useReconciliation());

    expect(result.current.results.size).toBe(0);
    expect(result.current.isChecking).toBe(false);
  });

  test("checkForReimport populates results when match found", () => {
    const { result } = renderHook(() => useReconciliation());

    const sheets = [makeTestSheet()];
    const mappings = new Map([
      ["employees", [makeTestMapping("Name", 0), makeTestMapping("Email", 1)]],
    ]);

    act(() => result.current.checkForReimport(sheets, mappings));

    expect(result.current.results.size).toBe(1);
    expect(result.current.results.get("Employees")!.isReimport).toBe(true);
    expect(result.current.isChecking).toBe(false);
  });

  test("checkForReimport returns empty results when no match", () => {
    const { result } = renderHook(() => useReconciliation());

    const sheets = [makeTestSheet()];
    const mappings = new Map([
      ["products", [makeTestMapping("SKU", 0), makeTestMapping("Price", 1)]],
    ]);

    act(() => result.current.checkForReimport(sheets, mappings));

    expect(result.current.results.size).toBe(0);
  });

  test("reset clears results", () => {
    const { result } = renderHook(() => useReconciliation());

    const sheets = [makeTestSheet()];
    const mappings = new Map([
      ["employees", [makeTestMapping("Name", 0), makeTestMapping("Email", 1)]],
    ]);

    act(() => result.current.checkForReimport(sheets, mappings));
    expect(result.current.results.size).toBe(1);

    act(() => result.current.reset());
    expect(result.current.results.size).toBe(0);
  });
});
