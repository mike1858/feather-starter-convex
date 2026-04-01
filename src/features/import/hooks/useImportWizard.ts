import { useState, useCallback } from "react";
import type { InferredEntity, DetectedRelationship } from "../types";
import type { InferredField } from "~/templates/pipeline/excel/type-inference";

export type WizardStep =
  | "upload"
  | "entities"
  | "fields"
  | "relationships"
  | "review";

export interface WizardState {
  step: WizardStep;
  file: File | null;
  entities: InferredEntity[];
  relationships: DetectedRelationship[];
  importOrder: string[];
  importId: string | null;
  analysisMethod: "llm" | "heuristic" | null;
}

const STEP_ORDER: WizardStep[] = [
  "upload",
  "entities",
  "fields",
  "relationships",
  "review",
];

export function useImportWizard() {
  const [state, setState] = useState<WizardState>({
    step: "upload",
    file: null,
    entities: [],
    relationships: [],
    importOrder: [],
    importId: null,
    analysisMethod: null,
  });

  const goToStep = useCallback((step: WizardStep) => {
    setState((prev) => ({ ...prev, step }));
  }, []);

  const goNext = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEP_ORDER.indexOf(prev.step);
      if (currentIndex < STEP_ORDER.length - 1) {
        return { ...prev, step: STEP_ORDER[currentIndex + 1] };
      }
      return prev;
    });
  }, []);

  const goBack = useCallback(() => {
    setState((prev) => {
      const currentIndex = STEP_ORDER.indexOf(prev.step);
      if (currentIndex > 0) {
        return { ...prev, step: STEP_ORDER[currentIndex - 1] };
      }
      return prev;
    });
  }, []);

  const setFile = useCallback((file: File) => {
    setState((prev) => ({ ...prev, file, step: "upload" }));
  }, []);

  const setAnalysisResult = useCallback(
    (result: {
      entities: InferredEntity[];
      relationships: DetectedRelationship[];
      importOrder: string[];
      method: "llm" | "heuristic";
      importId: string;
    }) => {
      setState((prev) => ({
        ...prev,
        entities: result.entities,
        relationships: result.relationships,
        importOrder: result.importOrder,
        analysisMethod: result.method,
        importId: result.importId,
        step: "entities",
      }));
    },
    [],
  );

  const updateEntity = useCallback(
    (entityIndex: number, updates: Partial<InferredEntity>) => {
      setState((prev) => {
        const entities = [...prev.entities];
        entities[entityIndex] = { ...entities[entityIndex], ...updates };
        return { ...prev, entities };
      });
    },
    [],
  );

  const updateField = useCallback(
    (
      entityIndex: number,
      fieldName: string,
      updates: Partial<InferredField>,
    ) => {
      setState((prev) => {
        const entities = [...prev.entities];
        const entity = { ...entities[entityIndex] };
        entity.fields = { ...entity.fields };
        entity.fields[fieldName] = {
          ...entity.fields[fieldName],
          ...updates,
        };
        entities[entityIndex] = entity;
        return { ...prev, entities };
      });
    },
    [],
  );

  const removeRelationship = useCallback((relationshipIndex: number) => {
    setState((prev) => {
      const relationships = prev.relationships.filter(
        (_, i) => i !== relationshipIndex,
      );
      return { ...prev, relationships };
    });
  }, []);

  const addRelationship = useCallback(
    (relationship: DetectedRelationship) => {
      setState((prev) => ({
        ...prev,
        relationships: [...prev.relationships, relationship],
      }));
    },
    [],
  );

  const canGoNext = state.step !== "review";
  const canGoBack = STEP_ORDER.indexOf(state.step) > 0;
  const stepNumber = STEP_ORDER.indexOf(state.step);

  return {
    state,
    goToStep,
    goNext,
    goBack,
    setFile,
    setAnalysisResult,
    updateEntity,
    updateField,
    removeRelationship,
    addRelationship,
    canGoNext,
    canGoBack,
    stepNumber,
  };
}
