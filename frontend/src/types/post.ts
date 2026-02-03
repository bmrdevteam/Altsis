export type TPostAttachment = {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  key?: string;
};

export type TPostTargetUser = {
  user: string;
  userId: string;
  userName: string;
};

export type TPostTargetAudience = {
  type: "all" | "manager" | "teacher" | "student" | "custom";
  users?: TPostTargetUser[];
  grade?: number;
};

export type TPost = {
  _id: string;
  board: string;
  author: string;
  authorId: string;
  authorName: string;
  authorProfile?: string;
  title: string;
  content: string;
  category?: string;
  isPinned: boolean;
  isActive: boolean;
  viewCount: number;
  attachments: TPostAttachment[];
  targetAudience?: TPostTargetAudience;
  legacyNotificationId?: string;
  isLegacyNotification?: boolean;
  createdAt: string;
  updatedAt: string;
};
