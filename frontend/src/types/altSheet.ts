export type TAltSheet = {
  _id: string;
  form: string;
  board: string;
  school: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TAltSheetRow = {
  _id: string;
  sheet: string;
  form: string;
  board: string;
  _respondent?: string;
  _respondentId?: string;
  _respondentName?: string;
  data: Record<string, any>;
  _submittedAt: string;
  _updatedAt: string;
  /** 요일마다 회차 출제일 (KST YYYY-MM-DD) */
  _weekdayOccurrenceKey?: string;
  /** 미제출 초안. 양식 AltForm.isDraft(비공개)와 다름 */
  isDraft?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
