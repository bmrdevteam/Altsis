import { useEffect, useRef } from "react";
import { useAlter, TAlterActivityDraft } from "contexts/alterContext";
import { TAltFormField, TFormRubric } from "types/altForm";
import {
  normalizeActivityDraftBundle,
  toActivitySettingsSnapshot,
  TActivityBuilderSettings,
} from "utils/activityDraft";

type Params = {
  enabled?: boolean;
  label?: string;
  boardId?: string;
  boardName?: string;
  getActivity: () => {
    title: string;
    description: string;
    fields: TAltFormField[];
    settings: TActivityBuilderSettings;
    rubrics: TFormRubric[];
  };
  setTitle: (title: string) => void;
  setDescription: (description: string) => void;
  setFields: (fields: TAltFormField[]) => void;
  setSettings: (
    settings:
      | TActivityBuilderSettings
      | ((prev: TActivityBuilderSettings) => TActivityBuilderSettings)
  ) => void;
  setRubrics: (rubrics: TFormRubric[]) => void;
};

/**
 * 활동(양식) 작성/수정 화면에서 Navbar Alter에 활동 초안 문맥을 등록한다.
 */
const useRegisterAlterActivity = (params: Params) => {
  const { registerPageContext } = useAlter();
  const getActivityRef = useRef(params.getActivity);
  const setTitleRef = useRef(params.setTitle);
  const setDescriptionRef = useRef(params.setDescription);
  const setFieldsRef = useRef(params.setFields);
  const setSettingsRef = useRef(params.setSettings);
  const setRubricsRef = useRef(params.setRubrics);
  getActivityRef.current = params.getActivity;
  setTitleRef.current = params.setTitle;
  setDescriptionRef.current = params.setDescription;
  setFieldsRef.current = params.setFields;
  setSettingsRef.current = params.setSettings;
  setRubricsRef.current = params.setRubrics;

  useEffect(() => {
    if (params.enabled === false) {
      registerPageContext(null);
      return () => registerPageContext(null);
    }

    registerPageContext({
      pageType: "activity",
      label: params.label || params.boardName || "활동 작성",
      boardId: params.boardId,
      boardName: params.boardName,
      getActivity: () => {
        const cur = getActivityRef.current();
        return {
          title: String(cur.title || ""),
          description: String(cur.description || ""),
          fields: cur.fields || [],
          settings: toActivitySettingsSnapshot(cur.settings),
          rubrics: cur.rubrics || [],
          boardName: params.boardName,
        };
      },
      applyActivityDraft: (draft: TAlterActivityDraft) => {
        const { fields, settings, rubrics } = normalizeActivityDraftBundle({
          fields: draft?.fields,
          settings: draft?.settings,
          rubrics: draft?.rubrics,
        });
        if (fields.length === 0) {
          return { applied: false };
        }
        const title = String(draft?.title ?? "").trim();
        if (title) setTitleRef.current(title);
        setDescriptionRef.current(String(draft?.description ?? ""));
        setFieldsRef.current(fields);
        setSettingsRef.current(settings);
        setRubricsRef.current(rubrics);
        return { applied: true };
      },
      suggestedSkills: ["activity-draft", "chat"],
    });

    return () => registerPageContext(null);
  }, [
    params.enabled,
    params.label,
    params.boardId,
    params.boardName,
    registerPageContext,
  ]);
};

export default useRegisterAlterActivity;
