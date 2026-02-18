export type TSurveyQuestionType =
  | "singleChoice"
  | "multipleChoice"
  | "shortText"
  | "longText"
  | "rating"
  | "linearScale"
  | "dropdown"
  | "date"
  | "fileUpload";

export type TSurveyOption = {
  id: string;
  text: string;
};

export type TSurveyFileInfo = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  key: string;
  preSignedUrl?: string;
  expiryDate?: string;
};

export type TSurveyQuestion = {
  id: string;
  type: TSurveyQuestionType;
  title: string;
  description?: string;
  isRequired?: boolean;
  options?: TSurveyOption[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  attachments?: TSurveyFileInfo[];
  maxFiles?: number;
  maxFileSize?: number;
};

export type TSurveySettings = {
  isAnonymous: boolean;
  showResults: "creator" | "afterResponse";
  deadline: string | null;
  allowModify: boolean;
};

export type TSurvey = {
  title?: string;
  description?: string;
  questions: TSurveyQuestion[];
  settings: TSurveySettings;
  responseCount: number;
};

export type TSurveyAnswer = {
  questionId: string;
  value?: string | string[] | number;
  files?: TSurveyFileInfo[];
};

export type TSurveyResponse = {
  _id: string;
  post: string;
  respondent?: string;
  respondentId?: string;
  respondentName?: string;
  answers: TSurveyAnswer[];
  createdAt: string;
  updatedAt: string;
};

export type TSurveyOptionCount = {
  optionId: string;
  count: number;
};

export type TSurveyDistribution = {
  value: number;
  count: number;
};

export type TSurveyQuestionStats = {
  questionId: string;
  totalAnswers: number;
  optionCounts?: TSurveyOptionCount[];
  average?: number;
  distribution?: TSurveyDistribution[];
  totalFiles?: number;
};

export type TSurveyStats = {
  totalResponses: number;
  questionStats: TSurveyQuestionStats[];
};
