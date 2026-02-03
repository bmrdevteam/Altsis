export type TNotificationType =
  | "direct"
  | "classInvitation"
  | "classCancellation"
  | "classApproval"
  | "classApprovalCancel"
  | "scheduleStart"
  | "newPost";

export type TRelatedEntity = {
  type: "enrollment" | "syllabus" | "calendarEvent" | "post";
  id: string;
};

export type TNotification = {
  type: "sent" | "received";
  _id: string;
  user: string;
  userId: string;
  userName: string;
  toUserList?: { user: string; userId: string; userName: string }[];
  fromUser?: string;
  fromUserId?: string;
  fromUserName?: string;
  checked?: boolean;
  category?: string;
  title: string;
  description?: string;
  date: Date;
  notificationType?: TNotificationType;
  relatedEntity?: TRelatedEntity;
  autoDeleteOnCheck?: boolean;
};

export type TNotificationSent = TNotification & {
  type: "sent";
  toUserList: { user: string; userId: string; userName: string }[];
};

export type TNotificationReceived = TNotification & {
  type: "received";
  fromUser: string;
  fromUserId: string;
  fromUserName: string;
  checked: boolean;
};

export type TNotificationSettings = {
  classInvitation: boolean;
  classCancellation: boolean;
  classApproval: boolean;
  classApprovalCancel: boolean;
  scheduleStart: boolean;
  newPost: boolean;
  directMessage: boolean;
  soundEnabled: boolean;
};
