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
  permissionWrite: TBoardPermission;
  permissionRead: TBoardPermission;
  permissionComment?: TBoardPermission;
  isDefault: boolean;
  isActive: boolean;
  order: number;
  postCount: number;
  createdAt: string;
  updatedAt: string;
};
