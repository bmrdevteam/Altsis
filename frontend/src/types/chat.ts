export type TChatParticipant = {
  user: string;
  userId: string;
  userName: string;
  profile?: string;
  joinedAt: string;
  lastReadAt?: string;
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
  type: "direct" | "group";
  name?: string;
  creator?: string;
  creatorId?: string;
  creatorName?: string;
  participants: TChatParticipant[];
  lastMessage?: TLastMessage;
  isActive: boolean;
  settings?: TChatRoomSettings;
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
