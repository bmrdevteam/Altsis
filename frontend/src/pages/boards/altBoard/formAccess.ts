import { TAltForm } from "types/altForm";
import { TAltBoardRole, TBoard, TBoardMembers } from "types/board";
import { TUser } from "types/users";

export const emptyFormAccess = (): TBoardMembers => ({
  groups: { manager: false, teacher: false, student: false },
  users: [],
});

export const isAccessListCustom = (access?: TBoardMembers | null): boolean => {
  if (!access) return false;
  const g = access.groups || { manager: false, teacher: false, student: false };
  return !!(g.manager || g.teacher || g.student || (access.users || []).length);
};

export const userMatchesAccessList = (
  access: TBoardMembers | undefined,
  user: Pick<TUser, "_id" | "userId" | "auth">,
  schoolRole?: string | null
): boolean => {
  if (!access || !user) return false;
  const uid = String(user._id);
  if (
    (access.users || []).some(
      (u) =>
        String(u.user) === uid ||
        (!!user.userId && !!u.userId && u.userId === user.userId)
    )
  ) {
    return true;
  }
  const g = access.groups || { manager: false, teacher: false, student: false };
  if (g.manager && (user.auth === "manager" || schoolRole === "manager")) {
    return true;
  }
  if (schoolRole && (g as Record<string, boolean>)[schoolRole]) return true;
  return false;
};

const isFormStaff = (
  form: TAltForm,
  board: TBoard,
  user: Pick<TUser, "_id" | "auth">,
  myRole: TAltBoardRole | null
) => {
  if (user.auth === "admin" || user.auth === "manager") return true;
  if (form.creator != null && String(form.creator) === String(user._id)) {
    return true;
  }
  if (myRole === "admin") return true;
  if (
    board.creator != null &&
    String(board.creator) === String(user._id)
  ) {
    return true;
  }
  return false;
};

export const canViewAllRowsForm = (
  form: TAltForm,
  board: TBoard,
  user: Pick<TUser, "_id" | "userId" | "auth">,
  myRole: TAltBoardRole | null,
  schoolRole?: string | null
): boolean => {
  if (isFormStaff(form, board, user, myRole)) return true;
  if (!myRole) return false;
  if (!isAccessListCustom(form.writers)) {
    return myRole === "admin" || myRole === "writer";
  }
  return userMatchesAccessList(form.writers, user, schoolRole);
};

export const getMyAltBoardRole = (
  board: TBoard,
  user: Pick<TUser, "_id" | "auth"> | null | undefined
): TAltBoardRole | null => {
  if (!user) return null;
  if (user.auth === "admin") return "admin";
  if (board.creator != null && String(board.creator) === String(user._id)) {
    return "admin";
  }
  const roles = board.altBoardRole;
  if (!roles) return null;
  return (
    (roles[user._id] as TAltBoardRole | undefined) ||
    (roles[String(user._id)] as TAltBoardRole | undefined) ||
    null
  );
};

/** 제출·할 일·미제출 대상. staff·작성 권한 우회 없음. */
export const isFormRespondent = (
  form: TAltForm,
  user: Pick<TUser, "_id" | "userId" | "auth"> | null | undefined,
  myRole: TAltBoardRole | null,
  schoolRole?: string | null
): boolean => {
  if (!user || !myRole) return false;
  if (!isAccessListCustom(form.members)) return true;
  return userMatchesAccessList(form.members, user, schoolRole);
};

export const selectedIdsFromAccess = (access?: TBoardMembers | null): string[] =>
  (access?.users || []).map((u) => String(u.user));
