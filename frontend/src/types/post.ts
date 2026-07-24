import { TBoardMembers } from "./board";
import { TSurvey } from "./survey";

export type TPostType = "general" | "survey";

export type TPostAttachmentType = "file" | "link" | "youtube" | "htmlEmbed";

export type TPostAttachment = {
  type?: TPostAttachmentType;
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  key?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  youtubeVideoId?: string;
  htmlContent?: string;
  embedType?: "code" | "url";
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
  /** 비공개(true): 작성자만 열람 / 공개(false) */
  isDraft?: boolean;
  /** 목록용: 현재 사용자 기준 안 읽음 (작성자·비공개 제외) */
  isUnread?: boolean;
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
  _mergeStripped?: boolean;
  _mergeTruncated?: boolean;
};
