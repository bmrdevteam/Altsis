import { TAltFormField } from "types/altForm";
import {
  getApprovalLineSteps,
  getCirculationConfig,
  uniqueApproverList,
} from "utils/approvalLine";

export type TFormViewMode = "compose" | "drafts" | "review";

export const urlModeToViewMode = (
  urlMode: string | null | undefined
): TFormViewMode => {
  if (urlMode === "responses") return "review";
  // 예전 mode=drafts 링크도 작성으로 연다.
  return "compose";
};

export const viewModeToUrlMode = (mode: TFormViewMode): string => {
  if (mode === "review") return "responses";
  return "respond";
};

/**
 * URL/딥링크 모드를 내부 작성·조회에 반영할지.
 * 재사용·수정 직후 skip은 내부 모드가 외부와 같아질 때까지 유지한다.
 */
export const shouldApplyExternalViewMode = ({
  skipInternal,
  internalMode,
  externalMode,
}: {
  skipInternal: boolean;
  internalMode: TFormViewMode;
  externalMode: TFormViewMode;
}): { apply: boolean; nextSkip: boolean } => {
  if (skipInternal) {
    return {
      apply: false,
      nextSkip: internalMode !== externalMode,
    };
  }
  return {
    apply: internalMode !== externalMode,
    nextSkip: false,
  };
};

/** 작성 탭 진입·재클릭은 칸 0(로컬/빈 양식). 내 응답은 작성 칸을 바꾸지 않는다. */
export const shouldStartNewCompose = ({
  targetMode,
}: {
  targetMode: TFormViewMode;
}): boolean => targetMode === "compose" || targetMode === "drafts";

/** 작성 슬롯: 브라우저·서버 초안이 있어도 빈 양식. */
export const resolveFreshComposeData = (_opts?: {
  localDraft?: Record<string, any> | null;
}): Record<string, any> => ({});

/** 수정 초안: 행 값이 있으면 덮고, 비어 있으면 조회 중 화면 값을 유지. */
export const mergeRowDataForEdit = (
  rowData: Record<string, any> | null | undefined,
  fallback: Record<string, any> = {}
): Record<string, any> => {
  const src =
    rowData && typeof rowData === "object" && !Array.isArray(rowData)
      ? rowData
      : {};
  return { ...fallback, ...src };
};

type ReuseField = Pick<
  TAltFormField,
  "_id" | "type" | "approvalLine" | "circulation"
>;

const reuseApprovalValue = (raw: any, field: ReuseField) => {
  const lineSteps = getApprovalLineSteps(field);
  const submittedSteps = Array.isArray(raw?.steps) ? raw.steps : null;
  const submittedPicks = submittedSteps
    ? submittedSteps.filter((s: { mode?: string }) => s?.mode !== "fixed")
    : raw?.approver?.userId
      ? [{ approver: raw.approver }]
      : [];
  let pickIdx = 0;
  const steps = lineSteps.map((def) => {
    const approver =
      def.mode === "pick" ? submittedPicks[pickIdx++]?.approver : undefined;
    return {
      order: def.order,
      label: def.label,
      mode: def.mode,
      approver,
      status: "waiting" as const,
    };
  });
  return {
    version: 2 as const,
    currentStep: 0,
    overallStatus: "pending" as const,
    status: "pending",
    approver: steps.find((s) => s.mode === "pick" && s.approver)?.approver,
    steps,
    circulation: uniqueApproverList(
      Array.isArray(raw?.circulation) ? raw.circulation : []
    ),
  };
};

/** 제출 행을 추가 제출 초안으로 복사. 결재 진행 상태는 초기화하고 지정 인원은 유지. */
export const copyRowDataForReuse = (
  data: Record<string, any> | null | undefined,
  fields: ReuseField[]
): Record<string, any> => {
  const copied: Record<string, any> = { ...(data || {}) };
  for (const key of Object.keys(copied)) {
    if (key.startsWith("_")) delete copied[key];
  }
  for (const field of fields) {
    if (field.type === "aiChat") {
      delete copied[field._id];
      continue;
    }
    if (field.type === "approval") {
      if (copied[field._id]) {
        copied[field._id] = reuseApprovalValue(copied[field._id], field);
      }
      continue;
    }
    if (field.type === "circulation") {
      const cfg = getCirculationConfig(field);
      if (cfg.mode !== "pick") {
        delete copied[field._id];
      } else {
        copied[field._id] = uniqueApproverList(
          Array.isArray(copied[field._id]) ? copied[field._id] : []
        );
      }
    }
  }
  const pickCirc = fields.find(
    (f) => f.type === "circulation" && getCirculationConfig(f).mode === "pick"
  );
  if (pickCirc) {
    const extra: { user?: string; userId?: string; userName?: string }[] = [];
    for (const field of fields) {
      if (field.type !== "approval") continue;
      const nested = copied[field._id]?.circulation;
      if (Array.isArray(nested) && nested.length) extra.push(...nested);
      if (copied[field._id] && typeof copied[field._id] === "object") {
        copied[field._id] = { ...copied[field._id], circulation: [] };
      }
    }
    copied[pickCirc._id] = uniqueApproverList([
      ...(copied[pickCirc._id] || []),
      ...extra,
    ]);
  }
  return copied;
};

export type TReusedDroppedPerson = {
  userId: string;
  userName?: string;
  role: "approver" | "circulation";
};

