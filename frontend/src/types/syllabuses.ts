export type TSyllabus = {
  _id: string;
  school: string;
  season: string;
  year: string;
  term: string;
  user: string;
  userId: string;
  userName: string;

  subject: string[];
  classTitle: string;
  time: { label: string; day: string; start: string; end: string }[];
  classroom: string;
  teachers: {
    _id: string;
    userId: string;
    userName: string;
    confirmed: boolean;
    isHiddenFromCalendar: boolean;
  }[];
  point: number;
  limit: number;
  count: number;

  info?: any;
  coverImage?: string;
  coverColor?: string;
  /** 연결된 Alt Board (없으면 미연결) */
  altBoard?: string;
};
