export type TDashboardSummary = {
  totalStudents: number;
  totalTeachers: number;
  totalCourses: number;
  totalEnrollments: number;
};

export type TSeasonStat = {
  _id: string;
  year: string;
  term: string;
  isActivated: boolean;
  studentCount: number;
  teacherCount: number;
};

export type TCourseFillRate = {
  classTitle: string;
  count: number;
  limit: number;
  fillRate: number | null;
};

export type TBoardActivity = {
  name: string;
  postCount: number;
};

export type TTrafficStat = {
  date: string;
  requests: number;
  avgResponseTime: number;
  dataIn: number;
  dataOut: number;
  uniqueUsers: number;
};

export type TStorageStat = {
  name: string;
  count: number;
  totalSize: number;
};

export type TAIUsage = {
  daily: {
    date: string;
    requests: number;
    totalTokens: number;
  }[];
  total: {
    requests: number;
    totalTokens: number;
    promptTokens: number;
    candidatesTokens: number;
    thoughtsTokens: number;
  };
};

export type TDashboard = {
  summary: TDashboardSummary;
  seasonStats: TSeasonStat[];
  courseFillRates: TCourseFillRate[];
  boardActivity: TBoardActivity[];
  trafficStats: TTrafficStat[];
  storageStats: TStorageStat[];
  aiUsage: TAIUsage;
};
