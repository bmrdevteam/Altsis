export type TAIChatSession = {
  _id: string;
  board: string;
  student: string;
  studentId: string;
  studentName: string;
  isActive: boolean;
  lastMessageAt?: string;
  lastMessagePreview?: string;
  messageCount: number;
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
