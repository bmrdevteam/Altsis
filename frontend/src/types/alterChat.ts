export type TAlterConversation = {
  _id: string;
  title: string;
  school?: string;
  season?: string;
  /** 최근 사용 학기 표시용 (예: 2026학년도 1쿼터) */
  seasonLabel?: string;
  pageType?: string;
  contextLabel?: string;
  syllabusId?: string;
  lastSkill?: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  messageCount?: number;
  status?: "idle" | "working" | "error";
  createdAt?: string;
  updatedAt?: string;
};

export type TAlterStoredMessage = {
  _id: string;
  conversation: string;
  role: "user" | "assistant";
  content: string;
  skill?: string;
  review?: any;
  draft?: any;
  tokenUsage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
  createdAt?: string;
};
