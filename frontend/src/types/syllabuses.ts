export type TSyllabus = {
  _id: string;
  school: string;
  season: string;
  user: string;
  userId: string;
  userName: string;

  subject: string[];
  classTitle: string;
  time: { label: string; day?: string; start?: string; end?: string }[];
  classroom: string;
  teachers: {
    _id: string;
    userId: string;
    userName: string;
    confirmed: boolean;
    isHiddenFromCalendar: boolean;
  }[];
};
