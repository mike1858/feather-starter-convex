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
});

// ── Step component tests ─────────────────────────────────────────────────────

describe("Step1Entities", () => {
  test("renders entities with confidence badges and editable labels", () => {
    const onUpdate = vi.fn();
    const entities = [
      makeEntity({ confidence: 90 }),
      makeEntity({
        name: "orders",
        label: "Orders",
        entityType: "transaction",
        confidence: 60,
        sourceSheet: "Orders",
      }),
    ];

    render(
      <Step1Entities entities={entities} onUpdateEntity={onUpdate} />,
    );

    expect(screen.getByText("Step 1: Review Entities")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Customers")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Orders")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
    expect(screen.getByText("master")).toBeInTheDocument();
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
    expect(screen.getByText("Customers (3)")).toBeInTheDocument();
    expect(screen.getByText("Orders (3)")).toBeInTheDocument();
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
    expect(screen.getByText("Customers (3)")).toBeInTheDocument();
    expect(screen.getByText("Orders (3)")).toBeInTheDocument();
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
});
