import { useEffect, useState } from "react";
import { TAlterSkillId } from "contexts/alterContext";
import { TGuidelineItem } from "./types";

const alterApiBase = () => `${process.env.REACT_APP_SERVER_URL}/api/ai`;

const GUIDELINE_PICKER_SKILLS: TAlterSkillId[] = [
  "syllabus-draft",
  "evaluation-draft",
  "archive-draft",
  "document-draft",
  "document-review",
  "form-response-draft",
  "activity-draft",
];

type GuidelineMap = Record<
  | "syllabus"
  | "evaluation"
  | "archive"
  | "document"
  | "documentReview"
  | "formResponse"
  | "activity",
  TGuidelineItem[]
>;

type SelectedMap = Record<
  | "syllabus"
  | "evaluation"
  | "archive"
  | "document"
  | "documentReview"
  | "documentReviewLearning"
  | "formResponse"
  | "activity",
  string[]
>;

const emptyItems = (): GuidelineMap => ({
  syllabus: [],
  evaluation: [],
  archive: [],
  document: [],
  documentReview: [],
  formResponse: [],
  activity: [],
});

const emptySelected = (): SelectedMap => ({
  syllabus: [],
  evaluation: [],
  archive: [],
  document: [],
  documentReview: [],
  documentReviewLearning: [],
  formResponse: [],
  activity: [],
});

const mapItems = (raw: unknown): TGuidelineItem[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it: { _id?: string; title?: string; content?: string }) => ({
      _id: String(it._id || ""),
      title: it.title || "지침",
      content: it.content || "",
    }))
    .filter((it) => it._id);
};

const pickIds = (
  prev: string[],
  allowedItems: TGuidelineItem[],
  defaultIds: string[]
) => {
  if (prev.length > 0) {
    const allowed = new Set(allowedItems.map((it) => it._id));
    const kept = prev.filter((id) => allowed.has(id));
    if (kept.length > 0) return kept;
  }
  return defaultIds;
};

type Params = {
  isOpen: boolean;
  seasonId?: string;
  selectedSkill: TAlterSkillId;
};

/**
 * Alter Skill prep용 학교 라이브러리 지침/학습정보 로드·선택 상태.
 */
