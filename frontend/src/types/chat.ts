export type TChatParticipant = {
  user: string;
  userId: string;
  userName: string;
  profile?: string;
  joinedAt: string;
  lastReadAt?: string;
  isPinned?: boolean;
  isArchived?: boolean;
};

export type TLastMessage = {
  content: string;
  sender: string;
  senderName: string;
  sentAt: string;
};

export type TChatRoomSettings = {
  allowInvites?: boolean;
  allowChat?: boolean;
};

export type TChatRoom = {
  _id: string;
  type: "direct" | "group" | "board";
  name?: string;
  board?: string;
  creator?: string;
  creatorId?: string;
  creatorName?: string;
  participants: TChatParticipant[];
  lastMessage?: TLastMessage;
  isActive: boolean;
  settings?: TChatRoomSettings;
  unreadCount?: number;
  isPinned?: boolean;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TChatMessage = {
  _id: string;
  room: string;
  sender: string;
  senderId: string;
  senderName: string;
  senderProfile?: string;
  content: string;
  messageType: "text" | "image" | "file" | "system";
  attachment?: {
    url: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    key?: string;
  };
  readBy: { user: string; readAt: string }[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TChatUser = {
  _id: string;
  userId: string;
  userName: string;
  profile?: string;
  schools?: { school: string; schoolId: string; schoolName: string }[];
};

export type TChatFile = {
  _id: string;
  user: string;
  userId: string;
  room: string;
  message?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  key: string;
  url: string;
  fileType: "image" | "file";
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TChatAttachment = {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  key?: string;
};
