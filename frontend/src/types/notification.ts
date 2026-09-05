export type TNotificationType =
  | "classInvitation"
  | "classCancellation"
  | "classApproval"
  | "classApprovalCancel"
  | "scheduleStart"
  | "newPost"
  | "reminder"
  | "boardInvitation"
  | "altFormApprovalRequest"
  | "altFormApprovalResult";

export type TRelatedEntity = {
  type:
    | "enrollment"
    | "syllabus"
    | "calendarEvent"
    | "post"
    | "reminder"
    | "board"
    | "altSheetRow"
    | "altForm";
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
  chatMessage: boolean;
  soundEnabled: boolean;
  reminder: boolean;
  boardInvitation?: boolean;
  altFormApprovalRequest?: boolean;
  altFormApprovalResult?: boolean;
  eventReminderDefault: number;
  /** 잠금화면 Web Push (기본 false, 옵트인) */
  webPushEnabled?: boolean;
  /** 이메일 알림 수신 (기본 false, 옵트인) */
  emailEnabled?: boolean;
};
