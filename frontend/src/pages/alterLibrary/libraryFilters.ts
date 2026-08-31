import {
  TAiLibraryItem,
  TAiLibraryKind,
  TAiLibraryVisibility,
  TAlterSkillId,
} from "types/schools";
import { isLibraryStaffAuth } from "./libraryAccess";

export type TLibraryListFilter =
  | "all"
  | TAiLibraryKind
  | TAiLibraryVisibility;

export const INSTRUCTION_CHAR_HINT = 2400;

export type TLibraryChipTone =
  | "All"
  | "Draft"
  | "Optional"
  | "Direct"
  | "Scheduled"
  | "Submitted"
  | "Pending"
  | "Closed"
  | "Activity"
  | "Form"
  | "Grade";

export const FILE_BADGE_TONE: TLibraryChipTone = "Closed";
export const ALL_SKILLS_TONE: TLibraryChipTone = "All";

export const LIBRARY_SKILL_LABELS: Array<{
  id: TAlterSkillId;
  label: string;
  tone: TLibraryChipTone;
}> = [
  { id: "chat", label: "챗봇", tone: "Closed" },
  { id: "syllabus-draft", label: "수업", tone: "Direct" },
  { id: "evaluation-draft", label: "평가", tone: "Pending" },
  { id: "archive-draft", label: "기록", tone: "Draft" },
  { id: "document-draft", label: "문서", tone: "Optional" },
  { id: "document-review", label: "문서 점검", tone: "Scheduled" },
  { id: "form-response-draft", label: "응답", tone: "Submitted" },
  { id: "activity-draft", label: "활동", tone: "Activity" },
  { id: "form-draft", label: "양식", tone: "Form" },
  { id: "assessment-grade", label: "채점", tone: "Grade" },
  { id: "search", label: "검색", tone: "All" },
];

export const skillLabel = (id: string) =>
  LIBRARY_SKILL_LABELS.find((s) => s.id === id)?.label || id;

export const skillTone = (id: string): TLibraryChipTone =>
  LIBRARY_SKILL_LABELS.find((s) => s.id === id)?.tone || "Optional";

export const isSchoolOfficialItem = (item: TAiLibraryItem) =>
  !item.visibility || item.visibility === "school";

export const visibilityLabel = (item: TAiLibraryItem) => {
  if (item.visibility === "personal") return "내 자료";
  if (item.visibility === "shared") return "공유";
  return "학교";
};

export const kindLabel = (kind: TAiLibraryKind) =>
  kind === "instruction" ? "지침" : "학습정보";

export const filterLibraryItems = (
  items: TAiLibraryItem[],
  {
    keyword = "",
    filter = "all",
  }: { keyword?: string; filter?: TLibraryListFilter }
) => {
  const q = keyword.trim().toLowerCase();
  return items.filter((item) => {
    if (filter === "instruction" || filter === "learning") {
      if (item.kind !== filter) return false;
    } else if (filter === "personal") {
      if (item.visibility !== "personal") return false;
    } else if (filter === "shared") {
      if (item.visibility !== "shared") return false;
    } else if (filter === "school") {
      if (!isSchoolOfficialItem(item)) return false;
    }
    if (!q) return true;
    const hay = [
      item.title,
      item.ownerName,
      item.ownerId,
      kindLabel(item.kind),
      visibilityLabel(item),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
};

export const libraryFilterCounts = (items: TAiLibraryItem[]) => ({
  all: items.length,
  instruction: items.filter((i) => i.kind === "instruction").length,
  learning: items.filter((i) => i.kind === "learning").length,
  personal: items.filter((i) => i.visibility === "personal").length,
  shared: items.filter((i) => i.visibility === "shared").length,
  school: items.filter((i) => isSchoolOfficialItem(i)).length,
});

export const canEditLibraryItem = (
  item: TAiLibraryItem,
  { userId, auth }: { userId?: string; auth?: string | null }
) => {
  const staff = isLibraryStaffAuth(auth);
  if (isSchoolOfficialItem(item)) return staff;
  if (item.visibility === "shared") {
    return staff || String(item.owner) === String(userId);
  }
  if (item.visibility === "personal") {
    return String(item.owner) === String(userId);
  }
  return false;
};

export const canPromoteLibraryItem = (
  item: TAiLibraryItem,
  auth?: string | null
) => isLibraryStaffAuth(auth) && item.visibility === "shared";