const useAlterGuidelineLibrary = ({
  isOpen,
  seasonId,
  selectedSkill,
}: Params) => {
  const [skillSettingsLoading, setSkillSettingsLoading] = useState(false);
  const [items, setItems] = useState<GuidelineMap>(emptyItems);
  const [selected, setSelected] = useState<SelectedMap>(emptySelected);
  const [docReviewLearningItems, setDocReviewLearningItems] = useState<
    TGuidelineItem[]
  >([]);
  const [expandedGuidelineId, setExpandedGuidelineId] = useState<string | null>(
    null
  );

  const setSelectedKey = (key: keyof SelectedMap, next: string[]) => {
    setSelected((prev) => ({ ...prev, [key]: next }));
  };

  useEffect(() => {
    if (!isOpen || !seasonId) return;
    if (!GUIDELINE_PICKER_SKILLS.includes(selectedSkill)) return;

    let cancelled = false;
    (async () => {
      try {
        setSkillSettingsLoading(true);
        const res = await fetch(
          `${alterApiBase()}/alter/skill-settings?season=${encodeURIComponent(
            seasonId
          )}&skill=${encodeURIComponent(selectedSkill)}`,
          { credentials: "include" }
        );
        if (!res.ok) {
          throw new Error("스킬 설정을 불러오지 못했습니다.");
        }
        const data = await res.json();
        if (cancelled) return;

        const filtered = mapItems(data.instructionItems);
        const defaults = Array.isArray(data.defaultGuidelineItemIds)
          ? data.defaultGuidelineItemIds.map(String)
          : filtered.map((it) => it._id);

        const apply = (key: keyof GuidelineMap & keyof SelectedMap) => {
          setItems((prev) => ({ ...prev, [key]: filtered }));
          setSelected((prev) => ({
            ...prev,
            [key]: pickIds(prev[key], filtered, defaults),
          }));
        };

        if (selectedSkill === "syllabus-draft") apply("syllabus");
        else if (selectedSkill === "evaluation-draft") apply("evaluation");
        else if (selectedSkill === "archive-draft") apply("archive");
        else if (selectedSkill === "document-draft") apply("document");
        else if (selectedSkill === "form-response-draft") apply("formResponse");
        else if (selectedSkill === "activity-draft") apply("activity");
        else if (selectedSkill === "document-review") {
          apply("documentReview");
          const learning = mapItems(data.learningItems).map((it) => ({
            ...it,
            title: it.title || "학습정보",
          }));
          const learningDefaults = Array.isArray(data.defaultLearningItemIds)
            ? data.defaultLearningItemIds.map(String)
            : [];
          setDocReviewLearningItems(learning);
          setSelected((prev) => ({
            ...prev,
            documentReviewLearning: pickIds(
              prev.documentReviewLearning,
              learning,
              learningDefaults
            ),
          }));
        }
      } catch {
        if (cancelled) return;
        if (selectedSkill === "syllabus-draft") {
          setItems((p) => ({ ...p, syllabus: [] }));
        } else if (selectedSkill === "evaluation-draft") {
          setItems((p) => ({ ...p, evaluation: [] }));
        } else if (selectedSkill === "archive-draft") {
          setItems((p) => ({ ...p, archive: [] }));
        } else if (selectedSkill === "document-draft") {
          setItems((p) => ({ ...p, document: [] }));
        } else if (selectedSkill === "document-review") {
          setItems((p) => ({ ...p, documentReview: [] }));
          setDocReviewLearningItems([]);
          setSelected((p) => ({ ...p, documentReviewLearning: [] }));
        } else if (selectedSkill === "form-response-draft") {
          setItems((p) => ({ ...p, formResponse: [] }));
        } else if (selectedSkill === "activity-draft") {
          setItems((p) => ({ ...p, activity: [] }));
        }
      } finally {
        if (!cancelled) setSkillSettingsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, seasonId, selectedSkill]);

  return {
    skillSettingsLoading,
    expandedGuidelineId,
    setExpandedGuidelineId,
    syllabusGuidelineItems: items.syllabus,
    syllabusSelectedGuidelineIds: selected.syllabus,
    setSyllabusSelectedGuidelineIds: (next: string[]) =>
      setSelectedKey("syllabus", next),
    evalGuidelineItems: items.evaluation,
    evalSelectedGuidelineIds: selected.evaluation,
    setEvalSelectedGuidelineIds: (next: string[]) =>
      setSelectedKey("evaluation", next),
    archiveGuidelineItems: items.archive,
    archiveSelectedGuidelineIds: selected.archive,
    setArchiveSelectedGuidelineIds: (next: string[]) =>
      setSelectedKey("archive", next),
    docGuidelineItems: items.document,
    docSelectedGuidelineIds: selected.document,
    setDocSelectedGuidelineIds: (next: string[]) =>
      setSelectedKey("document", next),
    docReviewGuidelineItems: items.documentReview,
    docReviewSelectedGuidelineIds: selected.documentReview,
    setDocReviewSelectedGuidelineIds: (next: string[]) =>
      setSelectedKey("documentReview", next),
    docReviewLearningItems,
    docReviewSelectedLearningIds: selected.documentReviewLearning,
    setDocReviewSelectedLearningIds: (next: string[]) =>
      setSelectedKey("documentReviewLearning", next),
    formResponseGuidelineItems: items.formResponse,
    formResponseSelectedGuidelineIds: selected.formResponse,
    setFormResponseSelectedGuidelineIds: (next: string[]) =>
      setSelectedKey("formResponse", next),
    activityGuidelineItems: items.activity,
    activitySelectedGuidelineIds: selected.activity,
    setActivitySelectedGuidelineIds: (next: string[]) =>
      setSelectedKey("activity", next),
  };
};

export default useAlterGuidelineLibrary;
