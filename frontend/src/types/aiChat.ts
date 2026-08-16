export type TFormAiChatSummary = {
  sessionId: string;
  messageCount: number;
  studentMessageCount: number;
  lastMessagePreview?: string;
  lastMessageAt?: string;
};

export type TAIChatSession = {
  _id: string;
  board: string;
  form?: string;
  fieldId?: string;
  row?: string;
  student: string;
  studentId: string;
  studentName: string;
  isActive: boolean;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  messageCount: number;
  studentMessageCount?: number;
  /** 연결된 시트 행이 없거나 비활성 */
  responseDeleted?: boolean;
  createdAt: string;
};

export type TAIChatMessage = {
  _id: string;
  session: string;
  board: string;
  senderType: "student" | "ai" | "teacher";
  sender?: string;
  senderId?: string;
  senderName: string;
  senderProfile?: string;
  content: string;
  /** Alter Skill id (chat | syllabus-draft …) */
  skill?: string;
  tokenUsage?: {
    promptTokens: number;
    candidatesTokens: number;
    totalTokens: number;
  };
  isDeleted: boolean;
  createdAt: string;
};
