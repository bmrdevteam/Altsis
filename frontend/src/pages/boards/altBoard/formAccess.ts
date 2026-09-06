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

const isSeasonScopedBoard = (board: TBoard) =>
  board.scope === "season" && !!board.season;

const isUserAssignedToSchool = (
  user: Pick<TUser, "schools">,
  schoolId?: string
) => {
  if (!user.schools?.length || !schoolId) return false;
  const sid = String(schoolId);
  return user.schools.some(
    (s) => String(s.schoolId) === sid || String(s.school) === sid
  );
};

const resolveBoardMembers = (board: TBoard): TBoardMembers => {
  if (board.members?.groups) return board.members;
  if (board.permissionRead) {
    return {
      groups: {
        manager: board.permissionRead.manager ?? true,
        teacher: board.permissionRead.teacher ?? true,
        student: board.permissionRead.student ?? true,
      },
      users: (board.permissionRead.exceptions || [])
        .filter((e) => e.isAllowed)
        .map((e) => ({
          user: e.user,
          userId: e.userId,
          userName: e.userName,
        })),
    };
  }
  return { groups: { manager: true, teacher: true, student: true }, users: [] };
};

const lookupAltBoardRole = (
  board: TBoard,
  userOid: string
): TAltBoardRole | undefined => {
  const roles = board.altBoardRole;
  if (!roles || !userOid) return undefined;
  return (
    (roles[userOid] as TAltBoardRole | undefined) ||
    undefined
  );
};

const isBoardMemberAsUser = (
  board: TBoard,
  user: Pick<TUser, "_id" | "auth" | "userId" | "schools">,
  schoolRole?: string | null
): boolean => {
  if (board.creator != null && String(board.creator) === String(user._id)) {
    return true;
  }
  if (board.isDefault) return true;
  const userOid = String(user._id);
  if (lookupAltBoardRole(board, userOid)) return true;
  const members = resolveBoardMembers(board);
  if (
    members.users?.some(
      (u) =>
        String(u.user) === userOid ||
        (!!user.userId && !!u.userId && u.userId === user.userId)
    )
  ) {
    return true;
  }
  if (user.auth === "manager" && members.groups?.manager) return true;
  if (schoolRole === "teacher" && members.groups?.teacher) return true;
  if (schoolRole === "student" && members.groups?.student) return true;
  if (
    !isSeasonScopedBoard(board) &&
    isUserAssignedToSchool(user, board.schoolId) &&
    (members.groups?.teacher || members.groups?.student)
  ) {
    return true;
  }
  return false;
};

export const getMyAltBoardRole = (
  board: TBoard,
  user:
    | Pick<TUser, "_id" | "auth" | "userId" | "schools">
    | null
    | undefined,
  schoolRole?: string | null
): TAltBoardRole | null => {
  if (!user) return null;
  if (user.auth === "admin") return "admin";
  if (board.creator != null && String(board.creator) === String(user._id)) {
    return "admin";
  }
  const explicit =
    lookupAltBoardRole(board, user._id) ||
    lookupAltBoardRole(board, String(user._id));
  if (explicit) return explicit;
  if (isBoardMemberAsUser(board, user, schoolRole)) return "respondent";
  return null;
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
