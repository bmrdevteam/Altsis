import { TAlterSkillId } from "contexts/alterContext";

const MODES: TAlterSkillId[] = ["agent", "search", "chat"];

/** Draft chips a locked conversation can select. form-draft is staff-only. */
export const LOCKED_CHIP_SKILLS: TAlterSkillId[] = [
  "form-draft",
  "syllabus-draft",
  "evaluation-draft",
  "archive-draft",
  "document-draft",
  "document-review",
  "form-response-draft",
  "activity-draft",
  "assessment-grade",
];

export const isLockedChip = (skill: TAlterSkillId) =>
  LOCKED_CHIP_SKILLS.includes(skill);

/** Pressing the selected draft chip again clears it. Mode chips stay selected. */
export const nextSkillOnChipClick = (
  current: TAlterSkillId,
  clicked: TAlterSkillId
): TAlterSkillId => {
  if (current === clicked && isLockedChip(clicked)) return "chat";
  return clicked;
};

export type VisibleSkillChipArgs = {
  auth?: string;
  registrationRole?: string;
  suggested?: TAlterSkillId[];
  selected?: TAlterSkillId;
};

/**
 * Mode chips always show. Draft chips follow the role, not the current page.
 * Students and members without a teacher registration only see the three modes.
 */
export const visibleSkillChips = ({
  auth = "",
  registrationRole = "",
  suggested = [],
  selected,
}: VisibleSkillChipArgs): TAlterSkillId[] => {
  const formStaff = auth === "owner" || auth === "admin" || auth === "manager";
  const student =
    !formStaff && (registrationRole === "student" || auth === "student");
  const teacher = formStaff || (!student && registrationRole === "teacher");
  const allowed = new Set<TAlterSkillId>(MODES);
  if (teacher) {
    for (const id of LOCKED_CHIP_SKILLS) {
      if (id === "form-draft" && !formStaff) continue;
      allowed.add(id);
    }
  }
  const out: TAlterSkillId[] = [];
  const push = (id?: TAlterSkillId) => {
    if (!id || !allowed.has(id) || out.includes(id)) return;
    out.push(id);
  };
  MODES.forEach(push);
  suggested.forEach(push);
  LOCKED_CHIP_SKILLS.forEach(push);
  push(selected);
  return out;
};
