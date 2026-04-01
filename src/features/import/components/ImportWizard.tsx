import { DropZone } from "./DropZone";
import { Step1Entities } from "./Step1Entities";
import { Step2Fields } from "./Step2Fields";
import { Step3Relationships } from "./Step3Relationships";
import { DashboardReview } from "./DashboardReview";
import { useImportWizard } from "../hooks/useImportWizard";
import type { WizardStep } from "../hooks/useImportWizard";
import { useSchemaAnalysis } from "../hooks/useSchemaAnalysis";

const STEP_LABELS = [
  "Upload",
  "Entities",
  "Fields",
  "Relationships",
  "Review",
];
const STEP_KEYS: WizardStep[] = [
  "upload",
  "entities",
  "fields",
  "relationships",
  "review",
];

export function ImportWizard() {
  const wizard = useImportWizard();
  const { analyzeFile, isAnalyzing, error } = useSchemaAnalysis();

  const handleFileSelected = async (file: File) => {
    wizard.setFile(file);
    const result = await analyzeFile(file);
    wizard.setAnalysisResult(result);
  };

  const handleConfirm = () => {
    // Will be wired to YAML generation + data import in Plan 04
    console.log("Confirmed schema:", wizard.state.entities);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Import Data</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {STEP_LABELS.map((label, index) => (
          <button
            key={label}
            onClick={() =>
              index <= wizard.stepNumber && wizard.goToStep(STEP_KEYS[index])
            }
            disabled={index > wizard.stepNumber}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
              index === wizard.stepNumber
                ? "bg-primary text-primary-foreground"
                : index < wizard.stepNumber
                  ? "bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80"
                  : "text-muted-foreground/50 cursor-not-allowed"
            }`}
          >
            <span className="w-5 h-5 rounded-full border flex items-center justify-center text-xs">
              {index + 1}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Step content */}
      {wizard.state.step === "upload" && (
        <DropZone
          onFileSelected={handleFileSelected}
          isAnalyzing={isAnalyzing}
        />
      )}
      {wizard.state.step === "entities" && (
        <Step1Entities
          entities={wizard.state.entities}
          onUpdateEntity={wizard.updateEntity}
        />
      )}
      {wizard.state.step === "fields" && (
        <Step2Fields
          entities={wizard.state.entities}
          onUpdateField={wizard.updateField}
        />
      )}
      {wizard.state.step === "relationships" && (
        <Step3Relationships
          entities={wizard.state.entities}
          relationships={wizard.state.relationships}
          onRemoveRelationship={wizard.removeRelationship}
          onAddRelationship={wizard.addRelationship}
        />
      )}
      {wizard.state.step === "review" && (
        <DashboardReview
          entities={wizard.state.entities}
          relationships={wizard.state.relationships}
          onUpdateField={wizard.updateField}
          onConfirm={handleConfirm}
        />
      )}

      {/* Navigation */}
      {wizard.state.step !== "upload" && (
        <div className="flex justify-between mt-8">
          <button
            onClick={wizard.goBack}
            disabled={!wizard.canGoBack}
            className="px-4 py-2 border rounded hover:bg-muted disabled:opacity-50"
          >
            Back
          </button>
          {wizard.canGoNext && (
            <button
              onClick={wizard.goNext}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              Next
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
