export type TDashboardPeriod = 7 | 14 | 30;
export type TDashboardScope = "school" | "academy";

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

export type TAIUsageTopUser = {
  userId: string;
  userName: string;
  requests: number;
  totalTokens: number;
  totalAlts: number;
};

export type TAIUsageByFeature = {
  feature: string;
  requests: number;
  totalTokens: number;
  totalAlts: number;
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
  totalAlts?: number;
  tokensPerAlt?: number;
  topUsers?: TAIUsageTopUser[];
  byFeature?: TAIUsageByFeature[];
};

export type TMyAiUsage = {
  period: "day";
  usedTokens: number;
  usedAlts: number;
  requests: number;
  limitEnabled: boolean;
  limitAlts: number | null;
  remainingAlts: number | null;
  tokensPerAlt: number;
  /** @deprecated use limitAlts */
  limitTokens?: number | null;
  /** @deprecated use remainingAlts */
  remainingTokens?: number | null;
};

export type TDashboardDelta = {
  absolute: number | null;
  percent: number | null;
};

export type TDashboardDeltas = {
  summary: {
    totalStudents: TDashboardDelta;
    totalTeachers: TDashboardDelta;
    totalCourses: TDashboardDelta;
    totalEnrollments: TDashboardDelta;
  };
  traffic: {
    requests: TDashboardDelta;
    avgResponseTime: TDashboardDelta;
    dataOut: TDashboardDelta;
    uniqueUsers: TDashboardDelta;
  };
  ai: {
    requests: TDashboardDelta;
    totalTokens: TDashboardDelta;
  };
};

export type TDashboardMeta = {
  period: TDashboardPeriod;
  scope: TDashboardScope;
  academyOnlyMetrics: ("traffic" | "storage" | "ai")[];
  comparedTo: "previousSeason" | null;
  trafficComparedTo: "previousPeriod";
};

export type TDashboard = {
  summary: TDashboardSummary;
  seasonStats: TSeasonStat[];
  trafficStats: TTrafficStat[];
  storageStats: TStorageStat[];
  aiUsage: TAIUsage;
  deltas: TDashboardDeltas;
  meta: TDashboardMeta;
};