export const filterReusedPickPeople = (
  data: Record<string, any>,
  fields: ReuseField[],
  candidates: {
    approvalCandidateIds: Iterable<string>;
    circulationCandidateIds: Iterable<string>;
  }
): { data: Record<string, any>; dropped: TReusedDroppedPerson[] } => {
  const approvalIds = new Set(candidates.approvalCandidateIds);
  const circulationIds = new Set(candidates.circulationCandidateIds);
  const dropped: TReusedDroppedPerson[] = [];
  const next: Record<string, any> = { ...data };

  const dropIfMissing = (
    user: { userId?: string; userName?: string } | undefined,
    ids: Set<string>,
    role: TReusedDroppedPerson["role"]
  ) => {
    if (!user?.userId) return undefined;
    if (ids.has(user.userId)) return user;
    dropped.push({
      userId: user.userId,
      userName: user.userName,
      role,
    });
    return undefined;
  };

  for (const field of fields) {
    if (field.type === "approval") {
      const val = next[field._id];
      if (!val || typeof val !== "object") continue;
      const steps = Array.isArray(val.steps)
        ? val.steps.map(
            (s: {
              mode?: string;
              approver?: { userId?: string; userName?: string };
            }) => {
              if (s?.mode === "fixed") return s;
              const approver = dropIfMissing(
                s?.approver,
                approvalIds,
                "approver"
              );
              return { ...s, approver };
            }
          )
        : val.steps;
      let nestedCirc = Array.isArray(val.circulation) ? val.circulation : [];
      nestedCirc = nestedCirc.filter(
        (u: { userId?: string; userName?: string }) => {
          if (!u?.userId) return false;
          if (circulationIds.has(u.userId)) return true;
          dropped.push({
            userId: u.userId,
            userName: u.userName,
            role: "circulation",
          });
          return false;
        }
      );
      next[field._id] = {
        ...val,
        steps,
        circulation: nestedCirc,
        approver: steps?.find(
          (s: { mode?: string; approver?: { userId?: string } }) =>
            s?.mode !== "fixed" && s?.approver?.userId
        )?.approver,
      };
      continue;
    }
    if (field.type === "circulation") {
      if (getCirculationConfig(field).mode !== "pick") continue;
      const list = Array.isArray(next[field._id]) ? next[field._id] : [];
      next[field._id] = list.filter(
        (u: { userId?: string; userName?: string }) => {
          if (!u?.userId) return false;
          if (circulationIds.has(u.userId)) return true;
          dropped.push({
            userId: u.userId,
            userName: u.userName,
            role: "circulation",
          });
          return false;
        }
      );
    }
  }
  return { data: next, dropped };
};

/** 키가 없을 때만 지정 기본 인원을 채운다. 빈 배열·빈 단계는 제출자가 지운 값으로 둔다. */
export const seedComposePickDefaults = (
  data: Record<string, any>,
  fields: ReuseField[],
  candidates?: {
    approvalCandidateIds?: Iterable<string>;
    circulationCandidateIds?: Iterable<string>;
  }
): { data: Record<string, any>; dropped: TReusedDroppedPerson[] } => {
  const next: Record<string, any> = { ...data };
  const dropped: TReusedDroppedPerson[] = [];
  const approvalIds = candidates?.approvalCandidateIds
    ? new Set(candidates.approvalCandidateIds)
    : null;
  const circulationIds = candidates?.circulationCandidateIds
    ? new Set(candidates.circulationCandidateIds)
    : null;

  for (const field of fields) {
    if (field.type === "approval") {
      if (next[field._id] !== undefined && next[field._id] !== null) continue;
      const lineSteps = getApprovalLineSteps(field);
      const steps = lineSteps.map((def) => {
        let approver = def.approver;
        if (
          def.mode === "pick" &&
          approver?.userId &&
          approvalIds &&
          !approvalIds.has(approver.userId)
        ) {
          dropped.push({
            userId: approver.userId,
            userName: approver.userName,
            role: "approver",
          });
          approver = undefined;
        }
        return {
          order: def.order,
          label: def.label,
          mode: def.mode,
          approver,
          status: "waiting" as const,
        };
      });
      next[field._id] = {
        version: 2 as const,
        currentStep: 0,
        overallStatus: "pending" as const,
        status: "pending",
        approver: steps.find((s) => s.mode === "pick" && s.approver)?.approver,
        steps,
        circulation: [],
      };
      continue;
    }
    if (field.type === "circulation") {
      if (next[field._id] !== undefined && next[field._id] !== null) continue;
      const cfg = getCirculationConfig(field);
      if (cfg.mode !== "pick") continue;
      const kept = [];
      for (const u of cfg.users) {
        if (!u?.userId) continue;
        if (circulationIds && !circulationIds.has(u.userId)) {
          dropped.push({
            userId: u.userId,
            userName: u.userName,
            role: "circulation",
          });
          continue;
        }
        kept.push(u);
      }
      next[field._id] = uniqueApproverList(kept);
    }
  }
  return { data: next, dropped };
};

export const formatReusedDroppedNotice = (
  dropped: TReusedDroppedPerson[]
): string | null => {
  if (!dropped.length) return null;
  const names = Array.from(
    new Set(dropped.map((d) => d.userName || d.userId).filter(Boolean))
  );
  const suffix = names.length ? ` (${names.join(", ")})` : "";
  return `더 이상 지정할 수 없는 승인자·회람자는 제외했습니다.${suffix}`;
};
