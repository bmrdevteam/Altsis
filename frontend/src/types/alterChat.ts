export type TAlterConversation = {
  _id: string;
  title: string;
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
