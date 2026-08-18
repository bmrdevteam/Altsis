import { TAltForm } from "types/altForm";
import { TActivityListSort } from "./ActivityListFilterBar";
import { getActivityPeriodKind } from "./activityStatusVisual";

const collator = new Intl.Collator("ko", { sensitivity: "base" });

const submitSortRank = (form: TAltForm): number => {
  const period = getActivityPeriodKind(form);
  const submitted = !!form.mySubmitted;
  const required = form.settings?.requiredMode === true && form.myRespondent !== false;
  if (!submitted && period === "open" && required) return 0;
  if (period === "scheduled") return 1;
  if (submitted && period !== "closed") return 2;
  return 3; // closed / optional unsubmitted
};

const compareDefault = (a: TAltForm, b: TAltForm): number => {
  const aDirect = a.settings?.directInputMode ? 1 : 0;
  const bDirect = b.settings?.directInputMode ? 1 : 0;
  if (aDirect !== bDirect) return aDirect - bDirect;
  return submitSortRank(a) - submitSortRank(b);
};

const dateValue = (value?: string | null): number => {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
};

/** 날짜 오름차순. 값 없는 항목은 뒤로. */
const compareDateAscMissingLast = (
  aVal?: string | null,
  bVal?: string | null
): number => {
  const aMissing = !aVal;
  const bMissing = !bVal;
  if (aMissing !== bMissing) return Number(aMissing) - Number(bMissing);
  return dateValue(aVal) - dateValue(bVal);
};

const compareBySort = (
  a: TAltForm,
  b: TAltForm,
  sortBy: TActivityListSort
): number => {
  switch (sortBy) {
    case "title":
      return collator.compare(a.title || "", b.title || "");
    case "updatedAt":
      return dateValue(b.updatedAt) - dateValue(a.updatedAt);
    case "createdAt":
      return dateValue(b.createdAt) - dateValue(a.createdAt);
    case "closeAt":
      return compareDateAscMissingLast(
        a.settings?.closeAt,
        b.settings?.closeAt
      );
    case "openAt":
      return compareDateAscMissingLast(a.settings?.openAt, b.settings?.openAt);
    case "default":
    default:
      return compareDefault(a, b);
  }
};

const isFormPinned = (
  form: TAltForm,
  pinnedIds?: Set<string>
): boolean => (pinnedIds ? pinnedIds.has(form._id) : !!form.isFavorited);

/** 고정(핀) 활동을 항상 상단에 두고, 그 아래에서 sortBy를 적용한다. */
export const sortFormsForList = (
  forms: TAltForm[],
  sortBy: TActivityListSort,
  pinnedIds?: Set<string>
): TAltForm[] => {
  return [...forms].sort((a, b) => {
    const pin =
      Number(isFormPinned(b, pinnedIds)) - Number(isFormPinned(a, pinnedIds));
    if (pin !== 0) return pin;
    return compareBySort(a, b, sortBy);
  });
};
