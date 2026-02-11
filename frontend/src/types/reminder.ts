export type TReminder = {
  _id: string;
  user: string;
  userId: string;
  userName: string;
  title: string;
  memo: string;
  reminderTime: string;
  completed: boolean;
  notified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TEventReminder = {
  _id: string;
  title: string;
  eventStart: string;
  reminderTime: string;
  minutesBefore: number;
  color?: string;
  isRecurring: boolean;
};

export type TUpcomingReminder = {
  type: "standalone" | "event";
  reminderTime: string;
  data: TReminder | TEventReminder;
};
