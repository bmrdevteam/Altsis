// 새 멤버 구조
export type TMemberUser = {
  user: string;
  userId: string;
  userName: string;
};

export type TBoardMembers = {
  groups: {
    manager: boolean;
    teacher: boolean;
    student: boolean;
  };
  users: TMemberUser[];
};

// 하위호환용 - 기존 권한 구조
export type TBoardPermissionException = {
  user: string;
  userId: string;
  userName: string;
  isAllowed: boolean;
};

export type TBoardPermission = {
  manager: boolean;
  teacher: boolean;
  student: boolean;
  exceptions: TBoardPermissionException[];
};

export type TBoardContentViewMode = "table" | "blog";
export type TBoardListViewMode = "table" | "gallery";
export type TBoardType = "official" | "user";
export type TBoardMode = "alt";
export type TAltBoardRole = "admin" | "writer" | "respondent";

export type TBoardNotificationEvents = {
  newPost: boolean;
  boardInvitation: boolean;
  altFormApprovalRequest: boolean;
  altFormApprovalResult: boolean;
  formDeadlineCalendar: boolean;
};

export type TBoard = {
  _id: string;
  school: string;
  schoolId: string;
  schoolName: string;
  name: string;
  slug: string;
  description: string;
  creator?: string;
  creatorId?: string;
  creatorName?: string;
  members: TBoardMembers;
  writers: TBoardMembers;
  /** @deprecated 하위호환용 */
  permissionWrite?: TBoardPermission;
  /** @deprecated 하위호환용 */
  permissionRead?: TBoardPermission;
  /** @deprecated 하위호환용 */
  permissionComment?: TBoardPermission;
  isDefault: boolean;
  isActive: boolean;
  order: number;
  postCount: number;
  contentViewMode: TBoardContentViewMode;
  boardType: TBoardType;
  coverImage?: string;
  coverColor?: string;
  isFavorited?: boolean;
  // Alt Board 확장 필드
  boardMode: TBoardMode;
  syllabus?: string;
  altBoardRole?: Record<string, TAltBoardRole>;
  notificationEvents?: TBoardNotificationEvents;
  createdAt: string;
  updatedAt: string;
};

export type TBoardFavorite = {
  _id: string;
  user: string;
  board: string;
  school: string;
  order: number;
  createdAt: string;
  updatedAt: string;
};
