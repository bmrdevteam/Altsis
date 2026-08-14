export type TAiUsageLimits = {
  enabled: boolean;
  /** 1인당 일(UTC) Alt 한도. 1 Alt = 10,000 토큰 */
  dailyUserAlts: number;
  /** @deprecated use dailyUserAlts */
  monthlyUserTokens?: number;
};

export type TAcademyPlans = {
  alt: {
    enabled: boolean;
    seasonSeatLimit: number | null;
    unitPrice: number;
  };
  shift: {
    enabled: boolean;
    storageLimitBytes: number | null;
    usedBytes: number;
    usageSyncedAt?: string | null;
    unitPrice: number;
  };
  ctrl: {
    enabled: boolean;
    tokenLimit: number | null;
    usedTokens: number;
    usageMonth?: string;
    unitPrice: number;
  };
};

export type TAcademyPlanUsage = {
  seats: number;
  storageBytes: number;
  storageCategories: Array<{
    name: string;
    totalBytes: number;
    count: number;
  }>;
  tokens: number;
};

export type TAcademyPlanPrice = {
  alt: number;
  shift: number;
  ctrl: number;
};

export type TAcademy = {
  _id: string;
  academyId: string;
  academyName: string;
  adminId: string;
  adminName: string;
  email?: string;
  tel?: string;
  isActivated?: boolean;
  chatEnabled?: boolean;
  boardEnabled?: boolean;
  aiEnabled?: boolean;
  sitePublishEnabled?: boolean;
  sitePublished?: boolean;
  aiProvider?: "openai" | "anthropic" | "gemini";
  aiUsageLimits?: TAiUsageLimits;
  plans?: TAcademyPlans;
};
