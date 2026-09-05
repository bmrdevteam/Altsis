import {
  TApprovalApprover,
  TApprovalLineStepDef,
  TApprovalPersonGroup,
  TApprovalPersonGroupKind,
  TApprovalPersonGroupMember,
} from "types/altForm";
import { uniqueApproverList } from "utils/approvalLine";

export const MAX_APPROVAL_GROUPS = 20;
export const MAX_GROUP_MEMBERS = 50;
export const MAX_GROUP_TITLE_LENGTH = 200;
export const MAX_MEMBER_LABEL_LENGTH = 200;

export type TDroppedGroupPerson = {
  userId: string;
  userName?: string;
};

const clip = (value: unknown, max: number): string =>
  String(value ?? "")
    .trim()
    .slice(0, max);

const asApprover = (raw: unknown): TApprovalApprover | null => {
  if (!raw || typeof raw !== "object") return null;
  const u = raw as Partial<TApprovalApprover>;
  if (!u.userId) return null;
  return {
    user: String(u.user || ""),
    userId: String(u.userId),
    userName: String(u.userName || u.userId),
  };
};

const asKind = (raw: unknown): TApprovalPersonGroupKind => {
  if (raw === "approver" || raw === "circulation" || raw === "both") {
    return raw;
  }
  return "both";
};

export function defaultApprovalStepLabel(index: number): string {
  return `${index + 1}차 승인`;
}

export function formHasApprovalGroups(
  groups: TApprovalPersonGroup[] | undefined | null
): boolean {
  return Array.isArray(groups) && groups.length > 0;
}

export function groupsForFieldKind(
  groups: TApprovalPersonGroup[] | undefined | null,
  fieldKind: "approver" | "circulation"
): TApprovalPersonGroup[] {
  return (groups || []).filter(
    (g) => g.kind === "both" || g.kind === fieldKind
  );
}

export function sanitizeApprovalGroups(raw: unknown): TApprovalPersonGroup[] {
  if (!Array.isArray(raw)) return [];
  const out: TApprovalPersonGroup[] = [];
  const seenIds = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    if (out.length >= MAX_APPROVAL_GROUPS) break;
    const g = item as Partial<TApprovalPersonGroup> & {
      users?: unknown;
    };
    let id = clip(g.id, 80);
    if (!id || seenIds.has(id)) {
      id =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `ag_${Date.now()}_${out.length}`;
    }
    seenIds.add(id);
    const members: TApprovalPersonGroupMember[] = [];
    const seenUsers = new Set<string>();
    const rawMembers = Array.isArray(g.members)
      ? g.members
      : Array.isArray(g.users)
        ? (g.users as unknown[]).map((user) => ({ label: "", user }))
        : [];
    for (const m of rawMembers) {
      if (members.length >= MAX_GROUP_MEMBERS) break;
      const row = m && typeof m === "object" ? (m as TApprovalPersonGroupMember) : null;
      const user = asApprover(row?.user || m);
      if (!user || seenUsers.has(user.userId)) continue;
      seenUsers.add(user.userId);
      members.push({
        label: clip(row?.label, MAX_MEMBER_LABEL_LENGTH),
        user,
      });
    }
    out.push({
      id,
      title: clip(g.title, MAX_GROUP_TITLE_LENGTH) || "그룹",
      kind: asKind(g.kind),
      members,
    });
  }
  return out;
}

const idSet = (ids: Iterable<string> | undefined): Set<string> =>
  ids instanceof Set ? ids : new Set(ids || []);

export function applyApprovalGroup(
  group: TApprovalPersonGroup,
  candidateIds: Iterable<string>
): {
  applied: boolean;
  steps: TApprovalLineStepDef[];
  dropped: TDroppedGroupPerson[];
} {
  const allowed = idSet(candidateIds);
  const dropped: TDroppedGroupPerson[] = [];
  const steps: TApprovalLineStepDef[] = [];
  for (const m of group.members || []) {
    const u = asApprover(m?.user);
    if (!u) continue;
    if (!allowed.has(u.userId)) {
      dropped.push({ userId: u.userId, userName: u.userName });
      continue;
    }
    const order = steps.length;
    steps.push({
      order,
      label: clip(m.label, MAX_MEMBER_LABEL_LENGTH) || defaultApprovalStepLabel(order),
      mode: "pick",
      approver: u,
    });
  }
  if (steps.length === 0) {
    return { applied: false, steps: [], dropped };
  }
  return { applied: true, steps, dropped };
}

export function applyCirculationGroup(
  group: TApprovalPersonGroup,
  candidateIds: Iterable<string>
): {
  applied: boolean;
  users: TApprovalApprover[];
  dropped: TDroppedGroupPerson[];
} {
  const allowed = idSet(candidateIds);
  const dropped: TDroppedGroupPerson[] = [];
  const kept: TApprovalApprover[] = [];
  for (const m of group.members || []) {
    const u = asApprover(m?.user);
    if (!u) continue;
    if (!allowed.has(u.userId)) {
      dropped.push({ userId: u.userId, userName: u.userName });
      continue;
    }
    kept.push(u);
  }
  const users = uniqueApproverList(kept);
  if (users.length === 0) {
    return { applied: false, users: [], dropped };
  }
  return { applied: true, users, dropped };
}

export function buildGroupApprovalValue(
  steps: TApprovalLineStepDef[],
  circulation: TApprovalApprover[] = []
) {
  const runtime = steps.map((s) => ({
    ...s,
    status: "waiting" as const,
  }));
  return {
    version: 2 as const,
    lineSource: "group" as const,
    currentStep: 0,
    overallStatus: "pending" as const,
    status: "pending",
    approver: runtime.find((s) => s.approver?.userId)?.approver,
    steps: runtime,
    circulation,
  };
}
