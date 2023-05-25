interface TNotification {
  type: "sent" | "received";
  _id: string;
  user: string;
  userId: string;
  userName: string;
  toUserList?: { user: string; userId: string; userName: string }[];
  category?: string;
  title: string;
  description?: string;
  date: Date;
}

export type TNotificationSent = TNotification & {
  type: "sent";
  toUserList: { user: string; userId: string; userName: string }[];
};

export type TNotificationReceived = TNotification & {
  type: "received";
  fromUser?: string;
  fromUserId?: string;
  fromUserName: string;
  checked: boolean;
};
