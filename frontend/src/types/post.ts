import { TBoardMembers } from "./board";
import { TSurvey } from "./survey";

export type TPostType = "general" | "survey";

export type TPostAttachment = {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  key?: string;
};

/** @deprecated 하위호환용 */
export type TPostTargetUser = {
  user: string;
  userId: string;
  userName: string;
};

/** @deprecated 하위호환용 */
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
  postType: TPostType;
  category?: string;
  isPinned: boolean;
  isActive: boolean;
  viewCount: number;
  attachments: TPostAttachment[];
  permissionRead?: TBoardMembers;
  /** @deprecated 하위호환용 */
  targetAudience?: TPostTargetAudience;
  surveys: TSurvey[];
  createdAt: string;
  updatedAt: string;
  _mergeApplied?: boolean;
  _mergeFields?: { label: string; type: string }[];
};
